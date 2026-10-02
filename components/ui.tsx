"use client";

import {
  useEffect,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

// ----------------------------- Button -----------------------------

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "default" | "ghost" | "danger";
  size?: "sm" | "md";
};

export function Button({
  variant = "default",
  size = "md",
  className,
  ...rest
}: ButtonProps) {
  const variants = {
    primary:
      "bg-brand-600 text-white hover:bg-brand-700 border border-brand-600 shadow-sm",
    default:
      "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:border-slate-400",
    ghost: "bg-transparent text-slate-600 border border-transparent hover:bg-slate-100",
    danger: "bg-white text-rose-600 border border-rose-200 hover:bg-rose-50",
  };
  const sizes = {
    sm: "h-7 px-2.5 text-[13px]",
    md: "h-9 px-3.5 text-sm",
  };
  return (
    <button
      {...rest}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
    />
  );
}

// ----------------------------- Inputs -----------------------------

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={cn("input-base", className)} />;
}

export function Textarea({
  className,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...rest} className={cn("input-base resize-y", className)} />;
}

export function Select({
  className,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...rest} className={cn("input-base cursor-pointer pr-8", className)}>
      {children}
    </select>
  );
}

export function Field({
  label,
  required,
  hint,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label className="field-label">
        {required && <span className="mr-0.5 text-rose-500">*</span>}
        {label}
        {hint && <span className="ml-1 font-normal text-slate-400">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

// ----------------------------- Modal -----------------------------

export function Modal({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
  width = "max-w-3xl",
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-hidden bg-slate-900/40 p-4 py-8 animate-fade">
      <div
        className={cn(
          "flex max-h-[calc(100vh-4rem)] w-full flex-col rounded-xl bg-white shadow-2xl animate-pop",
          width
        )}
      >
        <div className="flex shrink-0 items-start justify-between border-b border-slate-200 px-5 py-3.5">
          <div>
            <h3 className="text-[15px] font-semibold text-slate-800">{title}</h3>
            {subtitle && (
              <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="关闭"
            className="-mr-1 -mt-1 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M4 4l8 8M12 4l-8 8"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex shrink-0 items-center justify-end gap-2 rounded-b-xl border-t border-slate-200 bg-slate-50/70 px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ----------------------------- Misc -----------------------------

export function Tag({
  children,
  color = "#64748b",
  bg,
  className,
}: {
  children: ReactNode;
  color?: string;
  bg?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium leading-4",
        className
      )}
      style={{ color, background: bg ?? `${color}14` }}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  title,
  desc,
  action,
}: {
  title: string;
  desc?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <rect x="3.5" y="5" width="17" height="15" rx="2.5" stroke="#94a3b8" strokeWidth="1.5" />
          <path d="M3.5 9.5h17" stroke="#94a3b8" strokeWidth="1.5" />
          <path d="M8 3.5v3M16 3.5v3" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      <p className="text-sm font-medium text-slate-600">{title}</p>
      {desc && <p className="mt-1 max-w-sm text-xs text-slate-400">{desc}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand-500" />
      {label ?? "加载中…"}
    </div>
  );
}

export function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  const palette = ["#3661f0", "#0ea5e9", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];
  const idx = name.charCodeAt(0) % palette.length;
  const color = palette[idx];
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-medium text-white"
      style={{
        width: size,
        height: size,
        background: color,
        fontSize: size * 0.42,
      }}
    >
      {name.slice(0, 1)}
    </span>
  );
}
