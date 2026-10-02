"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useData } from "@/components/DataProvider";
import { Button, EmptyState, Input, Spinner, Tag } from "@/components/ui";
import { PATIENT_TYPES } from "@/lib/constants";
import type { CaseFile } from "@/lib/types";
import { ageFrom, cn, shortDateTime, toDateKey } from "@/lib/utils";

export default function CasesPage() {
  const router = useRouter();
  const { cases, doctors, appointments, doctorById, deleteCase, loading, error, mode } =
    useData();

  const [keyword, setKeyword] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [doctorFilter, setDoctorFilter] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const lastVisitOf = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of appointments) {
      const prev = m.get(a.case_id);
      if (!prev || a.start_at > prev) m.set(a.case_id, a.start_at);
    }
    return m;
  }, [appointments]);

  const list = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return cases.filter((c) => {
      if (typeFilter && c.patient_type !== typeFilter) return false;
      if (doctorFilter && c.doctor_id !== doctorFilter) return false;
      if (!kw) return true;
      return (
        c.name.toLowerCase().includes(kw) ||
        (c.phone ?? "").includes(kw) ||
        c.chart_no.includes(kw) ||
        (c.preliminary_diagnosis ?? "").toLowerCase().includes(kw)
      );
    });
  }, [cases, keyword, typeFilter, doctorFilter]);

  const remove = async (c: CaseFile) => {
    const n = appointments.filter((a) => a.case_id === c.id).length;
    const msg =
      n > 0
        ? `删除病例「${c.name}」会同时删除其 ${n} 条预约记录，且不可恢复。确定删除？`
        : `确定删除病例「${c.name}」？此操作不可恢复。`;
    if (!window.confirm(msg)) return;
    setBusyId(c.id);
    try {
      await deleteCase(c.id);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="no-print flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-4 py-3">
        <div>
          <h1 className="text-[17px] font-semibold text-slate-800">病例</h1>
          <p className="mt-0.5 text-[11px] text-slate-400">
            共 {cases.length} 份病例
            {mode === "local" && " · 本地演示数据"}
          </p>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索姓名 / 手机 / 病历号 / 初步判断"
            className="w-60"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="input-base w-28 cursor-pointer"
          >
            <option value="">全部类型</option>
            {PATIENT_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <select
            value={doctorFilter}
            onChange={(e) => setDoctorFilter(e.target.value)}
            className="input-base w-32 cursor-pointer"
          >
            <option value="">全部医生</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <Button variant="primary" onClick={() => router.push("/cases/new")}>
            ＋ 新建病例
          </Button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        {error && (
          <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-700">
            数据读取失败：{error}
            <span className="ml-2 text-rose-500">
              （检查 Supabase 环境变量与建表脚本是否已执行）
            </span>
          </div>
        )}
        <div className="card overflow-hidden">
          {loading ? (
            <Spinner />
          ) : list.length === 0 ? (
            <EmptyState
              title={cases.length === 0 ? "还没有病例" : "没有匹配的病例"}
              desc={
                cases.length === 0
                  ? "点击「新建病例」录入第一位患者"
                  : "换个关键词或清空筛选条件试试"
              }
              action={
                cases.length === 0 ? (
                  <Button variant="primary" onClick={() => router.push("/cases/new")}>
                    ＋ 新建病例
                  </Button>
                ) : null
              }
            />
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="th">病历号</th>
                  <th className="th">姓名</th>
                  <th className="th">性别 / 年龄</th>
                  <th className="th">手机</th>
                  <th className="th">类型</th>
                  <th className="th">来源</th>
                  <th className="th">责任医生</th>
                  <th className="th">主诉</th>
                  <th className="th">初诊日期</th>
                  <th className="th">最近预约</th>
                  <th className="th text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {list.map((c) => {
                  const last = lastVisitOf.get(c.id);
                  return (
                    <tr key={c.id} className="group transition hover:bg-slate-50/80">
                      <td className="td font-mono text-[12px] text-slate-500">
                        {c.chart_no}
                      </td>
                      <td className="td">
                        <Link
                          href={`/cases/${c.id}`}
                          className="font-medium text-slate-800 hover:text-brand-600 hover:underline"
                        >
                          {c.name}
                        </Link>
                        {c.tags.length > 0 && (
                          <span className="ml-1.5 inline-flex gap-1">
                            {c.tags.map((t) => (
                              <Tag key={t} color="#3661f0">
                                {t}
                              </Tag>
                            ))}
                          </span>
                        )}
                      </td>
                      <td className="td text-slate-500">
                        {c.gender}
                        {c.birth_date ? ` · ${ageFrom(c.birth_date)}岁` : ""}
                      </td>
                      <td className="td tabular-nums text-slate-600">
                        {c.phone || "—"}
                      </td>
                      <td className="td">
                        <Tag
                          color={
                            c.patient_type === "正畸"
                              ? "#8b5cf6"
                              : c.patient_type === "种植"
                              ? "#10b981"
                              : c.patient_type === "临时"
                              ? "#f59e0b"
                              : "#64748b"
                          }
                        >
                          {c.patient_type}
                        </Tag>
                      </td>
                      <td className="td text-slate-500">{c.source || "—"}</td>
                      <td className="td text-slate-600">
                        {doctorById(c.doctor_id)?.name ?? "未指定"}
                      </td>
                      <td
                        className="td max-w-[220px] truncate text-slate-500"
                        title={c.chief_complaint ?? ""}
                      >
                        {c.chief_complaint || "—"}
                      </td>
                      <td className="td text-slate-500">
                        {c.first_visit_date || "—"}
                      </td>
                      <td className="td">
                        {last ? (
                          <span
                            className={cn(
                              "text-slate-600",
                              toDateKey(last) === toDateKey(new Date()) &&
                                "font-medium text-brand-600"
                            )}
                          >
                            {shortDateTime(last)}
                          </span>
                        ) : (
                          <span className="text-slate-300">无</span>
                        )}
                      </td>
                      <td className="td text-right">
                        <div className="flex justify-end gap-1 opacity-0 transition group-hover:opacity-100">
                          <Button
                            size="sm"
                            onClick={() => router.push(`/cases/${c.id}`)}
                          >
                            编辑
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            disabled={busyId === c.id}
                            onClick={() => remove(c)}
                          >
                            删除
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
