"use client";
import { forwardRef, createContext, useContext, useState, useEffect, useRef, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface DialogContextType {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}
const DialogContext = createContext<DialogContextType>({ open: false, onOpenChange: () => {} });

export function Dialog({ open: controlledOpen, onOpenChange, children }: { open?: boolean; onOpenChange?: (v: boolean) => void; children: ReactNode }) {
  const [uncontrolled, setUncontrolled] = useState(false);
  const open = controlledOpen ?? uncontrolled;
  const onOpenChange_ = onOpenChange ?? setUncontrolled;
  return <DialogContext.Provider value={{ open, onOpenChange: onOpenChange_ }}>{children}</DialogContext.Provider>;
}

export function DialogTrigger({ children, asChild }: { children: ReactNode; asChild?: boolean }) {
  const { onOpenChange } = useContext(DialogContext);
  if (asChild) return <span onClick={() => onOpenChange(true)}>{children}</span>;
  return <button onClick={() => onOpenChange(true)}>{children}</button>;
}

export function DialogContent({ children, className }: { children: ReactNode; className?: string }) {
  const { open, onOpenChange } = useContext(DialogContext);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm" style={{ background: "rgba(0,0,0,0.6)" }} onClick={() => onOpenChange(false)}>
      <div
        className={cn("rounded-2xl border border-border bg-card/90 p-0 shadow-2xl backdrop-blur-2xl max-h-[90vh] overflow-auto", className)}
        onClick={(e) => e.stopPropagation()}
        style={{ background: "var(--bg-card, rgba(18,24,42,0.95))" }}
      >
        {children}
      </div>
    </div>
  );
}

export function DialogHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex items-center justify-between border-b border-border px-6 py-4", className)}>{children}</div>;
}

export function DialogTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={cn("font-display text-base font-semibold", className)}>{children}</h2>;
}

export function DialogFooter({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex justify-end gap-2 border-t border-border px-6 py-4", className)}>{children}</div>;
}

export { X };
