import { cn } from "@/lib/utils";

export type Risk = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

const statusStyles: Record<string, string> = {
  COMPLETED: "bg-success/15 text-success border-success/30",
  RUNNING: "bg-primary/15 text-primary border-primary/30",
  PENDING: "bg-warning/15 text-warning border-warning/30",
  FAILED: "bg-destructive/15 text-destructive border-destructive/30",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide border", statusStyles[status] || "bg-muted/30 text-muted-foreground border-border")}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

export function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    initialize: "bg-[#7c3aed]/15 text-[#7c3aed] border-[#7c3aed]/30",
    "tools/list": "bg-[#059669]/15 text-[#059669] border-[#059669]/30",
    "tools/call": "bg-primary/15 text-primary border-primary/30",
    ping: "bg-[#d97706]/15 text-[#d97706] border-[#d97706]/30",
    "notifications/": "bg-[#0891b2]/15 text-[#0891b2] border-[#0891b2]/30",
  };
  return (
    <span className={cn("inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-semibold border", colors[method] || "bg-muted/30 text-muted-foreground border-border")}>
      {method}
    </span>
  );
}

export function ClientBadge({ client }: { client?: string }) {
  if (!client) return null;
  const c = client.toLowerCase();
  let label: string;
  let color: string;
  if (c.includes("gpt") || c.includes("chatgpt") || c.includes("openai")) { label = "🤖 OpenAI"; color = "text-success border-success/40 bg-success/10"; }
  else if (c.includes("claude") || c.includes("anthropic")) { label = "🟣 Claude"; color = "text-[#a78bfa] border-[#a78bfa]/40 bg-[#a78bfa]/10"; }
  else { label = client; color = "text-muted-foreground border-border bg-muted/20"; }
  return <span className={cn("inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-semibold border", color)}>{label}</span>;
}

export function RiskBadge({ risk }: { risk: Risk }) {
  const colors: Record<string, string> = {
    CRITICAL: "bg-destructive/15 text-destructive border-destructive/30",
    HIGH: "bg-warning/15 text-warning border-warning/30",
    MEDIUM: "bg-success/15 text-success border-success/30",
    LOW: "bg-muted/30 text-muted-foreground border-border",
  };
  return <span className={cn("inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-semibold border", colors[risk])}>{risk}</span>;
}

export function FrameworkBadge({ framework }: { framework: string }) {
  const fw = framework.toLowerCase();
  return (
    <span className={cn("inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-semibold border", fw.includes("mitre") ? "bg-destructive/15 text-destructive border-destructive/30" : "bg-primary/15 text-primary border-primary/30")}>
      {fw.includes("mitre") ? "MITRE" : "OWASP"}
    </span>
  );
}

export function TypeBadge({ type }: { type: string }) {
  return <span className="inline-flex rounded border border-border bg-muted/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">{type}</span>;
}
