import { ACCESS_CODE } from "./utils";

const KEY = "xlide.unlocked";
// Fallback when sessionStorage is blocked (private mode, sandboxed frames).
let memUnlocked = false;

export function isUnlocked() {
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
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
