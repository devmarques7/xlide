// Carrega .env.local e .env (se existirem) antes de tudo: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, etc.
for (const f of [".env.local", ".env"]) {
  try { process.loadEnvFile(f); } catch { /* arquivo não existe */ }
}
