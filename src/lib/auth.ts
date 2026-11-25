import { ACCESS_CODE } from "./utils";
import { hasStoredSession, signOut, supabaseEnabled } from "./supabase";

const KEY = "xlide.unlocked";
// Fallback when sessionStorage is blocked (private mode, sandboxed frames).
let memUnlocked = false;

/** Com Supabase: logado com o Google. Sem Supabase: o código de acesso, como antes. */
export function isUnlocked() {
  if (supabaseEnabled) return hasStoredSession();
  try {
    return memUnlocked || sessionStorage.getItem(KEY) === "1";
  } catch {
    return memUnlocked;
  }
}

export function unlock(code: string) {
  if (code !== ACCESS_CODE) return false;
  memUnlocked = true;
  try {
    sessionStorage.setItem(KEY, "1");
  } catch {
    /* ignore */
  }
  return true;
}

export function lock() {
  memUnlocked = false;
  void signOut();
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
