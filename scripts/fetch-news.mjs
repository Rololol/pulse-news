import fs from "node:fs/promises";

const feeds=[
["Tagesschau","https://www.tagesschau.de/xml/rss2","DE"],["DW Deutsch","https://rss.dw.com/xml/rss-de-all","DE"],
["BBC World","https://feeds.bbci.co.uk/news/world/rss.xml","UK"],["BBC Technology","https://feeds.bbci.co.uk/news/technology/rss.xml","UK"],["BBC Science","https://feeds.bbci.co.uk/news/science_and_environment/rss.xml","UK"],
["Guardian World","https://www.theguardian.com/world/rss","UK"],["Guardian Science","https://www.theguardian.com/science/rss","UK"],["Guardian Business","https://www.theguardian.com/business/rss","UK"],
["NASA","https://www.nasa.gov/rss/dyn/breaking_news.rss","US"],["NPR","https://feeds.npr.org/1001/rss.xml","US"],
["NPR World","https://feeds.npr.org/1004/rss.xml","US"],["NPR Science","https://feeds.npr.org/1007/rss.xml","US"],
["NPR Technology","https://feeds.npr.org/1019/rss.xml","US"],["NPR Business","https://feeds.npr.org/1006/rss.xml","US"],
["France24 English","https://www.france24.com/en/rss","INT"],["Euronews","https://www.euronews.com/rss?level=theme&name=news","INT"],
["Al Jazeera","https://www.aljazeera.com/xml/rss/all.xml","INT"],["Politico Europe","https://www.politico.eu/feed/","EU"],
["The Verge","https://www.theverge.com/rss/index.xml","US"],["Ars Technica","https://feeds.arstechnica.com/arstechnica/index","US"],
["New Scientist","https://www.newscientist.com/feed/home/","INT"],["ESA","https://www.esa.int/rssfeed/Our_Activities","EU"],
["NOAA","https://www.noaa.gov/rss.xml","US"],["WHO","https://www.who.int/rss-feeds/news-english.xml","INT"],
["The Guardian Culture","https://www.theguardian.com/culture/rss","UK"],["The Guardian Sport","https://www.theguardian.com/sport/rss","UK"]
];

const clean=s=>String(s||"").replace(/<!\[CDATA\[|\]\]>/g,"").replace(/<[^>]+>/g,"").replace(/&amp;/g,"&").replace(/&#39;/g,"'").replace(/&quot;/g,'"').trim();
const topicOf=(t,s)=>{
 const x=(t+" "+s).toLowerCase();
 if(/raumfahrt|space|nasa|astronom|planet|moon|mars/.test(x))return"Raumfahrt";
 if(/wissenschaft|science|research|study|laboratory|physic|biology/.test(x))return"Wissenschaft";
 if(/technolog|technology|software|chip|artificial intelligence|\bai\b|ki |digital/.test(x))return"Technologie";
 if(/gesund|health|medizin|medical|hospital|disease|cancer/.test(x))return"Gesundheit";
 if(/wirtschaft|business|econom|market|markets|finance|financial|bank|company|corporate|trade/.test(x))return"Finanzen";
 if(/klima|climate|weather|energie|energy|emission|carbon|environment|wildfire|flood|storm/.test(x))return"Klima";
 if(/sport|football|soccer|tennis|basketball|olympic/.test(x))return"Sport";
 if(/kultur|culture|film|music|art|book/.test(x))return"Kultur";
 if(/mobil|transport|car|auto|rail|aviation/.test(x))return"Mobilität";
 if(/bildung|education|school|university/.test(x))return"Bildung";
 if(/politik|politic|government|election|wahl|parliament|minister|president|congress|senate|chancellor|kanzler|european commission/.test(x))return"Politik";
 return"Alle";
};
const tokens=s=>new Set(clean(s).toLowerCase().split(/[^a-zäöüß0-9]+/).filter(w=>w.length>4));
const similarity=(a,b)=>{const A=tokens(a),B=tokens(b);let n=0;for(const x of A)if(B.has(x))n++;return n/Math.max(1,Math.min(A.size,B.size));};

const out=[];
for(const [source,url,country] of feeds){
 try{
  const res=await fetch(url,{headers:{"user-agent":"PulseNews/1.0"}});
  if(!res.ok)throw new Error("HTTP "+res.status);
  const text=await res.text();
  const items=[...text.matchAll(/<item[\s\S]*?<\/item>/gi)].map(m=>m[0]);
  for(const raw of items.slice(0,30)){
   const get=k=>clean(raw.match(new RegExp("<"+k+"[^>]*>([\\s\\S]*?)<\/"+k+">","i"))?.[1]);
   const title=get("title"),link=get("link"),desc=get("description"),date=get("pubDate")||get("dc:date")||new Date().toISOString();
   if(title&&link)out.push({title,url:link,summary:desc.slice(0,320),source,date,topic:topicOf(title,desc),country});
  }
 }catch(e){console.log(source,e.message)}
}
out.sort((a,b)=>new Date(b.date)-new Date(a.date));
const unique=[];const seen=new Set();
for(const x of out){
 const key=x.title.toLowerCase().replace(/[^a-zäöüß0-9]+/g," ").trim().slice(0,120);
 if(seen.has(key))continue;seen.add(key);unique.push(x);
}
const clusters=[];
for(const x of unique.slice(0,250)){
 let c=clusters.find(c=>similarity(c.title,x.title)>=.55);
 if(!c){c={id:"story-"+clusters.length+1,title:x.title,topic:x.topic,country:x.country,date:x.date,summary:x.summary,sources:[x]};clusters.push(c)}
 else if(c.sources.length<8)c.sources.push(x);
}
const result=clusters.slice(0,180).map(c=>({
 ...c,
 sourceCount:c.sources.length,
 sources:c.sources.map(s=>({source:s.source,url:s.url,date:s.date})),
 summary:c.summary||"Aktuelle Meldung. Öffne die Quellen für weitere Details."
}));
await fs.mkdir("data",{recursive:true});
await fs.writeFile("data/news.json",JSON.stringify(result,null,2));
console.log("Wrote",result.length,"stories from",out.length,"feed items");
