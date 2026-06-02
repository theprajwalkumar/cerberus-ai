"use client";
import { useState, useEffect, useRef } from "react";
import { Copy, RefreshCw, Circle, Globe, Server, MessageSquare, Trash2, CheckSquare, Square, ChevronLeft, ChevronRight } from "lucide-react";
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
    if (path === "") { Object.assign(state, val); }
    else { setAtPath(state, path, val); }
  } else if (op === "append") {
    const existing = getAtPath(state, path);
    setAtPath(state, path, (typeof existing === "string" ? existing : "") + (typeof val === "string" ? val : ""));
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
      if (Array.isArray(obj.v)) { for (const sub of obj.v) applyDelta(state, sub); }
      else { applyDelta(state, obj); }
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
  if (Array.isArray(parts)) { text = parts.join(""); }
  else if (typeof parts === "object" && parts !== null) { text = extractText(parts); }
  else {
    const content = getAtPath(state, "/message/content");
    if (typeof content === "object" && content !== null) { text = extractText(content); }
  }
  if (text) {
    text = text.replace(/\ue200[^]*?\ue201/g, "").replace(/\ue202[^]*?\ue201/g, "").replace(/[\ue200-\ue203]/g, "").replace(/\s*\ue202[^}]*\}\s*/g, "");
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
    } else if (method === "initialize") { query = "Handshake"; }
    return { method, toolName, query };
  } catch {
    return { method: "?", toolName: "", query: raw.substring(0, 60) };
  }
}

function formatJson(raw: string | null | undefined): string {
  if (!raw) return "";
  try { const parsed = JSON.parse(raw); return JSON.stringify(parsed, null, 2); }
  catch { return raw; }
}

function truncate(s: string, n: number) {
  return s.length > n ? s.substring(0, n) + "..." : s;
}

const PAGE_SIZE = 100;

