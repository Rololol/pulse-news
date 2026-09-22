import fs from "node:fs/promises";

const feeds=[
["Google News DE","https://news.google.com/rss?hl=de&gl=DE&ceid=DE:de","DE"],["Google News DE Politik","https://news.google.com/rss/search?q=Politik&hl=de&gl=DE&ceid=DE:de","DE"],["Google News DE Wissenschaft","https://news.google.com/rss/search?q=Wissenschaft&hl=de&gl=DE&ceid=DE:de","DE"],["Google News DE Technologie","https://news.google.com/rss/search?q=Technologie&hl=de&gl=DE&ceid=DE:de","DE"],["Google News DE Wirtschaft","https://news.google.com/rss/search?q=Wirtschaft&hl=de&gl=DE&ceid=DE:de","DE"],
["Google News UK","https://news.google.com/rss?hl=en-GB&gl=GB&ceid=GB:en","UK"],["Google News US","https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en","US"],["Google News World","https://news.google.com/rss/search?q=world+news&hl=en-US&gl=US&ceid=US:en","INT"],
["Tagesschau","https://www.tagesschau.de/xml/rss2","DE"],["DW Deutsch","https://rss.dw.com/xml/rss-de-all","DE"],["BBC World","https://feeds.bbci.co.uk/news/world/rss.xml","UK"],["BBC Technology","https://feeds.bbci.co.uk/news/technology/rss.xml","UK"],["BBC Science","https://feeds.bbci.co.uk/news/science_and_environment/rss.xml","UK"],["Guardian World","https://www.theguardian.com/world/rss","UK"],["Guardian Science","https://www.theguardian.com/science/rss","UK"],["Guardian Business","https://www.theguardian.com/business/rss","UK"],["NASA","https://www.nasa.gov/rss/dyn/breaking_news.rss","US"],["NPR","https://feeds.npr.org/1001/rss.xml","US"],["NPR World","https://feeds.npr.org/1004/rss.xml","US"],["NPR Science","https://feeds.npr.org/1007/rss.xml","US"],["NPR Technology","https://feeds.npr.org/1019/rss.xml","US"],["NPR Business","https://feeds.npr.org/1006/rss.xml","US"],["France24 English","https://www.france24.com/en/rss","INT"],["Euronews","https://www.euronews.com/rss?level=theme&name=news","INT"],["Al Jazeera","https://www.aljazeera.com/xml/rss/all.xml","INT"],["The Verge","https://www.theverge.com/rss/index.xml","US"],["Ars Technica","https://feeds.arstechnica.com/arstechnica/index","US"],["New Scientist","https://www.newscientist.com/feed/home/","INT"],["ESA","https://www.esa.int/rssfeed/Our_Activities","EU"],["NOAA","https://www.noaa.gov/rss.xml","US"],["WHO","https://www.who.int/rss-feeds/news-english.xml","INT"],["Guardian Culture","https://www.theguardian.com/culture/rss","UK"],["Guardian Sport","https://www.theguardian.com/sport/rss","UK"]
];

const clean=s=>String(s||"").replace(/<!\[CDATA\[|\]\]>/g,"").replace(/<[^>]+>/g,"").replace(/&amp;/g,"&").replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/&#x27;/g,"'").trim();
const topicOf=(t,s)=>{const x=(t+" "+s).toLowerCase();if(/raumfahrt|space|nasa|astronom|planet|moon|mars/.test(x))return"Raumfahrt";if(/wissenschaft|science|research|study|laboratory|physic|biology/.test(x))return"Wissenschaft";if(/technolog|technology|software|chip|artificial intelligence|\bai\b|ki |digital/.test(x))return"Technologie";if(/gesund|health|medizin|medical|hospital|disease|cancer/.test(x))return"Gesundheit";if(/wirtschaft|business|econom|market|markets|finance|financial|bank|company|corporate|trade/.test(x))return"Finanzen";if(/klima|climate|weather|energie|energy|emission|carbon|environment|wildfire|flood|storm/.test(x))return"Klima";if(/sport|football|soccer|tennis|basketball|olympic/.test(x))return"Sport";if(/kultur|culture|film|music|art|book/.test(x))return"Kultur";if(/mobil|transport|car|auto|rail|aviation/.test(x))return"Mobilität";if(/bildung|education|school|university/.test(x))return"Bildung";if(/politik|politic|government|election|wahl|parliament|minister|president|congress|senate|chancellor|kanzler|european commission/.test(x))return"Politik";return"Alle"};

