"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Server, Edit3, Trash2, Plug, Copy, ChevronRight, X, Play, Loader2, Terminal, BookOpen } from "lucide-react";
import { PageLayout } from "@/components/ui";
import { StatusBadge, TypeBadge } from "@/components/gatekeeper/badges";
import { LightTheme } from "@/components/gatekeeper/light-theme";
import { AiSubNav } from "@/components/ai-gatekeeper";
import { cn } from "@/lib/utils";

export default function McpServersPage() {
  const [servers, setServers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingServer, setEditingServer] = useState<any>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", url: "", apiKey: "", type: "openai", policyId: "" });
  const [policies, setPolicies] = useState<any[]>([]);
  const [selectedServer, setSelectedServer] = useState<any>(null);
  const [tools, setTools] = useState<any[]>([]);
  const [loadingTools, setLoadingTools] = useState(false);
  const [toolsError, setToolsError] = useState<string | null>(null);
  const [toolResult, setToolResult] = useState<any>(null);
  const [callingTool, setCallingTool] = useState<string | null>(null);
  const [argInputs, setArgInputs] = useState<Record<string, string>>({});
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => { fetchServers(); fetchPolicies(); }, []);

  async function fetchServers() {
    const res = await fetch("/api/ai/mcp-servers");
    setServers(await res.json());
    setLoading(false);
  }

  async function fetchPolicies() {
    const res = await fetch("/api/ai/policies");
    setPolicies(await res.json());
  }

  async function addServer() {
    if (editingServer) {
      await fetch(`/api/ai/mcp-servers/${editingServer.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
    } else {
      await fetch("/api/ai/mcp-servers", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
    }
    closeModal();
    fetchServers();
  }

  function openAddModal() {
    setEditingServer(null);
    setForm({ name: "", url: "", apiKey: "", type: "openai", policyId: "" });
    setShowModal(true);
  }

  function openEditModal(server: any) {
    setEditingServer(server);
    fetch(`/api/ai/mcp-servers/${server.id}`).then(r => r.json()).then(data => {
      setForm({ name: data.name, url: data.url, apiKey: data.apiKey || "", type: data.type, policyId: data.policyId || "" });
    }).catch(() => {
      setForm({ name: server.name, url: server.url, apiKey: server.apiKey || "", type: server.type, policyId: server.policyId || "" });
    });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingServer(null);
    setForm({ name: "", url: "", apiKey: "", type: "openai", policyId: "" });
  }

  async function deleteServer(id: string) {
    await fetch(`/api/ai/mcp-servers/${id}`, { method: "DELETE" });
    if (selectedServer?.id === id) closeDrawer();
    fetchServers();
  }

  async function testServer(id: string) {
    setTesting(id);
    await fetch(`/api/ai/mcp-servers/${id}/test`, { method: "POST" });
    setTesting(null);
    fetchServers();
  }

  const NGROK_URL = "https://cerberus-ai.vercel.app";

  function copyConnectUrl(server: any) {
    navigator.clipboard.writeText(`${NGROK_URL}/api/ai/mcp-servers/${server.id}/mcp`);
  }

  function copyConfigJson(server: any) {
    const url = `${NGROK_URL}/api/ai/mcp-servers/${server.id}/mcp`;
    const tbServer = servers.find((s: any) => s.name.toLowerCase().includes("toolbox"));
    const tbUrl = tbServer ? `${NGROK_URL}/api/ai/mcp-servers/${tbServer.id}/mcp` : null;
    const mcpServers: Record<string, any> = {
      [server.name.replace(/\s+/g, '-').toLowerCase()]: { command: "node", args: ["/Users/prajwal/Desktop/cerberus-ai/mcp-proxy.mjs", url] },
    };
    if (tbServer && tbServer.id !== server.id) {
      mcpServers[tbServer.name.replace(/\s+/g, '-').toLowerCase()] = { command: "node", args: ["/Users/prajwal/Desktop/cerberus-ai/mcp-proxy.mjs", tbUrl] };
    }
    navigator.clipboard.writeText(JSON.stringify({ mcpServers }, null, 2));
  }

  async function discoverTools(server: any) {
    setSelectedServer(server);
    setToolResult(null);
    setToolsError(null);
    setArgInputs({});
    setLoadingTools(true);
    try {
      const res = await fetch(`/api/ai/mcp-servers/${server.id}/mcp`);
      const data = await res.json();
      setTools(data.tools || []);
      if (data.error) setToolsError(data.error?.message || JSON.stringify(data.error));
      if (!data.ok && !data.error) setToolsError(`Server returned HTTP ${res.status}`);
    } catch (err: any) { setToolsError(err.message); }
    setLoadingTools(false);
  }

  async function callTool(toolName: string) {
    setCallingTool(toolName);
    setToolResult(null);
    try {
      const params: Record<string, any> = {};
      const tool = tools.find(t => t.name === toolName);
      if (tool?.inputSchema?.properties) {
        for (const key of Object.keys(tool.inputSchema.properties)) {
          if (argInputs[key]) params[key] = argInputs[key];
        }
      }
      const res = await fetch(`/api/ai/mcp-servers/${selectedServer.id}/mcp`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "tools/call", toolName, params: Object.keys(params).length > 0 ? params : undefined }),
      });
      setToolResult(await res.json());
    } catch (err: any) { setToolResult({ error: err.message }); }
    setCallingTool(null);
  }

  function closeDrawer() {
    setSelectedServer(null);
    setTools([]);
    setToolResult(null);
    setToolsError(null);
  }

  return (
    <LightTheme><PageLayout current="/ai-gatekeeper/mcp-servers" title="MCP Servers"
      actions={
        <button onClick={openAddModal}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-5 py-2.5 text-xs font-bold uppercase tracking-wider shadow-lg transition hover:opacity-85"
          style={{ boxShadow: "0 4px 20px rgba(255,255,255,0.1)" }}>
          <Plus className="h-4 w-4" /> Add Server
        </button>
      }>
      <div className="space-y-5">
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>Manage, connect, and test your MCP tool servers.</p>
        <AiSubNav />

        {/* Table */}
        <div className="glass rounded-2xl overflow-hidden shadow-elegant">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: "var(--bg-surface, #111827)" }}>
                  {["Name", "URL", "Type", "Status", "Policy", ""].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>Loading...</td></tr>
                ) : servers.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
                    <Server className="mx-auto h-8 w-8 mb-2 opacity-30" />
                    No MCP servers yet. Add one to get started.
                  </td></tr>
                ) : servers.map((s: any) => (
                  <tr key={s.id} onClick={() => discoverTools(s)}
                    className="border-t transition cursor-pointer"
                    style={{ borderColor: "var(--border-light, rgba(255,255,255,0.06))", background: selectedServer?.id === s.id ? "var(--bg-card-hover, rgba(25,33,55,0.9))" : "transparent" }}>
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold" style={{ color: "var(--color-foreground)" }}>{s.name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs" style={{ color: "var(--color-primary)" }}>{s.url}</div>
                      <div className="text-[10px] mt-0.5 font-mono" style={{ color: "var(--color-text-muted)" }}>
                        🔗 {NGROK_URL.replace("https://", "")}/api/ai/.../{s.id}/mcp
                      </div>
                    </td>
                    <td className="px-4 py-3"><TypeBadge type={s.type} /></td>
                    <td className="px-4 py-3"><StatusBadge status={s.status === "connected" ? "COMPLETED" : s.status === "error" ? "FAILED" : "PENDING"} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-xs">
                        <span style={{ color: s.policyId ? "var(--color-accent-purple)" : "var(--color-text-muted)" }}>{s.policyId ? "✅" : "—"}</span>
                        <span style={{ color: s.apiKey ? "var(--color-accent-green)" : "var(--color-accent-red)" }}>{s.apiKey ? "🔑" : "❌"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => openEditModal(s)}
                          className="flex h-7 w-7 items-center justify-center rounded-md transition"
                          style={{ background: "var(--glass-bg)", border: "1px solid var(--border-light)" }}>
                          <Edit3 className="h-3 w-3" style={{ color: "var(--color-text-secondary)" }} />
                        </button>
                        <button onClick={() => deleteServer(s.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-md transition"
                          style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)" }}>
                          <Trash2 className="h-3 w-3" style={{ color: "var(--color-accent-red)" }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Side drawer */}
        {selectedServer && (
          <>
            <div className="fixed inset-0 z-40 backdrop-blur-sm" style={{ background: "rgba(0,0,0,0.5)" }} onClick={closeDrawer} />
            <div className="fixed top-0 right-0 bottom-0 z-50 w-[520px] overflow-hidden flex flex-col shadow-2xl"
              style={{ background: "var(--bg-card, rgba(18,24,42,0.85))", borderLeft: "1px solid var(--glass-border, rgba(59,124,244,0.12))", backdropFilter: "blur(20px)" }}>
              <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
                <div>
                  <h3 className="font-display text-sm font-semibold" style={{ color: "var(--color-foreground)" }}>Server Details</h3>
                  <span className="text-xs" style={{ color: "var(--color-primary)" }}>{selectedServer.name}</span>
                </div>
                <button onClick={closeDrawer} className="flex h-7 w-7 items-center justify-center rounded-md transition" style={{ color: "var(--color-text-muted)" }}>
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-auto px-5 py-4 space-y-4">
                <div className="glass rounded-xl p-3.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold whitespace-nowrap" style={{ color: "var(--color-text-muted)" }}>MCP URL</span>
                    <code className="flex-1 text-[11px] font-mono break-all" style={{ color: "var(--color-primary)" }}>
                      {NGROK_URL}/api/ai/mcp-servers/{selectedServer.id}/mcp
                    </code>
                    <button onClick={() => copyConnectUrl(selectedServer)}
                      className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition"
                      style={{ background: "var(--glass-bg)", border: "1px solid var(--border-light)", color: "var(--color-text-secondary)" }}>
                      <Copy className="h-3 w-3" /> Copy
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => testServer(selectedServer.id)} disabled={testing === selectedServer.id}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition"
                    style={{ background: "var(--glass-bg)", border: "1px solid var(--border-light)", color: "var(--color-text-secondary)", opacity: testing === selectedServer.id ? 0.6 : 1 }}>
                    <Plug className="h-3.5 w-3.5" /> {testing === selectedServer.id ? "Testing..." : "Test Connection"}
                  </button>
                  <button onClick={() => copyConfigJson(selectedServer)}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition"
                    style={{ background: "var(--glass-bg)", border: "1px solid var(--border-light)", color: "var(--color-text-secondary)" }}>
                    <Copy className="h-3.5 w-3.5" /> Copy Claude Config
                  </button>
                </div>

                <details className="group">
                  <summary className="flex items-center gap-2 cursor-pointer text-sm font-semibold py-1" style={{ color: "var(--color-primary)" }}>
                    <BookOpen className="h-4 w-4" /> How to connect
                  </summary>
                  <div className="mt-2 p-3 rounded-xl text-xs leading-relaxed space-y-2" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-light)" }}>
                    <div><span className="font-semibold" style={{ color: "var(--color-accent-green)" }}>⚡ ChatGPT (OAuth)</span>
                      <div className="mt-1 p-2 rounded-lg text-xs" style={{ background: "var(--glass-bg)", border: "1px solid var(--border-light)", color: "var(--color-text-secondary)" }}>
                        Settings → Apps → Create App → paste MCP URL → OAuth → Authorize
                      </div>
                    </div>
                    <div><span className="font-semibold" style={{ color: "var(--color-accent-purple)" }}>📋 Claude Desktop</span>
                      <pre className="mt-1 p-3 rounded-lg text-[10px] font-mono overflow-auto max-h-48"
                        style={{ background: "#0a0e14", color: "#e0e0e0", border: "1px solid rgba(255,255,255,0.05)" }}>
{`{
  "mcpServers": {
    "${selectedServer.name.replace(/\s+/g, '-').toLowerCase()}": {
      "command": "node",
      "args": ["/Users/prajwal/Desktop/cerberus-ai/mcp-proxy.mjs", "${NGROK_URL}/api/ai/mcp-servers/${selectedServer.id}/mcp"]
    }
  }
}`}
                      </pre>
                    </div>
                  </div>
                </details>

                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Terminal className="h-4 w-4" style={{ color: "var(--color-text-muted)" }} />
                    <span className="text-sm font-semibold" style={{ color: "var(--color-foreground)" }}>Tools</span>
                    <span className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>({tools.length})</span>
                  </div>

                  {loadingTools ? (
                    <div className="flex flex-col items-center py-10 text-sm" style={{ color: "var(--color-text-muted)" }}>
                      <Loader2 className="h-6 w-6 animate-spin mb-2" />
                      Discovering tools...
                    </div>
                  ) : tools.length === 0 ? (
                    <div className="rounded-xl p-5 text-center" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-light)" }}>
                      <Terminal className="mx-auto h-6 w-6 mb-2 opacity-30" style={{ color: "var(--color-text-muted)" }} />
                      <div className="text-sm" style={{ color: "var(--color-text-muted)" }}>No tools discovered</div>
                      {toolsError && <div className="mt-2 text-xs p-2 rounded-lg" style={{ color: "var(--color-accent-red)", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.15)" }}>{toolsError}</div>}
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[400px] overflow-auto">
                      {tools.map((tool: any, i: number) => (
                        <div key={tool.name} className="rounded-xl p-3" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-light)" }}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 mb-1">
                                <code className="text-xs font-semibold rounded px-1.5 py-0.5" style={{ color: "var(--color-primary)", background: "rgba(59,124,244,0.1)" }}>{tool.name}</code>
                                {tool.description && <span className="text-[11px] truncate" style={{ color: "var(--color-text-muted)" }}>{tool.description}</span>}
                              </div>
                              {tool.inputSchema?.properties && Object.keys(tool.inputSchema.properties).length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                  {Object.entries(tool.inputSchema.properties).map(([key, prop]: any) => (
                                    <div key={key} className="flex items-center gap-1 text-[11px]">
                                      <span style={{ color: "var(--color-text-muted)" }}>{key}:</span>
                                      <input placeholder={prop.description || prop.type}
                                        value={argInputs[key] || ""}
                                        onChange={e => setArgInputs(p => ({ ...p, [key]: e.target.value }))}
                                        className="rounded px-1.5 py-1 text-[11px] outline-none w-20"
                                        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-light)", color: "var(--color-foreground)" }} />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            <button onClick={() => callTool(tool.name)} disabled={callingTool === tool.name}
                              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:opacity-90 shrink-0"
                              style={{ background: "#fff", color: "#0a0a0a", opacity: callingTool === tool.name ? 0.6 : 1 }}>
                              {callingTool === tool.name ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                              Run
                            </button>
                          </div>

                          {toolResult && !callingTool && (
                            <div className="mt-2 space-y-1.5">
                              {toolResult.blocked && (
                                <div className="rounded-lg px-2.5 py-1.5 text-[11px] flex items-center gap-1.5"
                                  style={{ color: "var(--color-accent-amber)", background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)" }}>
                                  🚫 Blocked: {toolResult.error || toolResult.rule}
                                </div>
                              )}
                              <pre className="rounded-lg p-2.5 text-[11px] font-mono overflow-auto max-h-40"
                                style={{ background: "#0a0e14", color: "#e0e0e0", border: "1px solid rgba(255,255,255,0.05)" }}>
                                {JSON.stringify(toolResult.result || toolResult, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Add/Edit Server Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm" style={{ background: "rgba(0,0,0,0.6)" }}>
            <div className="rounded-2xl w-[500px] max-h-[90vh] overflow-auto shadow-2xl"
              style={{ background: "var(--bg-card)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)" }}>
              <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
                <h2 className="font-display text-base font-semibold" style={{ color: "var(--color-foreground)" }}>{editingServer ? "Edit Server" : "Add MCP Server"}</h2>
                <button onClick={closeModal} style={{ color: "var(--color-text-muted)" }}><X className="h-4 w-4" /></button>
              </div>
              <div className="px-6 py-4 space-y-4">
                <InputField label="Server Name" value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} />
                <InputField label="MCP Server URL" value={form.url} onChange={v => setForm(p => ({ ...p, url: v }))} placeholder="https://mcp.exa.ai/mcp" />
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--color-text-secondary)" }}>API Key</label>
                  <div className="flex">
                    <input type={showApiKey ? "text" : "password"} value={form.apiKey}
                      onChange={e => setForm(p => ({ ...p, apiKey: e.target.value }))}
                      placeholder={editingServer ? "Leave empty to keep existing key" : "Enter API key"}
                      className="flex-1 rounded-l-lg px-3 py-2 text-sm outline-none"
                      style={{ background: "var(--bg-surface)", border: "1px solid var(--border-light)", color: "var(--color-foreground)" }} />
                    <button onClick={() => setShowApiKey(p => !p)}
                      className="px-3 rounded-r-lg text-sm"
                      style={{ background: "var(--bg-surface)", border: "1px solid var(--border-light)", borderLeft: 0, color: "var(--color-text-muted)" }}>
                      {showApiKey ? "🙈" : "👁"}
                    </button>
                  </div>
                  {editingServer && <p className="text-[11px] mt-1" style={{ color: "var(--color-text-muted)" }}>Leave blank to keep the current key unchanged.</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--color-text-secondary)" }}>Auth Type</label>
                  <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ background: "var(--bg-surface)", border: "1px solid var(--border-light)", color: "var(--color-foreground)" }}>
                    <option value="openai">Bearer Token (Authorization)</option>
                    <option value="anthropic">x-api-key Header</option>
                    <option value="custom">Custom Header</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--color-text-secondary)" }}>Attach Policy</label>
                  <select value={form.policyId} onChange={e => setForm(p => ({ ...p, policyId: e.target.value }))}
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ background: "var(--bg-surface)", border: "1px solid var(--border-light)", color: "var(--color-foreground)" }}>
                    <option value="">No policy</option>
                    {policies.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="rounded-xl p-3 text-xs leading-relaxed" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-light)", color: "var(--color-text-muted)" }}>
                  <strong style={{ color: "var(--color-text-secondary)" }}>Exa via Smithery:</strong><br />
                  URL: <code style={{ color: "var(--color-primary)" }}>https://server.smithery.ai/@smithery/toolbox/mcp</code><br />
                  Auth: Bearer Token · Key: Your Smithery API key<br /><br />
                  <strong style={{ color: "var(--color-text-secondary)" }}>Exa MCP (direct):</strong><br />
                  URL: <code style={{ color: "var(--color-primary)" }}>https://mcp.exa.ai/mcp</code><br />
                  Auth: Custom Header (x-api-key) · Key: Your Exa API key
                </div>
              </div>
              <div className="flex justify-end gap-2 px-6 py-4 border-t" style={{ borderColor: "var(--border)" }}>
                <button onClick={closeModal} className="rounded-lg px-4 py-2 text-sm font-semibold transition"
                  style={{ background: "var(--glass-bg)", border: "1px solid var(--border-light)", color: "var(--color-text-secondary)" }}>
                  Cancel
                </button>
                <button onClick={addServer}
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                  style={{ background: "#fff", color: "#0a0a0a" }}>
                  {editingServer ? "Save Changes" : "Add Server"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageLayout></LightTheme>
  );
}

function InputField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <div>
    <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--color-text-secondary)" }}>{label}</label>
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full rounded-lg px-3 py-2 text-sm outline-none"
      style={{ background: "var(--bg-surface)", border: "1px solid var(--border-light)", color: "var(--color-foreground)" }} />
  </div>;
}
