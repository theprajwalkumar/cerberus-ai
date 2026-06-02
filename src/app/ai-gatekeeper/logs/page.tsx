"use client";
import { useState, useEffect, useRef } from "react";
import { Copy, RefreshCw, Circle, Globe, Server, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { PageLayout } from "@/components/ui";
import { StatusBadge, MethodBadge, ClientBadge } from "@/components/gatekeeper/badges";
import { CodeBlock } from "@/components/gatekeeper/code-block";
import { LightTheme } from "@/components/gatekeeper/light-theme";
import { AiSubNav } from "@/components/ai-gatekeeper";
import { cn } from "@/lib/utils";

type Tab = "mcp" | "bridge";

function getBridgeAction(log: any): string {
  const url = (log.url || "").toLowerCase();
  const m = log.method;
  if (url.includes("/backend-api/conversation/") && m === "POST") return "Send Message";
  if (url.includes("/backend-api/conversation/") && m === "PATCH") return "Edit Message";
  if (url.includes("/backend-api/conversation/") && m === "GET") return "Get Conversation";
  if (url.includes("/backend-api/conversations") && m === "GET") return "List Conversations";
  if (url.includes("/backend-api/conversations") && m === "POST") return "Create Conversation";
  if (url.includes("/backend-api/models")) return "List Models";
  if (url.includes("/backend-api/accounts/check")) return "Check Account";
  if (url.includes("/backend-api/sentinel/chat-requirements")) return "Chat Requirements";
  if (url.includes("/backend-api/moderations")) return "Moderate";
  if (url.includes("/backend-api/files")) return "File Upload";
  if (url.includes("claude.ai/api/organizations/") && url.includes("/completion")) return "Send Message";
  if (url.includes("claude.ai/api/organizations/")) return "Claude API";
  return "API Call";
}

function getBridgeStatus(code: number): string {
  if (code >= 200 && code < 300) return "COMPLETED";
  if (code >= 400) return "FAILED";
  return "COMPLETED";
}

const methodColors: Record<string, string> = {
  POST: "bg-[#059669]/15 text-[#059669] border-[#059669]/30",
  GET: "bg-[#3b7cf4]/15 text-[#3b7cf4] border-[#3b7cf4]/30",
  PATCH: "bg-[#d97706]/15 text-[#d97706] border-[#d97706]/30",
  DELETE: "bg-destructive/15 text-destructive border-destructive/30",
};

function HttpMethodBadge({ method }: { method: string }) {
  return (
    <span className={cn("inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-semibold border", methodColors[method] || "bg-muted/30 text-muted-foreground border-border")}>
      {method}
    </span>
  );
}

function getAtPath(obj: any, pointer: string): any {
  if (!pointer) return obj;
  return pointer.split("/").slice(1).reduce((cur, k) => cur?.[k], obj);
}

function setAtPath(obj: any, pointer: string, value: any) {
  if (!pointer) { Object.assign(obj, value); return; }
  const keys = pointer.split("/").slice(1);
  const last = keys.pop()!;
  const target = keys.reduce((cur, k) => { if (!(k in cur)) cur[k] = {}; return cur[k]; }, obj);
  target[last] = value;
}

function applyDelta(state: any, delta: any) {
  if (delta.type) return;
  const path = delta.p;
  const op = delta.o;
  const val = delta.v;
  if (path === undefined || op === undefined) return;

  if (op === "add" || op === "replace") {
    if (path === "") {
      Object.assign(state, val);
    } else {
      setAtPath(state, path, val);
    }
  } else if (op === "append") {
    const existing = getAtPath(state, path);
    const current = typeof existing === "string" ? existing : "";
    setAtPath(state, path, current + (typeof val === "string" ? val : ""));
  }
}

function parseSSEResponse(raw: string): string {
  if (!raw) return raw;
  const lines = raw.split("\n");
  const state: any = {};

  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].startsWith("data: ")) continue;
    const json = lines[i].slice(6).trim();
    if (!json || json === "[DONE]") continue;
    try {
      const obj = JSON.parse(json);
      if (Array.isArray(obj.v)) {
        for (const sub of obj.v) applyDelta(state, sub);
      } else {
        applyDelta(state, obj);
      }
    } catch {}
  }

  function extractText(obj: any): string {
    if (typeof obj === "string") return obj;
    if (Array.isArray(obj)) return obj.map(extractText).join("");
    if (typeof obj === "object" && obj !== null) {
      const vals = Object.values(obj).filter(v => typeof v === "string" || typeof v === "object");
      if (vals.length > 0) return vals.map(extractText).join("");
    }
    return "";
  }

  const parts = getAtPath(state, "/message/content/parts");
  let text = "";
  if (Array.isArray(parts)) {
    text = parts.join("");
  } else if (typeof parts === "object" && parts !== null) {
    text = extractText(parts);
  } else {
    const content = getAtPath(state, "/message/content");
    if (typeof content === "object" && content !== null) {
      text = extractText(content);
    }
  }

  if (text) {
    text = text.replace(/\ue200[^]*?\ue201/g, "");
    text = text.replace(/\ue202[^]*?\ue201/g, "");
    text = text.replace(/[\ue200-\ue203]/g, "");
    text = text.replace(/\s*\ue202[^}]*\}\s*/g, "");
    return text.replace(/\s+/g, " ").trim();
  }
  return raw;
}

