import {
  FolderOpen,
  Globe,
  Clock,
  Settings,
  Sparkles,
  Terminal,
  Server,
  FileText,
  Activity,
} from "lucide-react";

export type ActivityView = "collections" | "environments" | "history" | "mock" | "monitor" | "docs";

interface ActivityBarProps {
  activeView: ActivityView;
  onViewChange: (view: ActivityView) => void;
  onOpenSettings: () => void;
  onOpenAi: () => void;
  onToggleConsole: () => void;
}

const TOP_ITEMS: { id: ActivityView; icon: typeof FolderOpen; label: string }[] = [
  { id: "collections", icon: FolderOpen, label: "Collections" },
  { id: "environments", icon: Globe, label: "Environments" },
  { id: "history", icon: Clock, label: "History" },
];

const BOTTOM_ITEMS: { id: ActivityView; icon: typeof Server; label: string }[] = [
  { id: "mock", icon: Server, label: "Mock Servers" },
  { id: "monitor", icon: Activity, label: "Monitors" },
  { id: "docs", icon: FileText, label: "API Docs" },
];

export function ActivityBar({
  activeView,
  onViewChange,
  onOpenSettings,
  onOpenAi,
  onToggleConsole,
}: ActivityBarProps) {
  return (
    <div className="flex w-12 shrink-0 flex-col items-center border-r border-[var(--color-border)] bg-[var(--color-activity-bar)] py-3">
      {/* Logo */}
      <div className="mb-4 flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-accent)]">
        <span className="text-xs font-black text-white">A</span>
      </div>

      {/* Top nav items */}
      <div className="flex flex-col items-center gap-1">
        {TOP_ITEMS.map((item) => (
          <ActivityBarButton
            key={item.id}
            icon={item.icon}
            label={item.label}
            active={activeView === item.id}
            onClick={() => onViewChange(item.id)}
          />
        ))}
      </div>

      <div className="mx-auto my-3 h-px w-6 bg-[var(--color-border)]" />

      {/* Bottom nav items */}
      <div className="flex flex-col items-center gap-1">
        {BOTTOM_ITEMS.map((item) => (
          <ActivityBarButton
            key={item.id}
            icon={item.icon}
            label={item.label}
            active={activeView === item.id}
            onClick={() => onViewChange(item.id)}
          />
        ))}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom actions */}
      <div className="flex flex-col items-center gap-1">
        <ActivityBarButton icon={Sparkles} label="AI Assistant (Ctrl+Shift+A)" onClick={onOpenAi} />
        <ActivityBarButton icon={Terminal} label="Console (Ctrl+`)" onClick={onToggleConsole} />
        <ActivityBarButton icon={Settings} label="Settings (Ctrl+,)" onClick={onOpenSettings} />
      </div>
    </div>
  );
}

function ActivityBarButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof FolderOpen;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`relative flex h-9 w-9 items-center justify-center rounded-lg transition-all ${
        active
          ? "bg-[var(--color-accent-glow)] text-[var(--color-accent)]"
          : "text-[var(--color-text-muted)] hover:bg-[var(--color-elevated)] hover:text-[var(--color-text-secondary)]"
      }`}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-r bg-[var(--color-accent)]" />
      )}
      <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2 : 1.5} />
    </button>
  );
}