const stop=new Set("about after again against among because before being between could from have into more other over than that their there these they this those through under were which with would nach eine einer eines einen einem und oder der die das den dem des für von mit auf aus über auch nicht sich sind wird wurde werden zum zur im in ist ein eine einen einem einer er sie es wie bei nach gegen heute gestern heute the and for from with that this these those their about after before into over under were was has have had will would could should than then them they its his her are not you your our new news".split(/\s+/));
const norm=s=>clean(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9äöüß]+/g," ").trim();
const tokens=s=>new Set(norm(s).split(/\s+/).filter(w=>w.length>=4&&!stop.has(w)));
const score=(a,b)=>{const A=tokens(a),B=tokens(b);let shared=0;for(const x of A)if(B.has(x))shared++;const union=new Set([...A,...B]).size;return shared/Math.max(1,union)};
const distinctive=(s)=>[...tokens(s)].filter(x=>x.length>=6);
const related=(a,b)=>{
 const sa=score(a.title+" "+a.summary,b.title+" "+b.summary);
 const pa=distinctive(a.title),pb=distinctive(b.title);
 const phrase=pa.length>=3&&pb.length>=3&&(pa.slice(0,3).join(" ")===pb.slice(0,3).join(" "));
 return sa>=0.30||phrase||(score(a.title,b.title)>=0.45);
};

const now=Date.now(),cutoff=now-24*60*60*1000,out=[];
for(const [source,url,country] of feeds){
 try{
  const res=await fetch(url,{headers:{"user-agent":"PulseNews/1.0"}});
  if(!res.ok)throw new Error("HTTP "+res.status);
  const text=await res.text();
  const items=[...text.matchAll(/<item[\s\S]*?<\/item>/gi)].map(m=>m[0]);
  for(const raw of items.slice(0,50)){
   const get=k=>clean(raw.match(new RegExp("<"+k+"[^>]*>([\\s\\S]*?)<\/"+k+">","i"))?.[1]);
   const title=get("title"),link=get("link"),desc=get("description"),rawDate=get("pubDate")||get("dc:date"),time=Date.parse(rawDate||"");
   if(!title||!link||!Number.isFinite(time)||time<cutoff||time>now+6*60*60*1000)continue;
   out.push({title,url:link,summary:desc.slice(0,500),source,date:new Date(time).toISOString(),topic:topicOf(title,desc),country});
  }
 }catch(e){console.log(source,e.message)}
}
out.sort((a,b)=>Date.parse(b.date)-Date.parse(a.date));

const unique=[],seen=new Set();
for(const x of out){const key=norm(x.title);if(seen.has(key))continue;seen.add(key);unique.push(x)}

const clusters=[];
for(const x of unique){
 let best=null,bestScore=0;
 for(const c of clusters){
   if(c.topic!==x.topic)continue;
   const representative=c.sources[0];
   const s=score(x.title,representative.title);
   if(related(x,representative)&&s>bestScore){best=c;bestScore=s}
 }
 if(!best){best={id:"story-"+(clusters.length+1),title:x.title,topic:x.topic,country:x.country,date:x.date,summary:x.summary,sources:[]};clusters.push(best)}
 if(best.sources.length<12)best.sources.push(x);
 if(Date.parse(x.date)>Date.parse(best.date))best.date=x.date;
}

const result=clusters.sort((a,b)=>(b.sources.length-a.sources.length)||Date.parse(b.date)-Date.parse(a.date)).slice(0,180).map(c=>({...c,sourceCount:c.sources.length,sources:c.sources.map(s=>({source:s.source,url:s.url,date:s.date,snippet:s.summary})),summary:c.summary||"Aktuelle Meldung."}));
if(!result.length){console.log("No fresh stories in last 24h; keeping existing news.json.");process.exit(0)}
await fs.mkdir("data",{recursive:true});await fs.writeFile("data/news.json",JSON.stringify(result,null,2));
console.log("Wrote",result.length,"stories from",out.length,"fresh RSS items. Window: 24h.");