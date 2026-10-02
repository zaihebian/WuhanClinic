"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useData } from "@/components/DataProvider";
import { CaseForm, emptyCaseDraft, type CaseDraft } from "@/components/CaseForm";
import { Spinner } from "@/components/ui";

export default function NewCasePage() {
  const router = useRouter();
  const { doctors, saveCase, loading, nextChartNo } = useData();

  const [draft, setDraft] = useState<CaseDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (draft || loading) return;
    setDraft(emptyCaseDraft(nextChartNo(), doctors[0]?.id ?? null));
  }, [draft, loading, doctors, nextChartNo]);

  const save = async (andBook: boolean) => {
    if (!draft) return;
    if (!draft.name.trim()) {
      setError("请填写患者姓名");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const saved = await saveCase({ ...draft, name: draft.name.trim() });
      router.push(andBook ? `/?book=${saved.id}` : `/cases/${saved.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="no-print flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
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
          <h1 className="text-[17px] font-semibold text-slate-800">新增病例</h1>
          <p className="mt-0.5 text-[11px] text-slate-400">
            填写患者档案与初诊信息，保存后即可在日程中预约
          </p>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        {!draft ? (
          <div className="card">
            <Spinner />
          </div>
        ) : (
          <CaseForm
            draft={draft}
            onChange={setDraft}
            isNew
            busy={busy}
            error={error}
            onCancel={() => router.push("/cases")}
            onSave={() => save(false)}
            onSaveAndBook={() => save(true)}
          />
        )}
      </div>
    </div>
  );
}
