import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_PATH = path.join(ROOT, "cards.md");
const TEMPLATE_PATH = path.join(ROOT, "index.html");
const OUTPUT_DIR = path.join(ROOT, "dist");
const OUTPUT_PATH = path.join(OUTPUT_DIR, "index.html");

const DECKS = {
  warmup: {
    heading: "暖身破冰",
    name: "暖身破冰",
    badgeColor: "bg-rose-500",
    colorClass: "from-rose-500 to-rose-600",
  },
  one_star: {
    heading: "一星連結",
    name: "一星連結 ⭐",
    badgeColor: "bg-teal-500",
    colorClass: "from-teal-500 to-emerald-600",
  },
  two_star: {
    heading: "二星連結",
    name: "二星連結 ⭐⭐",
    badgeColor: "bg-blue-500",
    colorClass: "from-blue-500 to-indigo-600",
  },
  three_star: {
    heading: "三星連結",
    name: "三星連結 ⭐⭐⭐",
    badgeColor: "bg-purple-500",
    colorClass: "from-purple-500 to-violet-600",
  },
};

function normalizeHeading(value) {
  return value.replace(/\s*⭐+\s*$/u, "").trim();
}

function parseCards(markdown) {
  const cards = Object.fromEntries(Object.keys(DECKS).map((deck) => [deck, []]));
  let activeDeck = null;

  for (const [lineNumber, rawLine] of markdown.split(/\r?\n/u).entries()) {
    const line = rawLine.trimEnd();
    const headingMatch = line.match(/^##\s+(.+?)\s*$/u);
    if (headingMatch) {
      const heading = normalizeHeading(headingMatch[1]);
      activeDeck = Object.keys(DECKS).find((deck) => DECKS[deck].heading === heading) ?? null;
      if (!activeDeck) {
        throw new Error(`第 ${lineNumber + 1} 行的牌組標題不受支援：「${headingMatch[1]}」`);
      }
      continue;
    }

    if (!line.trim() || line.trimStart().startsWith("#")) continue;

    const cardMatch = line.match(/^\s*(?:\d+[.)]|[-*])\s+(.+?)\s*$/u);
    if (!cardMatch) {
      throw new Error(`第 ${lineNumber + 1} 行不是有效的牌卡項目：「${line}」`);
    }
    if (!activeDeck) {
      throw new Error(`第 ${lineNumber + 1} 行的牌卡沒有放在牌組標題下：「${line}」`);
    }

    const text = cardMatch[1].replace(/\s+/gu, " ").trim();
    if (!text) throw new Error(`第 ${lineNumber + 1} 行的牌卡內容是空白。`);
    cards[activeDeck].push(text);
  }

  for (const [deck, config] of Object.entries(DECKS)) {
    if (cards[deck].length === 0) throw new Error(`牌組「${config.name}」沒有任何題目。`);
  }

  const seen = new Map();
  for (const [deck, deckCards] of Object.entries(cards)) {
    deckCards.forEach((text, index) => {
      const location = `${DECKS[deck].name} #${index + 1}`;
      if (seen.has(text)) {
        throw new Error(`發現重複題目：${location} 與 ${seen.get(text)} 都是「${text}」`);
      }
      seen.set(text, location);
    });
  }

  return cards;
}

function createCardData(cards) {
  return Object.fromEntries(
    Object.entries(DECKS).map(([deck, config]) => [
      deck,
      {
        id: deck,
        name: config.name,
        badgeColor: config.badgeColor,
        colorClass: config.colorClass,
        cards: cards[deck].map((zh) => ({ zh })),
      },
    ]),
  );
}

function build() {
  const cards = parseCards(fs.readFileSync(SOURCE_PATH, "utf8"));
  const template = fs.readFileSync(TEMPLATE_PATH, "utf8");
  const startMarker = "    // CARD_DATA_START";
  const endMarker = "    // CARD_DATA_END";
  const start = template.indexOf(startMarker);
  const end = template.indexOf(endMarker);

  if (start < 0 || end < 0 || end <= start) {
    throw new Error("index.html 缺少 CARD_DATA_START / CARD_DATA_END 標記。\n");
  }

  const generated = `    const CARD_DATA = ${JSON.stringify(createCardData(cards), null, 2)};`;
  const output = `${template.slice(0, start)}${startMarker}\n${generated}\n${endMarker}${template.slice(end + endMarker.length)}`;

  fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, output, "utf8");

  const counts = Object.entries(cards).map(([deck, deckCards]) => `${DECKS[deck].name} ${deckCards.length} 張`);
  console.log(`已產生 ${path.relative(ROOT, OUTPUT_PATH)}：${counts.join("、")}`);
}

try {
  build();
} catch (error) {
  console.error(`牌卡編譯失敗：${error.message}`);
  process.exitCode = 1;
}
