import type { HttpMethod, Tab } from "@apiark/types";

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: "bg-emerald-500/15 text-emerald-400",
  POST: "bg-amber-500/15 text-amber-400",
  PUT: "bg-blue-500/15 text-blue-400",
  PATCH: "bg-purple-500/15 text-purple-400",
  DELETE: "bg-red-500/15 text-red-400",
  HEAD: "bg-cyan-500/15 text-cyan-400",
  OPTIONS: "bg-gray-500/15 text-gray-400",
};

export function TabBadge({ tab }: { tab: Tab }) {
  const badges: Record<string, { bg: string; label: string }> = {
    graphql: { bg: "bg-violet-500/15 text-violet-400", label: "GQL" },
    websocket: { bg: "bg-cyan-500/15 text-cyan-400", label: "WS" },
    sse: { bg: "bg-orange-500/15 text-orange-400", label: "SSE" },
    grpc: { bg: "bg-emerald-500/15 text-emerald-400", label: "gRPC" },
    mqtt: { bg: "bg-purple-500/15 text-purple-400", label: "MQTT" },
    socketio: { bg: "bg-pink-500/15 text-pink-400", label: "SIO" },
  };

  if (tab.protocol !== "http") {
    const badge = badges[tab.protocol];
    return (
      <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${badge?.bg ?? ""}`}>
        {badge?.label ?? tab.protocol}
      </span>
    );
  }

  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${METHOD_COLORS[tab.method]}`}>
      {tab.method}
    </span>
  );
}
