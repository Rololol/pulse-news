import fs from "node:fs/promises";

const apiKey=process.env.GEMINI_API_KEY;
const model=process.env.GEMINI_MODEL||"gemini-3.6-flash";
const file="data/news.json";
const cacheFile="data/ai-cache.json";

const stories=JSON.parse(await fs.readFile(file,"utf8"));
let cache={};
try{cache=JSON.parse(await fs.readFile(cacheFile,"utf8"))}catch{}

const keyFor=story=>story.title.toLowerCase().replace(/[^a-zäöüß0-9]+/g," ").trim().slice(0,180);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

function cleanSnippet(text=""){
  return String(text)
    .replace(/&lt;/gi,"<").replace(/&gt;/gi,">").replace(/&amp;/gi,"&").replace(/&nbsp;/gi," ")
    .replace(/&#39;/g,"'").replace(/&#x27;/g,"'").replace(/&quot;/gi,'"')
    .replace(/<[^>]+>/g," ").replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16)))
    .replace(/\s+/g," ").trim();
}

function fallback(story){
  const snippets=[...(story.sources||[]).map(s=>cleanSnippet(s.snippet||""))].filter(Boolean);
  const unique=[...new Set(snippets)];
  const parts=unique.flatMap(s=>s.split(/(?<=[.!?])\s+/)).filter(Boolean);
  const useful=parts.filter(p=>p.length>35&&p.toLowerCase()!==story.title.toLowerCase()).slice(0,2);
  return {
    summary:useful.length?useful.join(" ").slice(0,520).replace(/\s+$/,""):story.title+".",
    consensus:null,
    consensusFacts:[],
    divergences:[]
  };
}

const schema={
  type:"object",
  properties:{
    summary:{type:"string",description:"Neutrale deutsche Zusammenfassung in 2 bis 4 kurzen Sätzen. Nur Informationen aus den gelieferten RSS-Texten."},
    consensus:{type:"integer",description:"0 bis 100: geschätzter Grad der inhaltlichen Übereinstimmung zwischen den gelieferten RSS-Texten. Keine statistische Wahrscheinlichkeit und keine Bewertung der Wahrheit."},
    consensusFacts:{type:"array",items:{type:"string"},description:"2 bis 4 kurze Fakten, die in mehreren gelieferten Quellen übereinstimmen. Nur angeben, wenn tatsächlich gestützt."},
    divergences:{type:"array",items:{type:"object",properties:{source:{type:"string"},note:{type:"string"}},required:["source","note"]},description:"Konkrete Unterschiede oder nur von einzelnen Quellen genannte Angaben. Leer, wenn keine wesentlichen Unterschiede erkennbar sind."}
  },
  required:["summary","consensus","consensusFacts","divergences"]
};

async function requestGemini(story){
  const sources=(story.sources||[]).slice(0,8).map(s=>
    "Quelle: "+s.source+"\nRSS-Kurztext: "+cleanSnippet(s.snippet||"")
  ).join("\n");

  const prompt=`Du bist der neutrale Nachrichtenredakteur von Pulse.
Erzeuge eine strukturierte Quellen-Synthese auf Deutsch.
WICHTIG:
- Nutze ausschließlich die gelieferten Titel und RSS-Kurztexte.
- Behaupte niemals, einen vollständigen Artikel gelesen zu haben.
- Formuliere die summary in 2 bis 4 kurzen, sachlichen Sätzen.
- consensus ist nur ein Maß für die Übereinstimmung der gelieferten Texte, keine Wahrscheinlichkeit und kein Wahrheitswert.
- consensusFacts dürfen nur Angaben enthalten, die von mehreren gelieferten Quellen gestützt werden.
- divergences nennt nur konkrete Unterschiede, widersprüchliche Angaben oder Aussagen, die nur einer Quelle zugeordnet werden können.
- Keine politische Wertung, keine Meinung, keine Prognose.
- Wenn die Quellenlage dünn ist, nutze einen niedrigeren consensus-Wert und leere Listen statt zu raten.

Titel: ${story.title}
Thema: ${story.topic}
Länderkontext: ${story.country}
Quellen:
${sources}`;

  const res=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,{
    method:"POST",
    headers:{"content-type":"application/json"},
    body:JSON.stringify({
      contents:[{role:"user",parts:[{text:prompt}]}],
      generationConfig:{
        temperature:0.2,
        maxOutputTokens:500,
        response_mime_type:"application/json",
        response_schema:schema
      }
    })
  });

  if(!res.ok){
    const body=await res.text().catch(()=>"");
    const retryable=res.status===429||res.status===500||res.status===502||res.status===503||res.status===504;
    const err=new Error(`Gemini HTTP ${res.status}`);
    err.retryable=retryable;
    err.retryAfter=res.headers.get("retry-after");
    err.body=body.slice(0,500);
    throw err;
  }

  const data=await res.json();
  const text=data?.candidates?.[0]?.content?.parts?.map(p=>p.text||"").join("").trim();
  if(!text)throw new Error("Gemini returned no text");
  let parsed;
  try{parsed=JSON.parse(text)}catch{throw new Error("Gemini returned invalid JSON")}
  if(typeof parsed.summary!=="string"||!parsed.summary.trim())throw new Error("Gemini returned no summary");
  parsed.consensus=Number.isFinite(Number(parsed.consensus))?Math.max(0,Math.min(100,Math.round(Number(parsed.consensus)))):null;
  parsed.consensusFacts=Array.isArray(parsed.consensusFacts)?parsed.consensusFacts.filter(Boolean).slice(0,4):[];
  parsed.divergences=Array.isArray(parsed.divergences)?parsed.divergences.filter(d=>d&&d.source&&d.note).slice(0,4):[];
  return parsed;
}

