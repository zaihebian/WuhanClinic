"use client";

import { useState } from "react";
import { useData } from "./DataProvider";
import { Avatar, Button, Field, Input, Modal } from "./ui";
import { DOCTOR_COLORS } from "@/lib/constants";
import type { Doctor } from "@/lib/types";
import { cn } from "@/lib/utils";

type DoctorDraft = {
  id?: string;
  name: string;
  title: string | null;
  specialty: string | null;
  color: string;
  active: boolean;
};

const BLANK: DoctorDraft = {
  name: "",
  title: "执业医师",
  specialty: "",
  color: DOCTOR_COLORS[0],
  active: true,
};

export function DoctorDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { doctors, saveDoctor, deleteDoctor, appointments } = useData();
  const [editing, setEditing] = useState<DoctorDraft | null>(null);
  const [busy, setBusy] = useState(false);

  const countOf = (id: string) =>
    appointments.filter((a) => a.doctor_id === id).length;

  const submit = async () => {
    if (!editing?.name.trim()) return;
    setBusy(true);
    try {
      await saveDoctor({
        ...editing,
        name: editing.name.trim(),
        sort_order: editing.id
          ? doctors.find((d) => d.id === editing.id)?.sort_order ?? doctors.length
          : doctors.length,
      });
      setEditing(null);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (d: Doctor) => {
    const n = countOf(d.id);
    const msg =
      n > 0
        ? `「${d.name}」名下还有 ${n} 条预约，删除后这些预约将变为「未指定医生」。确定删除？`
        : `确定删除医生「${d.name}」？`;
    if (!window.confirm(msg)) return;
    setBusy(true);
    try {
      await deleteDoctor(d.id);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      title="医生管理"
      subtitle="日历看板的列 = 医生。停用的医生不再出现在看板上。"
      onClose={() => {
        setEditing(null);
        onClose();
      }}
      width="max-w-2xl"
      footer={
        editing ? (
          <>
            <Button onClick={() => setEditing(null)} disabled={busy}>
              取消
            </Button>
            <Button variant="primary" onClick={submit} disabled={busy || !editing.name.trim()}>
              {editing.id ? "保存修改" : "添加医生"}
            </Button>
          </>
        ) : (
          <>
            <Button onClick={onClose}>关闭</Button>
            <Button variant="primary" onClick={() => setEditing({ ...BLANK })}>
              + 添加医生
            </Button>
          </>
        )
      }
    >
      {editing && (
        <div className="mb-4 rounded-lg border border-brand-200 bg-brand-50/50 p-3.5">
          <p className="mb-3 text-[13px] font-semibold text-brand-800">
            {editing.id ? "编辑医生" : "新增医生"}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="姓名" required>
              <Input
                autoFocus
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="如：王医生"
              />
            </Field>
            <Field label="职称">
              <Input
                value={editing.title ?? ""}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                placeholder="如：主治医师"
              />
            </Field>
            <Field label="擅长方向" className="col-span-2">
              <Input
                value={editing.specialty ?? ""}
                onChange={(e) => setEditing({ ...editing, specialty: e.target.value })}
                placeholder="如：牙体牙髓 · 根管治疗"
              />
            </Field>
            <Field label="看板颜色" className="col-span-2">
              <div className="flex gap-2 pt-1">
                {DOCTOR_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setEditing({ ...editing, color: c })}
                    className={cn(
                      "h-6 w-6 rounded-full transition",
                      editing.color === c
                        ? "ring-2 ring-slate-800 ring-offset-2"
                        : "hover:scale-110"
                    )}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </Field>
            <label className="col-span-2 flex cursor-pointer items-center gap-2 text-[13px] text-slate-600">
              <input
                type="checkbox"
                checked={editing.active}
                onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 accent-brand-600"
              />
              在看板中启用
            </label>
          </div>
        </div>
      )}

      <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
        {doctors.length === 0 && (
          <p className="px-3 py-6 text-center text-[13px] text-slate-400">
            还没有医生，点右下角「添加医生」
          </p>
        )}
        {doctors.map((d) => (
          <div key={d.id} className="flex items-center gap-3 px-3 py-2.5">
            <Avatar name={d.name} size={30} />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-[13px] font-medium text-slate-800">
                {d.name}
                {!d.active && (
                  <span className="rounded bg-slate-100 px-1 text-[11px] font-normal text-slate-400">
                    已停用
                  </span>
                )}
              </p>
              <p className="truncate text-[11px] text-slate-400">
                {[d.title, d.specialty].filter(Boolean).join(" · ") || "—"}
              </p>
            </div>
            <span
              className="h-3 w-3 rounded-full"
              style={{ background: d.color }}
              title="看板颜色"
            />
            <span className="w-16 text-right text-[11px] text-slate-400">
              {countOf(d.id)} 条预约
            </span>
            <Button size="sm" variant="ghost" onClick={() => setEditing({ ...d })}>
              编辑
            </Button>
            <Button size="sm" variant="danger" onClick={() => remove(d)} disabled={busy}>
              删除
            </Button>
          </div>
        ))}
      </div>
    </Modal>
  );
}
