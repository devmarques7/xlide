// Gera a skill "XLIDE · especialista" para três destinos:
//   shared/skill.js                          → o MCP entrega o texto (read_skill) a quem conectar
//   public/downloads/xlide-especialista.zip  → para enviar em claude.ai → Skills
//   public/downloads/xlide-contexto.md       → o documento de contexto sozinho
// Rode depois de mudar skills/xlide-especialista:  npm run skill
import { execFileSync } from "node:child_process";
import { copyFileSync, readFileSync, rmSync, writeFileSync } from "node:fs";

const dir = "skills/xlide-especialista";
const skill = readFileSync(`${dir}/SKILL.md`, "utf8");
const context = readFileSync(`${dir}/references/contexto.md`, "utf8");
writeFileSync("shared/skill.js", `// Gerado por scripts/build-skill.mjs a partir de skills/xlide-especialista — não edite aqui.\nexport const SKILL_MD = ${JSON.stringify(skill)};\nexport const CONTEXT_MD = ${JSON.stringify(context)};\n`);
copyFileSync(`${dir}/references/contexto.md`, "public/downloads/xlide-contexto.md");
rmSync("public/downloads/xlide-especialista.zip", { force: true });
execFileSync("zip", ["-qrX", "../public/downloads/xlide-especialista.zip", "xlide-especialista", "-x", "*.DS_Store"], { cwd: "skills" });
console.log("skill ok:", skill.length, "+", context.length, "chars");
