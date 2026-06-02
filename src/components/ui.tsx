"use client";

import { ReactNode } from "react";
import Link from "next/link";

export function Card({ children, style = {}, onClick }: { children: ReactNode; style?: React.CSSProperties; onClick?: () => void }) {
  return <div onClick={onClick} style={{ background: "var(--color-bg-card, #111)", border: "1px solid var(--color-border, rgba(255,255,255,0.08))", borderRadius: 12, overflow: "hidden", cursor: onClick ? "pointer" : undefined, ...style }}>{children}</div>;
}

export function Table({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          {headers.map(h => <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.45)", letterSpacing: "0.06em", textTransform: "uppercase" }}>{h}</th>)}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}

export function Btn({ children, primary, outline, onClick, disabled, style = {} }: { children: ReactNode; primary?: boolean; outline?: boolean; onClick?: () => void; disabled?: boolean; style?: React.CSSProperties }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: "7px 16px", borderRadius: 50, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
      cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
      background: primary ? "#fff" : outline ? "transparent" : "rgba(255,255,255,0.07)",
      color: primary ? "#0a0a0a" : "#fff",
      border: primary ? "1px solid #fff" : outline ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(255,255,255,0.08)",
      transition: "all 0.2s",
      ...style,
    }}>{children}</button>
  );
}

const NAV_ITEMS = [
  { label: "Dashboard", href: "/ai-gatekeeper", icon: "⊞" },
  { label: "MCP Servers", href: "/ai-gatekeeper/mcp-servers", icon: "◈" },
  { label: "LLM Logs", href: "/ai-gatekeeper/logs", icon: "📋" },
  { label: "Policies", href: "/ai-gatekeeper/policies", icon: "🛡" },
  { label: "Red Teaming", href: "/ai-gatekeeper/red-teaming", icon: "⚔" },
  { label: "Settings", href: "/ai-gatekeeper/settings", icon: "⚙" },
];

export function Sidebar({ current }: { current: string }) {
  return (
    <aside style={{
      width: 220, background: "#0a0a0a", borderRight: "1px solid rgba(255,255,255,0.06)",
      display: "flex", flexDirection: "column", position: "fixed",
      top: 0, left: 0, height: "100vh", zIndex: 100
    }}>
      <div style={{ padding: "20px 20px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 30, height: 30, background: "#fff",
            borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
            color: "#0a0a0a", fontSize: 14, fontWeight: 800, fontFamily: "'Syne', sans-serif"
          }}>C</div>
          <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: "-0.3px", color: "#fff" }}>Cerberus</span>
        </div>
      </div>
      <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", padding: "4px 4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>prajwaltac@gmail.com</div>
      </div>
      <nav style={{ flex: 1, padding: "10px 12px", overflowY: "auto" }}>
        {NAV_ITEMS.map(item => {
          const active = current === item.href;
          return (
            <Link key={item.href} href={item.href}
              style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%",
                padding: "9px 12px", borderRadius: 8, border: "none",
                background: active ? "#fff" : "transparent",
                color: active ? "#0a0a0a" : "rgba(255,255,255,0.55)",
                fontWeight: active ? 600 : 500, fontSize: 13,
                cursor: "pointer", textDecoration: "none",
                transition: "all 0.15s",
                marginBottom: 2,
              }}
            >
              <span style={{ fontSize: 14 }}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export function PageLayout({ children, current, title, actions }: {
  children: ReactNode; current: string; title?: string; actions?: ReactNode;
}) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'DM Sans', 'Segoe UI', sans-serif", background: "#0a0a0a", color: "#fff" }}>
      <Sidebar current={current} />
      <main style={{ marginLeft: 220, flex: 1, minHeight: "100vh" }}>
        <div style={{ padding: "32px 36px", maxWidth: 1200 }}>
          {title && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, letterSpacing: "-0.5px", fontFamily: "'Syne', sans-serif" }}>{title}</h1>
              {actions && <div style={{ display: "flex", gap: 10 }}>{actions}</div>}
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}

export const td = { padding: "12px 16px", verticalAlign: "top" };
export const th = { padding: "10px 16px", textAlign: "left" as const, fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.45)", letterSpacing: "0.06em" as const, textTransform: "uppercase" as const };
