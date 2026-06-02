"use client";
import { createContext, useContext, useState, useRef, useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

interface SelectContextType {
  value: string;
  onValueChange: (v: string) => void;
  open: boolean;
  setOpen: (v: boolean) => void;
}
const SelectContext = createContext<SelectContextType>({ value: "", onValueChange: () => {}, open: false, setOpen: () => {} });

export function Select({ value, onValueChange, children }: { value?: string; onValueChange?: (v: string) => void; children: ReactNode }) {
  const [uncontrolled, setUncontrolled] = useState("");
  const [open, setOpen] = useState(false);
  return <SelectContext.Provider value={{ value: value ?? uncontrolled, onValueChange: onValueChange ?? setUncontrolled, open, setOpen }}>{children}</SelectContext.Provider>;
}

export function SelectTrigger({ children, className }: { children: ReactNode; className?: string }) {
  const { open, setOpen } = useContext(SelectContext);
  return (
    <button onClick={() => setOpen(!open)} className={cn("inline-flex items-center justify-between gap-2 rounded-lg border border-border bg-background/40 px-3 py-2 text-sm transition hover:bg-card/60", className)}>
      {children}
      <ChevronDown className="h-3.5 w-3.5 opacity-50" />
    </button>
  );
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  const { value } = useContext(SelectContext);
  return <span>{value || placeholder || "Select..."}</span>;
}

export function SelectContent({ children, className }: { children: ReactNode; className?: string }) {
  const { open } = useContext(SelectContext);
  if (!open) return null;
  return (
    <div className={cn("absolute z-50 mt-1 rounded-xl border border-border bg-card/95 p-1 shadow-2xl backdrop-blur-2xl min-w-[var(--radix-select-trigger-width)]", className)}
      style={{ background: "var(--bg-elevated, #1a2236)" }}>
      {children}
    </div>
  );
}

export function SelectItem({ value, children, className }: { value: string; children: ReactNode; className?: string }) {
  const { value: selectedValue, onValueChange, setOpen } = useContext(SelectContext);
  const active = selectedValue === value;
  return (
    <button
      onClick={() => { onValueChange(value); setOpen(false); }}
      className={cn("flex w-full items-center rounded-lg px-2.5 py-1.5 text-sm transition", active ? "bg-primary/15 text-primary font-semibold" : "hover:bg-card/60", className)}
    >
      {children}
    </button>
  );
}
