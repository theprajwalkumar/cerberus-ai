"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const SUB_NAV = [
  { label: "Dashboard",   href: "/ai-gatekeeper",              icon: "⊞" },
  { label: "MCP Servers", href: "/ai-gatekeeper/mcp-servers",  icon: "🖥" },
  { label: "MCP Logs",    href: "/ai-gatekeeper/logs",         icon: "📝" },
  { label: "Policies",    href: "/ai-gatekeeper/policies",     icon: "🛡" },
  { label: "Red Teaming", href: "/ai-gatekeeper/red-teaming",  icon: "🔴" },
];

export function SubNav() {
  const pathname = usePathname();
  return (
    <div className="flex flex-wrap gap-1.5">
      {SUB_NAV.map(item => {
        const active = pathname === item.href;
        return (
          <Link key={item.href} href={item.href}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-all",
              active
                ? "bg-gradient-primary text-white shadow-sm"
                : "bg-card/40 text-muted-foreground border border-border/50 hover:text-foreground"
            )}
            style={active ? { boxShadow: "0 4px 16px rgba(59,124,244,0.3)" } : {}}
          >
            <span className="text-xs opacity-80">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
