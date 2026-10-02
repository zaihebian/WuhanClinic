"use client";

import { useMemo } from "react";
import type { Appointment, CaseFile, Doctor } from "@/lib/types";
import {
  DAY_END_HOUR,
  DAY_START_HOUR,
  HOUR_HEIGHT,
  STATUS_META,
} from "@/lib/constants";
import { cn, isSameDay, toTimeLabel } from "@/lib/utils";

const TOTAL_H = (DAY_END_HOUR - DAY_START_HOUR) * HOUR_HEIGHT;

function minutesFromStart(iso: string) {
  const d = new Date(iso);
  return (d.getHours() - DAY_START_HOUR) * 60 + d.getMinutes();
}

/** 同一列内重叠的预约分道显示 */
function computeLanes(list: Appointment[]) {
  const sorted = [...list].sort((a, b) => a.start_at.localeCompare(b.start_at));
  const clusters: Appointment[][] = [];
  let cur: Appointment[] = [];
  let curEnd = -1;

  for (const a of sorted) {
    const s = new Date(a.start_at).getTime();
    const e = s + a.duration_min * 60000;
    if (cur.length && s < curEnd) {
      cur.push(a);
      curEnd = Math.max(curEnd, e);
    } else {
      if (cur.length) clusters.push(cur);
      cur = [a];
      curEnd = e;
    }
  }
  if (cur.length) clusters.push(cur);

  const out = new Map<string, { lane: number; lanes: number }>();
  for (const cluster of clusters) {
    const laneEnds: number[] = [];
    const assign = new Map<string, number>();
    for (const a of cluster) {
      const s = new Date(a.start_at).getTime();
      let lane = laneEnds.findIndex((end) => end <= s);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(0);
      }
      laneEnds[lane] = s + a.duration_min * 60000;
      assign.set(a.id, lane);
    }
    for (const a of cluster) {
      out.set(a.id, { lane: assign.get(a.id) ?? 0, lanes: laneEnds.length });
    }
  }
  return out;
}

