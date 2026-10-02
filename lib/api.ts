import { getSupabase, isSupabaseEnabled } from "./supabase";
import { loadLocalDB, localId, resetLocalDB, saveLocalDB, type LocalDB } from "./localdb";
import type { Appointment, CaseFile, Doctor } from "./types";

export { isSupabaseEnabled };

export type Snapshot = {
  doctors: Doctor[];
  cases: CaseFile[];
  appointments: Appointment[];
};

type Table = keyof LocalDB;
type AnyRow = { id: string } & Record<string, unknown>;

const PREFIX: Record<Table, string> = {
  doctors: "doc",
  cases: "case",
  appointments: "apt",
};

// ------------------------- 读取 -------------------------

export async function fetchAll(): Promise<Snapshot> {
  if (!isSupabaseEnabled) {
    return { ...loadLocalDB() };
  }

  const sb = getSupabase();
  const [doctors, cases, appointments] = await Promise.all([
    sb.from("doctors").select("*").order("sort_order", { ascending: true }),
    sb.from("cases").select("*").order("created_at", { ascending: false }),
    sb.from("appointments").select("*").order("start_at", { ascending: true }),
  ]);

  const firstError = doctors.error || cases.error || appointments.error;
  if (firstError) throw new Error(firstError.message);

  return {
    doctors: (doctors.data ?? []) as Doctor[],
    cases: (cases.data ?? []) as CaseFile[],
    appointments: (appointments.data ?? []) as Appointment[],
  };
}

// ------------------------- 写入 -------------------------

async function saveRow<T extends AnyRow>(
  table: Table,
  row: Partial<T> & { id?: string }
): Promise<T> {
  if (isSupabaseEnabled) {
    const sb = getSupabase();
    const { id, ...rest } = row;
    if (id) {
      const { data, error } = await sb
        .from(table)
        .update({ ...rest, updated_at: new Date().toISOString() } as never)
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as T;
    }
    const { data, error } = await sb.from(table).insert(rest as never).select().single();
    if (error) throw new Error(error.message);
    return data as T;
  }

  const db = loadLocalDB();
  const list = db[table] as unknown as AnyRow[];
  const nowIso = new Date().toISOString();

  if (row.id) {
    const idx = list.findIndex((x) => x.id === row.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...row, updated_at: nowIso } as AnyRow;
      saveLocalDB(db);
      return list[idx] as unknown as T;
    }
  }

  const created = {
    ...row,
    id: localId(PREFIX[table]),
    created_at: nowIso,
    updated_at: nowIso,
  } as unknown as T;
  list.push(created as unknown as AnyRow);
  saveLocalDB(db);
  return created;
}

async function deleteRow(table: Table, id: string): Promise<void> {
  if (isSupabaseEnabled) {
    const { error } = await getSupabase().from(table).delete().eq("id", id);
    if (error) throw new Error(error.message);
    return;
  }

  const db = loadLocalDB();

  if (table === "cases") {
    db.cases = db.cases.filter((c) => c.id !== id);
    db.appointments = db.appointments.filter((a) => a.case_id !== id);
  } else if (table === "doctors") {
    db.doctors = db.doctors.filter((d) => d.id !== id);
    db.cases = db.cases.map((c) =>
      c.doctor_id === id || c.first_visit_doctor_id === id
        ? {
            ...c,
            doctor_id: c.doctor_id === id ? null : c.doctor_id,
            first_visit_doctor_id:
              c.first_visit_doctor_id === id ? null : c.first_visit_doctor_id,
          }
        : c
    );
    db.appointments = db.appointments.map((a) =>
      a.doctor_id === id ? { ...a, doctor_id: null } : a
    );
  } else {
    db.appointments = db.appointments.filter((a) => a.id !== id);
  }

  saveLocalDB(db);
}

// ------------------------- 对外接口 -------------------------

export const api = {
  fetchAll,

  saveDoctor: (row: Partial<Doctor> & { id?: string }) =>
    saveRow<Doctor>("doctors", row),
  deleteDoctor: (id: string) => deleteRow("doctors", id),

  saveCase: (row: Partial<CaseFile> & { id?: string }) =>
    saveRow<CaseFile>("cases", row),
  deleteCase: (id: string) => deleteRow("cases", id),

  saveAppointment: (row: Partial<Appointment> & { id?: string }) =>
    saveRow<Appointment>("appointments", row),
  deleteAppointment: (id: string) => deleteRow("appointments", id),

  resetDemoData: () => resetLocalDB(),
};
