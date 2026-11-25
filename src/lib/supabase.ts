import { createClient, type Session } from "@supabase/supabase-js";

/* Cliente do Supabase no navegador (só a chave anon, pública). Sem as variáveis,
   o app segue como antes: código de acesso e dados pelo servidor. */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase = url && anon ? createClient(url, anon, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce" } }) : null;
export const supabaseEnabled = !!supabase;

/** Sessão guardada (síncrono, para a guarda de rota): o próprio supabase-js grava em localStorage. */
export function hasStoredSession(): boolean {
  if (!url) return false;
  try {
    const ref = new URL(url).hostname.split(".")[0];
    const raw = localStorage.getItem(`sb-${ref}-auth-token`);
    if (!raw) return false;
    const s = JSON.parse(raw) as Partial<Session> & { expires_at?: number };
    return !!s.access_token && (!s.expires_at || s.expires_at * 1000 > Date.now() - 60_000 || !!s.refresh_token);
  } catch {
    return false;
  }
}

export async function signInWithGoogle(from = "/") {
  if (!supabase) throw new Error("Supabase não configurado");
  const redirectTo = `${location.origin}/login?from=${encodeURIComponent(from)}`;
  const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo, queryParams: { prompt: "select_account" } } });
  if (error) throw error;
}

/** Link mágico por e-mail (alternativa ao Google). */
export async function signInWithEmail(email: string, from = "/") {
  if (!supabase) throw new Error("Supabase não configurado");
  const emailRedirectTo = `${location.origin}/login?from=${encodeURIComponent(from)}`;
  const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo } });
  if (error) throw error;
}

export async function signOut() {
  await supabase?.auth.signOut();
}
