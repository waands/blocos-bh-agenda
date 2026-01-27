import { createClient } from "@supabase/supabase-js"

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || ""
const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || ""

const supabaseUrl = rawUrl || "http://localhost:54321"
const supabaseAnonKey = rawKey || "public-anon-key"

if (!/^https?:\/\//.test(supabaseUrl)) {
  throw new Error(
    `Invalid supabaseUrl: "${supabaseUrl}". Expected a full URL like https://xyz.supabase.co`
  )
}

export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
