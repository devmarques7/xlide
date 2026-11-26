import { createClient, type Session } from "@supabase/supabase-js";

/* Cliente do Supabase no navegador (só a chave anon, pública). Sem as variáveis,
   o app segue como antes: código de acesso e dados pelo servidor. */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase = url && anon ? createClient(url, anon, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce" } }) : null;
export const supabaseEnabled = !!supabase;

function storedSession(): (Partial<Session> & { expires_at?: number }) | null {
  if (!url) return null;
  try {
    const ref = new URL(url).hostname.split(".")[0];
    const raw = localStorage.getItem(`sb-${ref}-auth-token`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Sessão guardada (síncrono, para a guarda de rota): o próprio supabase-js grava em localStorage. */
export function hasStoredSession(): boolean {
  const s = storedSession();
  return !!s?.access_token && (!s.expires_at || s.expires_at * 1000 > Date.now() - 60_000 || !!s.refresh_token);
}

/** fetch para a API do XLIDE levando a sessão (com o Supabase, decks, boards e imagens só abrem para a equipe). */
export function apiFetch(input: string, init: RequestInit = {}) {
  const token = storedSession()?.access_token;
  if (!token) return fetch(input, init);
  const headers = new Headers(init.headers);
  if (!headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}

/* ───── convite e equipe (sistema fechado: só entra quem foi convidado) ───── */

const INVITE_KEY = "xlide.invite";
/** O token do convite atravessa a ida e a volta do Google. */
export function rememberInvite(token: string | null) {
  try {
    if (token) sessionStorage.setItem(INVITE_KEY, token);
    else sessionStorage.removeItem(INVITE_KEY);
  } catch {
    /* ignore */
  }
}
export function pendingInvite(): string | null {
  try {
    return sessionStorage.getItem(INVITE_KEY);
  } catch {
    return null;
  }
}

export interface InviteInfo {
  email: string;
  name: string | null;
  role: "admin" | "editor" | "operator" | "reader";
  status: "valid" | "used" | "expired" | "revoked";
  expires_at: string;
}
export async function inviteInfo(token: string): Promise<InviteInfo | null> {
  if (!supabase) return null;
  const { data } = await supabase.rpc("xlide_invite_info", { tok: token });
  return (data as InviteInfo | null) ?? null;
}

/** Depois de entrar: a pessoa é da equipe? Se não for, tenta o convite pendente do e-mail dela. */
export async function ensureMember(token: string | null = pendingInvite()): Promise<boolean> {
  if (!supabase) return true;
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return false;
  const { data } = await supabase.from("profiles").select("id").eq("id", u.user.id).maybeSingle();
  if (data) return true;
  const { data: ok } = await supabase.rpc("xlide_join", { tok: token ?? null });
  return !!ok;
}

/** A chave do MCP da pessoa (criada ao entrar pelo convite). */
export async function myMcpToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.from("xlide_tokens").select("token").maybeSingle();
  return (data?.token as string | undefined) ?? null;
}
export async function rotateMcpToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("xlide_rotate_token");
  if (error) throw error;
  return data as string;
}

/** Erro do Supabase quando o e-mail não tem convite (o banco recusa criar a conta). */
export const isNoInviteError = (e: unknown) => /xlide_sem_convite|Database error saving new user|Signups not allowed/i.test(String((e as Error)?.message ?? e));

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
