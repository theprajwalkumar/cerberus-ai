"use client";
import type { ReactNode } from "react";

const NGROK_VARS: Record<string, string> = {
  "--bg-page": "#0a0a0a",
  "--bg-card": "#111111",
  "--bg-card-hover": "#1a1a1a",
  "--bg-surface": "#111111",
  "--bg-elevated": "#1a1a1a",
  "--border": "rgba(255,255,255,0.08)",
  "--border-light": "rgba(255,255,255,0.05)",
  "--glass-bg": "#111111",
  "--glass-border": "rgba(255,255,255,0.08)",
  "--glass-shadow": "0 8px 32px rgba(0,0,0,0.5)",
  "--color-bg-page": "#0a0a0a",
  "--color-bg-card": "#111111",
  "--color-bg-card-hover": "#1a1a1a",
  "--color-bg-surface": "#111111",
  "--color-bg-elevated": "#1a1a1a",
  "--color-text-primary": "#ffffff",
  "--color-text-secondary": "rgba(255,255,255,0.7)",
  "--color-text-muted": "rgba(255,255,255,0.45)",
  "--color-foreground": "#ffffff",
  "--color-muted": "rgba(255,255,255,0.05)",
  "--color-muted-foreground": "rgba(255,255,255,0.55)",
  "--color-border": "rgba(255,255,255,0.08)",
  "--color-background": "#0a0a0a",
  "--color-card": "#111111",
  "--color-card-foreground": "#ffffff",
  "--color-primary": "#ffffff",
  "--color-primary-foreground": "#0a0a0a",
  "--color-destructive": "#f87171",
  "--color-success": "#34d399",
  "--color-warning": "#fbbf24",
  "--color-accent-blue": "#3b7cf4",
  "--color-accent-cyan": "#00d4c8",
  "--color-accent-purple": "#a78bfa",
  "--color-accent-green": "#34d399",
  "--color-accent-red": "#f87171",
  "--color-accent-amber": "#fbbf24",
  "--color-accent-yellow": "#d4f000",
  "--color-accent-pink": "#ff6eb4",
};

export function LightTheme({ children }: { children: ReactNode }) {
  return (
    <div style={NGROK_VARS as React.CSSProperties}>
      {children}
    </div>
  );
}
