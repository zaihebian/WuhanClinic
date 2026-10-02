import type { AppointmentStatus } from "./types";

export const CLINIC_NAME = process.env.NEXT_PUBLIC_CLINIC_NAME || "佳兴口腔";

// 预约状态：颜色与顺序参考 e看牙 的预约看板列
export const APPT_STATUSES: {
  value: AppointmentStatus;
  color: string; // 文字/边框色
  bg: string;
  dot: string;
}[] = [
  { value: "待确认", color: "text-amber-700", bg: "bg-amber-50", dot: "#f59e0b" },
  { value: "预约", color: "text-sky-700", bg: "bg-sky-50", dot: "#0ea5e9" },
  { value: "已确认", color: "text-emerald-700", bg: "bg-emerald-50", dot: "#10b981" },
  { value: "已到诊", color: "text-teal-700", bg: "bg-teal-50", dot: "#14b8a6" },
  { value: "治疗中", color: "text-indigo-700", bg: "bg-indigo-50", dot: "#6366f1" },
  { value: "已完成", color: "text-slate-600", bg: "bg-slate-100", dot: "#94a3b8" },
  { value: "已取消", color: "text-rose-700", bg: "bg-rose-50", dot: "#f43f5e" },
  { value: "爽约", color: "text-orange-700", bg: "bg-orange-50", dot: "#fb923c" },
];

export const STATUS_META = Object.fromEntries(
  APPT_STATUSES.map((s) => [s.value, s])
) as Record<AppointmentStatus, (typeof APPT_STATUSES)[number]>;

// 看板上直接展示的「活跃」状态
export const BOARD_STATUSES: AppointmentStatus[] = [
  "待确认",
  "预约",
  "已确认",
  "已到诊",
  "治疗中",
  "已完成",
];

export const VISIT_TYPES = ["初诊", "复诊"];
export const BOOKING_TYPES = ["普通", "待定"];
export const PATIENT_TYPES = ["普通", "正畸", "种植", "临时"];

export const APPOINTMENT_SOURCES = [
  "外部来源",
  "老患者介绍",
  "美团点评",
  "抖音",
  "微信",
  "路过进店",
  "电话预约",
];

// 预约/治疗项目，分组（参考 e看牙 的项目树）
export const ITEM_GROUPS: { group: string; items: string[] }[] = [
  { group: "定期复诊", items: ["洁治", "常规检查"] },
  { group: "口腔检查", items: ["初诊", "口腔检查", "拍片"] },
  { group: "牙体", items: ["换药", "补牙", "根充", "根管治疗", "根管预备", "预成冠"] },
  { group: "口外", items: ["拔回访", "拔牙", "拆线"] },
  { group: "修复", items: ["戴牙", "试内冠", "试戴义齿", "试支架", "备牙", "修义齿", "加牙桩", "戴牙桩", "活动牙取模"] },
  { group: "种植", items: ["拆线", "种植一期", "种植二期", "种植三期"] },
  { group: "正畸", items: ["正畸初诊", "复诊加力", "换弓丝", "取模", "粘托槽", "保持器"] },
];

export const CHAIRS = ["1号牙椅", "2号牙椅", "3号牙椅", "4号牙椅", "5号牙椅"];

export const DOCTOR_COLORS = [
  "#3661f0",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#ef4444",
];

// 时间轴刻度：08:00 - 20:00
export const DAY_START_HOUR = 8;
export const DAY_END_HOUR = 20;
export const HOUR_HEIGHT = 64; // px per hour
