// Copia os decks e boards que já estão no XLIDE (Redis da Vercel, ou os arquivos do servidor local)
// para o projeto Supabase do XLIDE. SÓ LÊ do Redis: nada é apagado nem alterado lá.
// Pode rodar quantas vezes quiser (upsert pelo id). Cada item copiado é conferido e registrado em xlide_migration_log.
// As imagens continuam onde estão (/api/images/<id>, Redis ou Vercel Blob): os decks apontam para elas como antes.
//
// Uso:  node scripts/migrate-redis-to-supabase.mjs [--dry] [--local]
//   .env.local com SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e REDIS_URL (ou KV_REST_API_URL + KV_REST_API_TOKEN)
//   --local   lê server/data.json e server/boards.json em vez do Redis
//   --dry     só conta e mostra o que seria copiado
import "../server/env.js";
import fs from "node:fs";

const DRY = process.argv.includes("--dry");
const LOCAL = process.argv.includes("--local");
const { hasSupabase, deckStore, boardStoreSb, logMigration } = await import("../api/_supabase.js");
if (!hasSupabase && !DRY) { console.error("Faltam SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local."); process.exit(1); }

async function fromRedis() {
  const { redis, hasRedis } = await import("../api/_redis.js");
  if (!hasRedis) { console.error("Falta REDIS_URL (ou KV_REST_API_URL + KV_REST_API_TOKEN) no .env.local."); process.exit(1); }
  const read = async (set, prefix) => {
    const [ids] = await redis(["SMEMBERS", set]);
    if (!ids?.length) return [];
    const out = [];
    for (let i = 0; i < ids.length; i += 50) {
      const chunk = ids.slice(i, i + 50);
      const [vals] = await redis(["MGET", ...chunk.map((id) => prefix + id)]);
      vals.forEach((v, k) => { if (v) try { out.push(JSON.parse(v)); } catch { console.log("JSON inválido:", prefix + chunk[k]); } });
    }
    return out;
  };
  return { decks: await read("xlide:ids", "xlide:p:"), boards: await read("xlide:bids", "xlide:b:") };
}
function fromLocal() {
  const load = (f) => { try { return Object.values(JSON.parse(fs.readFileSync(new URL(`../server/${f}`, import.meta.url), "utf8"))); } catch { return []; } };
  return { decks: load("data.json"), boards: load("boards.json") };
}

const { decks, boards } = LOCAL ? fromLocal() : await fromRedis();
console.log(`Origem: ${LOCAL ? "arquivos locais" : "Redis"} · ${decks.length} decks · ${boards.length} boards`);
if (DRY) process.exit(0);

let ok = 0, fail = 0;
async function copy(kind, store, item, extra) {
  try {
    await store.put(item, { source: LOCAL ? "local" : "redis", ...extra });
    const back = await store.get(item.id); // confere
    if (!back || back.id !== item.id) throw new Error("não voltou igual");
    ok++; await logMigration(kind, item.id, true, null);
  } catch (e) {
    fail++; console.log(`FALHOU ${kind} ${item.id}: ${e.message}`); await logMigration(kind, item.id ?? "?", false, String(e.message).slice(0, 300));
  }
}
for (const d of decks) if (d?.id) await copy("deck", deckStore, d, { kind: d.music ? "song" : "deck" });
for (const b of boards) if (b?.id) await copy("board", boardStoreSb, b, {});
console.log(`Copiados: ${ok} · falharam: ${fail}. O Redis não foi alterado.`);
