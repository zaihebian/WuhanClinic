"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useData } from "@/components/DataProvider";
import { CaseForm, type CaseDraft } from "@/components/CaseForm";
import { AppointmentDialog } from "@/components/AppointmentDialog";
import { Button, EmptyState, Spinner, Tag } from "@/components/ui";
import { STATUS_META } from "@/lib/constants";
import type { Appointment } from "@/lib/types";
import { ageFrom, cn, dateLabel, toTimeLabel, weekdayLabel } from "@/lib/utils";

export default function CaseDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const {
    cases,
    appointments,
    doctorById,
    saveCase,
    deleteCase,
    deleteAppointment,
    loading,
  } = useData();

  const record = cases.find((c) => c.id === id);

  const [draft, setDraft] = useState<CaseDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apptOpen, setApptOpen] = useState(false);
  const [editingAppt, setEditingAppt] = useState<Appointment | undefined>(undefined);

  useEffect(() => {
    if (!record) return;
    const { id: _id, created_at: _c, updated_at: _u, ...rest } = record;
    setDraft(rest);
  }, [record]);

  const myAppointments = useMemo(
    () =>
      appointments
        .filter((a) => a.case_id === id)
        .sort((a, b) => b.start_at.localeCompare(a.start_at)),
    [appointments, id]
  );

  // 保持引用稳定，否则弹窗里的草稿会被反复重置
  const apptInitial = useMemo(
    () => ({ appointment: editingAppt, caseId: id, date: new Date() }),
    [editingAppt, id]
  );

  const save = async () => {
    if (!draft || !id) return;
    setBusy(true);
    setError(null);
    try {
      await saveCase({ ...draft, id, name: draft.name.trim() });
      setBusy(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!id || !record) return;
    if (
      !window.confirm(
        `删除病例「${record.name}」会同时删除其 ${myAppointments.length} 条预约记录，且不可恢复。确定删除？`
      )
    )
      return;
    await deleteCase(id);
    router.push("/cases");
  };

  if (loading) {
    return (
      <div className="flex-1 p-4">
        <div className="card">
          <Spinner />
        </div>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="flex-1 p-4">
        <div className="card">
          <EmptyState
            title="病例不存在"
            desc="该病例可能已被删除"
            action={
              <Button variant="primary" onClick={() => router.push("/cases")}>
                返回病例列表
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="no-print flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <button
          onClick={() => router.push("/cases")}
          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="返回"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div>
          <h1 className="flex items-center gap-2 text-[17px] font-semibold text-slate-800">
            {record.name}
            <span className="font-mono text-[12px] font-normal text-slate-400">
              {record.chart_no}
            </span>
            <Tag
              color={
                record.patient_type === "正畸"
                  ? "#8b5cf6"
                  : record.patient_type === "种植"
                  ? "#10b981"
                  : record.patient_type === "临时"
                  ? "#f59e0b"
                  : "#64748b"
              }
            >
              {record.patient_type}
            </Tag>
          </h1>
          <p className="mt-0.5 text-[11px] text-slate-400">
            {record.gender}
            {record.birth_date ? ` · ${ageFrom(record.birth_date)}岁` : ""}
            {record.phone ? ` · ${record.phone}` : ""}
            {" · 责任医生 "}
            {doctorById(record.doctor_id)?.name ?? "未指定"}
          </p>
        </div>

        <div className="ml-auto flex gap-2">
          <Button onClick={() => window.print()}>打印</Button>
          <Button variant="danger" onClick={remove}>
            删除病例
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setEditingAppt(undefined);
              setApptOpen(true);
            }}
          >
            ＋ 新建预约
          </Button>
        </div>
      </header>

      <div className="print-flow min-h-0 flex-1 overflow-auto p-4">
        <div className="print-stack grid grid-cols-[minmax(0,1fr)_300px] items-start gap-4">
          {draft ? (
            <CaseForm
              draft={draft}
              onChange={setDraft}
              isNew={false}
              busy={busy}
              error={error}
              onCancel={() => router.push("/cases")}
              onSave={save}
            />
          ) : (
            <div className="card">
              <Spinner />
            </div>
          )}

          {/* 就诊记录 */}
          <aside className="no-print card sticky top-0 overflow-hidden">
            <div className="border-b border-slate-200 px-3.5 py-2.5">
              <p className="text-[13px] font-semibold text-slate-700">就诊记录</p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                共 {myAppointments.length} 条
              </p>
            </div>
            <div className="max-h-[calc(100vh-260px)] overflow-y-auto">
              {myAppointments.length === 0 ? (
                <p className="px-3.5 py-8 text-center text-[12px] text-slate-400">
                  暂无预约记录
                </p>
              ) : (
                myAppointments.map((a) => {
                  const meta = STATUS_META[a.status];
                  return (
                    <div
                      key={a.id}
                      className="group border-b border-slate-100 px-3.5 py-2.5 last:border-b-0"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ background: meta?.dot }}
                        />
                        <span className="text-[12px] font-medium text-slate-700">
                          {dateLabel(a.start_at)} {weekdayLabel(a.start_at)}{" "}
                          {toTimeLabel(a.start_at)}
                        </span>
                        <span
                          className="ml-auto shrink-0 rounded px-1.5 py-0.5 text-[11px]"
                          style={{
                            color: meta?.dot,
                            background: `${meta?.dot}14`,
                          }}
                        >
                          {a.status}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-[12px] text-slate-500">
                        {a.items.join("、") || "—"}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400">
                        <span>{doctorById(a.doctor_id)?.name ?? "未指定医生"}</span>
                        {a.chair && <span>· {a.chair}</span>}
                        <button
                          onClick={() => {
                            setEditingAppt(a);
                            setApptOpen(true);
                          }}
                          className={cn(
                            "ml-auto text-brand-600 opacity-0 transition hover:underline group-hover:opacity-100"
                          )}
                        >
                          编辑
                        </button>
                        <button
                          onClick={async () => {
                            if (!window.confirm("删除这条预约？")) return;
                            await deleteAppointment(a.id);
                          }}
                          className="text-rose-500 opacity-0 transition hover:underline group-hover:opacity-100"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </aside>
        </div>
      </div>

      <AppointmentDialog
        open={apptOpen}
        initial={apptInitial}
        onClose={() => setApptOpen(false)}
      />
    </div>
  );
}
