// Set these in Vercel (Project Settings → Environment Variables) or app/web/.env.local.
// The anon key is public by design; the service role key never goes here.
const env = ((import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {});

export const API_URL = env.VITE_API_URL?.replace(/\/$/, "");
export const SUPABASE_URL = env.VITE_SUPABASE_URL;
export const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY;

// Without all three the app still reads the device, but can't sign in or save.
export const SERVER_CONFIGURED = Boolean(API_URL && SUPABASE_URL && SUPABASE_ANON_KEY);
