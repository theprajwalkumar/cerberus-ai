"use client";

import { useState } from "react";
import { Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { PageLayout, Btn } from "@/components/ui";
import { LightTheme } from "@/components/gatekeeper/light-theme";
import { AiSubNav } from "@/components/ai-gatekeeper";

export default function SettingsPage() {
  const [pollingInterval, setPollingInterval] = useState(3000);
  const [maxLogs, setMaxLogs] = useState(500);

  function handleSave() {
    toast.success("Settings saved");
  }

  function handleReset() {
    setPollingInterval(3000);
    setMaxLogs(500);
    toast.success("Settings reset to defaults");
  }

  return (
    <LightTheme><PageLayout current="/ai-gatekeeper/settings" title="Settings">
      <div className="space-y-5">
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          Configure AI GateKeeper behaviour and preferences.
        </p>
        <AiSubNav />

        <div className="glass rounded-2xl p-6 shadow-elegant space-y-5">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold" style={{ color: "var(--color-foreground)" }}>Logging</h3>
            <div className="grid gap-4 max-w-md">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--color-text-secondary)" }}>
                  Auto-refresh interval (ms)
                </label>
                <input type="number" value={pollingInterval} onChange={e => setPollingInterval(Number(e.target.value))}
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ background: "var(--bg-surface)", border: "1px solid var(--border-light)", color: "var(--color-foreground)" }} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: "var(--color-text-secondary)" }}>
                  Max bridge logs to display
                </label>
                <input type="number" value={maxLogs} onChange={e => setMaxLogs(Number(e.target.value))}
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ background: "var(--bg-surface)", border: "1px solid var(--border-light)", color: "var(--color-foreground)" }} />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={handleSave}
              className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90"
              style={{ background: "#fff", color: "#0a0a0a" }}>
              <Save className="h-3.5 w-3.5" /> Save Settings
            </button>
            <button onClick={handleReset}
              className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition"
              style={{ background: "var(--glass-bg)", border: "1px solid var(--border-light)", color: "var(--color-text-secondary)" }}>
              <RotateCcw className="h-3.5 w-3.5" /> Reset Defaults
            </button>
          </div>
        </div>
      </div>
    </PageLayout></LightTheme>
  );
}
