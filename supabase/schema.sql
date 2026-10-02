-- ===============================================================
-- 口腔诊所 · 日程预约 + 病例登记
-- Supabase 建表脚本
-- 用法：Supabase 控制台 → SQL Editor → 新建查询 → 粘贴全文 → Run
-- 幂等，可重复执行。
-- ===============================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------
-- 1. 医生（日历看板的列）
-- ---------------------------------------------------------------
create table if not exists public.doctors (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  title       text,
  specialty   text,
  color       text default '#3661f0',
  active      boolean default true,
  sort_order  int default 0,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ---------------------------------------------------------------
-- 2. 病例（= 患者档案 + 初诊信息）
-- ---------------------------------------------------------------
create table if not exists public.cases (
  id                      uuid primary key default gen_random_uuid(),

  -- 个人信息
  name                    text not null,
  gender                  text default '未知',
  patient_type            text default '普通',
  chart_no                text unique not null,
  birth_date              date,
  birth_unknown           boolean default false,
  photo_url               text,

  -- 联系方式
  phone                   text,
  phone_owner             text,
  tel                     text,
  tel_owner               text,
  workplace               text,
  province                text,
  city                    text,
  district                text,
  address                 text,

  -- 患者信息
  source                  text,
  tags                    text[] default '{}',
  note                    text,
  allergy                 text,
  past_history            text,
  medication              text,

  -- 客户关系
  doctor_id               uuid references public.doctors(id) on delete set null,

  -- 初诊信息
  first_visit_date        date,
  first_visit_doctor_id   uuid references public.doctors(id) on delete set null,
  chief_complaint         text,
  symptoms                text,
  preliminary_diagnosis   text,

  -- 患者自由项
  group_name              text,

  created_at              timestamptz default now(),
  updated_at              timestamptz default now()
);

-- ---------------------------------------------------------------
-- 3. 预约
-- ---------------------------------------------------------------
create table if not exists public.appointments (
  id            uuid primary key default gen_random_uuid(),
  case_id       uuid not null references public.cases(id) on delete cascade,
  doctor_id     uuid references public.doctors(id) on delete set null,
  start_at      timestamptz not null,
  duration_min  int default 30,
  status        text default '预约',
  visit_type    text default '初诊',
  booking_type  text default '普通',
  items         text[] default '{}',
  chair         text,
  assistant     text,
  source        text,
  note          text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create index if not exists appointments_start_at_idx on public.appointments (start_at);
create index if not exists appointments_case_idx     on public.appointments (case_id);
create index if not exists appointments_doctor_idx   on public.appointments (doctor_id);
create index if not exists cases_name_idx            on public.cases (name);
create index if not exists cases_phone_idx           on public.cases (phone);

-- ---------------------------------------------------------------
-- 4. RLS
--    本系统按需求「不要登录」，因此对 anon 开放全部读写。
--    ⚠️ 任何拿到链接的人都能看到并修改全部病例数据。
--    若要收紧，请先接入 Supabase Auth，再把下面的策略改成按用户过滤。
-- ---------------------------------------------------------------
alter table public.doctors      enable row level security;
alter table public.cases        enable row level security;
alter table public.appointments enable row level security;

drop policy if exists "anon full access" on public.doctors;
drop policy if exists "anon full access" on public.cases;
drop policy if exists "anon full access" on public.appointments;

create policy "anon full access" on public.doctors
  for all to anon, authenticated using (true) with check (true);

create policy "anon full access" on public.cases
  for all to anon, authenticated using (true) with check (true);

create policy "anon full access" on public.appointments
  for all to anon, authenticated using (true) with check (true);

grant usage on schema public to anon, authenticated;
grant all on public.doctors      to anon, authenticated;
grant all on public.cases        to anon, authenticated;
grant all on public.appointments to anon, authenticated;

-- ---------------------------------------------------------------
-- 5. 种子医生（已存在同名则跳过）
-- ---------------------------------------------------------------
insert into public.doctors (name, title, specialty, color, sort_order)
select * from (values
  ('王医生', '主治医师', '牙体牙髓 · 根管治疗', '#3661f0', 0),
  ('康宁',   '执业医师', '口腔修复 · 全冠贴面', '#0ea5e9', 1),
  ('张欣',   '主治医师', '口腔外科 · 微创拔牙', '#10b981', 2),
  ('彭明峰', '执业医师', '牙周治疗 · 洁治',     '#f59e0b', 3),
  ('彭金林', '主治医师', '种植修复',             '#8b5cf6', 4)
) as v(name, title, specialty, color, sort_order)
where not exists (select 1 from public.doctors d where d.name = v.name);
