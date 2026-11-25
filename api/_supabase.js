// Supabase no servidor (funções da Vercel e servidor local), pela API REST (PostgREST + Storage).
// Ligado quando SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY existem; sem elas tudo segue no Redis / arquivo local.
// A chave de serviço só vive no servidor: nunca vai para o navegador.
const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const hasSupabase = !!(URL_ && KEY);

const headers = (extra = {}) => ({ apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", ...extra });

async function rest(path, init = {}) {
  const res = await fetch(`${URL_}/rest/v1/${path}`, { ...init, headers: headers(init.headers) });
  if (!res.ok) throw new Error(`supabase ${res.status} ${await res.text().catch(() => "")}`.slice(0, 300));
  return res.status === 204 ? null : res.json().catch(() => null);
}

/** Tabela com { id, doc } guardando o objeto inteiro (decks e boards). */
function docTable(table, titleOf) {
  return {
    async list() { return (await rest(`${table}?select=doc&order=updated_at.desc`)).map((r) => r.doc); },
    async get(id) { const r = await rest(`${table}?select=doc&id=eq.${encodeURIComponent(id)}`); return r[0]?.doc ?? null; },
    async put(doc, extra = {}) {
      await rest(table, { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify([{ id: doc.id, title: titleOf(doc), doc, ...extra }]) });
    },
    async del(id) { await rest(`${table}?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" }); },
  };
}
const titleText = (t) => (typeof t === "string" ? t : t && (t.pt || t["pt-BR"] || t.en || Object.values(t)[0])) || null;
export const deckStore = docTable("xlide_decks", (d) => titleText(d.title));
export const boardStoreSb = docTable("xlide_boards", (b) => titleText(b.title || b.name));

export async function logMigration(kind, ref, ok, note) {
  await rest("xlide_migration_log", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify([{ kind, ref, ok, note }]) }).catch(() => {});
}

/** Envia um arquivo para o bucket xlide-media e devolve a URL pública. */
export async function uploadMedia(path, bytes, type) {
  const res = await fetch(`${URL_}/storage/v1/object/xlide-media/${path}`, { method: "POST", headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": type, "x-upsert": "true" }, body: bytes });
  if (!res.ok) throw new Error(`storage ${res.status} ${await res.text().catch(() => "")}`.slice(0, 300));
  return `${URL_}/storage/v1/object/public/xlide-media/${path}`;
}

export async function insertEvents(rows) {
  await rest("xlide_events", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(rows) });
}
export async function auditReport(days = 30) {
  return rest("rpc/xlide_audit_report", { method: "POST", body: JSON.stringify({ days }) });
}
/** Confere o token do usuário (Authorization: Bearer <jwt> do supabase-js) e devolve o id, ou null. */
export async function userFromToken(token) {
  if (!hasSupabase || !token) return null;
  const res = await fetch(`${URL_}/auth/v1/user`, { headers: { apikey: KEY, Authorization: `Bearer ${token}` } });
  if (!res.ok) return null;
  const u = await res.json().catch(() => null);
  return u?.id || null;
}
export { rest };
