import { ACCESS_CODE } from "./utils";

const KEY = "xlide.unlocked";

export function isUnlocked() {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function unlock(code: string) {
  if (code !== ACCESS_CODE) return false;
  try {
    sessionStorage.setItem(KEY, "1");
  } catch {
    /* ignore */
  }
  return true;
}

export function lock() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
