import fs from "node:fs/promises";

const feeds=[
  ["Tagesschau","https://www.tagesschau.de/xml/rss2","DE"],
  ["DW Deutsch","https://rss.dw.com/xml/rss-de-all","DE"],
  ["BBC World","https://feeds.bbci.co.uk/news/world/rss.xml","UK"],
  ["BBC Technology","https://feeds.bbci.co.uk/news/technology/rss.xml","UK"],
  ["BBC Science","https://feeds.bbci.co.uk/news/science_and_environment/rss.xml","UK"],
  ["Guardian World","https://www.theguardian.com/world/rss","UK"],
  ["Guardian Business","https://www.theguardian.com/business/rss","UK"],
  ["Guardian Science","https://www.theguardian.com/science/rss","UK"],
  ["Guardian Sport","https://www.theguardian.com/sport/rss","UK"],
  ["Guardian Culture","https://www.theguardian.com/culture/rss","UK"],
  ["RTP Notícias","https://www.rtp.pt/noticias/rss","PT"],
  ["RTP Portugal","https://www.rtp.pt/noticias/rss/portugal","PT"],
  ["RTP Mundo","https://www.rtp.pt/noticias/rss/mundo","PT"],
  ["RTP Desporto","https://www.rtp.pt/noticias/rss/desporto","PT"],
  ["RTP Economia","https://www.rtp.pt/noticias/rss/economia","PT"],
  ["Google News Portugal","https://news.google.com/rss?hl=pt-PT&gl=PT&ceid=PT:pt","PT"],
  ["Google News DE","https://news.google.com/rss?hl=de&gl=DE&ceid=DE:de","DE"],
  ["Google News World","https://news.google.com/rss/search?q=world+news&hl=en-US&gl=US&ceid=US:en","INT"],
  ["NPR World","https://feeds.npr.org/1004/rss.xml","US"],
  ["NPR Technology","https://feeds.npr.org/1019/rss.xml","US"],
  ["NPR Science","https://feeds.npr.org/1007/rss.xml","US"],
  ["NPR Business","https://feeds.npr.org/1006/rss.xml","US"],
  ["NASA","https://www.nasa.gov/rss/dyn/breaking_news.rss","US"],
  ["France24 English","https://www.france24.com/en/rss","INT"],
  ["Euronews","https://www.euronews.com/rss?level=theme&name=news","INT"],
  ["Al Jazeera","https://www.aljazeera.com/xml/rss/all.xml","INT"],
  ["The Verge","https://www.theverge.com/rss/index.xml","US"],
  ["Ars Technica","https://feeds.arstechnica.com/arstechnica/index","US"],
  ["New Scientist","https://www.newscientist.com/feed/home/","INT"],
  ["ESA","https://www.esa.int/rssfeed/Our_Activities","INT"],
  ["NOAA","https://www.noaa.gov/rss.xml","US"],
  ["WHO","https://www.who.int/rss-feeds/news-english.xml","INT"]
];

const clean=s=>String(s||"")
  .replace(/<!\[CDATA\[|\]\]>/g,"")
  .replace(/<[^>]+>/g," ")
  .replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/&lt;/gi,"<").replace(/&gt;/gi,">")
  .replace(/&#39;/g,"'").replace(/&#x27;/g,"'").replace(/&quot;/gi,'"')
  .replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16)))
  .replace(/\s+/g," ").trim();

const topicOf=(title,body)=>{
  const t=title.toLowerCase(), b=body.toLowerCase();
  const rules=[
    ["politik",/wahl|election|government|regierung|minister|präsident|president|parliament|parlament|congress|senate|kanzler|chancellor|prime minister|trump|macron|krieg|war|nato|europa|europe/],
    ["sport",/sport|football|soccer|tennis|basketball|olympic|bundesliga|premier league|liga|match|championship/],
    ["wissenschaft",/wissenschaft|science|research|study|studie|laboratory|physic|biology|astronom|planet|climate research/],
    ["technik",/technolog|technology|software|chip|artificial intelligence|\bai\b|ki |digital|cyber|smartphone|computer/],
    ["umwelt",/klima|climate|emission|carbon|environment|umwelt|wildfire|feuer|flood|storm|ocean|drought/],
    ["wirtschaft",/wirtschaft|business|econom|market|markets|finance|financial|bank|company|corporate|trade|inflation|zinsen|interest rate/],
    ["panorama",/kultur|culture|film|music|art|book|festival|society|gesellschaft|travel|crime|accident|mensch|people/]
  ];
  for(const [k,re] of rules) if(re.test(t)) return k;
  for(const [k,re] of rules) if(re.test(b)) return k;
  return "panorama";
};

