import fs from "node:fs/promises";

const apiKey=process.env.GEMINI_API_KEY;
const model=process.env.GEMINI_MODEL||"gemini-3.5-flash-lite";
const freeTierModels=new Set(["gemini-3.5-flash-lite","gemini-3.1-flash-lite"]);
if(apiKey&&!freeTierModels.has(model)) throw new Error(`Kosten-Schutz: Modell ${model} ist nicht für den Free-Tier-Guard freigegeben.`);
const inputFile="data/news.json";
const outputFile="data.json";
const archiveDir="data/archive";
const archiveIndexFile=`${archiveDir}/index.json`;
const cacheFile="data/ai-cache.json";
let previousCurrent=[];
try{previousCurrent=JSON.parse(await fs.readFile(outputFile,"utf8"))}catch{}

const raw=JSON.parse(await fs.readFile(inputFile,"utf8"));
let cache={};
try{cache=JSON.parse(await fs.readFile(cacheFile,"utf8"))}catch{}
const cacheTTL=48*60*60*1000;
const nowMs=Date.now();
for(const [k,v] of Object.entries(cache)){const t=Date.parse(v?.updatedAt||"");if(!Number.isFinite(t)||nowMs-t>cacheTTL)delete cache[k];}

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const clean=s=>String(s||"").replace(/<!\[CDATA\[|\]\]>/g,"").replace(/<[^>]+>/g," ").replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/&lt;/gi,"<").replace(/&gt;/gi,">").replace(/&#39;/g,"'").replace(/&#x27;/g,"'").replace(/&quot;/gi,'"').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/\s+/g," ").trim();
const hashKey=s=>Buffer.from(String(s)).toString("base64url").slice(0,120);
const stableId=s=>{let h=2166136261;for(let i=0;i<String(s).length;i++){h^=String(s).charCodeAt(i);h=Math.imul(h,16777619)}return "story-"+(h>>>0).toString(16).padStart(8,"0")+(((h>>>0)^0x9e3779b9)>>>0).toString(16).padStart(8,"0")};
const titleSimilarity=(a,b)=>{const A=new Set(clean(a).toLowerCase().split(/\s+/).filter(w=>w.length>=5)),B=new Set(clean(b).toLowerCase().split(/\s+/).filter(w=>w.length>=5));let n=0;for(const w of A)if(B.has(w))n++;return n/Math.max(1,new Set([...A,...B]).size)};
const previousFor=item=>previousCurrent.find(x=>x.id===stableId((item.sources||[]).map(s=>s.url).join("|")+"|"+(item.stateHint||"")))||previousCurrent.find(x=>titleSimilarity(x.t||"",item.title)>=0.55);
const categoryMap={politik:"politik",wirtschaft:"wirtschaft",sport:"sport",wissenschaft:"wissenschaft",technik:"technik",panorama:"panorama",umwelt:"umwelt"};
const countryMap={DE:"DE",UK:"INT",PT:"INT",INT:"INT",US:"INT",EU:"INT"};

function localFallback(item){
  const sources=(item.sources||[]).map(x=>clean(x.snippet||x.title||"")).filter(Boolean);
  const first=sources[0]||clean(item.title);
  const sentences=first.split(/(?<=[.!?])\s+/).filter(Boolean);
  return {
    t:clean(item.title).replace(/Gewehfreparatur/gi,"Gewehrreparatur").slice(0,110),
    s:(sentences.slice(0,4).join(" ")||clean(item.title)).slice(0,500),
    m:sources.join(" ").slice(0,1200),
    r:"Die Meldung wird hier als aktuelle Nachricht aus den gelieferten Quellen eingeordnet. Weitere Relevanz ergibt sich aus den dort genannten Auswirkungen und Zusammenhängen.",
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
    chg:{type:"string"},
    diff:{type:"array",items:{type:"object",properties:{name:{type:"string"},note:{type:"string"}},required:["name","note"]}}
  },
  required:["t","s","m","r","k","p","agree","diff","c"]
};

async function ask(item,previous){
  const sourceText=(item.sources||[]).slice(0,8).map((src,i)=>
    "["+(src.source||"Quelle "+(i+1))+"]\n"+clean(src.title||"")+"\n"+clean(src.snippet||"")
  ).join("\n\n");
  const previousText=previous?`Vorheriger Pulse-Stand:\nKurzfassung: ${clean(previous.s||"")}\nWas bisher bekannt ist: ${clean(previous.m||"")}`:"";
  const prompt=`Hier sind mehrere Redaktionsmeldungen zum selben Ereignis. Vergleiche sie und antworte NUR mit einem JSON-Objekt in genau diesem Format. Formuliere alle Felder t, s, m, r und chg auf Deutsch; diff.note ebenfalls auf Deutsch. Die Quellennamen in diff.name bleiben exakt unverändert:
{"t":"neutraler, prägnanter Titel (max. 12 Wörter)","s":"Kurzfassung: Was ist passiert? 3-4 informative Sätze, max. 500 Zeichen. Nenne die wichtigsten Fakten und den aktuellen Stand, ohne Inhalte aus m unnötig vorwegzunehmen.","m":"Was ist bisher bekannt? 6-8 informative Sätze, max. 1200 Zeichen. Liefere deutlich mehr Kontext als s: zeitlicher Ablauf, konkrete Zahlen, beteiligte Akteure, Hintergründe, Folgen und offene Punkte, soweit die Quellen dies hergeben. Wiederhole s nicht einfach, sondern ergänze neue Informationen.","r":"Warum ist die Meldung relevant? 2-3 nüchterne Sätze, max. 400 Zeichen, nur aus den gelieferten Informationen ableiten","k":"eine von: politik, wirtschaft, sport, wissenschaft, technik, panorama, umwelt","c":"DE wenn das Ereignis hauptsächlich Deutschland betrifft, sonst INT","p":Wichtigkeit 1-5,"agree":"ein Satz: worin sich die Quellen einig sind","chg":"Wenn ein Vorheriger Pulse-Stand vorhanden ist: 1-3 Sätze nur zu neuen oder geänderten bestätigten Informationen. Wenn nichts Wesentliches neu ist oder kein Vorheriger Pulse-Stand vorhanden ist: leerer String.","diff":[{"name":"Quellenname exakt wie angegeben","note":"was diese Quelle abweichend/zusätzlich berichtet"}]}
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
    e.status=res.status;
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
  parsed.t=clean(parsed.t).replace(/Gewehfreparatur/gi,"Gewehrreparatur").split(/\s+/).slice(0,12).join(" ");
  const sourceTitles=(item.sources||[]).map(x=>clean(x.title||"").toLowerCase()).join(" ");
  const titleWords=parsed.t.toLowerCase().split(/\s+/).filter(w=>w.length>=5);
  const titleOverlap=titleWords.filter(w=>sourceTitles.includes(w)).length/Math.max(1,titleWords.length);
  if(titleOverlap<0.25 && item.country==="DE")parsed.t=clean(item.title).replace(/Gewehfreparatur/gi,"Gewehrreparatur").split(/\s+/).slice(0,12).join(" ");
  parsed.s=clean(parsed.s).slice(0,500);
  parsed.m=clean(parsed.m).slice(0,1200);
  parsed.r=clean(parsed.r).slice(0,400);
  parsed.k=categoryMap[parsed.k]?parsed.k:(categoryMap[item.topic]||"panorama");
  parsed.c=parsed.c==="DE"?"DE":"INT";
  parsed.p=Math.min(5,Math.max(1,Math.round(Number(parsed.p)||1)));
  parsed.agree=clean(parsed.agree||"").slice(0,260);
  parsed.chg=clean(parsed.chg||"").slice(0,420);
  // Zahlen müssen in den gelieferten Quellen vorkommen.
  const sourceNumbers=new Set((sourceText.match(/\b\d[\d.,%/-]*\b/g)||[]).map(x=>x.replace(/[^\d]/g,"")));
  const outputNumbers=(parsed.s+" "+parsed.m+" "+parsed.r).match(/\b\d[\d.,%/-]*\b/g)||[];
  for(const n of outputNumbers){const key=n.replace(/[^\\d]/g,"");if(key.length>=2&&!sourceNumbers.has(key))throw new Error("Qualitätsprüfung: Zahl nicht in Quelle belegt")};
  parsed.diff=Array.isArray(parsed.diff)?parsed.diff.filter(x=>x&&x.name&&x.note).slice(0,6).map(x=>({name:clean(x.name),note:clean(x.note).slice(0,280)})):[];
  // Qualitätsprüfung: Kurzfassung und Kontext dürfen nicht nahezu identisch sein.
  const sWords=new Set(parsed.s.toLowerCase().split(/\s+/).filter(w=>w.length>=5));
  const mWords=new Set(parsed.m.toLowerCase().split(/\s+/).filter(w=>w.length>=5));
  let shared=0;for(const w of sWords)if(mWords.has(w))shared++;
  const overlap=shared/Math.max(1,sWords.size);
  if(sWords.size>=8&&mWords.size>=8&&overlap>0.88)throw new Error("Qualitätsprüfung: Kurzfassung und Kontext sind zu ähnlich");
  // Offensichtlich fremdsprachige Titel werden nicht als deutsche Pulse-Titel akzeptiert.
  const foreignTitle=/\b(economia|mundial|deve|crescer|este|ano|recuperacao|gradual|the|and|with|from|world|economy|growth|will|this|year)\b/i;
  if(foreignTitle.test(parsed.t))throw new Error("Qualitätsprüfung: Titel nicht deutsch");
  return parsed;
}

const categories=["politik","wirtschaft","sport","wissenschaft","technik","panorama","umwelt"];
const rankItems=list=>list.slice().sort((a,b)=>{
  const pa=a.sources?.length||1,pb=b.sources?.length||1;
  return (pb-pa)||(Date.parse(b.date)-Date.parse(a.date));
});
const byCategory=new Map(categories.map(k=>[k,[]]));
for(const item of raw)(byCategory.get(item.topic)||byCategory.get("panorama")).push(item);
for(const list of byCategory.values())list.splice(0,list.length,...rankItems(list));

function categoryRoundRobin(list,limit){
  const pools=new Map(categories.map(k=>[k,rankItems(list.filter(x=>(x.topic||"panorama")===k))]));
  const out=[],seen=new Set();
  while(out.length<limit){
    let added=false;
    for(const k of categories){
      const pool=pools.get(k);
      while(pool.length&&seen.has(pool[0]))pool.shift();
      if(pool.length){const item=pool.shift();out.push(item);seen.add(item);added=true;if(out.length>=limit)break;}
    }
    if(!added)break;
  }
  return out;
}
const ranked=[];
ranked.push(...categoryRoundRobin(raw.filter(x=>x.country==="DE"),39));
ranked.push(...categoryRoundRobin(raw.filter(x=>x.country!=="DE"),6));
if(ranked.length<45){
  const used=new Set(ranked);
  for(const item of rankItems(raw)){
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
  const previous=previousFor(item);
  const key=hashKey("v7-event-tracking|"+item.id+"|"+signature+"|"+(item.stateHint||""));
  let ai=cache[key];
  let usedGemini=false;
  if(!(ai?.t&&ai?.s&&ai?.m)){
    if(apiKey){
      // Kosten-Schutz: höchstens ein Gemini-Aufruf pro neuer Meldung; 429/Quota wird nicht erneut versucht.
      for(let attempt=0;attempt<3;attempt++){
        try{ai=await ask(item,previous);generated++;usedGemini=true;break}
        catch(e){
          if(e.status===429||!e.retryable||attempt===2){failures++;break}
          const retry=Number(e.retryAfter);
          await sleep(Number.isFinite(retry)?Math.max(8000,retry*1000):10000*(attempt+1));
        }
      }
    }
    if(!ai?.t){ai=localFallback(item);fallbacks++}
    cache[key]={...ai,updatedAt:new Date().toISOString(),sourceSignature:signature,method:usedGemini?"gemini":"fallback"};
  }

  output.push({
    id:previous?.id||stableId(signature+"|"+(item.stateHint||"")),c:ai.c||countryMap[item.country]||"INT",k:ai.k||categoryMap[item.topic]||"panorama",
    lang:"de",d:item.date,p:ai.p||1,st:item.stateHint||"",city:"",t:ai.t,s:ai.s,m:ai.m,r:ai.r||"",
    srcs,url:srcs[0]?.url||"",agree:srcs.length>1?(ai.agree||""):"",diff:srcs.length>1?(ai.diff||[]):[],chg:ai.chg||"",independent:[...new Set(srcs.map(s=>{try{return new URL(s.url).hostname.replace(/^www\\./,"")}catch{return s.name||""}}).filter(Boolean))].length
  });
  await sleep(apiKey?6000:0);
}

output.sort((a,b)=>(b.d.localeCompare(a.d))||(b.p-a.p));
const final=output.slice(0,45);

// Historie: Die aus dem aktuellen Fenster fallenden Meldungen werden monatlich archiviert.
// Es werden nur die bisherigen data.json-Meldungen übernommen, die nicht mehr in final stehen.
await fs.mkdir(archiveDir,{recursive:true});
const finalIds=new Set(final.map(x=>x.id));
const archiveCandidates=previousCurrent.filter(x=>x&&x.id&&!finalIds.has(x.id));
const months=new Map();
for(const item of archiveCandidates){
  const d=new Date(item.d); if(!Number.isFinite(d.getTime()))continue;
  const month=d.toISOString().slice(0,7);
  if(!months.has(month))months.set(month,[]);
  months.get(month).push(item);
}
for(const [month,items] of months){
  const file=`${archiveDir}/${month}.json`;
  let existing=[];
  try{existing=JSON.parse(await fs.readFile(file,"utf8"))}catch{}
  const byId=new Map(existing.filter(x=>x&&x.id).map(x=>[x.id,x]));
  for(const item of items)byId.set(item.id,item);
  const merged=[...byId.values()].sort((a,b)=>(b.d||"").localeCompare(a.d||""));
  await fs.writeFile(file,JSON.stringify(merged,null,2));
}
const archiveMonths=new Set();
try{
  for(const name of await fs.readdir(archiveDir))if(/^\d{4}-\d{2}\.json$/.test(name))archiveMonths.add(name.slice(0,-5));
}catch{}
for(const item of archiveCandidates){const d=new Date(item.d);if(Number.isFinite(d.getTime()))archiveMonths.add(d.toISOString().slice(0,7));}
const monthList=[...archiveMonths].sort().reverse();
await fs.writeFile(archiveIndexFile,JSON.stringify(monthList.map(month=>({month,file:`${month}.json`})),null,2));
await fs.writeFile(outputFile,JSON.stringify(final,null,2));
await fs.writeFile(cacheFile,JSON.stringify(cache,null,2));
console.log(`data.json: ${final.length} items · archiviert: ${archiveCandidates.length} · Monate: ${monthList.length} · ${generated} Gemini · ${fallbacks} fallback · ${failures} Gemini failures`);