"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useData } from "./DataProvider";
import { Button, Field, Input, Modal, Select, Textarea } from "./ui";
import {
  APPOINTMENT_SOURCES,
  APPT_STATUSES,
  BOOKING_TYPES,
  CHAIRS,
  ITEM_GROUPS,
  VISIT_TYPES,
} from "@/lib/constants";
import type { Appointment, AppointmentStatus, CaseFile } from "@/lib/types";
import { cn, toDateKey, toTimeLabel } from "@/lib/utils";

const DURATIONS = [15, 30, 45, 60, 90, 120, 180];

type Draft = {
  id?: string;
  case_id: string;
  doctor_id: string | null;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  duration_min: number;
  status: AppointmentStatus;
  visit_type: string;
  booking_type: string;
  items: string[];
  chair: string | null;
  assistant: string | null;
  source: string | null;
  note: string | null;
};

function emptyDraft(date: Date, doctorId: string | null, time = "09:00"): Draft {
  return {
    case_id: "",
    doctor_id: doctorId,
    date: toDateKey(date),
    time,
    duration_min: 30,
    status: "预约",
    visit_type: "初诊",
    booking_type: "普通",
    items: [],
    chair: null,
    assistant: null,
    source: null,
    note: null,
  };
}

// --------------------------- 患者选择器 ---------------------------