function getMessagePreview(log: any): string {
  try {
    const req = JSON.parse(log.request || "{}");
    const msgs = req.messages || req.history || [];
    if (msgs.length > 0) {
      const last = msgs[msgs.length - 1];
      const t = typeof last.content === "string" ? last.content : typeof last === "string" ? last : JSON.stringify(last);
      return t.substring(0, 90);
    }
    if (req.prompt) return req.prompt.substring(0, 90);
    if (req.messages) {
      const last = req.messages[req.messages.length - 1];
      const t = typeof last.content === "string" ? last.content : typeof last === "string" ? last : "";
      return t.substring(0, 90);
    }
  } catch {}
  return "";
}

const actionColors: Record<string, string> = {
  "Send Message": "bg-primary/15 text-primary border-primary/30",
  "Edit Message": "bg-[#d97706]/15 text-[#d97706] border-[#d97706]/30",
  "Create Conversation": "bg-[#7c3aed]/15 text-[#7c3aed] border-[#7c3aed]/30",
  "List Conversations": "bg-[#0891b2]/15 text-[#0891b2] border-[#0891b2]/30",
  "List Models": "bg-[#059669]/15 text-[#059669] border-[#059669]/30",
  "Check Account": "bg-[#0ea5e9]/15 text-[#0ea5e9] border-[#0ea5e9]/30",
  "Chat Requirements": "bg-[#f59e0b]/15 text-[#f59e0b] border-[#f59e0b]/30",
  Moderate: "bg-destructive/15 text-destructive border-destructive/30",
};

function parseMcpRequest(raw: string): { method: string; toolName: string; query: string } {
  try {
    const parsed = JSON.parse(raw);
    const method = parsed.method || "?";
    let toolName = "";
    let query = "";
    if (method === "tools/call") {
      toolName = parsed.params?.name || parsed.toolName || "";
      const args = parsed.params?.arguments || parsed.params || parsed.args || {};
      query = Object.values(args).filter(v => typeof v === "string").join(", ").substring(0, 80);
    } else if (method === "initialize") {
      query = "Handshake";
    }
    return { method, toolName, query };
  } catch {
    return { method: "?", toolName: "", query: raw.substring(0, 60) };
  }
}

function formatJson(raw: string | null | undefined): string {
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return raw;
  }
}

function truncate(s: string, n: number) {
  return s.length > n ? s.substring(0, n) + "..." : s;
}

