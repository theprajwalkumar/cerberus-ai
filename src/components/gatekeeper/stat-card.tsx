import { type ReactNode } from "react";

const accentMap: Record<string, { bg: string; ring: string; bar: string }> = {
  blue: { bg: "bg-[oklch(0.65_0.2_258_/_0.12)]", ring: "ring-[oklch(0.65_0.2_258_/_0.25)]", bar: "from-[#3b7cf4]" },
  green: { bg: "bg-[oklch(0.65_0.2_158_/_0.12)]", ring: "ring-[oklch(0.65_0.2_158_/_0.25)]", bar: "from-[#34d399]" },
  purple: { bg: "bg-[oklch(0.65_0.24_290_/_0.12)]", ring: "ring-[oklch(0.65_0.24_290_/_0.25)]", bar: "from-[#a78bfa]" },
  red: { bg: "bg-[oklch(0.65_0.22_25_/_0.12)]", ring: "ring-[oklch(0.65_0.22_25_/_0.25)]", bar: "from-[#f87171]" },
};

export function StatCard({ icon, label, value, accent = "blue" }: { icon: ReactNode; label: string; value: number | string; accent?: string }) {
  const a = accentMap[accent] || accentMap.blue;
  const accentColor = accent === "blue" ? "#3b7cf4" : accent === "green" ? "#34d399" : accent === "purple" ? "#a78bfa" : "#f87171";
  return (
    <div className="glass relative overflow-hidden p-5 shadow-elegant">
      <div className="absolute -right-6 -top-6 text-5xl opacity-[0.04] pointer-events-none select-none">{typeof icon === "string" ? icon : null}</div>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium tracking-wide text-muted-foreground">{label}</div>
          <div className="mt-1.5 font-display text-3xl font-bold" style={{ color: accentColor }}>{value}</div>
        </div>
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${a.bg} ring-1 ${a.ring}`} style={{ color: accentColor }}>
          {icon}
        </div>
      </div>
      <div className={`mt-4 h-[2px] rounded-full bg-gradient-to-r ${a.bar} to-transparent`} />
    </div>
  );
}
