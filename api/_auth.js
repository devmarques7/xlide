// Quem está chamando a API. Com o Supabase ligado o XLIDE é fechado:
//   · chave do MCP da pessoa (xl_…, tabela xlide_tokens; cada membro ganha a sua ao entrar pelo convite),
//   · ou a sessão do app (Authorization: Bearer <jwt do supabase-js>), desde que a pessoa tenha perfil,
//   · ou XLIDE_MCP_KEY, se definida na Vercel (chave de serviço, conta como admin; opcional).
// Sem o Supabase tudo segue como antes: XLIDE_MCP_KEY ou o código 1423.
import { hasSupabase, rest, userFromToken } from "./_supabase.js";
export { runAs, currentActorId } from "./_supabase.js";

const ENV_KEY = process.env.XLIDE_MCP_KEY || "";
export const LEGACY_KEY = ENV_KEY || "1423";


function keyOf(headers, query) {
  const auth = headers?.authorization || headers?.Authorization || "";
  return /^Bearer\s+(.+)$/i.exec(auth)?.[1]?.trim() || (typeof query?.key === "string" ? query.key.trim() : "");
}

/** O servidor não consegue falar com o Supabase (chave secreta errada na Vercel, por exemplo): não é culpa da chave da pessoa. */
export class ServerDown extends Error {}
function serverDown(e) {
  const m = String(e?.message ?? e);
  throw new ServerDown(/401|Invalid API key/i.test(m) ? "server_key_invalid" : "supabase_unreachable");
}
export const SERVER_DOWN_HINT = {
  server_key_invalid: "O servidor do XLIDE está com a chave secreta do Supabase errada (SUPABASE_SERVICE_ROLE_KEY na Vercel). Sua chave do MCP está certa; o admin precisa colar a Secret key de novo e fazer redeploy.",
  supabase_unreachable: "O servidor do XLIDE não conseguiu falar com o Supabase agora. Tente de novo em um minuto.",
};

const cache = new Map(); // chave → { actor, at } por 60 s (cada função da Vercel tem o seu)
const EDIT = new Set(["admin", "editor"]);

/** { id, role, via, canEdit } ou null. */
export async function actorFrom(headers, query) {
  const key = keyOf(headers, query);
  if (!key) return null;
  if (!hasSupabase) return key === LEGACY_KEY ? { id: null, role: "admin", via: "key", canEdit: true } : null;
  if (ENV_KEY && key === ENV_KEY) return { id: null, role: "admin", via: "key", canEdit: true };
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < 60_000) return hit.actor;
  let actor = null;
  if (/^xl_[0-9a-f]{48}$/.test(key)) {
    const rows = await rest(`xlide_tokens?select=user_id,profiles(role)&token=eq.${key}`).catch(serverDown);
    const r = rows?.[0];
    if (r?.profiles?.role) {
      actor = { id: r.user_id, role: r.profiles.role, via: "token" };
      rest(`xlide_tokens?user_id=eq.${r.user_id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ last_used_at: new Date().toISOString() }) }).catch(() => {});
    }
  } else if (key.split(".").length === 3) {
    const uid = await userFromToken(key);
    if (uid) {
      const rows = await rest(`profiles?select=role&id=eq.${uid}`).catch(serverDown);
      if (rows?.[0]?.role) actor = { id: uid, role: rows[0].role, via: "app" };
    }
  }
  if (actor) actor.canEdit = EDIT.has(actor.role);
  cache.set(key, { actor, at: Date.now() });
  if (cache.size > 500) cache.delete(cache.keys().next().value);
  return actor;
}

/** Para as rotas: devolve o membro ou responde 401/403 e devolve null. need = "member" | "edit" | "admin". */
export async function requireActor(req, res, need = "member") {
  let a;
  try {
    a = await actorFrom(req.headers, req.query);
  } catch (e) {
    if (!(e instanceof ServerDown)) throw e;
    res.status(503).json({ error: e.message, message: SERVER_DOWN_HINT[e.message] });
    return null;
  }
  if (!a) {
    res.status(401).json({ error: "unauthorized", message: keyOf(req.headers, req.query) ? "Chave do MCP inválida ou trocada. Copie o link novo em XLIDE → Configurações → Conectar ao Claude." : "Falta a chave. Use o link de XLIDE → Configurações → Conectar ao Claude (…/api/mcp?key=xl_…)." });
    return null;
  }
  if ((need === "edit" && !a.canEdit) || (need === "admin" && a.role !== "admin")) { res.status(403).json({ error: "forbidden", role: a.role }); return null; }
  return a;
}

/** Rotas do app (decks, boards, imagens): sem o Supabase seguem abertas como antes; com ele, só a equipe. */
export async function guard(req, res, need = "member") {
  if (!hasSupabase) return { id: null, role: "admin", via: "open", canEdit: true };
  return requireActor(req, res, need);
}
