// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY

// Debug helper — remove after confirming keys load
if (!supabaseUrl)  console.error('❌ VITE_SUPABASE_URL is missing from .env.local')
if (!supabaseAnon) console.error('❌ VITE_SUPABASE_ANON_KEY is missing from .env.local')

export const supabase = createClient(
  supabaseUrl  || 'https://placeholder.supabase.co',
  supabaseAnon || 'placeholder'
)