function PatientPicker({
  value,
  onChange,
  onCreate,
}: {
  value: string;
  onChange: (id: string) => void;
  onCreate: (name: string, phone: string) => Promise<CaseFile>;
}) {
  const { cases } = useData();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);

  const selected = cases.find((c) => c.id === value);

  const results = useMemo(() => {
    const kw = q.trim().toLowerCase();
    const list = kw
      ? cases.filter(
          (c) =>
            c.name.toLowerCase().includes(kw) ||
            (c.phone ?? "").includes(kw) ||
            c.chart_no.includes(kw)
        )
      : cases;
    return list.slice(0, 40);
  }, [cases, q]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const exact = cases.some((c) => c.name === q.trim());

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="input-base flex items-center justify-between text-left"
      >
        {selected ? (
          <span className="flex items-center gap-2">
            <span className="font-medium text-slate-800">{selected.name}</span>
            <span className="text-slate-400">
              {selected.gender} · {selected.phone || "无手机"}
            </span>
          </span>
        ) : (
          <span className="text-slate-400">搜索患者姓名 / 手机 / 病历号</span>
        )}
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="shrink-0 text-slate-400">
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-30 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 p-2">
            <Input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="输入姓名 / 手机号 / 病历号"
            />
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {results.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  onChange(c.id);
                  setOpen(false);
                  setQ("");
                }}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] transition hover:bg-slate-50",
                  c.id === value && "bg-brand-50"
                )}
              >
                <span className="font-medium text-slate-700">{c.name}</span>
                <span className="text-[11px] text-slate-400">
                  {c.gender}
                  {c.birth_date ? ` · ${new Date().getFullYear() - new Date(c.birth_date).getFullYear()}岁` : ""}
                </span>
                <span className="ml-auto text-[11px] text-slate-400">
                  {c.phone || c.chart_no}
                </span>
              </button>
            ))}
            {results.length === 0 && (
              <p className="px-3 py-3 text-center text-[12px] text-slate-400">
                没有匹配的病例
              </p>
            )}
          </div>
          {q.trim() && !exact && (
            <button
              type="button"
              onClick={async () => {
                const created = await onCreate(q.trim(), "");
                onChange(created.id);
                setOpen(false);
                setQ("");
              }}
              className="w-full border-t border-slate-100 bg-brand-50/60 px-3 py-2 text-left text-[13px] font-medium text-brand-700 transition hover:bg-brand-50"
            >
              ＋ 新建病例「{q.trim()}」
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// --------------------------- 主弹窗 ---------------------------

export function AppointmentDialog({
  open,
  initial,
  onClose,
  onOpenCase,
}: {
  open: boolean;
  /** 传入已有预约 = 编辑；传入 { date, doctorId, time, caseId } = 新建 */
  initial: {
    appointment?: Appointment;
    date?: Date;
    doctorId?: string | null;
    time?: string;
    caseId?: string;
  } | null;
  onClose: () => void;
  onOpenCase?: (caseId: string) => void;
}) {
  const { doctors, saveAppointment, deleteAppointment, saveCase, caseById } = useData();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // 医生列表用 ref 读取，避免它变化时把正在编辑的草稿重置掉
  const doctorsRef = useRef(doctors);
  doctorsRef.current = doctors;

  useEffect(() => {
    if (!open || !initial) return;
    setErr(null);
    if (initial.appointment) {
      const a = initial.appointment;
      setDraft({
        id: a.id,
        case_id: a.case_id,
        doctor_id: a.doctor_id,
        date: toDateKey(a.start_at),
        time: toTimeLabel(a.start_at),
        duration_min: a.duration_min,
        status: a.status,
        visit_type: a.visit_type,
        booking_type: a.booking_type,
        items: [...a.items],
        chair: a.chair,
        assistant: a.assistant,
        source: a.source,
        note: a.note,
      });
    } else {
      const next = emptyDraft(
        initial.date ?? new Date(),
        initial.doctorId ?? doctorsRef.current[0]?.id ?? null,
        initial.time ?? "09:00"
      );
      next.case_id = initial.caseId ?? "";
      setDraft(next);
    }
  }, [open, initial]);

  const patient = draft ? caseById(draft.case_id) : undefined;

  if (!open || !draft) return null;

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) =>
    setDraft((d) => (d ? { ...d, [k]: v } : d));

  const toggleItem = (item: string) =>
    setDraft((d) =>
      d
        ? {
            ...d,
            items: d.items.includes(item)
              ? d.items.filter((x) => x !== item)
              : [...d.items, item],
          }
        : d
    );

  const submit = async (closeAfter = true) => {
    if (!draft.case_id) {
      setErr("请先选择患者");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const start = new Date(`${draft.date}T${draft.time}:00`);
      await saveAppointment({
        id: draft.id,
        case_id: draft.case_id,
        doctor_id: draft.doctor_id,
        start_at: start.toISOString(),
        duration_min: draft.duration_min,
        status: draft.status,
        visit_type: draft.visit_type,
        booking_type: draft.booking_type,
        items: draft.items,
        chair: draft.chair,
        assistant: draft.assistant,
        source: draft.source,
        note: draft.note,
      });
      if (closeAfter) onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!draft.id) return;
    if (!window.confirm("确定删除这条预约？")) return;
    setBusy(true);
    try {
      await deleteAppointment(draft.id);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      title={draft.id ? "编辑预约" : "新建预约"}
      subtitle={`${draft.date} ${draft.time} · 时长 ${draft.duration_min} 分钟`}
      onClose={onClose}
      width="max-w-4xl"
      footer={
        <>
          {err && <span className="mr-auto text-[12px] text-rose-600">{err}</span>}
          {draft.id && (
            <Button variant="danger" onClick={remove} disabled={busy}>
              删除预约
            </Button>
          )}
          <Button onClick={onClose} disabled={busy}>
            取消
          </Button>
          <Button variant="primary" onClick={() => submit()} disabled={busy}>
            {draft.id ? "保存修改" : "创建预约"}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-3 gap-x-5 gap-y-4">
        {/* 患者信息 */}
        <section className="col-span-3">
          <p className="section-title">患者信息</p>
          <div className="grid grid-cols-3 gap-3">
            <Field label="患者" required className="col-span-2">
              <PatientPicker
                value={draft.case_id}
                onChange={(id) => set("case_id", id)}
                onCreate={async (name, phone) => {
                  const chart_no = `26${String(Date.now()).slice(-8)}`;
                  const created = await saveCase({
                    name,
                    gender: "未知",
                    patient_type: "普通",
                    chart_no,
                    birth_date: null,
                    birth_unknown: true,
                    photo_url: null,
                    phone: phone || null,
                    phone_owner: phone ? "本人" : null,
                    tel: null,
                    tel_owner: null,
                    workplace: null,
                    province: null,
                    city: null,
                    district: null,
                    address: null,
                    source: null,
                    tags: [],
                    note: null,
                    allergy: null,
                    past_history: null,
                    medication: null,
                    doctor_id: draft.doctor_id,
                    first_visit_date: draft.date,
                    first_visit_doctor_id: draft.doctor_id,
                    chief_complaint: null,
                    symptoms: null,
                    preliminary_diagnosis: null,
                    group_name: null,
                  });
                  return created;
                }}
              />
            </Field>
            <Field label="手机">
              <Input value={patient?.phone ?? ""} disabled placeholder="—" />
            </Field>
            <Field label="病历号">
              <Input value={patient?.chart_no ?? ""} disabled placeholder="—" />
            </Field>
            <Field label="患者类型">
              <Input value={patient?.patient_type ?? ""} disabled placeholder="—" />
            </Field>
            <div className="flex items-end">
              {patient && onOpenCase && (
                <Button onClick={() => onOpenCase(patient.id)} className="w-full">
                  查看病例
                </Button>
              )}
            </div>
            <Field label="患者备注" className="col-span-3">
              <Textarea rows={2} value={patient?.note ?? ""} disabled placeholder="—" />
            </Field>
          </div>
        </section>

        {/* 预约信息 */}
        <section className="col-span-3">
          <p className="section-title">预约信息</p>
          <div className="grid grid-cols-4 gap-3">
            <Field label="就诊类型">
              <Select value={draft.visit_type} onChange={(e) => set("visit_type", e.target.value)}>
                {VISIT_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </Select>
            </Field>
            <Field label="预约类型">
              <Select value={draft.booking_type} onChange={(e) => set("booking_type", e.target.value)}>
                {BOOKING_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </Select>
            </Field>
            <Field label="状态">
              <Select
                value={draft.status}
                onChange={(e) => set("status", e.target.value as AppointmentStatus)}
              >
                {APPT_STATUSES.map((s) => (
                  <option key={s.value}>{s.value}</option>
                ))}
              </Select>
            </Field>
            <Field label="预约来源">
              <Select
                value={draft.source ?? ""}
                onChange={(e) => set("source", e.target.value || null)}
              >
                <option value="">未指定</option>
                {APPOINTMENT_SOURCES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
            </Field>

            <Field label="预约日期">
              <Input type="date" value={draft.date} onChange={(e) => set("date", e.target.value)} />
            </Field>
            <Field label="开始时间">
              <Input type="time" value={draft.time} onChange={(e) => set("time", e.target.value)} />
            </Field>
            <Field label="持续时间">
              <Select
                value={draft.duration_min}
                onChange={(e) => set("duration_min", Number(e.target.value))}
              >
                {DURATIONS.map((m) => (
                  <option key={m} value={m}>
                    {m} 分钟
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="医生">
              <Select
                value={draft.doctor_id ?? ""}
                onChange={(e) => set("doctor_id", e.target.value || null)}
              >
                <option value="">未指定医生</option>
                {doctors
                  .filter((d) => d.active || d.id === draft.doctor_id)
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                      {d.title ? `（${d.title}）` : ""}
                    </option>
                  ))}
              </Select>
            </Field>

            <Field label="诊室 / 牙椅">
              <Select value={draft.chair ?? ""} onChange={(e) => set("chair", e.target.value || null)}>
                <option value="">未指定</option>
                {CHAIRS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </Field>
            <Field label="助理">
              <Input
                value={draft.assistant ?? ""}
                onChange={(e) => set("assistant", e.target.value || null)}
                placeholder="如：小陈"
              />
            </Field>
            <Field label="预约备注" className="col-span-2">
              <Input
                value={draft.note ?? ""}
                onChange={(e) => set("note", e.target.value || null)}
                placeholder="如：初诊，主诉右上后牙冷热痛"
              />
            </Field>
          </div>
        </section>

        {/* 预约项目 */}
        <section className="col-span-3">
          <p className="section-title">
            预约项目
            {draft.items.length > 0 && (
              <span className="font-normal text-brand-600">已选 {draft.items.length} 项</span>
            )}
          </p>
          <div className="space-y-2.5 rounded-lg border border-slate-200 bg-slate-50/50 p-3">
            {ITEM_GROUPS.map((g) => (
              <div key={g.group} className="flex gap-3">
                <span className="w-16 shrink-0 pt-0.5 text-[12px] font-medium text-slate-500">
                  {g.group}
                </span>
                <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                  {g.items.map((it) => (
                    <label
                      key={it}
                      className="flex cursor-pointer items-center gap-1.5 text-[13px] text-slate-600"
                    >
                      <input
                        type="checkbox"
                        checked={draft.items.includes(it)}
                        onChange={() => toggleItem(it)}
                        className="h-3.5 w-3.5 rounded border-slate-300 accent-brand-600"
                      />
                      {it}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Modal>
  );
}
