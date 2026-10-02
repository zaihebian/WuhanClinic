# 口腔诊所 · 日程预约 + 病例登记

参考 e看牙（领健）的部分界面重做的轻量版，**只有两个功能**：

1. **日程与预约管理**（日历看板）
2. **病例填写**（患者登记表）

技术栈：Next.js 15（App Router）+ TypeScript + Tailwind CSS + Supabase。
目标部署环境：Vercel + Supabase。

---

## 1. 本地跑起来

```bash
cd dental-clinic
npm install
npm run dev
# 打开 http://localhost:3000
```

**不配任何环境变量也能跑。** 这时是「本地演示模式」，数据存在浏览器
`localStorage`，并自带 5 位医生、13 份病例、20 条预约的演示数据。

---

## 2. 两种数据模式

| | 本地演示模式 | Supabase 模式 |
|---|---|---|
| 触发条件 | `NEXT_PUBLIC_SUPABASE_URL` 为空 | 两个环境变量都填上 |
| 数据存哪 | 浏览器 localStorage | Supabase Postgres |
| 适合 | 试功能、演示、改界面 | 真实使用、多台电脑共享 |

切换方式：在 `.env.local` 里填上环境变量，重启 `npm run dev` 即自动切到云端。
左侧边栏底部会显示当前处于哪种模式。

---

## 3. 接入 Supabase（5 分钟）

### 第 1 步：建项目（已完成可跳过）

https://supabase.com → New project → 记下数据库密码（后面基本用不到，但别丢）。

### 第 2 步：建表（已完成可跳过）

左侧 **SQL Editor** → New query → 把 `supabase/schema.sql` 全文粘进去 → **Run**。
脚本幂等，重复执行不报错。它会建 3 张表、开 RLS 策略、插入 5 位医生。

跑成功的标志：左侧 **Table Editor** 里能看到 `doctors` / `cases` / `appointments` 三张表，
且 `doctors` 里有 5 行。

### 第 3 步：拿两个值

> ⚠️ Supabase 已改版：**没有** `Settings → API` 这个页面了，现在叫 `Settings → API Keys`。

**最快路径**：项目页右上角点 **Connect** 按钮 → 弹窗里直接显示
`Project URL` 和一个 key，可以一键复制。

**或者**：左侧 **Settings → API Keys**，里面有两块：

| 要复制的 | 长什么样 | 在哪 |
|---|---|---|
| Project URL | `https://xxxxx.supabase.co` | 页面顶部 |
| API key | `sb_publishable_xxxx`（新版）<br>或 `eyJhbGciOi...`（旧版 anon） | API Keys 列表里，类型写 **publishable** 或 **anon / public** 的那个 |

- 两种 key 本系统都认，随便哪个都能用。
- **千万别复制 secret key / service_role** —— 那个会绕过 RLS，等于把数据库裸奔。

### 第 4 步：填进 `.env.local`

项目根目录已经建好 `.env.local`，打开它，**只改最后两行的等号后面**：

```env
NEXT_PUBLIC_SUPABASE_URL=https://你的项目.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_你的key
```

整段粘贴，不要加引号、不要在前后加空格。

### 第 5 步：重启

```bash
npm run dev
```

`.env.local` 只在启动时读取，改完**必须重启**才生效。

**成功的标志**：左侧边栏最底部从橙色的「本地演示模式」变成绿色的「已连接 Supabase」。

**这时数据库里只有 5 位医生，病例和预约是空的** —— 之前本地演示模式里录的数据存在
浏览器 localStorage，不会自动搬过去，这是正常的。需要的话重新录入即可。

### 排查

| 现象 | 原因 |
|---|---|
| 还是显示「本地演示模式」 | 没重启，或 `.env.local` 里两行没填全 |
| 页面报 `relation "public.cases" does not exist` | schema.sql 没跑成功，回第 2 步 |
| 页面报 `permission denied for table cases` | schema.sql 里的 RLS / grant 部分没执行完整，把整个脚本重跑一遍 |
| 报 `Invalid API key` | 复制时漏了字符，或复制成了 secret key |


---

## 4. 部署到 Vercel

```bash
# 首次
npm i -g vercel
vercel            # 一路回车，Framework 会自动识别为 Next.js
vercel --prod
```

或者走网页版：

1. 把 `dental-clinic` 推到 GitHub。
2. Vercel → Add New → Project → 选中该仓库 → Framework Preset 选 **Next.js**。
3. 在 **Environment Variables** 里加两条（名字和 `.env.local` 完全一致）：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy。

> ⚠️ 这两个变量是**打包时**写进前端代码的，改完必须 **Redeploy** 才生效
> （Deployments → 最新一条 → ⋯ → Redeploy）。
>
> ⚠️ `.env.local` 已被 `.gitignore` 排除，不会推到 GitHub，所以 Vercel 上必须手动再填一次。

之后每次 push 到主分支都会自动重新部署。

---

## 5. ⚠️ 安全提示（重要，请读完）

按需求本系统**没有登录**，因此 `supabase/schema.sql` 里的 RLS 策略是
「对 anon 角色开放全部读写」。这意味着：

- **任何拿到网址的人，都能查看、修改、删除全部病例和预约数据。**
- 病例属于敏感的个人健康信息，请勿把网址发到公开群、朋友圈或任何不受控的地方。

如果之后要收紧，最小改动是接入 Supabase Auth：

1. Supabase → Authentication → 开启 Email 登录，创建诊所账号。
2. 给三张表加 `owner uuid default auth.uid()` 字段。
3. 把 `schema.sql` 第 4 节的策略改成：
   ```sql
   create policy "owner only" on public.cases
     for all to authenticated
     using (owner = auth.uid()) with check (owner = auth.uid());
   ```
