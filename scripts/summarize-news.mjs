import fs from "node:fs/promises";

const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const file = "data/news.json";
const cacheFile = "data/ai-cache.json";

const stories = JSON.parse(await fs.readFile(file, "utf8"));
let cache = {};
try { cache = JSON.parse(await fs.readFile(cacheFile, "utf8")); } catch {}

const keyFor = story => story.title.toLowerCase().replace(/[^a-zäöüß0-9]+/g, " ").trim().slice(0, 180);
const sleep = ms => new Promise(r => setTimeout(r, ms));

function cleanSnippet(text="") {
  return String(text)
    .replace(/&lt;/gi,"<").replace(/&gt;/gi,">").replace(/&amp;/gi,"&").replace(/&nbsp;/gi," ")
    .replace(/&#39;/g,"'").replace(/&#x27;/g,"'").replace(/&quot;/gi,'"').replace(/<[^>]+>/g," ")
    .replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16)))
    .replace(/\s+/g," ").trim();
}

function fallbackSummary(story) {
  const snippets = (story.sources || []).map(s => cleanSnippet(s.snippet || "")).filter(Boolean);
  const unique = [...new Set(snippets)];
  const parts = unique.flatMap(s => s.split(/(?<=[.!?])\s+/)).filter(Boolean);
  const useful = parts.filter(p => p.length > 35 && p.toLowerCase() !== story.title.toLowerCase()).slice(0, 2);
  if (!useful.length) return story.title + ".";
  return useful.join(" ").slice(0, 520).replace(/\s+$/,"");
}

async function summarize(story) {
  const sources = (story.sources || []).slice(0, 8).map(s =>
    `Quelle: ${s.source}\nRSS-Kurztext: ${cleanSnippet(s.snippet || "")}`
  ).join("\n");

  const prompt = `Du bist ein neutraler Nachrichtenredakteur für Pulse News.
Fasse die Meldung auf Deutsch in 2 bis 4 kurzen Sätzen zusammen.
Nutze ausschließlich die gelieferten Informationen. Erfinde keine Fakten und behaupte nicht, einen vollständigen Artikel gelesen zu haben.
Wenn mehrere Quellen dieselben Fakten berichten, fasse die gemeinsamen Fakten zusammen.
Wenn Quellen unterschiedliche Angaben machen oder nur eine Quelle eine Behauptung aufstellt, kennzeichne das vorsichtig.
Keine politische Wertung, keine Meinung, keine Prognose.
Gib ausschließlich die fertige Zusammenfassung zurück.

Titel: ${story.title}
Thema: ${story.topic}
Länderkontext: ${story.country}
Quellen:
${sources}`;

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: {"content-type":"application/json"},
    body: JSON.stringify({
      contents:[{role:"user",parts:[{text:prompt}]}],
      generationConfig:{temperature:0.2,maxOutputTokens:220}
    })
  });
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map(p=>p.text||"").join("").trim();
  if (!text) throw new Error("Gemini returned no text");
  return text;
}

let generated=0, fallback=0, failed=0;
const candidates=stories
  .map((story,index)=>({story,index,key:keyFor(story)}))
  .sort((a,b)=>(b.story.sourceCount||1)-(a.story.sourceCount||1))
  .slice(0,35);

for (const {story,index,key} of candidates) {
  const signature=(story.sources||[]).map(s=>s.url).join("|");
  const cached=cache[key];
  if (cached?.summary && cached.sourceSignature===signature && (!apiKey || cached.method==="gemini")) {
    stories[index].aiSummary=cached.summary;
    continue;
  }

  if (apiKey) {
    try {
      const summary=await summarize(story);
      stories[index].aiSummary=summary;
      cache[key]={summary,sourceSignature:signature,updatedAt:new Date().toISOString(),method:"gemini"};
      generated++;
      await sleep(250);
      continue;
    } catch(e) {
      failed++;
      console.log(`Gemini failed for "${story.title}": ${e.message}`);
    }
  }

  const summary=fallbackSummary(story);
  stories[index].aiSummary=summary;
  cache[key]={summary,sourceSignature:signature,updatedAt:new Date().toISOString(),method:"rss-synthesis"};
  fallback++;
}

for (let i=0;i<stories.length;i++) {
  if (!stories[i].aiSummary) {
    stories[i].aiSummary=fallbackSummary(stories[i]);
    const key=keyFor(stories[i]);
    const signature=(stories[i].sources||[]).map(s=>s.url).join("|");
    cache[key]={summary:stories[i].aiSummary,sourceSignature:signature,updatedAt:new Date().toISOString(),method:"rss-synthesis"};
    fallback++;
  }
}

await fs.writeFile(file,JSON.stringify(stories,null,2));
await fs.writeFile(cacheFile,JSON.stringify(cache,null,2));
console.log(`Summaries: ${generated} Gemini, ${fallback} RSS-synthesis, ${failed} Gemini failures, ${Object.keys(cache).length} cached.`);
