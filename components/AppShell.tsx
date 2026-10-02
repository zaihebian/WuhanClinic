"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useData } from "./DataProvider";
import { DoctorDialog } from "./DoctorDialog";
import { CLINIC_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

const NAV = [
  {
    href: "/",
    label: "日程",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="5" width="18" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
        <path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        <path d="M8 14h3v3H8z" fill="currentColor" opacity=".85" />
      </svg>
    ),
  },
  {
    href: "/cases",
    label: "病例",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
        <path
          d="M6 3.5h9L19.5 8v12a1.5 1.5 0 01-1.5 1.5H6A1.5 1.5 0 014.5 20V5A1.5 1.5 0 016 3.5z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        <path d="M14.5 3.5V8H19" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M8 12h8M8 15.5h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    ),
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { mode, doctors, loading } = useData();
  const [doctorOpen, setDoctorOpen] = useState(false);

  return (
    <div className="print-root flex h-screen overflow-hidden">
      {/* 侧边栏 */}
      <aside className="no-print flex w-[196px] shrink-0 flex-col bg-slate-900">
        <div className="flex h-14 items-center gap-2 px-4">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500 text-[13px] font-bold text-white">
            牙
          </span>
          <span className="text-[15px] font-semibold tracking-wide text-white">
            {CLINIC_NAME}
          </span>
        </div>

        <nav className="mt-1 flex flex-col gap-0.5 px-2.5">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition",
                  active
                    ? "bg-brand-600 font-medium text-white shadow-sm"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-2 px-2.5 pb-3">
          <button
            onClick={() => setDoctorOpen(true)}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.7" />
              <path d="M4.5 20c0-3.6 3.4-6 7.5-6s7.5 2.4 7.5 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
            医生管理
            <span className="ml-auto rounded bg-white/10 px-1.5 text-[11px] text-slate-300">
              {loading ? "…" : doctors.length}
            </span>
          </button>

          <div className="rounded-lg bg-white/5 px-2.5 py-1.5 text-[11px] leading-4 text-slate-400">
            {mode === "supabase" ? (
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                已连接 Supabase
              </span>
            ) : (
              <>
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                  本地演示模式
                </span>
                <span className="mt-0.5 block text-[10px] leading-4 text-slate-500">
                  数据存本地，配 Supabase 后切云端
                </span>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* 主内容 */}
      <main className="print-main flex min-w-0 flex-1 flex-col overflow-hidden bg-[#f4f6fa]">
        {children}
      </main>

      <DoctorDialog open={doctorOpen} onClose={() => setDoctorOpen(false)} />
    </div>
  );
}