4. 前端加一个登录页（`@supabase/supabase-js` 的 `signInWithPassword`），
   并把客户端 `auth.persistSession` 改成 `true`。

---

## 6. 功能说明

### 6.1 日程（`/`）

- 左侧：月历（有预约的日期带彩色圆点，颜色 = 预约状态）+ 当天状态统计 + 最近待就诊列表。
- 右侧：**按医生分列的日视图时间轴**，08:00–20:00，每小时 64px。
- 操作：
  - 点空白时段 → 新建预约（时间自动填成最近的 15 分钟刻度）
  - **双击**医生列空白处 → 新建预约
  - 点预约块 → 编辑 / 删除
  - 顶部可搜索患者、按状态筛选、点医生标签临时隐藏该列
- 预约状态共 8 种：待确认 / 预约 / 已确认 / 已到诊 / 治疗中 / 已完成 / 已取消 / 爽约。
- 同一时段多个预约会自动分道显示，不重叠。
- 医生管理在左下角「医生管理」弹窗里（新增 / 改颜色 / 停用 / 删除）。

### 6.2 病例（`/cases`）

- 列表：按姓名 / 手机 / 病历号 / 初步判断搜索，按患者类型和医生筛选。
- 详情页 = **病例填写表单**，字段完全对照 e看牙「新增患者」：

| 分区 | 字段 |
|---|---|
| 个人信息 | 姓名、性别、患者类型、病历号、出生年月日、年龄、患者照片、患者分组 |
| 联系方式 | 手机（含归属）、电话（含归属）、工作单位、家庭住址（省/市/区/详细） |
| 患者信息 | 患者来源、患者标签、过敏史、既往史、用药史、患者备注、责任医生 |
| 初诊信息 | 初诊日期、初诊医生、主诉、症状、初步判断 |

- 年龄与出生日期双向联动；病历号按「YYMMDD + 3 位序号」自动生成，可手动改。
- 患者照片上传后在前端压缩到 240px JPEG 再存，避免把原图塞进数据库。
- 详情页右侧固定「就诊记录」栏，显示该患者全部预约，可直接编辑/删除/新建。
- 底部操作：`取消` / `保存并预约`（保存后跳回日程并自动打开预约弹窗）/ `保存病例`。
- 顶部可 `打印`。

---

## 7. 目录结构

```
dental-clinic/
├── app/
│   ├── layout.tsx              全局布局（DataProvider + 侧边栏）
│   ├── page.tsx                日程（日历看板）
│   ├── globals.css
│   └── cases/
│       ├── page.tsx            病例列表
│       ├── new/page.tsx        新增病例
│       └── [id]/page.tsx       病例详情 / 编辑
├── components/
│   ├── AppShell.tsx            侧边栏 + 导航（只有「日程」「病例」两项）
│   ├── DataProvider.tsx        全局数据状态（读 / 写 / 缓存）
│   ├── CalendarPanel.tsx       月历 + 当天概览
│   ├── DayBoard.tsx            医生分列时间轴看板
│   ├── AppointmentDialog.tsx   新建 / 编辑预约
│   ├── CaseForm.tsx            病例填写表单
│   ├── DoctorDialog.tsx        医生管理
│   └── ui.tsx                  基础组件（Button/Input/Modal/...）
├── lib/
│   ├── types.ts                数据模型
│   ├── constants.ts            状态、项目、颜色等常量
│   ├── utils.ts                日期与格式化工具
│   ├── supabase.ts             Supabase 客户端
│   ├── localdb.ts              本地演示模式（localStorage + 种子数据）
│   └── api.ts                  统一数据接口（自动在两种模式间切换）
├── supabase/schema.sql         建表 + RLS + 种子医生
└── .env.local.example
```

### 数据层是怎么切的

`lib/api.ts` 导出一组异步 CRUD 函数。内部只看一个布尔值
`isSupabaseEnabled`（由两个环境变量是否齐全决定）：

- `true` → 走 `@supabase/supabase-js` 读写 Postgres
- `false` → 读写 `localStorage`

上层组件只调用 `api.*`，完全感知不到差别。所以**改界面不需要动数据层，
换数据库也不需要动界面**。

---

## 8. 数据模型

```
doctors (医生)
  id, name, title, specialty, color, active, sort_order

cases (病例 = 患者档案 + 初诊信息)
  id, name, gender, patient_type, chart_no, birth_date, birth_unknown, photo_url,
  phone, phone_owner, tel, tel_owner, workplace, province, city, district, address,
  source, tags[], note, allergy, past_history, medication,
  doctor_id → doctors.id,
  first_visit_date, first_visit_doctor_id → doctors.id,
  chief_complaint, symptoms, preliminary_diagnosis, group_name

appointments (预约)
  id, case_id → cases.id (级联删除), doctor_id → doctors.id (置空),
  start_at, duration_min, status, visit_type, booking_type, items[],
  chair, assistant, source, note
```

删除行为：删病例 → 连带删该病例的所有预约；删医生 → 相关记录的医生字段置空，
不会丢数据。

---

## 9. 常见问题

**Q：改完 `.env.local` 没生效？**
A：`.env.local` 只在启动时读取，必须重启 `npm run dev`。

**Q：Supabase 模式下一片空白 / 报错？**
A：先确认 `schema.sql` 已经执行过（表不存在会返回 404）。再确认 key 复制的是
`anon public`，不是 `service_role`。

**Q：想恢复演示数据？**
A：本地演示模式下，浏览器控制台执行
`localStorage.removeItem('dental-clinic-db-v2')` 后刷新页面。

**Q：能不能加挂号、收费、库存、报表？**
A：本次需求明确不要。数据模型已经留好了扩展位（`appointments.case_id`
和 `cases.doctor_id` 都是外键），要加时新建表引用即可。
