"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useData } from "./DataProvider";
import { Button, Field, Input, Select, Textarea } from "./ui";
import { APPOINTMENT_SOURCES, PATIENT_TYPES } from "@/lib/constants";
import type { CaseFile, Gender } from "@/lib/types";
import { cn, toDateKey } from "@/lib/utils";

const DISTRICTS = [
  "江岸区",
  "江汉区",
  "硚口区",
  "汉阳区",
  "武昌区",
  "青山区",
  "洪山区",
  "东西湖区",
  "汉南区",
  "蔡甸区",
  "江夏区",
  "黄陂区",
  "新洲区",
];

const PHONE_OWNERS = ["本人", "家属", "朋友", "其他"];
const TEL_OWNERS = ["家", "公司", "其他"];

export type CaseDraft = Omit<CaseFile, "id" | "created_at" | "updated_at">;

export function emptyCaseDraft(chartNo: string, doctorId: string | null): CaseDraft {
  const today = toDateKey(new Date());
  return {
    name: "",
    gender: "男",
    patient_type: "普通",
    chart_no: chartNo,
    birth_date: null,
    birth_unknown: false,
    photo_url: null,
    phone: null,
    phone_owner: "本人",
    tel: null,
    tel_owner: "家",
    workplace: null,
    province: "湖北省",
    city: "武汉市",
    district: "洪山区",
    address: null,
    source: null,
    tags: [],
    note: null,
    allergy: null,
    past_history: null,
    medication: null,
    doctor_id: doctorId,
    first_visit_date: today,
    first_visit_doctor_id: doctorId,
    chief_complaint: null,
    symptoms: null,
    preliminary_diagnosis: null,
    group_name: null,
  };
}

/** 压缩头像到 240px 内的 JPEG，避免把大图塞进数据库 */
async function compressImage(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });

  const size = 240;
  const scale = Math.min(size / img.width, size / img.height, 1);
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", 0.82);
}

