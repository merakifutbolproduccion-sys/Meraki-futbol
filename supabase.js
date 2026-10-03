import {createClient} from '@supabase/supabase-js'
const url=import.meta.env.VITE_SUPABASE_URL,key=(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||import.meta.env.VITE_SUPABASE_ANON_KEY)
export const configured=Boolean(url&&key)
export const sb=createClient(url||'http://localhost',key||'missing') // solo URL + anon key: nunca service_role
