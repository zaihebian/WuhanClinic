"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useData } from "@/components/DataProvider";
import { MonthCalendar, DaySummary, QuickNav } from "@/components/CalendarPanel";
import { DayBoard } from "@/components/DayBoard";
import { AppointmentDialog } from "@/components/AppointmentDialog";
import { Button, Input, Spinner } from "@/components/ui";
import type { Appointment } from "@/lib/types";
import { dateLabel, fullDateLabel, isSameDay, weekdayLabel } from "@/lib/utils";
import { APPT_STATUSES } from "@/lib/constants";

type DialogState = {
  appointment?: Appointment;
  date?: Date;
  doctorId?: string | null;
  time?: string;
  caseId?: string;
} | null;

export default function SchedulePage() {
  const router = useRouter();
  const { doctors, appointments, caseById, loading, error, mode } = useData();

  const [date, setDate] = useState(() => new Date());
  const [dialog, setDialog] = useState<DialogState>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  // 从「病例 → 保存并预约」跳回来时，直接打开预约弹窗并带上患者
  useEffect(() => {
    const book = new URLSearchParams(window.location.search).get("book");
    if (!book) return;
    setDialog({ date: new Date(), caseId: book });
    window.history.replaceState(null, "", "/");
  }, []);

  const visibleDoctors = useMemo(
    () => doctors.filter((d) => d.active && !hidden.has(d.id)),
    [doctors, hidden]
  );

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return appointments.filter((a) => {
      if (statusFilter && a.status !== statusFilter) return false;
      if (!kw) return true;
      const c = caseById(a.case_id);
      return (
        (c?.name ?? "").toLowerCase().includes(kw) ||
        (c?.phone ?? "").includes(kw) ||
        a.items.join(" ").toLowerCase().includes(kw)
      );
    });
  }, [appointments, keyword, statusFilter, caseById]);

  const todayCount = useMemo(
    () =>
      appointments.filter(
        (a) => isSameDay(a.start_at, new Date()) && a.status !== "已取消"
      ).length,
    [appointments]
  );

  const toggleDoctor = (id: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      {/* 左侧：月历 + 概览 */}
      <aside className="no-print flex w-[236px] shrink-0 flex-col gap-4 overflow-y-auto border-r border-slate-200 bg-white p-3.5">
        <MonthCalendar value={date} onChange={setDate} appointments={appointments} />
        <div className="border-t border-slate-100 pt-3">
          <DaySummary date={date} appointments={appointments} onJump={setDate} />
        </div>
      </aside>

      {/* 右侧：工具栏 + 看板 */}
      <div className="flex min-w-0 flex-1 flex-col gap-3 p-3.5">
        <header className="no-print flex flex-wrap items-center gap-2">
          <div>
            <h1 className="flex items-baseline gap-2 text-[17px] font-semibold text-slate-800">
              {dateLabel(date)}
              <span className="text-[13px] font-normal text-slate-400">
                {weekdayLabel(date)}
              </span>
              {isSameDay(date, new Date()) && (
                <span className="rounded bg-brand-50 px-1.5 py-0.5 text-[11px] font-medium text-brand-600">
                  今天
                </span>
              )}
            </h1>
            <p className="mt-0.5 text-[11px] text-slate-400">
              {fullDateLabel(date)} · 今日共 {todayCount} 条预约
              {mode === "local" && " · 本地演示数据"}
            </p>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <QuickNav date={date} onChange={setDate} />
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索患者 / 手机 / 项目"
              className="w-44"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-base w-28 cursor-pointer"
            >
              <option value="">全部状态</option>
              {APPT_STATUSES.map((s) => (
                <option key={s.value}>{s.value}</option>
              ))}
            </select>
            <Button
              variant="primary"
              onClick={() => setDialog({ date, doctorId: visibleDoctors[0]?.id ?? null })}
            >
              ＋ 新建预约
            </Button>
          </div>
        </header>

        {/* 医生筛选 */}
        <div className="no-print flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[12px] text-slate-400">医生</span>
          {doctors.map((d) => {
            const off = hidden.has(d.id) || !d.active;
            return (
              <button
                key={d.id}
                onClick={() => toggleDoctor(d.id)}
                className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] transition"
                style={{
                  borderColor: off ? "#e2e8f0" : `${d.color}66`,
                  background: off ? "#fff" : `${d.color}12`,
                  color: off ? "#94a3b8" : "#334155",
                }}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: off ? "#cbd5e1" : d.color }}
                />
                {d.name}
              </button>
            );
          })}
          {hidden.size > 0 && (
            <button
              onClick={() => setHidden(new Set())}
              className="ml-1 text-[12px] text-brand-600 hover:underline"
            >
              显示全部
            </button>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-700">
            数据读取失败：{error}
            <span className="ml-2 text-rose-500">
              （检查 Supabase 环境变量与建表脚本是否已执行）
            </span>
          </div>
        )}

        {loading ? (
          <div className="card flex-1">
            <Spinner />
          </div>
        ) : (
          <DayBoard
            date={date}
            doctors={visibleDoctors}
            appointments={filtered}
            caseById={caseById}
            onSelect={(a) => setDialog({ appointment: a })}
            onCreate={(doctorId, time) => setDialog({ date, doctorId, time })}
          />
        )}
      </div>

      <AppointmentDialog
        open={dialog !== null}
        initial={dialog}
        onClose={() => setDialog(null)}
        onOpenCase={(caseId) => {
          setDialog(null);
          router.push(`/cases/${caseId}`);
        }}
      />
    </div>
  );
}
