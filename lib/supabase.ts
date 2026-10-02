import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Supabase 有两套 key，本文件两种都认：
//   1. 新版 publishable key：sb_publishable_xxxxxxxx   （推荐，2026 年后的新项目默认给这个）
//   2. 旧版 anon JWT：      eyJhbGciOi...             （仍然有效，官方计划 2026 年底弃用）
// 注意：必须写成静态的 process.env.XXX，Next.js 才会在打包时把值内联进去。
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

export const SUPABASE_URL = url || "";
export const SUPABASE_KEY = key || "";

/** 两个值齐全才启用 Supabase，否则走本地演示模式 */
export const isSupabaseEnabled = Boolean(SUPABASE_URL && SUPABASE_KEY);

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!isSupabaseEnabled) {
    throw new Error(
      "Supabase 未配置：缺少 NEXT_PUBLIC_SUPABASE_URL 和 key（NEXT_PUBLIC_SUPABASE_ANON_KEY 或 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY）"
    );
  }
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false },
    });
  }
  return client;
}
