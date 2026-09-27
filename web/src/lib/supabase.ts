/** Supabase client (ARCHITECTURE.md §5): browser gets only the public URL + anon/publishable key. RLS does the rest. */
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  console.warn('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set -- see docs/SETUP.md.')
}

export const supabase = createClient(url ?? '', anonKey ?? '')