const norm=s=>clean(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9äöüß]+/g," ").trim();
const stop=new Set("the and for from with that this these those their about after before into over under were was has have had will would could should than then them they its his her are not you your our new news eine einer eines einen einem ein der die das den dem des für von mit auf aus über auch nicht sich sind wird wurde werden zum zur im in ist und oder nach gegen heute gestern".split(/\s+/));
const tokens=s=>new Set(norm(s).split(/\s+/).filter(w=>w.length>=4&&!stop.has(w)));
const jaccard=(a,b)=>{
  const A=tokens(a),B=tokens(b);let shared=0;for(const x of A)if(B.has(x))shared++;
  return shared/Math.max(1,new Set([...A,...B]).size);
};
const related=(a,b)=>{
  const hours=Math.abs(Date.parse(a.date)-Date.parse(b.date))/3600000;
  if(hours>12)return false;
  const titleScore=jaccard(a.title,b.title);
  const textScore=jaccard(a.title+" "+a.summary,b.title+" "+b.summary);
  const A=[...tokens(a.title)].filter(x=>x.length>=6),B=[...tokens(b.title)].filter(x=>x.length>=6);
  const shared=A.filter(x=>B.includes(x)).length;
  return titleScore>=0.55 || (shared>=2 && textScore>=0.32);
};

const now=Date.now(),cutoff=now-24*60*60*1000,fresh=[];
for(const [source,url,country] of feeds){
  try{
    const res=await fetch(url,{headers:{"user-agent":"PulseNews/1.0 (+https://rololol.github.io/pulse-news/)"}});
    if(!res.ok) throw new Error("HTTP "+res.status);
    const xml=await res.text();
    const items=[...xml.matchAll(/<item[\s\S]*?<\/item>/gi)];
    for(const raw of items.slice(0,60)){
      const get=k=>clean(raw.match(new RegExp("<"+k+"[^>]*>([\\s\\S]*?)<\\/"+k+">","i"))?.[1]);
      const title=get("title"),link=get("link"),desc=get("description"),rawDate=get("pubDate")||get("dc:date");
      const time=Date.parse(rawDate||"");
      if(!title||!link||!Number.isFinite(time)||time<cutoff||time>now+6*60*60*1000)continue;
      fresh.push({title,url:link,summary:desc.slice(0,700),source,date:new Date(time).toISOString(),topic:topicOf(title,desc),country});
    }
  }catch(e){console.log(source,e.message)}
}

fresh.sort((a,b)=>Date.parse(b.date)-Date.parse(a.date));
const unique=[],seen=new Set();
for(const x of fresh){
  const key=norm(x.title);
  if(seen.has(key))continue;
  seen.add(key);unique.push(x);
}

const clusters=[];
for(const item of unique){
  let best=null,bestScore=0;
  for(const cluster of clusters){
    if(cluster.topic!==item.topic)continue;
    const representative=cluster.items[0];
    if(!related(item,representative))continue;
    const s=jaccard(item.title,representative.title);
    if(s>bestScore){best=cluster;bestScore=s}
  }
  if(!best){
    best={id:"story-"+(clusters.length+1),topic:item.topic,country:item.country,date:item.date,items:[]};
    clusters.push(best);
  }
  const sameSource=best.items.some(x=>x.source===item.source);
  if(!sameSource && best.items.length<8) best.items.push(item);
  if(Date.parse(item.date)>Date.parse(best.date)) best.date=item.date;
}

const result=clusters
  .filter(c=>c.items.length)
  .sort((a,b)=>(b.items.length-a.items.length)||Date.parse(b.date)-Date.parse(a.date))
  .slice(0,120)
  .map(c=>({
    id:c.id,topic:c.topic,country:c.country,date:c.date,
    sources:c.items.map(x=>({source:x.source,url:x.url,date:x.date,snippet:x.summary,title:x.title})),
    title:c.items[0].title,
    summary:c.items.map(x=>x.title+" "+x.summary).join("\n").slice(0,2500)
  }));

await fs.mkdir("data",{recursive:true});
await fs.writeFile("data/news.json",JSON.stringify(result,null,2));
console.log("Wrote",result.length,"clusters from",fresh.length,"fresh RSS items. Window: 24h.");