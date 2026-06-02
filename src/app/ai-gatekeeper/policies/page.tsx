"use client";
import { useState, useEffect } from "react";
import { Plus, X, Shield } from "lucide-react";
import { PageLayout } from "@/components/ui";
import { LightTheme } from "@/components/gatekeeper/light-theme";
import { AiSubNav } from "@/components/ai-gatekeeper";
import { cn } from "@/lib/utils";

const RULE_TEMPLATES = [
  { name: "Block Sensitive Keywords", type: "block_keywords", keywords: ["password", "secret", "api_key", "token"], description: "Blocks requests containing sensitive keywords" },
  { name: "Max Token Limit", type: "max_tokens", maxTokens: 2000, description: "Limits request size to prevent abuse" },
  { name: "Block System Prompt Leaks", type: "block_keywords", keywords: ["system prompt", "ignore previous", "you are now a", "act as a"], description: "Prevents prompt injection attempts" },
  { name: "Block PII Extraction", type: "block_keywords", keywords: ["ssn", "credit card", "social security", "passport"], description: "Blocks attempts to extract PII" },
];

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showRulePicker, setShowRulePicker] = useState(false);
  const [customKeywords, setCustomKeywords] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", enabled: true, rules: [] as any[], priority: 0 });

  useEffect(() => { fetchPolicies(); }, []);

  async function fetchPolicies() {
    const res = await fetch("/api/ai/policies");
    setPolicies(await res.json());
    setLoading(false);
  }

  async function savePolicy() {
    await fetch("/api/ai/policies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setShowModal(false);
    setForm({ name: "", description: "", enabled: true, rules: [], priority: 0 });
    setShowRulePicker(false);
    setShowCustomInput(false);
    setCustomKeywords("");
    fetchPolicies();
  }

  async function togglePolicy(policy: any) {
    await fetch("/api/ai/policies", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: policy.id, enabled: !policy.enabled }),
    });
    fetchPolicies();
  }

  async function deletePolicy(id: string) {
    await fetch(`/api/ai/policies?id=${id}`, { method: "DELETE" });
    fetchPolicies();
  }

  function addRule(rule: typeof RULE_TEMPLATES[0]) {
    setForm(f => ({ ...f, rules: [...f.rules, { ...rule, id: Date.now() }] }));
    setShowRulePicker(false);
  }

  function addCustomRule() {
    const keywords = customKeywords.split(",").map(k => k.trim()).filter(Boolean);
    if (keywords.length === 0) return;
    setForm(f => ({
      ...f,
      rules: [...f.rules, { id: Date.now(), name: `Custom Block: ${keywords.join(", ")}`, type: "block_keywords", keywords, description: `Blocks: ${keywords.join(", ")}` }],
    }));
    setShowCustomInput(false);
    setCustomKeywords("");
    setShowRulePicker(false);
  }

  function removeRule(id: number) {
    setForm(f => ({ ...f, rules: f.rules.filter((r: any) => r.id !== id) }));
  }

  function ruleCountColor(count: number) {
    if (count === 0) return "var(--color-text-muted)";
    if (count <= 2) return "#34d399";
    if (count <= 5) return "#fbbf24";
    return "#3b7cf4";
  }

  return (
    <LightTheme><PageLayout current="/ai-gatekeeper/policies" title="AI Policies"
      actions={
        <button onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-5 py-2.5 text-xs font-bold uppercase tracking-wider shadow-lg transition hover:opacity-85"
          style={{ boxShadow: "0 4px 20px rgba(255,255,255,0.1)" }}>
          <Plus className="h-4 w-4" /> Create Policy
        </button>
      }>
      <div className="space-y-5">
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          Block keywords, limit tokens, enforce safety rules across all MCP servers.
        </p>
        <AiSubNav />

        {/* Policies Table */}
        <div className="glass rounded-2xl overflow-hidden shadow-elegant">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: "var(--bg-surface)" }}>
                  {["Name", "Rules", "Scope", "Priority", "Status", ""].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>Loading...</td></tr>
                ) : policies.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
                    <Shield className="mx-auto h-8 w-8 mb-2 opacity-30" />
                    No policies. Create one to secure your AI usage.
                  </td></tr>
                ) : policies.map((p: any) => {
                  const rules = typeof p.rules === "string" ? JSON.parse(p.rules) : p.rules;
                  const count = rules?.length || 0;
                  return (
                    <tr key={p.id} className="border-t transition" style={{ borderColor: "var(--border-light)" }}>
                      <td className="px-4 py-3">
                        <div className="text-sm font-semibold" style={{ color: "var(--color-foreground)" }}>{p.name}</div>
                        {p.description && <div className="text-[11px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>{p.description}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded px-1.5 py-0.5 text-[11px] font-semibold border"
                          style={{ color: ruleCountColor(count), borderColor: `${ruleCountColor(count)}40`, background: `${ruleCountColor(count)}10` }}>
                          {count} rules
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded border border-border px-1.5 py-0.5 text-[10px] font-semibold uppercase" style={{ color: "var(--color-text-muted)" }}>
                          {p.scope || "global"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: "var(--color-text-secondary)" }}>{p.priority}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => togglePolicy(p)}
                          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold transition cursor-pointer"
                          style={{
                            background: p.enabled ? "rgba(52,211,153,0.15)" : "rgba(255,255,255,0.05)",
                            color: p.enabled ? "#34d399" : "var(--color-text-muted)",
                            border: p.enabled ? "1px solid rgba(52,211,153,0.2)" : "1px solid var(--border-light)",
                            backdropFilter: "blur(8px)",
                          }}>
                          <span className={cn("h-1.5 w-1.5 rounded-full", p.enabled ? "bg-[#34d399]" : "bg-current")} />
                          {p.enabled ? "Enabled" : "Disabled"}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => deletePolicy(p.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-md transition"
                          style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)" }}>
                          <X className="h-3 w-3" style={{ color: "var(--color-accent-red)" }} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create Policy Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm" style={{ background: "rgba(0,0,0,0.6)" }}>
            <div className="rounded-2xl w-[540px] max-h-[90vh] overflow-auto shadow-2xl"
              style={{ background: "var(--bg-card)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)" }}>
              <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
                <h2 className="font-display text-base font-semibold" style={{ color: "var(--color-foreground)" }}>Create AI Policy</h2>
                <button onClick={() => { setShowModal(false); setShowRulePicker(false); setShowCustomInput(false); }} style={{ color: "var(--color-text-muted)" }}><X className="h-4 w-4" /></button>
              </div>
              <div className="px-6 py-4 space-y-4">
                <InputField label="Policy Name" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} />
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--color-text-secondary)" }}>Description</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2}
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-vertical"
                    style={{ background: "var(--bg-surface)", border: "1px solid var(--border-light)", color: "var(--color-foreground)" }} />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--color-text-secondary)" }}>Rules</label>
                  <div className="flex flex-col gap-2">
                    {form.rules.map((r: any) => (
                      <div key={r.id} className="flex items-center gap-2 rounded-xl px-3 py-2.5"
                        style={{ background: "var(--bg-surface)", border: "1px solid var(--border-light)" }}>
                        <div className="flex-1">
                          <span className="text-xs font-semibold" style={{ color: "var(--color-text-secondary)" }}>{r.name}</span>
                          <span className="inline-flex rounded border border-border px-1.5 py-0.5 text-[10px] font-semibold ml-2" style={{ color: "var(--color-text-muted)" }}>{r.type}</span>
                          {r.keywords && <div className="text-[10px] mt-1" style={{ color: "var(--color-text-muted)" }}>Keywords: {r.keywords.join(", ")}</div>}
                          {r.maxTokens && <div className="text-[10px] mt-1" style={{ color: "var(--color-text-muted)" }}>Max tokens: {r.maxTokens}</div>}
                        </div>
                        <button onClick={() => removeRule(r.id)} style={{ color: "var(--color-accent-red)", border: "none", background: "none", cursor: "pointer", fontSize: 16 }}>×</button>
                      </div>
                    ))}
                    <button onClick={() => setShowRulePicker(true)}
                      className="w-full rounded-xl px-3 py-2.5 text-xs font-semibold transition"
                      style={{ border: "1px dashed var(--border)", color: "var(--color-text-secondary)", background: "transparent" }}>
                      + Add Rule
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--color-text-secondary)" }}>Priority</label>
                  <input type="number" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: parseInt(e.target.value) || 0 }))}
                    className="rounded-lg px-3 py-2 text-sm outline-none"
                    style={{ width: 100, background: "var(--bg-surface)", border: "1px solid var(--border-light)", color: "var(--color-foreground)" }} />
                </div>
              </div>
              <div className="flex justify-end gap-2 px-6 py-4 border-t" style={{ borderColor: "var(--border)" }}>
                <button onClick={() => { setShowModal(false); setShowRulePicker(false); setShowCustomInput(false); }}
                  className="rounded-lg px-4 py-2 text-sm font-semibold transition"
                  style={{ background: "var(--glass-bg)", border: "1px solid var(--border-light)", color: "var(--color-text-secondary)" }}>
                  Cancel
                </button>
                <button onClick={savePolicy}
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                  style={{ background: "#fff", color: "#0a0a0a" }}>
                  Create Policy
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Rule Picker Modal */}
        {showRulePicker && (
          <div className="fixed inset-0 z-[51] flex items-center justify-center backdrop-blur-sm" style={{ background: "rgba(0,0,0,0.6)" }}>
            <div className="rounded-2xl w-[480px] shadow-2xl"
              style={{ background: "var(--bg-card)", border: "1px solid var(--glass-border)", backdropFilter: "blur(20px)" }}>
              <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: "var(--border)" }}>
                <h3 className="font-display text-sm font-semibold" style={{ color: "var(--color-foreground)" }}>Choose Rule Template</h3>
                <button onClick={() => setShowRulePicker(false)} style={{ color: "var(--color-text-muted)" }}><X className="h-4 w-4" /></button>
              </div>
              <div className="p-3 space-y-1.5 max-h-[400px] overflow-auto">
                {RULE_TEMPLATES.map((rule, i) => (
                  <div key={i} onClick={() => addRule(rule)}
                    className="rounded-xl px-3.5 py-3 cursor-pointer transition"
                    style={{ background: "var(--bg-surface)", border: "1px solid var(--border-light)" }}>
                    <div className="text-sm font-semibold" style={{ color: "var(--color-foreground)" }}>{rule.name}</div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>{rule.description}</div>
                  </div>
                ))}
                <div onClick={() => setShowCustomInput(true)}
                  className="rounded-xl px-3.5 py-3 cursor-pointer transition"
                  style={{ background: "rgba(59,124,244,0.05)", border: "1px dashed var(--color-primary)" }}>
                  <div className="text-sm font-semibold" style={{ color: "var(--color-primary)" }}>✎ Custom Keywords</div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>Type your own comma-separated keywords to block</div>
                </div>
                {showCustomInput && (
                  <div className="rounded-xl p-3.5" style={{ background: "rgba(59,124,244,0.08)", border: "1px solid var(--color-primary)" }}>
                    <div className="text-xs font-semibold mb-1.5" style={{ color: "var(--color-text-secondary)" }}>Enter keywords (comma-separated):</div>
                    <div className="flex gap-2">
                      <input value={customKeywords} onChange={e => setCustomKeywords(e.target.value)}
                        placeholder="e.g. Instagram, Facebook, Twitter"
                        className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
                        style={{ background: "var(--bg-surface)", border: "1px solid var(--border-light)", color: "var(--color-foreground)" }}
                        onKeyDown={e => { if (e.key === "Enter") addCustomRule(); }} />
                      <button onClick={addCustomRule}
                        className="rounded-lg px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                        style={{ background: "#fff", color: "#0a0a0a" }}>
                        Add
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-end px-5 py-3 border-t" style={{ borderColor: "var(--border)" }}>
                <button onClick={() => { setShowRulePicker(false); setShowCustomInput(false); setCustomKeywords(""); }}
                  className="rounded-lg px-4 py-2 text-sm font-semibold transition"
                  style={{ background: "var(--glass-bg)", border: "1px solid var(--border-light)", color: "var(--color-text-secondary)" }}>
                  Close
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