export function DayBoard({
  date,
  doctors,
  appointments,
  caseById,
  onSelect,
  onCreate,
}: {
  date: Date;
  doctors: Doctor[];
  appointments: Appointment[];
  caseById: (id: string) => CaseFile | undefined;
  onSelect: (a: Appointment) => void;
  onCreate: (doctorId: string | null, time: string) => void;
}) {
  const dayAppts = useMemo(
    () => appointments.filter((a) => isSameDay(a.start_at, date)),
    [appointments, date]
  );

  const hours = useMemo(
    () => Array.from({ length: DAY_END_HOUR - DAY_START_HOUR + 1 }, (_, i) => DAY_START_HOUR + i),
    []
  );

  const nowOffset = useMemo(() => {
    if (!isSameDay(date, new Date())) return null;
    const d = new Date();
    const m = (d.getHours() - DAY_START_HOUR) * 60 + d.getMinutes();
    return m >= 0 && m <= (DAY_END_HOUR - DAY_START_HOUR) * 60 ? (m / 60) * HOUR_HEIGHT : null;
  }, [date]);

  if (doctors.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-[13px] text-slate-400">
        还没有医生，先在左下角「医生管理」里添加
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* 医生表头 */}
      <div className="flex shrink-0 border-b border-slate-200 bg-slate-50/80">
        <div className="w-[52px] shrink-0 border-r border-slate-200" />
        {doctors.map((d) => {
          const n = dayAppts.filter((a) => a.doctor_id === d.id).length;
          return (
            <div
              key={d.id}
              className="min-w-0 flex-1 border-r border-slate-200 px-2.5 py-2 last:border-r-0"
            >
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: d.color }} />
                <span className="truncate text-[13px] font-semibold text-slate-700">{d.name}</span>
                <span className="ml-auto shrink-0 rounded bg-slate-200/70 px-1 text-[11px] text-slate-500">
                  {n}
                </span>
              </div>
              <p className="mt-0.5 truncate pl-3.5 text-[11px] text-slate-400">
                {d.specialty || d.title || "—"}
              </p>
            </div>
          );
        })}
      </div>

      {/* 时间轴 */}
      <div className="min-h-0 flex-1 overflow-y-auto pt-2.5">
        <div className="flex" style={{ height: TOTAL_H }}>
          {/* 时间刻度 */}
          <div className="w-[52px] shrink-0 border-r border-slate-200 bg-white">
            {hours.map((h) => (
              <div
                key={h}
                className="relative border-b border-slate-100"
                style={{ height: HOUR_HEIGHT }}
              >
                <span className="absolute -top-2 right-1.5 text-[11px] tabular-nums text-slate-400">
                  {String(h).padStart(2, "0")}:00
                </span>
              </div>
            ))}
          </div>

          {/* 医生列 */}
          {doctors.map((d) => {
            const list = dayAppts.filter((a) => a.doctor_id === d.id);
            const lanes = computeLanes(list);
            return (
              <div
                key={d.id}
                className="relative min-w-0 flex-1 border-r border-slate-200 last:border-r-0"
                onDoubleClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const y = e.clientY - rect.top;
                  const mins = Math.round((y / HOUR_HEIGHT) * 60 / 15) * 15;
                  const h = DAY_START_HOUR + Math.floor(mins / 60);
                  const m = mins % 60;
                  onCreate(d.id, `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
                }}
              >
                {hours.map((h) => (
                  <div
                    key={h}
                    className="border-b border-slate-100"
                    style={{ height: HOUR_HEIGHT }}
                  />
                ))}

                {nowOffset !== null && (
                  <div
                    className="pointer-events-none absolute left-0 right-0 z-20"
                    style={{ top: nowOffset }}
                  >
                    <div className="relative h-0 border-t-[1.5px] border-rose-400">
                      <span className="absolute -left-1 -top-[3px] h-[6px] w-[6px] rounded-full bg-rose-400" />
                    </div>
                  </div>
                )}

                {list.map((a) => {
                  const c = caseById(a.case_id);
                  const meta = STATUS_META[a.status];
                  const top = (minutesFromStart(a.start_at) / 60) * HOUR_HEIGHT;
                  const height = Math.max((a.duration_min / 60) * HOUR_HEIGHT - 2, 26);
                  const { lane, lanes: total } = lanes.get(a.id) ?? { lane: 0, lanes: 1 };
                  const widthPct = 100 / total;
                  const isDead = a.status === "已取消" || a.status === "爽约";

                  return (
                    <button
                      key={a.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(a);
                      }}
                      className={cn(
                        "absolute overflow-hidden rounded-md border px-1.5 py-1 text-left transition hover:z-10 hover:shadow-md",
                        isDead && "opacity-60"
                      )}
                      style={{
                        top,
                        height,
                        left: `calc(${lane * widthPct}% + 2px)`,
                        width: `calc(${widthPct}% - 4px)`,
                        background: `${meta?.dot ?? "#64748b"}12`,
                        borderColor: `${meta?.dot ?? "#64748b"}55`,
                        borderLeftWidth: 3,
                        borderLeftColor: meta?.dot ?? "#64748b",
                      }}
                    >
                      <p className="flex items-center gap-1 text-[11px] font-semibold leading-4 text-slate-700">
                        <span className="tabular-nums">
                          {toTimeLabel(a.start_at)}
                        </span>
                        <span className="truncate">{c?.name ?? "未知患者"}</span>
                      </p>
                      {height > 40 && (
                        <p className="truncate text-[11px] leading-4 text-slate-500">
                          {a.items.join("、") || "—"}
                        </p>
                      )}
                      {height > 62 && (
                        <p className="truncate text-[11px] leading-4 text-slate-400">
                          {a.status}
                          {a.chair ? ` · ${a.chair}` : ""}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

