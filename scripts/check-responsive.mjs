import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

const checks = [
  ["mobile-first grid", /grid-cols-1\s+lg:grid-cols-12/u],
  ["fluid card slot class", /responsive-card-slot/u],
  ["fluid card height", /height:\s*clamp\(444px,\s*calc\(1183px\s*-\s*70\.703125vw\),\s*640px\)/u],
  ["narrow player input", /id="playerNameInput"[^>]*\bmin-w-0\b/u],
  ["fluid site title", /\.site-title\s*\{[^}]*font-size:\s*clamp\(/su],
  ["single-line site title", /<h1[^>]*site-title[^>]*>[\s\S]*?<span[^>]*whitespace-nowrap/u],
  ["single-line title badge", /class="site-badge\b[^>]*"/u],
  ["question text wrapping", /id="cardQuestionZh"[^>]*\bbreak-words\b/u],
  ["scrollable history", /id="historyLogList"[^>]*\boverflow-y-auto\b/u],
];

const failures = checks.filter(([, pattern]) => !pattern.test(html));
if (failures.length > 0) {
  console.error(`RWD 檢查失敗：${failures.map(([name]) => name).join("、")}`);
  process.exitCode = 1;
} else {
  console.log(`RWD 靜態檢查通過：${checks.length} 項`);
}
