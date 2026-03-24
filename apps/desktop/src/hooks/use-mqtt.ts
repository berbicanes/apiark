import { useEffect, useState, useCallback, useRef } from "react";
import type { MqttConnectParams } from "@/lib/tauri-api";
import { mqttConnect, mqttSubscribe, mqttPublish, mqttDisconnect } from "@/lib/tauri-api";

export interface MqttMessage {
  topic: string;
  payload: string;
  qos: number;
  retain: boolean;
  timestamp: string;
  direction: "sent" | "received";
}

interface UseMqttReturn {
  status: "disconnected" | "connecting" | "connected";
  messages: MqttMessage[];
  subscriptions: string[];
  error: string | null;
  connect: (params: MqttConnectParams) => Promise<void>;
  disconnect: () => Promise<void>;
  subscribe: (topic: string, qos: number) => Promise<void>;
  unsubscribe: (topic: string) => void;
  publish: (topic: string, payload: string, qos: number, retain: boolean) => Promise<void>;
  clearMessages: () => void;
}

export function useMqtt(connectionId: string): UseMqttReturn {
  const [status, setStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");
  const [messages, setMessages] = useState<MqttMessage[]>([]);
  const [subscriptions, setSubscriptions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const unlistenersRef = useRef<(() => void)[]>([]);

  useEffect(() => {
    let cancelled = false;

    const setup = async () => {
      try {
        const { listen } = await import("@tauri-apps/api/event");

        const unlistenConnected = await listen<void>(
          `mqtt:connected:${connectionId}`,
          () => {
            if (cancelled) return;
            setStatus("connected");
            setError(null);
          },
        );

        const unlistenMessage = await listen<{
          topic: string;
          payload: string;
          qos: number;
          retain: boolean;
          timestamp: string;
        }>(`mqtt:message:${connectionId}`, (event) => {
          if (cancelled) return;
          setMessages((prev) => [
            ...prev,
            { ...event.payload, direction: "received" },
          ]);
        });

        const unlistenError = await listen<string>(
          `mqtt:error:${connectionId}`,
          (event) => {
            if (cancelled) return;
            setError(event.payload);
            setStatus("disconnected");
          },
        );

        unlistenersRef.current = [unlistenConnected, unlistenMessage, unlistenError];
      } catch {
        // Not in Tauri env
      }
    };

    setup();

    return () => {
      cancelled = true;
      for (const unlisten of unlistenersRef.current) {
        unlisten();
      }
      unlistenersRef.current = [];
    };
  }, [connectionId]);

  const connect = useCallback(
    async (params: MqttConnectParams) => {
      setError(null);
      setStatus("connecting");
      try {
        await mqttConnect(connectionId, params);
      } catch (err) {
        setError(String(err));
        setStatus("disconnected");
      }
    },
    [connectionId],
  );

  const disconnect = useCallback(async () => {
    try {
      await mqttDisconnect(connectionId);
      setStatus("disconnected");
      setSubscriptions([]);
    } catch (err) {
      setError(String(err));
    }
  }, [connectionId]);

  const subscribe = useCallback(
    async (topic: string, qos: number) => {
      try {
        await mqttSubscribe(connectionId, topic, qos);
        setSubscriptions((prev) =>
          prev.includes(topic) ? prev : [...prev, topic],
        );
      } catch (err) {
        setError(String(err));
      }
    },
    [connectionId],
  );

  const unsubscribe = useCallback((topic: string) => {
    setSubscriptions((prev) => prev.filter((t) => t !== topic));
  }, []);

  const publish = useCallback(
    async (topic: string, payload: string, qos: number, retain: boolean) => {
      try {
        await mqttPublish(connectionId, topic, payload, qos, retain);
        setMessages((prev) => [
          ...prev,
          {
            topic,
            payload,
            qos,
            retain,
            timestamp: new Date().toISOString(),
            direction: "sent",
          },
        ]);
      } catch (err) {
        setError(String(err));
      }
    },
    [connectionId],
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    status,
    messages,
    subscriptions,
    error,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    publish,
    clearMessages,
  };
}
