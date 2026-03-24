import { useEffect, useState, useCallback, useRef } from "react";
import type { WsMessage, WsStatus, KeyValuePair } from "@apiark/types";
import { wsConnect, wsSend, wsDisconnect } from "@/lib/tauri-api";
import { socketioBuildUrl } from "@/lib/tauri-api";

export interface SioEvent {
  eventName: string;
  args: string;
  direction: "sent" | "received";
  timestamp: string;
  namespace: string;
}

interface EioHandshake {
  sid: string;
  pingInterval: number;
  pingTimeout: number;
}

interface UseSocketIoReturn {
  status: "disconnected" | "connecting" | "connected";
  events: SioEvent[];
  error: string | null;
  serverInfo: EioHandshake | null;
  connect: (url: string, namespace: string, headers: KeyValuePair[], auth?: Record<string, unknown>) => Promise<void>;
  emit: (eventName: string, args: string) => Promise<void>;
  disconnect: () => Promise<void>;
  clearEvents: () => void;
}

// Engine.IO packet types
const EIO_OPEN = "0";
const EIO_CLOSE = "1";
const EIO_PING = "2";
const EIO_PONG = "3";
const EIO_MESSAGE = "4";

// Socket.IO packet types (prefixed after EIO_MESSAGE "4")
const SIO_CONNECT = "0";
const SIO_DISCONNECT = "1";
const SIO_EVENT = "2";
const SIO_ACK = "3";
const SIO_CONNECT_ERROR = "4";

