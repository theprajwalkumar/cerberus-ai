"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const SUB_NAV = [
  { label: "Dashboard",   href: "/ai-gatekeeper" },
  { label: "MCP Servers", href: "/ai-gatekeeper/mcp-servers" },
  { label: "LLM Logs",    href: "/ai-gatekeeper/logs" },
  { label: "Client Tokens", href: "/ai-gatekeeper/client-tokens" },
  { label: "Policies",    href: "/ai-gatekeeper/policies" },
  { label: "Red Teaming", href: "/ai-gatekeeper/red-teaming" },
  { label: "Settings",    href: "/ai-gatekeeper/settings" },
];

export function AiSubNav() {
  const pathname = usePathname();
  return (
    <div className="flex flex-wrap gap-1.5 pb-4 mb-5 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
      {SUB_NAV.map(item => {
        const active = pathname === item.href;
        return (
          <Link key={item.href} href={item.href}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-all"
            )}
            style={{
              background: active ? "#fff" : "transparent",
              color: active ? "#0a0a0a" : "rgba(255,255,255,0.55)",
              border: active ? "1px solid #fff" : "1px solid rgba(255,255,255,0.06)",
              fontWeight: active ? 600 : 400,
            }}>
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

export function ThemeToggle() {
  const [theme, setTheme] = useState("dark");
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") {
      root.style.setProperty("--bg-page", "#f0f2f8");
      root.style.setProperty("--bg-card", "#ffffff");
    } else {
      root.style.setProperty("--bg-page", "#0a0a0a");
      root.style.setProperty("--bg-card", "#111111");
      root.style.setProperty("--bg-card-hover", "#1a1a1a");
      root.style.setProperty("--bg-surface", "#111111");
      root.style.setProperty("--bg-elevated", "#1a1a1a");
      root.style.setProperty("--border", "rgba(255,255,255,0.08)");
      root.style.setProperty("--border-light", "rgba(255,255,255,0.05)");
      root.style.setProperty("--text-primary", "#ffffff");
      root.style.setProperty("--text-secondary", "rgba(255,255,255,0.7)");
      root.style.setProperty("--text-muted", "rgba(255,255,255,0.45)");
      root.style.setProperty("--glass-bg", "#111111");
      root.style.setProperty("--glass-border", "rgba(255,255,255,0.08)");
      root.style.setProperty("--glass-shadow", "0 8px 32px rgba(0,0,0,0.5)");
      root.style.setProperty("--color-text-muted", "rgba(255,255,255,0.45)");
      root.style.setProperty("--color-text-secondary", "rgba(255,255,255,0.7)");
      root.style.setProperty("--color-foreground", "#ffffff");
    }
  }, [theme]);
  return (
    <button onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}
      className="flex h-8 w-8 items-center justify-center rounded-lg transition"
      style={{
        background: "#111",
        border: "1px solid rgba(255,255,255,0.08)",
        color: "rgba(255,255,255,0.55)",
      }}>
      {theme === "dark" ? "☀" : "🌙"}
    </button>
  );
}
