import { useEffect, useState } from "react";
import { cachedRole, fetchRole, supabaseEnabled, type Role } from "@/lib/supabase";

/** Papel de quem está usando; null sem Supabase ou sem perfil. */
export function useRole(): Role | null {
  const [role, setRole] = useState<Role | null>(() => (supabaseEnabled ? cachedRole() : null));
  useEffect(() => {
    if (!supabaseEnabled) return;
    let on = true;
    void fetchRole().then((r) => on && setRole(r));
    return () => {
      on = false;
    };
  }, []);
  return role;
}
