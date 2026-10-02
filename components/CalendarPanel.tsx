"use client";

import { useMemo, useState } from "react";
import type { Appointment } from "@/lib/types";
import {
  addDays,
  cn,
  dateLabel,
  isSameDay,
  monthGrid,
  toDateKey,
  toTimeLabel,
  weekdayLabel,
} from "@/lib/utils";
import { STATUS_META } from "@/lib/constants";

export function MonthCalendar({
  value,
  onChange,
  appointments,
}: {
  value: Date;
  onChange: (d: Date) => void;
  appointments: Appointment[];
}) {
  const [cursor, setCursor] = useState(() => new Date(value));
  const grid = useMemo(() => monthGrid(cursor), [cursor]);
  const today = new Date();

  const byDay = useMemo(() => {
    const m = new Map<string, Appointment[]>();
    for (const a of appointments) {
      const k = toDateKey(a.start_at);
      const list = m.get(k) ?? [];
      list.push(a);
      m.set(k, list);
    }
    return m;
  }, [appointments]);

  const shift = (n: number) => {
    const d = new Date(cursor);
    d.setMonth(d.getMonth() + n);
    setCursor(d);
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between px-1">
        <button
          onClick={() => shift(-1)}
          className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="上个月"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          onClick={() => {
            setCursor(new Date());
            onChange(new Date());
          }}
          className="text-[13px] font-semibold text-slate-700 hover:text-brand-600"
        >
          {cursor.getFullYear()} 年 {cursor.getMonth() + 1} 月
        </button>
        <button
          onClick={() => shift(1)}
          className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="下个月"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-y-0.5 text-center">
        {["一", "二", "三", "四", "五", "六", "日"].map((w) => (
          <div key={w} className="pb-1 text-[11px] font-medium text-slate-400">
            {w}
          </div>
        ))}
        {grid.map((d) => {
          const key = toDateKey(d);
          const list = byDay.get(key) ?? [];
          const outside = d.getMonth() !== cursor.getMonth();
          const selected = isSameDay(d, value);
          const isToday = isSameDay(d, today);
          const active = list.filter((a) => a.status !== "已取消" && a.status !== "爽约");
          return (
            <button
              key={key}
              onClick={() => onChange(d)}
              className={cn(
                "relative flex h-8 flex-col items-center justify-center rounded-md text-[12px] transition",
                outside ? "text-slate-300" : "text-slate-600",
                !selected && "hover:bg-slate-100",
                selected && "bg-brand-600 font-semibold text-white hover:bg-brand-600",
                !selected && isToday && "font-semibold text-brand-600 ring-1 ring-inset ring-brand-300"
              )}
            >
              {d.getDate()}
              {active.length > 0 && (
                <span className="absolute bottom-[3px] flex gap-[2px]">
                  {active.slice(0, 3).map((a, i) => (
                    <span
                      key={i}
                      className="h-[3px] w-[3px] rounded-full"
                      style={{
                        background: selected ? "#fff" : STATUS_META[a.status]?.dot ?? "#94a3b8",
                      }}
                    />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** 今日概览 + 最近预约 */
export function DaySummary({
  date,
  appointments,
  onJump,
}: {
  date: Date;
  appointments: Appointment[];
  onJump: (d: Date) => void;
}) {
  const dayList = useMemo(
    () =>
      appointments
        .filter((a) => isSameDay(a.start_at, date))
        .sort((a, b) => a.start_at.localeCompare(b.start_at)),
    [appointments, date]
  );

  const now = new Date();
  const upcoming = dayList.filter(
    (a) =>
      new Date(a.start_at).getTime() >= now.getTime() &&
      a.status !== "已取消" &&
      a.status !== "爽约" &&
      a.status !== "已完成"
  );

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of dayList) m.set(a.status, (m.get(a.status) ?? 0) + 1);
    return [...m.entries()];
  }, [dayList]);

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
        <p className="text-[13px] font-semibold text-slate-700">
          {dateLabel(date)} {weekdayLabel(date)}
        </p>
        <p className="mt-0.5 text-[11px] text-slate-400">
          共 {dayList.length} 条预约 · 待就诊 {upcoming.length} 条
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {counts.map(([status, n]) => {
            const meta = STATUS_META[status as keyof typeof STATUS_META];
            return (
              <span
                key={status}
                className="rounded px-1.5 py-0.5 text-[11px] font-medium"
                style={{ color: meta?.dot ?? "#64748b", background: `${meta?.dot ?? "#64748b"}14` }}
              >
                {status} {n}
              </span>
            );
          })}
          {counts.length === 0 && (
            <span className="text-[11px] text-slate-400">当天暂无预约</span>
          )}
        </div>
      </div>

      <div>
        <p className="mb-1.5 px-1 text-[11px] font-medium text-slate-400">
          接下来
        </p>
        <div className="space-y-1">
          {upcoming.slice(0, 6).map((a) => (
            <button
              key={a.id}
              onClick={() => onJump(new Date(a.start_at))}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition hover:bg-slate-100"
            >
              <span
                className="h-6 w-[3px] shrink-0 rounded-full"
                style={{ background: STATUS_META[a.status]?.dot }}
              />
              <span className="w-10 shrink-0 text-[12px] font-medium tabular-nums text-slate-600">
                {toDateKey(a.start_at) === toDateKey(date)
                  ? toTimeLabel(a.start_at)
                  : `${new Date(a.start_at).getMonth() + 1}/${new Date(a.start_at).getDate()}`}
              </span>
              <span className="min-w-0 flex-1 truncate text-[12px] text-slate-600">
                {a.note || a.items.join("、") || "—"}
              </span>
            </button>
          ))}
          {upcoming.length === 0 && (
            <p className="px-2 py-2 text-[12px] text-slate-400">没有待就诊预约</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function QuickNav({
  date,
  onChange,
}: {
  date: Date;
  onChange: (d: Date) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onChange(addDays(date, -1))}
        className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-[12px] text-slate-600 transition hover:bg-slate-50"
      >
        前一天
      </button>
      <button
        onClick={() => onChange(new Date())}
        className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-[12px] text-slate-600 transition hover:bg-slate-50"
      >
        今天
      </button>
      <button
        onClick={() => onChange(addDays(date, 1))}
        className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-[12px] text-slate-600 transition hover:bg-slate-50"
      >
        后一天
      </button>
    </div>
  );
}

