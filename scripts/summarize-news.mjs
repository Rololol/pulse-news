import fs from "node:fs/promises";

const apiKey=process.env.GEMINI_API_KEY;
const model=process.env.GEMINI_MODEL||"gemini-3.5-flash-lite";
const inputFile="data/news.json";
const outputFile="data.json";
const cacheFile="data/ai-cache.json";

const raw=JSON.parse(await fs.readFile(inputFile,"utf8"));
let cache={};
try{cache=JSON.parse(await fs.readFile(cacheFile,"utf8"))}catch{}

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const clean=s=>String(s||"").replace(/<!\[CDATA\[|\]\]>/g,"").replace(/<[^>]+>/g," ").replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/&lt;/gi,"<").replace(/&gt;/gi,">").replace(/&#39;/g,"'").replace(/&#x27;/g,"'").replace(/&quot;/gi,'"').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/\s+/g," ").trim();
const hashKey=s=>Buffer.from(String(s)).toString("base64url").slice(0,120);

const categoryMap={politik:"politik",wirtschaft:"wirtschaft",sport:"sport",wissenschaft:"wissenschaft",technik:"technik",panorama:"panorama",umwelt:"umwelt"};
const countryMap={DE:"DE",UK:"INT",PT:"INT",INT:"INT",US:"INT",EU:"INT"};

function localFallback(item){
  const sources=(item.sources||[]).map(x=>clean(x.snippet||x.title||"")).filter(Boolean);
  const first=sources[0]||clean(item.title);
  const sentences=first.split(/(?<=[.!?])\s+/).filter(Boolean);
  return {
    t:clean(item.title).slice(0,110),
    s:(sentences.slice(0,2).join(" ")||clean(item.title)).slice(0,220),
    m:sources.slice(0,2).join(" ").slice(0,500),
    r:"Die Meldung wird hier als aktuelle Nachricht aus den gelieferten Quellen eingeordnet.",
    k:categoryMap[item.topic]||"panorama",
    c:countryMap[item.country]==="DE"?"DE":"INT",
    p:Math.min(5,Math.max(1,(item.sources?.length||1))),
    agree: item.sources?.length>1 ? "Mehrere RSS-Quellen berichten über dasselbe Ereignis." : "",
    diff:[]
  };
}

const schema={
  type:"object",
  properties:{
    t:{type:"string"},
    s:{type:"string"},
    m:{type:"string"},
    r:{type:"string"},
    k:{type:"string",enum:["politik","wirtschaft","sport","wissenschaft","technik","panorama","umwelt"]},
    c:{type:"string",enum:["DE","INT"]},
    p:{type:"integer",minimum:1,maximum:5},
    agree:{type:"string"},
    diff:{type:"array",items:{type:"object",properties:{name:{type:"string"},note:{type:"string"}},required:["name","note"]}}
  },
  required:["t","s","m","r","k","p","agree","diff","c"]
};

async function ask(item){
  const sourceText=(item.sources||[]).slice(0,8).map((src,i)=>
    "["+(src.source||"Quelle "+(i+1))+"]\n"+clean(src.title||"")+"\n"+clean(src.snippet||"")
  ).join("\n\n");
  const prompt=`Hier sind mehrere Redaktionsmeldungen zum selben Ereignis. Vergleiche sie und antworte NUR mit einem JSON-Objekt in genau diesem Format. Formuliere alle Felder t, s, m und agree auf Deutsch; diff.note ebenfalls auf Deutsch. Die Quellennamen in diff.name bleiben exakt unverändert:
{"t":"neutraler, prägnanter Titel (max. 12 Wörter)","s":"Was ist passiert? 1-2 Sätze, max. 220 Zeichen, nur was die Quellen bestätigen","m":"Was ist bisher bekannt? 2-4 Sätze, max. 500 Zeichen","r":"Warum ist die Meldung relevant? 1-2 nüchterne Sätze, max. 280 Zeichen, nur aus den gelieferten Informationen ableiten","k":"eine von: politik, wirtschaft, sport, wissenschaft, technik, panorama, umwelt","c":"DE wenn das Ereignis hauptsächlich Deutschland betrifft, sonst INT","p":Wichtigkeit 1-5,"agree":"ein Satz: worin sich die Quellen einig sind","diff":[{"name":"Quellenname exakt wie angegeben","note":"was diese Quelle abweichend/zusätzlich berichtet"}]}
Wenn es keine Abweichungen gibt, gib diff als leeres Array zurück. Erfinde nichts, das nicht in den gelieferten Texten steht. Bei nur einer Quelle bleiben agree und diff leer.
Quellen:
${sourceText}`;

  const res=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,{
    method:"POST",
    headers:{"content-type":"application/json"},
    body:JSON.stringify({
      contents:[{role:"user",parts:[{text:prompt}]}],
      generationConfig:{
        temperature:0.15,
        maxOutputTokens:700,
        response_mime_type:"application/json",
        response_schema:schema
      }
    })
  });
  if(!res.ok){
    const body=await res.text().catch(()=>"");
    const e=new Error("Gemini HTTP "+res.status);
    e.retryable=[429,500,502,503,504].includes(res.status);
    e.retryAfter=res.headers.get("retry-after");
    e.body=body.slice(0,300);
    throw e;
  }
  const data=await res.json();
  const text=data?.candidates?.[0]?.content?.parts?.map(p=>p.text||"").join("").trim();
  if(!text)throw new Error("Gemini returned no text");
  let parsed;
  try{parsed=JSON.parse(text)}catch{
    const cleaned=text.replace(/^\`\`\`json\s*/i,"").replace(/^\`\`\`\s*/i,"").replace(/\s*\`\`\`$/,"").trim();
    parsed=JSON.parse(cleaned);
  }
  if(!parsed.t||!parsed.s||!parsed.m||!parsed.r)throw new Error("Gemini returned incomplete object");
  parsed.t=clean(parsed.t).split(/\s+/).slice(0,12).join(" ");
  parsed.s=clean(parsed.s).slice(0,220);
  parsed.m=clean(parsed.m).slice(0,500);
  parsed.r=clean(parsed.r).slice(0,280);
  parsed.k=categoryMap[parsed.k]?parsed.k:(categoryMap[item.topic]||"panorama");
  parsed.c=parsed.c==="DE"?"DE":"INT";
  parsed.p=Math.min(5,Math.max(1,Math.round(Number(parsed.p)||1)));
  parsed.agree=clean(parsed.agree||"").slice(0,260);
  parsed.diff=Array.isArray(parsed.diff)?parsed.diff.filter(x=>x&&x.name&&x.note).slice(0,6).map(x=>({name:clean(x.name),note:clean(x.note).slice(0,280)})):[];
  return parsed;
}

const categories=["politik","wirtschaft","sport","wissenschaft","technik","panorama","umwelt"];
const byCategory=new Map(categories.map(k=>[k,[]]));
for(const item of raw){
  const list=byCategory.get(item.topic)||byCategory.get("panorama");
  list.push(item);
}
for(const list of byCategory.values()){
  list.sort((a,b)=>{
    const pa=a.sources?.length||1,pb=b.sources?.length||1;
    return (pb-pa)||(Date.parse(b.date)-Date.parse(a.date));
  });
}
const ranked=[];
const germany=raw.filter(x=>x.country==="DE");
const international=raw.filter(x=>x.country!=="DE");
const rankItems=list=>list.slice().sort((a,b)=>{
  const pa=a.sources?.length||1,pb=b.sources?.length||1;
  return (pb-pa)||(Date.parse(b.date)-Date.parse(a.date));
});
ranked.push(...rankItems(germany).slice(0,39));
ranked.push(...rankItems(international).slice(0,6));
if(ranked.length<45){
  const used=new Set(ranked);
  for(const item of raw.slice().sort((a,b)=>Date.parse(b.date)-Date.parse(a.date))){
    if(ranked.length>=45)break;
    if(used.has(item))continue;
    ranked.push(item);used.add(item);
  }
}

const output=[];
let generated=0,fallbacks=0,failures=0;
for(const item of ranked){
  const srcs=(item.sources||[]).slice(0,8).map(s=>({name:s.source,url:s.url,date:s.date}));
  const signature=(item.sources||[]).map(s=>s.url).join("|");
  const key=hashKey("v4-de-focus|"+item.id+"|"+signature+"|"+(item.stateHint||""));
  let ai=cache[key];
  if(!(ai?.t&&ai?.s&&ai?.m)){
    if(apiKey){
      for(let attempt=0;attempt<3;attempt++){
        try{ai=await ask(item);generated++;break}
        catch(e){
          if(!e.retryable||attempt===2){failures++;break}
          const retry=Number(e.retryAfter);
          await sleep(Number.isFinite(retry)?Math.max(8000,retry*1000):10000*(attempt+1));
        }
      }
    }
    if(!ai?.t){ai=localFallback(item);fallbacks++}
    cache[key]={...ai,updatedAt:new Date().toISOString(),sourceSignature:signature,method:apiKey&&ai!==localFallback?"gemini":"fallback"};
  }

  output.push({
    id:item.id,c:ai.c||countryMap[item.country]||"INT",k:ai.k||categoryMap[item.topic]||"panorama",
    lang:"de",d:item.date,p:ai.p||1,st:item.stateHint||"",city:"",t:ai.t,s:ai.s,m:ai.m,r:ai.r||"",
    srcs,agree:srcs.length>1?(ai.agree||""):"",diff:srcs.length>1?(ai.diff||[]):[]
  });
  await sleep(apiKey?6000:0);
}

output.sort((a,b)=>(b.d.localeCompare(a.d))||(b.p-a.p));
const final=output.slice(0,45);
await fs.writeFile(outputFile,JSON.stringify(final,null,2));
await fs.writeFile(cacheFile,JSON.stringify(cache,null,2));
console.log(`data.json: ${final.length} items · ${generated} Gemini · ${fallbacks} fallback · ${failures} Gemini failures`);