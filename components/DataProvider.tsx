"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, isSupabaseEnabled, type Snapshot } from "@/lib/api";
import type { Appointment, CaseFile, Doctor } from "@/lib/types";

type Ctx = Snapshot & {
  loading: boolean;
  error: string | null;
  mode: "supabase" | "local";
  reload: () => Promise<void>;
  resetDemoData: () => Promise<void>;

  saveCase: (row: Partial<CaseFile> & { id?: string }) => Promise<CaseFile>;
  deleteCase: (id: string) => Promise<void>;

  saveAppointment: (row: Partial<Appointment> & { id?: string }) => Promise<Appointment>;
  deleteAppointment: (id: string) => Promise<void>;

  saveDoctor: (row: Partial<Doctor> & { id?: string }) => Promise<Doctor>;
  deleteDoctor: (id: string) => Promise<void>;

  caseById: (id: string | null | undefined) => CaseFile | undefined;
  doctorById: (id: string | null | undefined) => Doctor | undefined;
  /** 生成下一个病历号 */
  nextChartNo: () => string;
};

const DataContext = createContext<Ctx | null>(null);

const EMPTY: Snapshot = { doctors: [], cases: [], appointments: [] };

export function DataProvider({ children }: { children: ReactNode }) {
  const [snap, setSnap] = useState<Snapshot>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSnap(await api.fetchAll());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const value = useMemo<Ctx>(() => {
    const caseMap = new Map(snap.cases.map((c) => [c.id, c]));
    const doctorMap = new Map(snap.doctors.map((d) => [d.id, d]));

    return {
      ...snap,
      loading,
      error,
      mode: isSupabaseEnabled ? "supabase" : "local",
      reload,

      resetDemoData: async () => {
        api.resetDemoData();
        await reload();
      },

      caseById: (id) => (id ? caseMap.get(id) : undefined),
      doctorById: (id) => (id ? doctorMap.get(id) : undefined),

      nextChartNo: () => {
        const d = new Date();
        const head = `${String(d.getFullYear()).slice(2)}${String(
          d.getMonth() + 1
        ).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
        const used = snap.cases
          .map((c) => c.chart_no)
          .filter((n) => n.startsWith(head))
          .map((n) => Number(n.slice(head.length)) || 0);
        const next = (used.length ? Math.max(...used) : 0) + 1;
        return `${head}${String(next).padStart(3, "0")}`;
      },

      saveCase: async (row) => {
        const saved = await api.saveCase(row);
        setSnap((s) => {
          const exists = s.cases.some((c) => c.id === saved.id);
          return {
            ...s,
            cases: exists
              ? s.cases.map((c) => (c.id === saved.id ? saved : c))
              : [saved, ...s.cases],
          };
        });
        return saved;
      },

      deleteCase: async (id) => {
        await api.deleteCase(id);
        setSnap((s) => ({
          ...s,
          cases: s.cases.filter((c) => c.id !== id),
          appointments: s.appointments.filter((a) => a.case_id !== id),
        }));
      },

      saveAppointment: async (row) => {
        const saved = await api.saveAppointment(row);
        setSnap((s) => {
          const exists = s.appointments.some((a) => a.id === saved.id);
          return {
            ...s,
            appointments: exists
              ? s.appointments.map((a) => (a.id === saved.id ? saved : a))
              : [...s.appointments, saved],
          };
        });
        return saved;
      },

      deleteAppointment: async (id) => {
        await api.deleteAppointment(id);
        setSnap((s) => ({
          ...s,
          appointments: s.appointments.filter((a) => a.id !== id),
        }));
      },

      saveDoctor: async (row) => {
        const saved = await api.saveDoctor(row);
        setSnap((s) => {
          const exists = s.doctors.some((d) => d.id === saved.id);
          return {
            ...s,
            doctors: exists
              ? s.doctors.map((d) => (d.id === saved.id ? saved : d))
              : [...s.doctors, saved],
          };
        });
        return saved;
      },

      deleteDoctor: async (id) => {
        await api.deleteDoctor(id);
        await reload();
      },
    };
  }, [snap, loading, error, reload]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): Ctx {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData 必须在 DataProvider 内部使用");
  return ctx;
}
