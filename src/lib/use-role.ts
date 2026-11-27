import { useEffect, useState } from "react";
import { cachedRole, fetchRole, supabase, supabaseEnabled, type Role } from "@/lib/supabase";

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

/** Nome e e-mail de quem entrou (perfil; sem perfil, o que o login trouxe). */
export function useMe(): { name: string; email: string } | null {
  const [me, setMe] = useState<{ name: string; email: string } | null>(() => {
    try {
      return JSON.parse(localStorage.getItem("xlide.me") || "null");
    } catch {
      return null;
    }
  });
  useEffect(() => {
    if (!supabase) return;
    let on = true;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      const u = data.session?.user;
      if (!u) return;
      const { data: p } = await supabase.from("profiles").select("name,email").eq("id", u.id).maybeSingle();
      const meta = u.user_metadata ?? {};
      const v = { name: p?.name || meta.full_name || meta.name || (u.email ?? "").split("@")[0], email: p?.email || u.email || "" };
      try {
        localStorage.setItem("xlide.me", JSON.stringify(v));
      } catch {
        /* sem storage */
      }
      if (on) setMe(v);
    })();
    return () => {
      on = false;
    };
  }, []);
  return me;
}
