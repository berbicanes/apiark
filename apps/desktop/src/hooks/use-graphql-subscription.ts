import { useEffect, useState, useCallback, useRef } from "react";
import type { WsMessage, WsStatus, KeyValuePair } from "@apiark/types";
import { wsConnect, wsSend, wsDisconnect } from "@/lib/tauri-api";

export interface GqlSubscriptionMessage {
  id: string;
  data: string;
  errors?: string;
  timestamp: string;
}

interface UseGraphQLSubscriptionReturn {
  status: "disconnected" | "connecting" | "connected" | "subscribed";
  messages: GqlSubscriptionMessage[];
  error: string | null;
  subscribe: (
    url: string,
    query: string,
    variables: string,
    operationName: string,
    headers: KeyValuePair[],
  ) => Promise<void>;
  unsubscribe: () => Promise<void>;
  clearMessages: () => void;
}

// graphql-ws protocol message types
const GQL_CONNECTION_INIT = "connection_init";
const GQL_CONNECTION_ACK = "connection_ack";
const GQL_SUBSCRIBE = "subscribe";
const GQL_NEXT = "next";
const GQL_ERROR = "error";
const GQL_COMPLETE = "complete";

let subIdCounter = 0;

export function useGraphQLSubscription(
  connectionId: string,
): UseGraphQLSubscriptionReturn {
  const [status, setStatus] = useState<
    "disconnected" | "connecting" | "connected" | "subscribed"
  >("disconnected");
  const [messages, setMessages] = useState<GqlSubscriptionMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const unlistenersRef = useRef<(() => void)[]>([]);
  const subscriptionIdRef = useRef<string | null>(null);
  const pendingSubscribeRef = useRef<{
    query: string;
    variables: string;
    operationName: string;
  } | null>(null);

  const handleMessage = useCallback((content: string) => {
    try {
      const msg = JSON.parse(content);
      switch (msg.type) {
        case GQL_CONNECTION_ACK:
          setStatus("connected");
          // If we have a pending subscription, send it now
          if (pendingSubscribeRef.current) {
            const { query, variables, operationName } =
              pendingSubscribeRef.current;
            pendingSubscribeRef.current = null;
            const subId = `sub_${++subIdCounter}`;
            subscriptionIdRef.current = subId;

            let varsObj = {};
            try {
              varsObj = variables ? JSON.parse(variables) : {};
            } catch {
              // ignore parse error
            }

            const subscribeMsg = JSON.stringify({
              id: subId,
              type: GQL_SUBSCRIBE,
              payload: {
                query,
                variables: varsObj,
                operationName: operationName || undefined,
              },
            });
            wsSend(connectionId, subscribeMsg).then(() => {
              setStatus("subscribed");
            });
          }
          break;

        case GQL_NEXT:
          if (msg.payload) {
            setMessages((prev) => [
              ...prev,
              {
                id: `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
                data: JSON.stringify(msg.payload.data, null, 2),
                errors: msg.payload.errors
                  ? JSON.stringify(msg.payload.errors, null, 2)
                  : undefined,
                timestamp: new Date().toISOString(),
              },
            ]);
          }
          break;

        case GQL_ERROR:
          setError(
            Array.isArray(msg.payload)
              ? msg.payload.map((e: { message?: string }) => e.message).join(", ")
              : JSON.stringify(msg.payload),
          );
          break;

        case GQL_COMPLETE:
          setStatus("connected");
          subscriptionIdRef.current = null;
          break;
      }
    } catch {
      // Not a JSON message, ignore
    }
  }, [connectionId]);

  useEffect(() => {
    let cancelled = false;

    const setup = async () => {
      try {
        const { listen } = await import("@tauri-apps/api/event");

        const unlistenStatus = await listen<WsStatus>(
          "ws:status",
          (event) => {
            if (cancelled || event.payload.connectionId !== connectionId)
              return;
            if (event.payload.state === "disconnected") {
              setStatus("disconnected");
              subscriptionIdRef.current = null;
              if (event.payload.error) setError(event.payload.error);
            }
          },
        );

        const unlistenMessage = await listen<WsMessage>(
          "ws:message",
          (event) => {
            if (cancelled || event.payload.connectionId !== connectionId)
              return;
            if (event.payload.direction === "received") {
              handleMessage(event.payload.content);
            }
          },
        );

        unlistenersRef.current = [unlistenStatus, unlistenMessage];
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
  }, [connectionId, handleMessage]);

  const subscribe = useCallback(
    async (
      url: string,
      query: string,
      variables: string,
      operationName: string,
      headers: KeyValuePair[],
    ) => {
      setError(null);
      setMessages([]);
      setStatus("connecting");

      // Convert HTTP URL to WebSocket URL
      let wsUrl = url.trim();
      if (wsUrl.startsWith("http://")) {
        wsUrl = "ws://" + wsUrl.slice(7);
      } else if (wsUrl.startsWith("https://")) {
        wsUrl = "wss://" + wsUrl.slice(8);
      } else if (!wsUrl.startsWith("ws://") && !wsUrl.startsWith("wss://")) {
        wsUrl = "ws://" + wsUrl;
      }

      // Store the subscription details to send after connection_ack
      pendingSubscribeRef.current = { query, variables, operationName };

      try {
        await wsConnect(connectionId, {
          url: wsUrl,
          headers,
          protocols: ["graphql-transport-ws"],
        });

        // Send connection_init
        await wsSend(
          connectionId,
          JSON.stringify({ type: GQL_CONNECTION_INIT }),
        );
      } catch (err) {
        setError(String(err));
        setStatus("disconnected");
      }
    },
    [connectionId],
  );

  const unsubscribe = useCallback(async () => {
    if (subscriptionIdRef.current) {
      try {
        await wsSend(
          connectionId,
          JSON.stringify({
            id: subscriptionIdRef.current,
            type: GQL_COMPLETE,
          }),
        );
      } catch {
        // ignore
      }
    }
    subscriptionIdRef.current = null;
    try {
      await wsDisconnect(connectionId);
    } catch {
      // ignore
    }
    setStatus("disconnected");
  }, [connectionId]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    status,
    messages,
    error,
    subscribe,
    unsubscribe,
    clearMessages,
  };
}