async function summarize(story){
  let last;
  for(let attempt=0;attempt<3;attempt++){
    try{return await requestGemini(story)}
    catch(e){
      last=e;
      if(!e.retryable||attempt===2)throw e;
      const headerDelay=Number(e.retryAfter);
      const delay=Number.isFinite(headerDelay)?Math.max(1000,headerDelay*1000):[8000,16000,30000][attempt];
      console.log(`Retrying Gemini after ${delay}ms for "${story.title}"`);
      await sleep(delay);
    }
  }
  throw last;
}

let generated=0,fallbackCount=0,failed=0;
const candidates=stories
  .map((story,index)=>({story,index,key:keyFor(story)}))
  .sort((a,b)=>(b.story.sourceCount||b.story.sources?.length||1)-(a.story.sourceCount||a.story.sources?.length||1))
  .slice(0,35);

for(const {story,index,key} of candidates){
  const signature=(story.sources||[]).map(s=>s.url).join("|");
  const cached=cache[key];
  if(cached?.summary&&cached.sourceSignature===signature&&cached.method==="gemini"&&cached.consensus!==undefined){
    Object.assign(stories[index],{
      aiSummary:cached.summary,
      consensus:cached.consensus,
      consensusFacts:cached.consensusFacts||[],
      divergences:cached.divergences||[]
    });
    continue;
  }

  if(apiKey){
    try{
      const result=await summarize(story);
      Object.assign(stories[index],{
        aiSummary:result.summary,
        consensus:result.consensus,
        consensusFacts:result.consensusFacts,
        divergences:result.divergences
      });
      cache[key]={...result,sourceSignature:signature,updatedAt:new Date().toISOString(),method:"gemini"};
      generated++;
      await sleep(8000);
      continue;
    }catch(e){
      failed++;
      console.log(`Gemini failed for "${story.title}": ${e.message}`);
    }
  }

  const result=fallback(story);
  Object.assign(stories[index],{
    aiSummary:result.summary,
    consensus:result.consensus,
    consensusFacts:result.consensusFacts,
    divergences:result.divergences
  });
  cache[key]={...result,sourceSignature:signature,updatedAt:new Date().toISOString(),method:"rss-synthesis"};
  fallbackCount++;
}

for(let i=0;i<stories.length;i++){
  if(!stories[i].aiSummary){
    const result=fallback(stories[i]);
    Object.assign(stories[i],{
      aiSummary:result.summary,
      consensus:result.consensus,
      consensusFacts:result.consensusFacts,
      divergences:result.divergences
    });
    const key=keyFor(stories[i]);
    const signature=(stories[i].sources||[]).map(s=>s.url).join("|");
    cache[key]={...result,sourceSignature:signature,updatedAt:new Date().toISOString(),method:"rss-synthesis"};
    fallbackCount++;
  }
}

await fs.writeFile(file,JSON.stringify(stories,null,2));
await fs.writeFile(cacheFile,JSON.stringify(cache,null,2));
console.log(`Summaries: ${generated} Gemini, ${fallbackCount} RSS-synthesis, ${failed} Gemini failures, ${Object.keys(cache).length} cached.`);
