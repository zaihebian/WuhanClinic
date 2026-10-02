// ---------------------------------------------------------------
// 数据模型：与 supabase/schema.sql 一一对应
// 只有三张表：doctors（医生）/ cases（病例）/ appointments（预约）
// 「病例」= 患者档案 + 初诊信息，字段对齐 e看牙「新增患者」表单
// ---------------------------------------------------------------

export type Gender = "男" | "女" | "未知";

export type AppointmentStatus =
  | "待确认"
  | "预约"
  | "已确认"
  | "已到诊"
  | "治疗中"
  | "已完成"
  | "已取消"
  | "爽约";

export type Doctor = {
  id: string;
  name: string;
  title: string | null;
  specialty: string | null;
  color: string;
  active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
};

export type CaseFile = {
  id: string;

  // —— 个人信息 ——
  name: string;
  gender: Gender;
  patient_type: string; // 普通 / 正畸 / 种植 / 临时
  chart_no: string; // 病历号
  birth_date: string | null; // YYYY-MM-DD
  birth_unknown: boolean;
  photo_url: string | null;

  // —— 联系方式 ——
  phone: string | null;
  phone_owner: string | null; // 本人 / 家属 / 其他
  tel: string | null;
  tel_owner: string | null; // 家 / 公司 / 其他
  workplace: string | null;
  province: string | null;
  city: string | null;
  district: string | null;
  address: string | null;

  // —— 患者信息 ——
  source: string | null; // 患者来源
  tags: string[];
  note: string | null; // 患者备注
  allergy: string | null; // 过敏史
  past_history: string | null; // 既往史
  medication: string | null; // 用药史

  // —— 客户关系 ——
  doctor_id: string | null; // 责任医生

  // —— 初诊信息 ——
  first_visit_date: string | null;
  first_visit_doctor_id: string | null;
  chief_complaint: string | null; // 主诉
  symptoms: string | null; // 症状
  preliminary_diagnosis: string | null; // 初步判断

  // —— 患者自由项 ——
  group_name: string | null; // 患者分组

  created_at?: string;
  updated_at?: string;
};

export type Appointment = {
  id: string;
  case_id: string;
  doctor_id: string | null;
  start_at: string; // ISO
  duration_min: number;
  status: AppointmentStatus;
  visit_type: string; // 初诊 / 复诊
  booking_type: string; // 普通 / 待定
  items: string[];
  chair: string | null;
  assistant: string | null;
  source: string | null;
  note: string | null;
  created_at?: string;
  updated_at?: string;
};

export type TableName = "doctors" | "cases" | "appointments";

export type DB = {
  doctors: Doctor;
  cases: CaseFile;
  appointments: Appointment;
};
