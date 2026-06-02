"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface SheetContextType { open: boolean; onOpenChange: (v: boolean) => void; }
const SheetContext = createContext<SheetContextType>({ open: false, onOpenChange: () => {} });

export function Sheet({ open: controlledOpen, onOpenChange, children }: { open?: boolean; onOpenChange?: (v: boolean) => void; children: ReactNode }) {
  const [uncontrolled, setUncontrolled] = useState(false);
  const open = controlledOpen ?? uncontrolled;
  const onOpenChange_ = onOpenChange ?? setUncontrolled;
  return <SheetContext.Provider value={{ open, onOpenChange: onOpenChange_ }}>{children}</SheetContext.Provider>;
}

export function SheetTrigger({ children }: { children: ReactNode }) {
  const { onOpenChange } = useContext(SheetContext);
  return <span onClick={() => onOpenChange(true)}>{children}</span>;
}

export function SheetContent({ children, className, side = "right" }: { children: ReactNode; className?: string; side?: "right" | "left" }) {
  const { open, onOpenChange } = useContext(SheetContext);
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-40 backdrop-blur-sm" style={{ background: "rgba(0,0,0,0.5)" }} onClick={() => onOpenChange(false)} />
      <div
        className={cn("fixed top-0 bottom-0 z-50 flex flex-col overflow-hidden shadow-2xl", side === "right" ? "right-0" : "left-0", className)}
        style={{
          width: 520, maxWidth: "100vw",
          background: "var(--bg-card, rgba(18,24,42,0.85))",
          borderLeft: side === "right" ? "1px solid var(--glass-border, rgba(59,124,244,0.12))" : "none",
          borderRight: side === "left" ? "1px solid var(--glass-border, rgba(59,124,244,0.12))" : "none",
          backdropFilter: "blur(20px)",
        }}
      >
        {children}
      </div>
    </>
  );
}

export function SheetHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("border-b border-border px-5 py-4", className)}>{children}</div>;
}

export function SheetTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h3 className={cn("font-display text-sm font-semibold", className)}>{children}</h3>;
}

export function SheetClose({ children, className }: { children: ReactNode; className?: string }) {
  const { onOpenChange } = useContext(SheetContext);
  return <button onClick={() => onOpenChange(false)} className={className}>{children ?? <X className="h-4 w-4" />}</button>;
}
