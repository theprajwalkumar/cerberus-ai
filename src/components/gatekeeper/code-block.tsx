import { cn } from "@/lib/utils";

export function CodeBlock({ code, lang, maxHeight, className }: { code: string; lang?: string; maxHeight?: number; className?: string }) {
  return (
    <div
      className={cn("rounded-xl border font-mono text-xs leading-relaxed overflow-auto", className)}
      style={{
        background: "#0a0e14", color: "#e0e0e0",
        borderColor: "rgba(255,255,255,0.05)",
        maxHeight: maxHeight || 400,
        boxShadow: "inset 0 0 30px rgba(0,0,0,0.3)",
      }}
    >
      {lang && (
        <div className="sticky top-0 flex items-center gap-2 px-3 py-1.5 text-[10px] uppercase tracking-wider opacity-50"
          style={{ background: "#0a0e14", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <span className="h-2 w-2 rounded-full bg-[#f87171]" />
          <span className="h-2 w-2 rounded-full bg-[#fbbf24]" />
          <span className="h-2 w-2 rounded-full bg-[#34d399]" />
          <span className="ml-auto">{lang}</span>
        </div>
      )}
      <pre className="p-3 whitespace-pre-wrap">{code}</pre>
    </div>
  );
}