export function CaseForm({
  draft,
  onChange,
  onSave,
  onSaveAndBook,
  onCancel,
  busy,
  error,
  isNew,
}: {
  draft: CaseDraft;
  onChange: (d: CaseDraft) => void;
  onSave: () => void;
  onSaveAndBook?: () => void;
  onCancel: () => void;
  busy: boolean;
  error: string | null;
  isNew: boolean;
}) {
  const { doctors, nextChartNo } = useData();
  const [tagInput, setTagInput] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof CaseDraft>(k: K, v: CaseDraft[K]) =>
    onChange({ ...draft, [k]: v });

  const age = useMemo(() => {
    if (!draft.birth_date) return "";
    const b = new Date(draft.birth_date);
    if (Number.isNaN(b.getTime())) return "";
    const now = new Date();
    let a = now.getFullYear() - b.getFullYear();
    const m = now.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < b.getDate())) a--;
    return String(a);
  }, [draft.birth_date]);

  // 出生日期 + 年龄 双向同步：只改年龄时反推年份
  const [ageInput, setAgeInput] = useState("");
  useEffect(() => {
    setAgeInput(age);
  }, [age]);

  const applyAge = (v: string) => {
    setAgeInput(v);
    const n = Number(v);
    if (!v || Number.isNaN(n) || n < 0 || n > 130) return;
    const d = new Date();
    d.setFullYear(d.getFullYear() - n);
    set("birth_date", toDateKey(d));
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (!t || draft.tags.includes(t)) return;
    set("tags", [...draft.tags, t]);
    setTagInput("");
  };

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-700">
          {error}
        </div>
      )}

      {/* ————— 个人信息 ————— */}
      <section className="card p-4">
        <p className="section-title">个人信息</p>
        <div className="flex gap-5">
          <div className="grid flex-1 grid-cols-4 gap-x-4 gap-y-3.5">
            <Field label="姓名" required>
              <Input
                autoFocus
                value={draft.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="请输入姓名"
              />
            </Field>

            <Field label="性别">
              <div className="flex h-9 items-center gap-2.5">
                {(["男", "女", "未知"] as Gender[]).map((g) => (
                  <label
                    key={g}
                    className="flex cursor-pointer items-center gap-1 whitespace-nowrap text-[13px] text-slate-600"
                  >
                    <input
                      type="radio"
                      checked={draft.gender === g}
                      onChange={() => set("gender", g)}
                      className="h-3.5 w-3.5 shrink-0 accent-brand-600"
                    />
                    {g}
                  </label>
                ))}
              </div>
            </Field>

            <Field label="患者类型" className="col-span-2">
              <div className="flex gap-1.5">
                {PATIENT_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => set("patient_type", t)}
                    className={cn(
                      "h-9 flex-1 rounded-lg border text-[13px] transition",
                      draft.patient_type === t
                        ? "border-brand-500 bg-brand-50 font-medium text-brand-700"
                        : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="病历号" className="col-span-2">
              <div className="flex gap-1.5">
                <Input
                  value={draft.chart_no}
                  onChange={(e) => set("chart_no", e.target.value)}
                />
                <Button
                  onClick={() => set("chart_no", nextChartNo())}
                  title="按当天顺序重新生成"
                  className="shrink-0"
                >
                  刷新
                </Button>
              </div>
            </Field>

            <div>
              <div className="flex items-baseline justify-between">
                <label className="field-label">出生年月日</label>
                <label className="mb-1 flex cursor-pointer items-center gap-1 whitespace-nowrap text-[11px] text-slate-500">
                  <input
                    type="checkbox"
                    checked={draft.birth_unknown}
                    onChange={(e) => {
                      set("birth_unknown", e.target.checked);
                      if (e.target.checked) set("birth_date", null);
                    }}
                    className="h-3 w-3 shrink-0 accent-brand-600"
                  />
                  未知
                </label>
              </div>
              <Input
                type="date"
                value={draft.birth_date ?? ""}
                onChange={(e) => set("birth_date", e.target.value || null)}
                disabled={draft.birth_unknown}
              />
            </div>

            <Field label="年龄">
              <div className="flex items-center gap-1.5">
                <Input
                  value={ageInput}
                  onChange={(e) => applyAge(e.target.value)}
                  placeholder="自动计算"
                  disabled={draft.birth_unknown}
                />
                <span className="shrink-0 text-[13px] text-slate-400">岁</span>
              </div>
            </Field>

            <Field label="患者分组" hint="（自由项）" className="col-span-2">
              <Input
                value={draft.group_name ?? ""}
                onChange={(e) => set("group_name", e.target.value || null)}
                placeholder="如：VIP / 团购 / 儿童"
              />
            </Field>
          </div>

          {/* 照片 */}
          <div className="print-hide w-[120px] shrink-0">
            <label className="field-label">患者照片</label>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex h-[120px] w-[120px] flex-col items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate-300 bg-slate-50 text-center transition hover:border-brand-400 hover:bg-brand-50/40"
            >
              {draft.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={draft.photo_url}
                  alt="患者照片"
                  className="h-full w-full object-cover"
                />
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="mb-1.5 text-slate-400">
                    <path d="M12 7v10M7 12h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                  <span className="px-2 text-[11px] leading-4 text-slate-400">
                    点击上传
                    <br />
                    建议 240×240
                  </span>
                </>
              )}
            </button>
            {draft.photo_url && (
              <button
                type="button"
                onClick={() => set("photo_url", null)}
                className="mt-1.5 w-full text-[11px] text-rose-500 hover:underline"
              >
                移除照片
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                set("photo_url", await compressImage(f));
                e.target.value = "";
              }}
            />
          </div>
        </div>
      </section>

      {/* ————— 联系方式 ————— */}
      <section className="card p-4">
        <p className="section-title">联系方式</p>
        <div className="grid grid-cols-4 gap-x-4 gap-y-3.5">
          <Field label="手机" className="col-span-2">
            <div className="flex gap-1.5">
              <Input
                value={draft.phone ?? ""}
                onChange={(e) => set("phone", e.target.value || null)}
                placeholder="11 位手机号"
              />
              <Select
                value={draft.phone_owner ?? ""}
                onChange={(e) => set("phone_owner", e.target.value || null)}
                className="w-24 shrink-0"
              >
                <option value="">归属</option>
                {PHONE_OWNERS.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </Select>
            </div>
          </Field>

          <Field label="电话" className="col-span-2">
            <div className="flex gap-1.5">
              <Input
                value={draft.tel ?? ""}
                onChange={(e) => set("tel", e.target.value || null)}
                placeholder="固定电话"
              />
              <Select
                value={draft.tel_owner ?? ""}
                onChange={(e) => set("tel_owner", e.target.value || null)}
                className="w-24 shrink-0"
              >
                <option value="">归属</option>
                {TEL_OWNERS.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </Select>
            </div>
          </Field>

          <Field label="工作单位" className="col-span-4">
            <Input
              value={draft.workplace ?? ""}
              onChange={(e) => set("workplace", e.target.value || null)}
              placeholder="单位名称"
            />
          </Field>

          <Field label="家庭住址" className="col-span-4">
            <div className="flex gap-1.5">
              <Input
                value={draft.province ?? ""}
                onChange={(e) => set("province", e.target.value || null)}
                placeholder="省"
                className="w-28 shrink-0"
              />
              <Input
                value={draft.city ?? ""}
                onChange={(e) => set("city", e.target.value || null)}
                placeholder="市"
                className="w-28 shrink-0"
              />
              <Select
                value={draft.district ?? ""}
                onChange={(e) => set("district", e.target.value || null)}
                className="w-28 shrink-0"
              >
                <option value="">区/县</option>
                {DISTRICTS.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </Select>
              <Input
                value={draft.address ?? ""}
                onChange={(e) => set("address", e.target.value || null)}
                placeholder="详细地址"
              />
            </div>
          </Field>
        </div>
      </section>

      {/* ————— 患者信息 ————— */}
      <section className="card p-4">
        <p className="section-title">患者信息</p>
        <div className="grid grid-cols-4 gap-x-4 gap-y-3.5">
          <Field label="患者来源">
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

          <Field label="责任医生">
            <Select
              value={draft.doctor_id ?? ""}
              onChange={(e) => set("doctor_id", e.target.value || null)}
            >
              <option value="">未指定医生</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                  {d.title ? `（${d.title}）` : ""}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="患者标签" className="col-span-2">
            <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2 py-1">
              {draft.tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 rounded bg-brand-50 px-1.5 py-0.5 text-[12px] text-brand-700"
                >
                  {t}
                  <button
                    type="button"
                    onClick={() => set("tags", draft.tags.filter((x) => x !== t))}
                    className="text-brand-400 hover:text-brand-700"
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                onBlur={addTag}
                placeholder="输入后回车添加"
                className="min-w-[80px] flex-1 border-0 bg-transparent py-1 text-[13px] outline-none placeholder:text-slate-400"
              />
            </div>
          </Field>

          <Field label="过敏史" className="col-span-2">
            <Input
              value={draft.allergy ?? ""}
              onChange={(e) => set("allergy", e.target.value || null)}
              placeholder="如：青霉素过敏"
            />
          </Field>
          <Field label="既往史" className="col-span-2">
            <Input
              value={draft.past_history ?? ""}
              onChange={(e) => set("past_history", e.target.value || null)}
              placeholder="如：高血压、糖尿病"
            />
          </Field>
          <Field label="用药史" className="col-span-2">
            <Input
              value={draft.medication ?? ""}
              onChange={(e) => set("medication", e.target.value || null)}
              placeholder="如：长期服用阿司匹林"
            />
          </Field>
          <Field label="患者备注" className="col-span-2">
            <Textarea
              rows={2}
              value={draft.note ?? ""}
              onChange={(e) => set("note", e.target.value || null)}
              placeholder="其他需要记录的信息"
            />
          </Field>
        </div>
      </section>

      {/* ————— 初诊信息 ————— */}
      <section className="card p-4">
        <p className="section-title">初诊信息</p>
        <div className="grid grid-cols-4 gap-x-4 gap-y-3.5">
          <Field label="初诊日期">
            <Input
              type="date"
              value={draft.first_visit_date ?? ""}
              onChange={(e) => set("first_visit_date", e.target.value || null)}
            />
          </Field>
          <Field label="初诊医生">
            <Select
              value={draft.first_visit_doctor_id ?? ""}
              onChange={(e) => set("first_visit_doctor_id", e.target.value || null)}
            >
              <option value="">未指定医生</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="主诉" className="col-span-2">
            <Input
              value={draft.chief_complaint ?? ""}
              onChange={(e) => set("chief_complaint", e.target.value || null)}
              placeholder="如：右上后牙遇冷热疼痛 3 天"
            />
          </Field>
          <Field label="症状" className="col-span-2">
            <Textarea
              rows={3}
              value={draft.symptoms ?? ""}
              onChange={(e) => set("symptoms", e.target.value || null)}
              placeholder="请输入症状"
            />
          </Field>
          <Field label="初步判断" className="col-span-2">
            <Textarea
              rows={3}
              value={draft.preliminary_diagnosis ?? ""}
              onChange={(e) => set("preliminary_diagnosis", e.target.value || null)}
              placeholder="请输入初步判断"
            />
          </Field>
        </div>
      </section>

      {/* 底部操作条 */}
      <div className="no-print sticky bottom-0 z-10 -mx-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-4px_16px_rgba(15,23,42,0.06)] backdrop-blur">
        <span className="text-[12px] text-slate-400">
          {isNew
            ? "新建病例 · 保存后可在日程里为该患者预约"
            : `病历号 ${draft.chart_no} · 修改后记得点右侧保存`}
        </span>
        <div className="ml-auto flex gap-2">
          <Button onClick={onCancel} disabled={busy}>
            取消
          </Button>
          {onSaveAndBook && (
            <Button onClick={onSaveAndBook} disabled={busy || !draft.name.trim()}>
              保存并预约
            </Button>
          )}
          <Button variant="primary" onClick={onSave} disabled={busy || !draft.name.trim()}>
            {busy ? "保存中…" : isNew ? "保存病例" : "保存修改"}
          </Button>
        </div>
      </div>
    </div>
  );
}
