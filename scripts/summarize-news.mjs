import fs from "node:fs/promises";

const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

if (!apiKey) {
  console.log("GEMINI_API_KEY is not configured; keeping source summaries.");
  process.exit(0);
}

const file = "data/news.json";
const cacheFile = "data/ai-cache.json";
const stories = JSON.parse(await fs.readFile(file, "utf8"));
let cache = {};
try { cache = JSON.parse(await fs.readFile(cacheFile, "utf8")); } catch {}

const keyFor = story => story.title.toLowerCase().replace(/[^a-zäöüß0-9]+/g, " ").trim().slice(0, 180);
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function summarize(story) {
  const sources = (story.sources || []).slice(0, 8).map(s =>
    `Quelle: ${s.source}\nURL: ${s.url}\nRSS-Kurztext: ${s.snippet || ""}`
  ).join("\n");

  const prompt = `Du bist ein neutraler Nachrichtenredakteur für Pulse News.
Fasse die folgende Meldung auf Deutsch in 2 bis 4 kurzen Sätzen zusammen.
Nutze ausschließlich die gelieferten Informationen. Erfinde keine Fakten und behaupte nicht, einen vollständigen Artikel gelesen zu haben.
Wenn mehrere Quellen dieselben Fakten berichten, fasse diese gemeinsamen Fakten zusammen.
Wenn Quellen unterschiedliche Angaben machen oder nur eine Quelle eine Behauptung aufstellt, kennzeichne das vorsichtig.
Keine politische Wertung, keine Meinung, keine Prognose.
Gib ausschließlich die fertige Zusammenfassung zurück.

Titel: ${story.title}
Thema: ${story.topic}
Länderkontext: ${story.country}
Kurztext aus dem Feed: ${story.summary}
Quellen:
${sources}`;

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: {"content-type": "application/json"},
    body: JSON.stringify({
      contents: [{role: "user", parts: [{text: prompt}]}],
      generationConfig: {temperature: 0.2, maxOutputTokens: 220}
    })
  });

  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("").trim();
  if (!text) throw new Error("Gemini returned no text");
  return text;
}

let generated = 0;
let failed = 0;

// Keep the free tier predictable: summarize up to 35 stories per run,
// prioritizing stories covered by multiple sources.
const candidates = stories
  .map((story, index) => ({story, index, key: keyFor(story)}))
  .sort((a,b) => (b.story.sourceCount || 1) - (a.story.sourceCount || 1))
  .slice(0, 35);

for (const {story, index, key} of candidates) {
  const cached = cache[key];
  if (cached?.summary && cached.sourceSignature === (story.sources || []).map(s => s.url).join("|")) {
    stories[index].aiSummary = cached.summary;
    continue;
  }

  try {
    const summary = await summarize(story);
    const sourceSignature = (story.sources || []).map(s => s.url).join("|");
    stories[index].aiSummary = summary;
    cache[key] = {summary, sourceSignature, updatedAt: new Date().toISOString()};
    generated++;
    await sleep(250);
  } catch (e) {
    failed++;
    console.log(`Gemini failed for "${story.title}": ${e.message}`);
  }
}

await fs.writeFile(file, JSON.stringify(stories, null, 2));
await fs.writeFile(cacheFile, JSON.stringify(cache, null, 2));
console.log(`Gemini summaries: ${generated} generated, ${failed} failed, ${Object.keys(cache).length} cached.`);