export default function LogsPage() {
  const [tab, setTab] = useState<Tab>("mcp");
  const [mcpLogs, setMcpLogs] = useState<any[]>([]);
  const [bridgeLogs, setBridgeLogs] = useState<any[]>([]);
  const [bridgeTotal, setBridgeTotal] = useState(0);
  const [bridgeHasMore, setBridgeHasMore] = useState(false);
  const [bridgeOffset, setBridgeOffset] = useState(0);
  const [servers, setServers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterServer, setFilterServer] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [bridgeSource, setBridgeSource] = useState("all");
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fetchLogsRef = useRef<typeof fetchLogs | null>(null);

  const BRIDGE_LIMIT = 200;
  const MCP_LIMIT = 500;

  const fetchLogs = async (append = false) => {
    try {
      if (tab === "mcp") {
        const params = new URLSearchParams();
        if (filterServer) params.set("serverId", filterServer);
        if (filterStatus) params.set("status", filterStatus);
        params.set("limit", String(MCP_LIMIT));
        const res = await fetch(`/api/ai/mcp-logs?${params}`);
        if (!res.ok) { setMcpLogs([]); setLoading(false); return; }
        const data = await res.json();
        setMcpLogs(data.logs || []);
      } else {
        const offset = append ? bridgeOffset : 0;
        const sourceParam = bridgeSource !== "all" ? `&source=${bridgeSource}` : "";
        const res = await fetch(`/api/ai/bridge-logs?limit=${BRIDGE_LIMIT}&offset=${offset}${sourceParam}`);
        if (!res.ok) { setBridgeLogs([]); setLoading(false); return; }
        const data = await res.json();
        setBridgeLogs(prev => append ? [...prev, ...(data.logs || [])] : (data.logs || []));
        setBridgeTotal(data.total || 0);
        setBridgeHasMore(data.hasMore || false);
        setBridgeOffset(offset + (data.logs || []).length);
      }
    } catch (e) {
      console.warn("fetchLogs error:", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
    if (tab === "mcp") {
      fetch("/api/ai/mcp-servers").then(r => r.json()).then(setServers);
    }
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [tab]);

  fetchLogsRef.current = fetchLogs;

  useEffect(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    if (!selectedLog) {
      pollingRef.current = setInterval(() => {
        if (fetchLogsRef.current) fetchLogsRef.current(false);
      }, 10000);
    }
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [tab, selectedLog]);

  useEffect(() => {
    if (tab === "bridge") { fetchLogs(); }
    if (tab === "mcp") { fetchLogs(); }
  }, [filterServer, filterStatus, bridgeSource]);

  function copyText(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  }

  const logs = tab === "mcp" ? mcpLogs : bridgeLogs;

  return (
    <LightTheme><PageLayout current="/ai-gatekeeper/logs" title="LLM Logs">
      <div className="space-y-5">
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          All LLM traffic captured across MCP servers and browser conversations.
        </p>
        <AiSubNav />

        {/* Tab selector */}
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg p-0.5 gap-0.5" style={{ background: "var(--glass-bg)", border: "1px solid var(--border-light)" }}>
            {([{ id: "mcp", label: "MCP Logs", icon: Server }, { id: "bridge", label: "Bridge Logs", icon: Globe }] as const).map(t => (
              <button key={t.id} onClick={() => { setTab(t.id); setSelectedLog(null); }}
                className={cn("inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer", tab === t.id ? "text-white shadow" : "hover:text-white/80")}
                style={tab === t.id ? { background: "#fff", color: "#0a0a0a" } : { color: "var(--color-text-secondary)" }}>
                <t.icon className="h-3.5 w-3.5" /> {t.label}
              </button>
            ))}
          </div>
          <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            {tab === "bridge" ? `${bridgeTotal} total` : `${logs.length} log${logs.length !== 1 ? "s" : ""}`}
          </div>
        </div>

        {/* Filters (MCP only) */}
        {tab === "mcp" && (
          <div className="glass rounded-2xl p-4 shadow-elegant">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Filter:</span>
              <select value={filterServer} onChange={e => setFilterServer(e.target.value)}
                className="rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border-light)", color: "var(--color-foreground)" }}>
                <option value="">All Servers</option>
                {servers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border-light)", color: "var(--color-foreground)" }}>
                <option value="">All Status</option>
                <option value="success">Success</option>
                <option value="blocked">Blocked</option>
                <option value="error">Error</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>
        )}

        {/* Bridge filters + info banner */}
        {tab === "bridge" && (
          <>
            <div className="glass rounded-2xl p-4 shadow-elegant">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Source:</span>
                {["all", "chatgpt", "claude"].map(s => (
                  <button key={s} onClick={() => { setBridgeSource(s); setSelectedLog(null); }}
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold transition"
                    style={{
                      background: bridgeSource === s ? "var(--color-primary)" : "var(--glass-bg)",
                      border: `1px solid ${bridgeSource === s ? "var(--color-primary)" : "var(--border-light)"}`,
                      color: bridgeSource === s ? "#fff" : "var(--color-text-secondary)"
                    }}>
                    {s === "all" ? "All" : s === "chatgpt" ? "ChatGPT" : "Claude"}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl p-4 text-sm flex-1" style={{ background: "rgba(59,124,244,0.08)", border: "1px solid rgba(59,124,244,0.2)", color: "var(--color-text-secondary)" }}>
                <strong style={{ color: "var(--color-primary)" }}>🖥 LLM Bridge Extension</strong> — Install the HostedScan browser extension to capture ChatGPT/OpenAI conversations.{" "}
                <span style={{ color: "var(--color-text-muted)" }}>Download from <code style={{ color: "var(--color-primary)" }}>browser-extension/</code></span>
              </div>
              <button onClick={async () => {
                const res = await fetch("/api/ai/bridge-logs?action=cleanup-old&olderThan=7", { method: "DELETE" });
                const data = await res.json();
                toast.success(`Deleted ${data.deleted} logs older than 7 days`);
                fetchLogs();
              }}
                className="shrink-0 rounded-lg px-3.5 py-2 text-xs font-semibold transition hover:opacity-80"
                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444" }}>
                Delete Old Logs
              </button>
            </div>
          </>
        )}

        {/* Logs list */}
        <div className="glass rounded-2xl overflow-hidden shadow-elegant">
          {loading ? (
            <div className="p-8 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>Loading...</div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center" style={{ color: "var(--color-text-muted)" }}>
              <div className="text-3xl mb-2 opacity-40">{tab === "mcp" ? "📝" : "🌐"}</div>
              <div className="text-sm font-medium">No {tab === "mcp" ? "MCP" : "bridge"} logs yet</div>
              <div className="text-xs mt-1">
                {tab === "mcp"
                  ? "Send requests through an MCP server proxy to see logs here."
                  : "Install the browser extension and visit chatgpt.com to capture conversations."}
              </div>
            </div>
          ) : tab === "mcp" ? (
            <div className="max-h-[calc(100vh-340px)] overflow-auto">
              {logs.map((log: any) => {
                const { method, toolName, query } = parseMcpRequest(log.request);
                const isExpanded = selectedLog?.id === log.id;
                return (
                  <div key={log.id} onClick={() => setSelectedLog(isExpanded ? null : log)}
                    className="cursor-pointer transition"
                    style={{ padding: "12px 20px", borderBottom: "1px solid var(--border-light)", background: isExpanded ? "var(--bg-card-hover)" : "transparent" }}>
                    <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                      <StatusBadge status={log.status === "blocked" ? "FAILED" : log.status === "success" ? "COMPLETED" : log.status === "error" ? "FAILED" : "PENDING"} />
                      <span className="text-sm font-semibold" style={{ color: "var(--color-primary)" }}>{log.server?.name || "Unknown"}</span>
                      <MethodBadge method={method} />
                      {toolName && (
                        <span className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold border"
                          style={{ color: "var(--color-text-secondary)", borderColor: "var(--border-light)", background: "var(--bg-surface)" }}>
                          {toolName}
                        </span>
                      )}
                      <ClientBadge client={log.userAgent} />
                      <span className="text-[11px] ml-auto whitespace-nowrap" style={{ color: "var(--color-text-muted)" }}>
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                      {log.duration != null && (
                        <span className="text-[11px] whitespace-nowrap" style={{ color: "var(--color-text-muted)" }}>· {log.duration}ms</span>
                      )}
                    </div>
                    {query && (
                      <div className="text-sm" style={{ color: "var(--color-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: isExpanded ? "normal" : "nowrap" }}>
                        {query}
                      </div>
                    )}
                    {isExpanded && (
                      <div className="mt-3 border-t pt-3 space-y-3" style={{ borderColor: "var(--border)" }}>
                        {log.policyEval && (
                          <div className="rounded-lg px-3 py-2 text-xs flex items-center gap-1.5"
                            style={{ color: "var(--color-accent-amber)", background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)" }}>
                            🛡 Policy Evaluation: {log.policyEval}
                          </div>
                        )}
                        <div className="flex gap-2">
                          <button onClick={(e) => { e.stopPropagation(); copyText(log.request, "Request"); }}
                            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition"
                            style={{ background: "var(--glass-bg)", border: "1px solid var(--border-light)", color: "var(--color-text-secondary)" }}>
                            <Copy className="h-3 w-3" /> Copy Request
                          </button>
                          {log.response && (
                            <button onClick={(e) => { e.stopPropagation(); copyText(log.response, "Response"); }}
                              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition"
                              style={{ background: "var(--glass-bg)", border: "1px solid var(--border-light)", color: "var(--color-text-secondary)" }}>
                              <Copy className="h-3 w-3" /> Copy Response
                            </button>
                          )}
                        </div>
                        <div>
                          <div className="text-xs font-semibold mb-1" style={{ color: "#22d3ee" }}>▸ REQUEST</div>
                          <CodeBlock code={formatJson(log.request)} lang="json" />
                        </div>
                        {log.response && (
                          <div>
                            <div className="text-xs font-semibold mb-1" style={{ color: "#34d399" }}>▸ RESPONSE</div>
                            <CodeBlock code={formatJson(log.response)} lang="json" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* Bridge logs */
            <div className="max-h-[calc(100vh-340px)] overflow-auto">
              {logs.map((log: any) => {
                const isExpanded = selectedLog?.id === log.id;
                const isChatGpt = log.url?.includes("chatgpt.com") || log.url?.includes("chat.openai.com");
                const isClaude = log.url?.includes("claude.ai") || log.url?.includes("anthropic.com");
                const action = getBridgeAction(log);
                const msgPreview = getMessagePreview(log);
                return (
                  <div key={log.id} onClick={() => setSelectedLog(isExpanded ? null : log)}
                    className="cursor-pointer transition"
                    style={{ padding: "12px 20px", borderBottom: "1px solid var(--border-light)", background: isExpanded ? "var(--bg-card-hover)" : "transparent" }}>
                    <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                      <StatusBadge status={getBridgeStatus(log.status)} />
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold"
                        style={{ background: isChatGpt ? "rgba(16,163,127,0.15)" : isClaude ? "rgba(245,158,11,0.15)" : "rgba(59,124,244,0.15)", color: isChatGpt ? "#10a37f" : isClaude ? "#f59e0b" : "var(--color-primary)" }}>
                        {isChatGpt ? "C" : isClaude ? "A" : "?"}
                      </span>
                      <span className="text-sm font-semibold" style={{ color: "var(--color-primary)" }}>
                        {isChatGpt ? "ChatGPT" : isClaude ? "Claude" : "Unknown"}
                      </span>
                      <HttpMethodBadge method={log.method} />
                      <span className={cn("inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-semibold border", actionColors[action] || "bg-muted/30 text-muted-foreground border-border")}>
                        {action}
                      </span>
                      {log.status && (
                        <span className="text-[11px] font-mono" style={{ color: log.status >= 400 ? "var(--color-destructive)" : "var(--color-text-muted)" }}>
                          {log.status}
                        </span>
                      )}
                      {log.durationMs != null && (
                        <span className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>· {log.durationMs}ms</span>
                      )}
                      <span className="text-[11px] ml-auto whitespace-nowrap" style={{ color: "var(--color-text-muted)" }}>
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-start gap-2 text-xs" style={{ color: "var(--color-text-muted)" }}>
                      <MessageSquare className="h-3 w-3 mt-0.5 shrink-0 opacity-50" />
                      <span className="truncate">{msgPreview || truncate(log.url || "", 90)}</span>
                    </div>
                    {log.sessionId && (
                      <div className="text-[10px] font-mono mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                        Session: {truncate(log.sessionId, 24)}
                        {log.conversationId && <> · Conv: {truncate(log.conversationId, 12)}</>}
                      </div>
                    )}
                    {isExpanded && (
                      <div className="mt-3 border-t pt-3 space-y-3" style={{ borderColor: "var(--border)" }}>
                        <div className="flex gap-2">
                          {log.request && (
                            <button onClick={(e) => { e.stopPropagation(); copyText(formatJson(log.request), "Request"); }}
                              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition"
                              style={{ background: "var(--glass-bg)", border: "1px solid var(--border-light)", color: "var(--color-text-secondary)" }}>
                              <Copy className="h-3 w-3" /> Copy Request
                            </button>
                          )}
                          {log.response && (
                            <button onClick={(e) => { e.stopPropagation(); copyText(log.response, "Response"); }} 
                              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition"
                              style={{ background: "var(--glass-bg)", border: "1px solid var(--border-light)", color: "var(--color-text-secondary)" }}>
                              <Copy className="h-3 w-3" /> Copy Response
                            </button>
                          )}
                        </div>
                        <div>
                          <div className="text-xs font-semibold mb-1" style={{ color: "#22d3ee" }}>▸ REQUEST</div>
                          <CodeBlock code={log.request ? formatJson(log.request) : "(binary)"} lang={log.request ? "json" : "text"} maxHeight={300} />
                        </div>
                        {log.response && (
                          <div>
                            <div className="text-xs font-semibold mb-1" style={{ color: "#34d399" }}>▸ RAW RESPONSE</div>
                            <CodeBlock code={formatJson(log.response)} lang="json" maxHeight={300} />
                          </div>
                        )}
                        {log.response && log.contentType?.includes("event-stream") && (
                          <div>
                            <div className="text-xs font-semibold mb-1" style={{ color: "#f59e0b" }}>▸ RAW DECODED RESPONSE</div>
                            <CodeBlock code={parseSSEResponse(log.response)} lang="markdown" maxHeight={400} />
                          </div>
                        )}
                        {log.tokens && log.tokens.length > 0 && (
                          <div>
                            <div className="text-xs font-semibold mb-1" style={{ color: "#a78bfa" }}>▸ EXTRACTED TOKENS</div>
                            <div className="space-y-1">
                              {log.tokens.map((t: any) => (
                                <div key={t.id} className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-mono"
                                  style={{ background: "var(--bg-surface)", border: "1px solid var(--border-light)" }}>
                                  <span className="inline-flex rounded px-1 py-0.5 text-[9px] font-semibold"
                                    style={{ color: t.source === "chatgpt" ? "#10a37f" : "#f59e0b", background: t.source === "chatgpt" ? "rgba(16,163,127,0.15)" : "rgba(245,158,11,0.15)" }}>
                                    {t.source}
                                  </span>
                                  <span style={{ color: "var(--color-text-secondary)" }}>{t.token.substring(0, 20)}...</span>
                                  <span className="text-[9px]" style={{ color: "var(--color-text-muted)" }}>({t.type})</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {log.url && (
                          <div className="text-[10px] font-mono" style={{ color: "var(--color-text-muted)" }}>
                            URL: {log.url} · Status: {log.status} · {log.contentType || "no content-type"}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {tab === "bridge" && bridgeHasMore && (
                <div className="p-4 text-center">
                  <button onClick={() => fetchLogs(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition hover:opacity-80"
                    style={{ background: "var(--glass-bg)", border: "1px solid var(--border-light)", color: "var(--color-primary)" }}>
                    Load more ({bridgeTotal - bridgeOffset} remaining)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Auto-refresh indicator */}
        <div className="fixed bottom-4 right-4 flex items-center gap-1.5 text-xs rounded-full px-3 py-1.5 shadow-lg"
          style={{ background: "var(--glass-bg)", border: "1px solid var(--border-light)", color: "var(--color-text-muted)", backdropFilter: "blur(8px)" }}>
          <Circle className="h-2 w-2 fill-current animate-pulse" style={{ color: "#34d399" }} />
          Auto-refreshes every 3s
          <button onClick={() => fetchLogs(false)} className="ml-1 hover:text-white/80 transition">
            <RefreshCw className="h-3 w-3" />
          </button>
        </div>
      </div>
    </PageLayout></LightTheme>
  );
}
