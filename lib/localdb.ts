"use client";

import type { Appointment, CaseFile, Doctor } from "./types";
import { DOCTOR_COLORS } from "./constants";
import { addDays, combineDateTime, toDateKey, uid } from "./utils";

const STORAGE_KEY = "dental-clinic-db-v2";

export type LocalDB = {
  doctors: Doctor[];
  cases: CaseFile[];
  appointments: Appointment[];
};

// ----------------------------- 演示种子数据 -----------------------------

function seed(): LocalDB {
  const now = new Date();
  const ago = (days: number) => new Date(now.getTime() - 86400000 * days).toISOString();

  const doctorSeed: [string, string, string, number][] = [
    ["王医生", "主治医师", "牙体牙髓 · 根管治疗", 0],
    ["康宁", "执业医师", "口腔修复 · 全冠贴面", 1],
    ["张欣", "主治医师", "口腔外科 · 微创拔牙", 2],
    ["彭明峰", "执业医师", "牙周治疗 · 洁治", 3],
    ["彭金林", "主治医师", "种植修复", 4],
  ];

  const doctors: Doctor[] = doctorSeed.map(([name, title, specialty, i]) => ({
    id: `doc-${i + 1}`,
    name,
    title,
    specialty,
    color: DOCTOR_COLORS[i],
    active: true,
    sort_order: i,
    created_at: ago(120),
  }));

  type Seed = [
    string,
    CaseFile["gender"],
    string,
    string,
    string,
    string,
    string,
    string,
    string
  ];

  const caseSeed: Seed[] = [
    ["周建平", "男", "1988-04-12", "13554600990", "普通", "老患者介绍", "右上后牙遇冷热疼痛 3 天", "冷热刺激痛，夜间加重，疼痛不能定位", "16 慢性牙髓炎急性发作"],
    ["张承军", "男", "1992-11-03", "15802798735", "普通", "美团点评", "右下后牙咬合不适 1 周", "咀嚼时隐痛，无自发痛", "46 慢性根尖周炎"],
    ["邹俣华", "女", "1995-06-21", "13607123456", "正畸", "抖音", "牙列不齐，要求正畸", "上前牙拥挤约 3mm，覆合覆盖正常", "安氏 I 类错𬌗畸形"],
    ["夏子帆", "男", "2001-02-09", "18827120011", "普通", "路过进店", "左下后牙遇甜食酸痛", "冷热刺激一过性敏感", "36 中龋"],
    ["王雷", "男", "1979-09-30", "13907112233", "种植", "老患者介绍", "46 缺失 3 年，要求种植", "缺牙区牙龈无红肿，对颌牙略伸长", "46 牙列缺损"],
    ["谢少林", "男", "1985-01-17", "13995531179", "普通", "微信", "右下后牙牙龈反复肿痛", "牙龈红肿，探诊出血，牙周袋 5mm", "46 慢性牙周炎"],
    ["查博元", "男", "2016-08-05", "", "普通", "老患者介绍", "家长代诉：多颗乳牙龋坏", "16 面可见龋坏，探诊无痛", "乳牙龋（多颗）"],
    ["汤兰玉", "女", "1990-12-25", "13164640246", "普通", "美团点评", "要求全口洁治", "全口牙石 I 度，牙龈轻度红肿", "慢性牙龈炎"],
    ["陆安", "男", "1998-03-14", "17762340098", "普通", "抖音", "上前牙外伤 2 天", "11 牙冠缺损约 1/3，无松动", "11 牙冠折"],
    ["吴梓稀", "女", "2019-05-20", "", "正畸", "老患者介绍", "乳牙反𬌗，要求早期干预", "乳前牙反𬌗，下颌可后退", "前牙反𬌗（乳牙期）"],
    ["李爱", "女", "1993-07-08", "13554009876", "普通", "微信", "左下后牙冷热痛 5 天", "冷测敏感，叩诊阴性", "37 深龋"],
    ["李志惠", "女", "1968-10-02", "15623799797", "普通", "路过进店", "全口多颗牙缺失，要求修复", "上下颌多数后牙缺失，余牙 II 度松动", "牙列缺损（多颗）"],
    ["皮庆英", "女", "1975-04-19", "18627128321", "普通", "电话预约", "右上后牙咬合痛 2 周", "叩诊（+），无松动，牙龈无红肿", "15 慢性根尖周炎"],
  ];

  const cases: CaseFile[] = caseSeed.map(
    ([name, gender, birth, phone, type, source, complaint, symptoms, diagnosis], i) => ({
      id: `case-${i + 1}`,
      chart_no: `26092${String(34120 + i).padStart(5, "0")}`,
      name,
      gender,
      patient_type: type,
      birth_date: birth,
      birth_unknown: false,
      photo_url: null,
      phone: phone || null,
      phone_owner: phone ? "本人" : null,
      tel: null,
      tel_owner: null,
      workplace: i % 4 === 0 ? "武汉某某科技有限公司" : null,
      province: "湖北省",
      city: "武汉市",
      district: ["江岸区", "江汉区", "硚口区", "武昌区", "洪山区"][i % 5],
      address: i % 3 === 0 ? "解放大道 1000 号 3 栋 2 单元 501" : null,
      source,
      tags: type === "正畸" ? ["正畸中"] : type === "种植" ? ["种植中"] : [],
      note: null,
      allergy: i % 7 === 3 ? "青霉素过敏" : null,
      past_history: i % 5 === 1 ? "高血压，规律服药" : null,
      medication: null,
      doctor_id: doctors[i % doctors.length].id,
      first_visit_date: toDateKey(addDays(now, -(60 - i * 3))),
      first_visit_doctor_id: doctors[i % doctors.length].id,
      chief_complaint: complaint,
      symptoms,
      preliminary_diagnosis: diagnosis,
      group_name: null,
      created_at: ago(60 - i * 3),
      updated_at: ago(60 - i * 3),
    })
  );

  const mk = (
    idx: number,
    caseIdx: number,
    doctorIdx: number,
    dayOffset: number,
    time: string,
    duration: number,
    status: Appointment["status"],
    items: string[],
    note?: string
  ): Appointment => ({
    id: `apt-${idx}`,
    case_id: cases[caseIdx].id,
    doctor_id: doctors[doctorIdx].id,
    start_at: combineDateTime(toDateKey(addDays(now, dayOffset)), time),
    duration_min: duration,
    status,
    visit_type: items.includes("初诊") ? "初诊" : "复诊",
    booking_type: "普通",
    items,
    chair: `${(idx % 5) + 1}号牙椅`,
    assistant: idx % 2 === 0 ? "小陈" : null,
    source: "老患者介绍",
    note: note ?? null,
    created_at: now.toISOString(),
  });

  const appointments: Appointment[] = [
    mk(1, 0, 0, 0, "09:00", 60, "已确认", ["初诊", "口腔检查", "拍片"], "初诊，主诉右上后牙冷热痛"),
    mk(2, 1, 0, 0, "10:30", 60, "已到诊", ["根管治疗"], "第二次根管"),
    mk(3, 2, 1, 0, "09:30", 30, "预约", ["复诊加力"]),
    mk(4, 3, 1, 0, "11:00", 90, "已确认", ["备牙", "取模"]),
    mk(5, 4, 4, 0, "14:00", 120, "已确认", ["种植二期"], "术前拍片已做"),
    mk(6, 5, 2, 0, "15:00", 45, "预约", ["拔牙"]),
    mk(7, 6, 3, 0, "16:00", 30, "待确认", ["洁治"]),
    mk(8, 7, 3, 0, "17:00", 30, "预约", ["常规检查"]),
    mk(9, 8, 2, 0, "16:30", 60, "治疗中", ["根管预备"]),
    mk(10, 9, 1, 1, "09:00", 30, "预约", ["取模"]),
    mk(11, 10, 0, 1, "10:00", 60, "已确认", ["补牙"]),
    mk(12, 11, 3, 2, "09:30", 30, "预约", ["洁治"]),
    mk(13, 12, 4, 2, "14:30", 90, "待确认", ["种植三期"]),
    mk(14, 0, 0, -1, "09:00", 60, "已完成", ["根管治疗"]),
    mk(15, 1, 1, -1, "10:30", 30, "已完成", ["常规检查"]),
    mk(16, 3, 2, 3, "11:00", 45, "预约", ["拆线"]),
    mk(17, 5, 1, 4, "15:30", 60, "预约", ["戴牙"]),
    mk(18, 7, 0, 5, "09:00", 30, "预约", ["换药"]),
    mk(19, 9, 3, -2, "16:00", 30, "爽约", ["洁治"]),
    mk(20, 2, 1, -3, "10:00", 60, "已完成", ["复诊加力"]),
  ];

  return { doctors, cases, appointments };
}

function emptyDB(): LocalDB {
  return { doctors: [], cases: [], appointments: [] };
}

// ----------------------------- 读写 -----------------------------

export function loadLocalDB(): LocalDB {
  if (typeof window === "undefined") return emptyDB();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const fresh = seed();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
      return fresh;
    }
    const parsed = JSON.parse(raw) as Partial<LocalDB>;
    return {
      doctors: parsed.doctors ?? [],
      cases: parsed.cases ?? [],
      appointments: parsed.appointments ?? [],
    };
  } catch {
    return seed();
  }
}

export function saveLocalDB(db: LocalDB) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

export function resetLocalDB(): LocalDB {
  const fresh = seed();
  saveLocalDB(fresh);
  return fresh;
}

export function localId(prefix: string) {
  return `${prefix}-${uid()}`;
}
