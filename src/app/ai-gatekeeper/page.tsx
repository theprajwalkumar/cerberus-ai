"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { Server, FileText, Shield, Ban, Plus, ArrowRight, Crosshair, MessageSquare, Bot, Activity } from "lucide-react";
import { BarChart, Bar, XAxis, ResponsiveContainer, Cell, Tooltip, Legend } from "recharts";
import { PageLayout } from "@/components/ui";
import { StatCard } from "@/components/gatekeeper/stat-card";
import { StatusBadge, TypeBadge, MethodBadge } from "@/components/gatekeeper/badges";
import { cn } from "@/lib/utils";
import { LightTheme } from "@/components/gatekeeper/light-theme";
import { AiSubNav } from "@/components/ai-gatekeeper";

const periods = ["1h", "6h", "24h", "7d", "30d"] as const;

function useTelemetry(period: string) {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    fetch(`/api/ai/telemetry?period=${period}`)
      .then(r => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, [period]);
  return data;
}

export default function AiGatekeeperDashboard() {
  const [period, setPeriod] = useState<(typeof periods)[number]>("24h");
  const [stats, setStats] = useState({ servers: 0, totalLogs: 0, mcpLogs: 0, bridgeLogs: 0, policies: 0, blocked: 0 });
  const [recentMcp, setRecentMcp] = useState<any[]>([]);
  const [recentBridge, setRecentBridge] = useState<any[]>([]);
  const [servers, setServers] = useState<any[]>([]);
  const telemetry = useTelemetry(period);

  useEffect(() => {
    Promise.all([
      fetch("/api/ai/mcp-servers").then(r => r.json()),
      fetch("/api/ai/mcp-logs?limit=10").then(r => r.json()),
      fetch("/api/ai/policies").then(r => r.json()),
      fetch("/api/ai/bridge-logs?limit=10").then(r => r.json()),
    ]).then(([s, mcpLogs, p, bridgeLogs]) => {
      setServers(s);
      setRecentMcp(mcpLogs.logs || []);
      setRecentBridge(bridgeLogs.logs || []);
      const mcpTotal = mcpLogs.total || 0;
      const bridgeTotal = bridgeLogs.total || 0;
      setStats({
        servers: s.length,
        totalLogs: mcpTotal + bridgeTotal,
        mcpLogs: mcpTotal,
        bridgeLogs: bridgeTotal,
        policies: p.length,
        blocked: (mcpLogs.logs || []).filter((x: any) => x.status === "blocked").length,
      });
    });
  }, []);

  const chartData = telemetry?.hourly || [];

  return (
    <LightTheme><PageLayout current="/ai-gatekeeper" title="AI GateKeeper"
      actions={
        <Link href="/ai-gatekeeper/mcp-servers"
          className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-5 py-2.5 text-xs font-bold uppercase tracking-wider shadow-lg transition hover:opacity-85"
          style={{ boxShadow: "0 4px 20px rgba(255,255,255,0.1)" }}>
          <Plus className="h-4 w-4" /> Add MCP Server
        </Link>
      }>
      <div className="space-y-6">
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          Enterprise AI gateway — monitor, log, police, and red-team every AI interaction across MCP servers and ChatGPT bridge.
        </p>

        <AiSubNav />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard icon={<Server className="h-4 w-4" />} label="MCP Servers" value={stats.servers} accent="blue" />
          <StatCard icon={<Bot className="h-4 w-4" />} label="MCP Requests" value={stats.mcpLogs} accent="cyan" />
          <StatCard icon={<MessageSquare className="h-4 w-4" />} label="Bridge Requests" value={stats.bridgeLogs} accent="green" />
          <StatCard icon={<Shield className="h-4 w-4" />} label="AI Policies" value={stats.policies} accent="purple" />
          <StatCard icon={<Ban className="h-4 w-4" />} label="Blocked" value={stats.blocked} accent="red" />
        </div>

        <div className="glass rounded-2xl p-6 shadow-elegant">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold" style={{ color: "var(--color-foreground)" }}>Telemetry & Usage</h2>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>MCP + Bridge traffic over {period}.</p>
            </div>
            <div className="flex rounded-lg border p-0.5" style={{ borderColor: "var(--color-border)", background: "rgba(255,255,255,0.03)" }}>
              {periods.map((p) => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={cn("rounded-md px-3 py-1 text-xs font-semibold transition", period === p ? "text-white shadow" : "hover:text-white/80")}
                  style={period === p ? { background: "#fff", color: "#0a0a0a" } : { color: "var(--color-text-muted)" }}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          {telemetry ? (
            <>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {[
                  { label: "Total Requests", value: telemetry.summary?.totalRequests?.toLocaleString() || "—" },
                  { label: "MCP Requests", value: telemetry.summary?.mcpRequests?.toLocaleString() || "—" },
                  { label: "Bridge Requests", value: telemetry.summary?.bridgeRequests?.toLocaleString() || "—" },
                  { label: "Success Rate", value: telemetry.summary ? `${telemetry.summary.successRate}%` : "—" },
                  { label: "Blocked", value: telemetry.summary?.blockedCount?.toLocaleString() || "—" },
                  { label: "Avg Response", value: telemetry.summary ? `${telemetry.summary.avgResponseTime} ms` : "—" },
                ].map((m) => (
                  <div key={m.label} className="rounded-lg border p-3" style={{ borderColor: "var(--color-border)", background: "var(--color-bg-surface)" }}>
                    <div className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>{m.label}</div>
                    <div className="mt-1 font-display text-xl font-semibold" style={{ color: "var(--color-foreground)" }}>{m.value}</div>
                  </div>
                ))}
              </div>

              <div className="mt-5 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <defs>
                      <linearGradient id="mcpBar" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#00d4c8" />
                        <stop offset="100%" stopColor="#00d4c8" />
                      </linearGradient>
                      <linearGradient id="bridgeBar" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ff6eb4" />
                        <stop offset="100%" stopColor="#ff6eb4" />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="hour" stroke="var(--color-text-muted)" fontSize={10} interval={2} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: "rgba(59,124,244,0.08)" }}
                      contentStyle={{ background: "var(--color-bg-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12, color: "var(--color-foreground)" }}
                      labelStyle={{ color: "var(--color-text-muted)" }} />
                    <Legend wrapperStyle={{ fontSize: 11, color: "var(--color-text-muted)" }} />
                    <Bar dataKey="mcp" name="MCP" radius={[4, 4, 0, 0]} animationDuration={900} fill="url(#mcpBar)" stackId="a" />
                    <Bar dataKey="bridge" name="Bridge" radius={[4, 4, 0, 0]} animationDuration={900} fill="url(#bridgeBar)" stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <div className="mt-8 text-center" style={{ color: "var(--color-text-muted)" }}>
              <div className="text-3xl opacity-30 mb-2">📊</div>
              <div className="text-sm">Send requests through MCP or bridge to see telemetry.</div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="glass rounded-2xl p-5 shadow-elegant">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-semibold" style={{ color: "var(--color-foreground)" }}>Connected MCP Servers</h2>
              <Link href="/ai-gatekeeper/mcp-servers" className="inline-flex items-center gap-1 text-xs font-semibold hover:underline" style={{ color: "var(--color-primary)" }}>
                View All <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="mt-3 divide-y" style={{ borderColor: "var(--color-border)" }}>
              {servers.length === 0 ? (
                <div className="py-8 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
                  No MCP servers connected yet. <Link href="/ai-gatekeeper/mcp-servers" style={{ color: "var(--color-primary)" }}>Add one →</Link>
                </div>
              ) : servers.slice(0, 5).map((s: any) => (
                <div key={s.id} className="flex items-center justify-between py-2.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className={cn("h-2 w-2 shrink-0 rounded-full", s.status === "connected" && "bg-[#34d399]", s.status === "error" && "bg-[#f87171]", s.status !== "connected" && s.status !== "error" && "bg-[#fbbf24]")} />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold" style={{ color: "var(--color-foreground)" }}>{s.name}</div>
                      <div className="truncate font-mono text-[11px]" style={{ color: "var(--color-text-muted)" }}>{s.url}</div>
                    </div>
                  </div>
                  <TypeBadge type={s.type} />
                </div>
              ))}
            </div>
          </div>

          <div className="glass rounded-2xl p-5 shadow-elegant">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-semibold" style={{ color: "var(--color-foreground)" }}>Recent MCP Logs</h2>
              <Link href="/ai-gatekeeper/logs" className="inline-flex items-center gap-1 text-xs font-semibold hover:underline" style={{ color: "var(--color-primary)" }}>
                View All <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="mt-3 divide-y" style={{ borderColor: "var(--color-border)" }}>
              {recentMcp.length === 0 ? (
                <div className="py-8 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
                  No MCP logs yet.
                </div>
              ) : recentMcp.slice(0, 5).map((l: any) => {
                let method = "?";
                try { const p = JSON.parse(l.request); method = p.method || "?"; } catch {}
                return (
                  <div key={l.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <div className="truncate text-sm">
                        <span className="font-semibold" style={{ color: "var(--color-primary)" }}>{l.server?.name || "Unknown"}</span>
                        <span style={{ color: "var(--color-text-muted)" }}> — </span>
                        <span className="font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>{method}</span>
                      </div>
                      <div className="mt-0.5 text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                        {new Date(l.createdAt).toLocaleTimeString()} · {l.duration ? `${l.duration}ms` : "—"}
                      </div>
                    </div>
                    <StatusBadge status={l.status === "success" ? "COMPLETED" : l.status === "blocked" || l.status === "error" ? "FAILED" : "PENDING"} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="glass rounded-2xl p-5 shadow-elegant">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" style={{ color: "#34d399" }} />
              <h2 className="font-display font-semibold" style={{ color: "var(--color-foreground)" }}>Recent Bridge Logs</h2>
            </div>
            <Link href="/ai-gatekeeper/logs" className="inline-flex items-center gap-1 text-xs font-semibold hover:underline" style={{ color: "var(--color-primary)" }}>
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="mt-3 divide-y" style={{ borderColor: "var(--color-border)" }}>
            {recentBridge.length === 0 ? (
              <div className="py-8 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
                No bridge logs yet. Use the ChatGPT browser extension.
              </div>
            ) : recentBridge.slice(0, 5).map((l: any) => (
              <div key={l.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <div className="truncate text-sm">
                    <MethodBadge method={l.method || "GET"} />
                    <span className="ml-2 font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>
                      {l.url ? (l.url.length > 50 ? l.url.slice(0, 50) + "..." : l.url) : "—"}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                    {l.createdAt ? new Date(l.createdAt).toLocaleTimeString() : ""} · {l.durationMs ? `${l.durationMs}ms` : "—"}
                  </div>
                </div>
                <StatusBadge status={l.status === 200 ? "COMPLETED" : l.status >= 400 ? "FAILED" : "PENDING"} />
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Link href="/ai-gatekeeper/policies" className="group glass rounded-2xl p-5 shadow-elegant transition hover:shadow-glow" style={{ cursor: "pointer" }}>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg ring-1" style={{ background: "rgba(167,139,250,0.12)", color: "#a78bfa", borderColor: "rgba(167,139,250,0.25)" }}>
                <Shield className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-display font-semibold" style={{ color: "var(--color-foreground)" }}>AI Policies</h3>
                <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>Block keywords, limit tokens, enforce safety rules across all AI interactions.</p>
              </div>
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" style={{ color: "var(--color-text-muted)" }} />
            </div>
          </Link>
          <Link href="/ai-gatekeeper/red-teaming" className="group glass rounded-2xl p-5 shadow-elegant transition hover:shadow-glow" style={{ cursor: "pointer" }}>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg ring-1" style={{ background: "rgba(248,113,113,0.12)", color: "#f87171", borderColor: "rgba(248,113,113,0.25)" }}>
                <Crosshair className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-display font-semibold" style={{ color: "var(--color-foreground)" }}>Red Teaming</h3>
                <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>Test against OWASP Top 10 & MITRE ATLAS. Automated risk analysis on responses.</p>
              </div>
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1 group-hover:text-[#f87171]" style={{ color: "var(--color-text-muted)" }} />
            </div>
          </Link>
        </div>
      </div>
    </PageLayout></LightTheme>
  );
}
