"use client";
import { useState, useEffect } from "react";
import { Copy, RefreshCw, Eye, EyeOff, Key, Shield, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { PageLayout, Btn } from "@/components/ui";
import { LightTheme } from "@/components/gatekeeper/light-theme";
import { AiSubNav } from "@/components/ai-gatekeeper";

export default function ClientTokensPage() {
  const [tokens, setTokens] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState("all");
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  async function fetchTokens() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (sourceFilter !== "all") params.set("source", sourceFilter);
      const res = await fetch(`/api/ai/client-tokens?${params}`);
      const data = await res.json();
      setTokens(data.tokens || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.warn("fetchTokens error:", e);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchTokens();
  }, [sourceFilter]);

  useEffect(() => {
    const interval = setInterval(fetchTokens, 5000);
    return () => clearInterval(interval);
  }, []);

  function toggleReveal(id: string) {
    setRevealed(prev => ({ ...prev, [id]: !prev[id] }));
  }

  function maskToken(token: string): string {
    if (token.length <= 12) return token;
    return token.substring(0, 8) + "••••" + token.substring(token.length - 4);
  }

  function copyText(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  }

  const sourceColors: Record<string, string> = {
    chatgpt: "rgba(16,163,127,0.15)",
    claude: "rgba(245,158,11,0.15)",
  };

  const sourceTextColors: Record<string, string> = {
    chatgpt: "#10a37f",
    claude: "#f59e0b",
  };

  const typeColors: Record<string, string> = {
    api_key: "#34d399",
    bearer_token: "#22d3ee",
    cookie: "#a78bfa",
  };

  return (
    <LightTheme><PageLayout current="/ai-gatekeeper/client-tokens" title="LLM Client Tokens">
      <div className="space-y-5">
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          API keys and session tokens extracted from active ChatGPT and Claude conversations.
        </p>
        <AiSubNav />

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="glass rounded-2xl p-5 shadow-elegant">
            <div className="flex items-center gap-2 mb-2">
              <Key className="h-4 w-4" style={{ color: "#22d3ee" }} />
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Total Tokens</span>
            </div>
            <div className="text-2xl font-bold" style={{ color: "var(--color-foreground)" }}>{total}</div>
          </div>
          <div className="glass rounded-2xl p-5 shadow-elegant">
            <div className="flex items-center gap-2 mb-2">
              <Key className="h-4 w-4" style={{ color: "#10a37f" }} />
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>ChatGPT</span>
            </div>
            <div className="text-2xl font-bold" style={{ color: "var(--color-foreground)" }}>{tokens.filter(t => t.source === "chatgpt").length}</div>
          </div>
          <div className="glass rounded-2xl p-5 shadow-elegant">
            <div className="flex items-center gap-2 mb-2">
              <Key className="h-4 w-4" style={{ color: "#f59e0b" }} />
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Claude</span>
            </div>
            <div className="text-2xl font-bold" style={{ color: "var(--color-foreground)" }}>{tokens.filter(t => t.source === "claude").length}</div>
          </div>
        </div>

        {/* Source filter */}
        <div className="glass rounded-2xl p-4 shadow-elegant">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Source:</span>
            {["all", "chatgpt", "claude"].map(s => (
              <button key={s} onClick={() => setSourceFilter(s)}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold transition"
                style={{
                  background: sourceFilter === s ? "var(--color-primary)" : "var(--glass-bg)",
                  border: `1px solid ${sourceFilter === s ? "var(--color-primary)" : "var(--border-light)"}`,
                  color: sourceFilter === s ? "#fff" : "var(--color-text-secondary)"
                }}>
                {s === "all" ? "All" : s === "chatgpt" ? "ChatGPT" : "Claude"}
              </button>
            ))}
            <button onClick={async () => {
                const res = await fetch("/api/ai/client-tokens", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "cleanup-jwt" }),
                });
                const data = await res.json();
                toast.success(`Cleaned up ${data.deleted} JWT tokens`);
                fetchTokens();
              }}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold transition flex items-center gap-1.5"
              style={{ color: "#f59e0b", background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.2)" }}>
              <AlertTriangle className="h-3 w-3" /> Remove JWT Tokens
            </button>
            <button onClick={fetchTokens}
              className="ml-auto rounded-lg px-3 py-1.5 text-xs font-semibold transition hover:text-white/80 flex items-center gap-1.5"
              style={{ color: "var(--color-text-secondary)" }}>
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>
        </div>

        {/* Token list */}
        <div className="glass rounded-2xl overflow-hidden shadow-elegant">
          {loading && tokens.length === 0 ? (
            <div className="p-8 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>Loading...</div>
          ) : tokens.length === 0 ? (
            <div className="py-12 text-center" style={{ color: "var(--color-text-muted)" }}>
              <Key className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <div className="text-sm font-medium">No tokens found</div>
              <div className="text-xs mt-1">
                Install the browser extension and visit ChatGPT or Claude to automatically capture API tokens.
              </div>
            </div>
          ) : (
            <div className="max-h-[calc(100vh-400px)] overflow-auto">
              {tokens.map((token: any) => {
                const isRevealed = revealed[token.id];
                return (
                  <div key={token.id}
                    className="transition"
                    style={{ padding: "14px 20px", borderBottom: "1px solid var(--border-light)" }}>
                    <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold"
                        style={{ background: sourceColors[token.source] || "rgba(59,124,244,0.15)", color: sourceTextColors[token.source] || "var(--color-primary)" }}>
                        {token.source === "chatgpt" ? "C" : token.source === "claude" ? "A" : "?"}
                      </span>
                      <span className="text-sm font-semibold" style={{ color: "var(--color-primary)" }}>
                        {token.source === "chatgpt" ? "ChatGPT" : token.source === "claude" ? "Claude" : token.source}
                      </span>
                      <span className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold border"
                        style={{ color: typeColors[token.type] || "var(--color-text-secondary)", borderColor: "var(--border-light)", background: "var(--bg-surface)" }}>
                        {token.type === "api_key" ? "API Key" : token.type === "bearer_token" ? "Bearer Token" : token.type === "cookie" ? "Session Cookie" : token.type}
                      </span>
                      {token.label && (
                        <span className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                          {token.label}
                        </span>
                      )}
                      <span className="text-[11px] ml-auto whitespace-nowrap" style={{ color: "var(--color-text-muted)" }}>
                        {new Date(token.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-xs font-mono flex-1 rounded-lg px-3 py-1.5"
                        style={{ background: "var(--bg-surface)", border: "1px solid var(--border-light)", color: isRevealed ? "#22d3ee" : "var(--color-text-secondary)", wordBreak: "break-all" }}>
                        {isRevealed ? token.token : maskToken(token.token)}
                      </code>
                      <button onClick={() => toggleReveal(token.id)}
                        className="rounded-lg p-1.5 transition hover:text-white/80"
                        style={{ color: "var(--color-text-secondary)" }}
                        title={isRevealed ? "Hide" : "Reveal"}>
                        {isRevealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                      <button onClick={() => copyText(token.token, "Token")}
                        className="rounded-lg p-1.5 transition hover:text-white/80"
                        style={{ color: "var(--color-text-secondary)" }}
                        title="Copy">
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={async () => {
                        await fetch(`/api/ai/client-tokens?id=${token.id}`, { method: "DELETE" });
                        fetchTokens();
                        toast.success("Token deleted");
                      }}
                        className="rounded-lg p-1.5 transition hover:text-red-400"
                        style={{ color: "var(--color-text-muted)" }}
                        title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {token.url && (
                      <div className="text-[10px] font-mono mt-1" style={{ color: "var(--color-text-muted)" }}>
                        URL: {token.url}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Security note */}
        <div className="rounded-2xl p-4 text-sm flex items-start gap-2"
          style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)", color: "var(--color-text-secondary)" }}>
          <Shield className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "#f59e0b" }} />
          <div>
            <strong style={{ color: "#f59e0b" }}>Security Notice</strong> — These tokens are extracted from active browser sessions. Do not share or expose them publicly. Tokens are stored locally in your database and never transmitted to third parties.
          </div>
        </div>
      </div>
    </PageLayout></LightTheme>
  );
}