export default function LogsPage() {
  const [tab, setTab] = useState<Tab>("mcp");
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [servers, setServers] = useState<any[]>([]);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const [filterServer, setFilterServer] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [bridgeSource, setBridgeSource] = useState("all");
  const [bridgeMethod, setBridgeMethod] = useState("");
  const [bridgeStatus, setBridgeStatus] = useState("");

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fetchLogsRef = useRef<typeof fetchLogs | null>(null);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const fetchLogs = async (gotoPage?: number) => {
    try {
      const targetPage = gotoPage ?? page;
      const offset = targetPage * PAGE_SIZE;
      if (tab === "mcp") {
        const params = new URLSearchParams();
        if (filterServer) params.set("serverId", filterServer);
        if (filterStatus) params.set("status", filterStatus);
        params.set("limit", String(PAGE_SIZE));
        params.set("offset", String(offset));
        params.set("excludeNoise", "true");
        const res = await fetch(`/api/ai/mcp-logs?${params}`);
        if (!res.ok) { setLogs([]); setLoading(false); return; }
        const data = await res.json();
        setLogs(data.logs || []);
        setTotal(data.total || 0);
      } else {
        const params = new URLSearchParams();
        params.set("limit", String(PAGE_SIZE));
        params.set("offset", String(offset));
        params.set("excludeNoise", "true");
        if (bridgeSource !== "all") params.set("source", bridgeSource);
        if (bridgeMethod) params.set("method", bridgeMethod);
        if (bridgeStatus) params.set("status", bridgeStatus);
        const res = await fetch(`/api/ai/bridge-logs?${params}`);
        if (!res.ok) { setLogs([]); setLoading(false); return; }
        const data = await res.json();
        setLogs(data.logs || []);
        setTotal(data.total || 0);
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
    setSelectedLog(null);
    setSelectedIds(new Set());
    setPage(0);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [tab]);

  fetchLogsRef.current = fetchLogs;

  useEffect(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    if (!selectedLog) {
      pollingRef.current = setInterval(() => {
        if (fetchLogsRef.current) fetchLogsRef.current();
      }, 10000);
    }
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [tab, selectedLog, page]);

  useEffect(() => {
    setPage(0);
    fetchLogs(0);
  }, [filterServer, filterStatus, bridgeSource, bridgeMethod, bridgeStatus]);

  function goToPage(p: number) {
    if (p < 0 || p >= totalPages) return;
    setPage(p);
    setSelectedLog(null);
    setSelectedIds(new Set());
    fetchLogs(p);
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === logs.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(logs.map(l => l.id)));
    }
  }

  async function deleteSelected() {
    if (selectedIds.size === 0) return;
    setDeleting(true);
    const idsStr = Array.from(selectedIds).join(",");
    const endpoint = tab === "mcp" ? "/api/ai/mcp-logs" : "/api/ai/bridge-logs";
    try {
      const res = await fetch(`${endpoint}?ids=${idsStr}`, { method: "DELETE" });
      const data = await res.json();
      toast.success(`Deleted ${data.deleted} log${data.deleted !== 1 ? "s" : ""}`);
      setSelectedIds(new Set());
      fetchLogs();
    } catch (err: any) {
      toast.error("Delete failed: " + err.message);
    }
    setDeleting(false);
  }

  function copyText(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  }

  return (
    <LightTheme><PageLayout current="/ai-gatekeeper/logs" title="LLM Logs">
      <div className="space-y-5">
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          All LLM traffic captured across MCP servers and browser conversations.
        </p>
        <AiSubNav />

        {/* Tab + actions bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex rounded-lg p-0.5 gap-0.5" style={{ background: "var(--glass-bg)", border: "1px solid var(--border-light)" }}>
            {([{ id: "mcp", label: "MCP Logs", icon: Server }, { id: "bridge", label: "Bridge Logs", icon: Globe }] as const).map(t => (
              <button key={t.id} onClick={() => { setTab(t.id); }}
                className={cn("inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer", tab === t.id ? "text-white shadow" : "hover:text-white/80")}
                style={tab === t.id ? { background: "#fff", color: "#0a0a0a" } : { color: "var(--color-text-secondary)" }}>
                <t.icon className="h-3.5 w-3.5" /> {t.label}
              </button>
            ))}
          </div>
          <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>{total} total</span>
          {selectedIds.size > 0 && (
            <button onClick={deleteSelected} disabled={deleting}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition"
              style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", opacity: deleting ? 0.6 : 1 }}>
              <Trash2 className="h-3 w-3" /> Delete {selectedIds.size}
            </button>
          )}
          {tab === "bridge" && (
            <button onClick={async () => {
              const res = await fetch("/api/ai/bridge-logs?action=cleanup-old&olderThan=7", { method: "DELETE" });
              const data = await res.json();
              toast.success(`Deleted ${data.deleted} logs older than 7 days`);
              fetchLogs();
            }}
              className="ml-auto rounded-lg px-3 py-1.5 text-xs font-semibold transition hover:opacity-80"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444" }}>
              Delete Old Logs
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="glass rounded-2xl p-4 shadow-elegant">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Filter:</span>
            {tab === "mcp" ? (
              <>
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
              </>
            ) : (
              <>
                <select value={bridgeSource} onChange={e => setBridgeSource(e.target.value)}
                  className="rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ background: "var(--bg-surface)", border: "1px solid var(--border-light)", color: "var(--color-foreground)" }}>
                  <option value="all">All Sources</option>
                  <option value="chatgpt">ChatGPT</option>
                  <option value="claude">Claude</option>
                </select>
                <select value={bridgeMethod} onChange={e => setBridgeMethod(e.target.value)}
                  className="rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ background: "var(--bg-surface)", border: "1px solid var(--border-light)", color: "var(--color-foreground)" }}>
                  <option value="">All Methods</option>
                  <option value="POST">POST</option>
                  <option value="GET">GET</option>
                  <option value="PATCH">PATCH</option>
                  <option value="DELETE">DELETE</option>
                </select>
                <select value={bridgeStatus} onChange={e => setBridgeStatus(e.target.value)}
                  className="rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ background: "var(--bg-surface)", border: "1px solid var(--border-light)", color: "var(--color-foreground)" }}>
                  <option value="">All Status</option>
                  <option value="200">200 OK</option>
                  <option value="201">201 Created</option>
                  <option value="400">400 Bad Request</option>
                  <option value="401">401 Unauthorized</option>
                  <option value="403">403 Forbidden</option>
                  <option value="404">404 Not Found</option>
                  <option value="429">429 Rate Limited</option>
                  <option value="500">500 Server Error</option>
                </select>
              </>
            )}
          </div>
        </div>

        {/* Bridge info banner */}
        {tab === "bridge" && (
          <div className="rounded-2xl p-4 text-sm" style={{ background: "rgba(59,124,244,0.08)", border: "1px solid rgba(59,124,244,0.2)", color: "var(--color-text-secondary)" }}>
            <strong style={{ color: "var(--color-primary)" }}>🖥 Cerberus.ai Bridge Extension</strong> — Install the browser extension to capture ChatGPT & Claude web conversations.{" "}
            <span style={{ color: "var(--color-text-muted)" }}>Download from <code style={{ color: "var(--color-primary)" }}>browser-extension/</code></span>
          </div>
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
                  : "Install the Cerberus.ai Bridge extension and visit chatgpt.com or claude.ai to capture conversations."}
              </div>
            </div>
          ) : (
            <div>
              {/* Select all header */}
              <div className="flex items-center gap-2 px-4 py-2 border-b" style={{ borderColor: "var(--border-light)", background: "var(--bg-surface)" }}>
                <button onClick={toggleSelectAll} className="flex items-center gap-1.5 text-xs font-semibold transition hover:opacity-80" style={{ color: "var(--color-text-secondary)" }}>
                  {selectedIds.size === logs.length ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                  {selectedIds.size === logs.length ? "Deselect all" : "Select all"}
                </button>
              </div>

              <div className="max-h-[calc(100vh-480px)] overflow-auto">
                {logs.map((log: any) => {
                  const isExpanded = selectedLog?.id === log.id;
                  const isSelected = selectedIds.has(log.id);
                  return (
                    <div key={log.id}
                      className="transition"
                      style={{ padding: "0", borderBottom: "1px solid var(--border-light)", background: isExpanded ? "var(--bg-card-hover)" : isSelected ? "rgba(59,124,244,0.05)" : "transparent" }}>
                      <div className="flex items-stretch">
                        {/* Checkbox */}
                        <div className="flex items-center px-3" onClick={(e) => { e.stopPropagation(); toggleSelect(log.id); }}>
                          <button className="flex items-center transition hover:opacity-80" style={{ color: isSelected ? "var(--color-primary)" : "var(--color-text-muted)" }}>
                            {isSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                          </button>
                        </div>
                        {/* Log content */}
                        <div className="flex-1 cursor-pointer py-3 pr-4" onClick={() => setSelectedLog(isExpanded ? null : log)}>
                          {tab === "mcp" ? (
                            <McpLogRow log={log} isExpanded={isExpanded} copyText={copyText} />
                          ) : (
                            <BridgeLogRow log={log} isExpanded={isExpanded} copyText={copyText} />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-1 px-4 py-3 border-t" style={{ borderColor: "var(--border-light)" }}>
                  <button onClick={() => goToPage(page - 1)} disabled={page === 0}
                    className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition"
                    style={{ color: page === 0 ? "var(--color-text-muted)" : "var(--color-text-secondary)", opacity: page === 0 ? 0.4 : 1 }}>
                    <ChevronLeft className="h-3.5 w-3.5" /> Prev
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i).map(p => (
                    <button key={p} onClick={() => goToPage(p)}
                      className="rounded-lg px-2.5 py-1.5 text-xs font-semibold transition"
                      style={{
                        background: p === page ? "#fff" : "transparent",
                        color: p === page ? "#0a0a0a" : "var(--color-text-secondary)"
                      }}>
                      {p + 1}
                    </button>
                  ))}
                  <button onClick={() => goToPage(page + 1)} disabled={page >= totalPages - 1}
                    className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition"
                    style={{ color: page >= totalPages - 1 ? "var(--color-text-muted)" : "var(--color-text-secondary)", opacity: page >= totalPages - 1 ? 0.4 : 1 }}>
                    Next <ChevronRight className="h-3.5 w-3.5" />
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
          Auto-refreshes every 10s
          <button onClick={() => fetchLogs()} className="ml-1 hover:text-white/80 transition">
            <RefreshCw className="h-3 w-3" />
          </button>
        </div>
      </div>
    </PageLayout></LightTheme>
  );
}

function McpLogRow({ log, isExpanded, copyText }: { log: any; isExpanded: boolean; copyText: (text: string, label: string) => void }) {
  const { method, toolName, query } = parseMcpRequest(log.request);
  return (
    <div>
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
}

function BridgeLogRow({ log, isExpanded, copyText }: { log: any; isExpanded: boolean; copyText: (text: string, label: string) => void }) {
  const isChatGpt = log.url?.includes("chatgpt.com") || log.url?.includes("chat.openai.com");
  const isClaude = log.url?.includes("claude.ai") || log.url?.includes("anthropic.com");
  const action = getBridgeAction(log);
  const msgPreview = getMessagePreview(log);
  return (
    <div>
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
}