export function useSocketIo(connectionId: string): UseSocketIoReturn {
  const [status, setStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");
  const [events, setEvents] = useState<SioEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [serverInfo, setServerInfo] = useState<EioHandshake | null>(null);
  const unlistenersRef = useRef<(() => void)[]>([]);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const namespaceRef = useRef("/");
  const connectedRef = useRef(false);

  const clearPing = () => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
  };

  const handleRawMessage = useCallback((content: string) => {
    if (!content || content.length === 0) return;

    const eioType = content[0];
    const payload = content.slice(1);

    switch (eioType) {
      case EIO_OPEN: {
        // Engine.IO handshake: {"sid":"xxx","upgrades":[],"pingInterval":25000,"pingTimeout":20000}
        try {
          const info = JSON.parse(payload) as EioHandshake;
          setServerInfo(info);
          // Start ping loop
          clearPing();
          pingIntervalRef.current = setInterval(() => {
            wsSend(connectionId, EIO_PING).catch(() => {});
          }, info.pingInterval);
          // Send Socket.IO CONNECT packet for namespace
          const ns = namespaceRef.current;
          const connectPacket = ns === "/" ? `${EIO_MESSAGE}${SIO_CONNECT}` : `${EIO_MESSAGE}${SIO_CONNECT}${ns},`;
          wsSend(connectionId, connectPacket).catch(() => {});
        } catch {
          // ignore parse errors
        }
        break;
      }
      case EIO_PING:
        // Respond to server ping with pong
        wsSend(connectionId, EIO_PONG).catch(() => {});
        break;
      case EIO_PONG:
        // Server responded to our ping, connection is alive
        break;
      case EIO_CLOSE:
        setStatus("disconnected");
        connectedRef.current = false;
        clearPing();
        break;
      case EIO_MESSAGE: {
        // Socket.IO packet inside Engine.IO message
        handleSioPacket(payload);
        break;
      }
    }
  }, [connectionId]);

  const handleSioPacket = useCallback((packet: string) => {
    if (!packet || packet.length === 0) return;

    const sioType = packet[0];
    const rest = packet.slice(1);

    // Extract namespace if present
    let ns = "/";
    let data = rest;
    if (rest.startsWith("/")) {
      const commaIdx = rest.indexOf(",");
      if (commaIdx !== -1) {
        ns = rest.slice(0, commaIdx);
        data = rest.slice(commaIdx + 1);
      } else {
        ns = rest;
        data = "";
      }
    }

    switch (sioType) {
      case SIO_CONNECT:
        // Connected to namespace
        setStatus("connected");
        connectedRef.current = true;
        setError(null);
        break;
      case SIO_DISCONNECT:
        setStatus("disconnected");
        connectedRef.current = false;
        break;
      case SIO_EVENT: {
        // Parse event: [eventName, ...args]
        try {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const eventName = String(parsed[0]);
            const args = parsed.length > 1 ? JSON.stringify(parsed.slice(1), null, 2) : "";
            setEvents((prev) => [...prev, {
              eventName,
              args,
              direction: "received",
              timestamp: new Date().toISOString(),
              namespace: ns,
            }]);
          }
        } catch {
          // Raw string event
          setEvents((prev) => [...prev, {
            eventName: "message",
            args: data,
            direction: "received",
            timestamp: new Date().toISOString(),
            namespace: ns,
          }]);
        }
        break;
      }
      case SIO_ACK:
        // ACK response — show as event
        setEvents((prev) => [...prev, {
          eventName: "ack",
          args: data,
          direction: "received",
          timestamp: new Date().toISOString(),
          namespace: ns,
        }]);
        break;
      case SIO_CONNECT_ERROR:
        setError(`Socket.IO connect error: ${data}`);
        setStatus("disconnected");
        connectedRef.current = false;
        break;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const setup = async () => {
      try {
        const { listen } = await import("@tauri-apps/api/event");

        const unlistenStatus = await listen<WsStatus>("ws:status", (event) => {
          if (cancelled || event.payload.connectionId !== connectionId) return;
          if (event.payload.state === "disconnected") {
            setStatus("disconnected");
            connectedRef.current = false;
            clearPing();
            if (event.payload.error) setError(event.payload.error);
          }
        });

        const unlistenMessage = await listen<WsMessage>("ws:message", (event) => {
          if (cancelled || event.payload.connectionId !== connectionId) return;
          if (event.payload.direction === "received") {
            handleRawMessage(event.payload.content);
          }
        });

        unlistenersRef.current = [unlistenStatus, unlistenMessage];
      } catch {
        // Not in Tauri env
      }
    };

    setup();

    return () => {
      cancelled = true;
      clearPing();
      for (const unlisten of unlistenersRef.current) {
        unlisten();
      }
      unlistenersRef.current = [];
    };
  }, [connectionId, handleRawMessage]);

  const connect = useCallback(
    async (url: string, namespace: string, headers: KeyValuePair[], _auth?: Record<string, unknown>) => {
      setError(null);
      setStatus("connecting");
      namespaceRef.current = namespace || "/";
      try {
        const wsUrl = await socketioBuildUrl(url, namespace);
        await wsConnect(connectionId, { url: wsUrl, headers, protocols: [] });
      } catch (err) {
        setError(String(err));
        setStatus("disconnected");
      }
    },
    [connectionId],
  );

  const emit = useCallback(
    async (eventName: string, argsStr: string) => {
      if (!connectedRef.current) return;
      try {
        let args: unknown[];
        if (argsStr.trim()) {
          const parsed = JSON.parse(argsStr);
          args = Array.isArray(parsed) ? parsed : [parsed];
        } else {
          args = [];
        }
        const packet = JSON.stringify([eventName, ...args]);
        const ns = namespaceRef.current;
        const sioPacket = ns === "/"
          ? `${EIO_MESSAGE}${SIO_EVENT}${packet}`
          : `${EIO_MESSAGE}${SIO_EVENT}${ns},${packet}`;
        await wsSend(connectionId, sioPacket);
        setEvents((prev) => [...prev, {
          eventName,
          args: args.length > 0 ? JSON.stringify(args, null, 2) : "",
          direction: "sent",
          timestamp: new Date().toISOString(),
          namespace: ns,
        }]);
      } catch (err) {
        setError(String(err));
      }
    },
    [connectionId],
  );

  const disconnect = useCallback(async () => {
    clearPing();
    try {
      // Send SIO disconnect
      if (connectedRef.current) {
        const ns = namespaceRef.current;
        const packet = ns === "/"
          ? `${EIO_MESSAGE}${SIO_DISCONNECT}`
          : `${EIO_MESSAGE}${SIO_DISCONNECT}${ns},`;
        await wsSend(connectionId, packet);
      }
      await wsDisconnect(connectionId);
    } catch {
      // ignore
    }
    setStatus("disconnected");
    connectedRef.current = false;
  }, [connectionId]);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  return { status, events, error, serverInfo, connect, emit, disconnect, clearEvents };
}
