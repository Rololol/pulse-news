import fs from "node:fs/promises";

const feeds=[
  [
    "Tagesschau",
    "https://www.tagesschau.de/xml/rss2",
    "DE"
  ],
  [
    "Tagesschau Inland",
    "https://www.tagesschau.de/inland/index~rss2.xml",
    "DE"
  ],
  [
    "Tagesschau Regional Baden-Württemberg",
    "https://www.tagesschau.de/inland/regional/badenwuerttemberg/index~rss2.xml",
    "DE",
    null,
    "BW"
  ],
  [
    "Tagesschau Regional Bayern",
    "https://www.tagesschau.de/inland/regional/bayern/index~rss2.xml",
    "DE",
    null,
    "BY"
  ],
  [
    "Tagesschau Regional Berlin",
    "https://www.tagesschau.de/inland/regional/berlin/index~rss2.xml",
    "DE",
    null,
    "BE"
  ],
  [
    "Tagesschau Regional Brandenburg",
    "https://www.tagesschau.de/inland/regional/brandenburg/index~rss2.xml",
    "DE",
    null,
    "BB"
  ],
  [
    "Tagesschau Regional Bremen",
    "https://www.tagesschau.de/inland/regional/bremen/index~rss2.xml",
    "DE",
    null,
    "HB"
  ],
  [
    "Tagesschau Regional Hamburg",
    "https://www.tagesschau.de/inland/regional/hamburg/index~rss2.xml",
    "DE",
    null,
    "HH"
  ],
  [
    "Tagesschau Regional Hessen",
    "https://www.tagesschau.de/inland/regional/hessen/index~rss2.xml",
    "DE",
    null,
    "HE"
  ],
  [
    "Tagesschau Regional Mecklenburg-Vorpommern",
    "https://www.tagesschau.de/inland/regional/mecklenburgvorpommern/index~rss2.xml",
    "DE",
    null,
    "MV"
  ],
  [
    "Tagesschau Regional Niedersachsen",
    "https://www.tagesschau.de/inland/regional/niedersachsen/index~rss2.xml",
    "DE",
    null,
    "NI"
  ],
  [
    "Tagesschau Regional Nordrhein-Westfalen",
    "https://www.tagesschau.de/inland/regional/nordrheinwestfalen/index~rss2.xml",
    "DE",
    null,
    "NW"
  ],
  [
    "Tagesschau Regional Rheinland-Pfalz",
    "https://www.tagesschau.de/inland/regional/rheinlandpfalz/index~rss2.xml",
    "DE",
    null,
    "RP"
  ],
  [
    "Tagesschau Regional Saarland",
    "https://www.tagesschau.de/inland/regional/saarland/index~rss2.xml",
    "DE",
    null,
    "SL"
  ],
  [
    "Tagesschau Regional Sachsen",
    "https://www.tagesschau.de/inland/regional/sachsen/index~rss2.xml",
    "DE",
    null,
    "SN"
  ],
  [
    "Tagesschau Regional Sachsen-Anhalt",
    "https://www.tagesschau.de/inland/regional/sachsenanhalt/index~rss2.xml",
    "DE",
    null,
    "ST"
  ],
  [
    "Tagesschau Regional Schleswig-Holstein",
    "https://www.tagesschau.de/inland/regional/schleswigholstein/index~rss2.xml",
    "DE",
    null,
    "SH"
  ],
  [
    "Tagesschau Regional Thüringen",
    "https://www.tagesschau.de/inland/regional/thueringen/index~rss2.xml",
    "DE",
    null,
    "TH"
  ],
  [
    "Deutschlandfunk Nachrichten",
    "https://www.deutschlandfunk.de/nachrichten-100.rss",
    "DE"
  ],
  [
    "Deutschlandfunk Politik",
    "https://www.deutschlandfunk.de/politikportal-100.rss",
    "DE",
    "politik"
  ],
  [
    "Deutschlandfunk Wirtschaft",
    "https://www.deutschlandfunk.de/wirtschaft-106.rss",
    "DE",
    "wirtschaft"
  ],
  [
    "Deutschlandfunk Wissen",
    "https://www.deutschlandfunk.de/wissen-106.rss",
    "DE",
    "wissenschaft"
  ],
  [
    "Deutschlandfunk Gesellschaft",
    "https://www.deutschlandfunk.de/gesellschaft-106.rss",
    "DE",
    "panorama"
  ],
  [
    "Deutschlandfunk Sport",
    "https://www.deutschlandfunk.de/sportportal-100.rss",
    "DE",
    "sport"
  ],
  [
    "NDR Niedersachsen",
    "https://www.ndr.de/nachrichten/niedersachsen/index~rss2.xml",
    "DE",
    null,
    "NI"
  ],
  [
    "NDR Schleswig-Holstein",
    "https://www.ndr.de/nachrichten/schleswig-holstein/index~rss2.xml",
    "DE",
    null,
    "SH"
  ],
  [
    "NDR Mecklenburg-Vorpommern",
    "https://www.ndr.de/nachrichten/mecklenburg-vorpommern/index~rss2.xml",
    "DE",
    null,
    "MV"
  ],
  [
    "NDR Hamburg",
    "https://www.ndr.de/nachrichten/hamburg/index~rss2.xml",
    "DE",
    null,
    "HH"
  ],
  [
    "WDR Nachrichten",
    "https://www1.wdr.de/wissen/uebersicht-nachrichten-100.feed",
    "DE",
    null,
    "NW"
  ],
  [
    "WDR Rheinland",
    "https://www1.wdr.de/nachrichten/rheinland/uebersicht-rheinland-100.feed",
    "DE",
    null,
    "NW"
  ],
  [
    "WDR Ruhrgebiet",
    "https://www1.wdr.de/nachrichten/ruhrgebiet/uebersicht-ruhrgebiet-100.feed",
    "DE",
    null,
    "NW"
  ],
  [
    "BR24 Bayern",
    "https://nachrichtenfeeds.br.de/rss/nachrichten/seiten/QXAPkQJ",
    "DE",
    null,
    "BY"
  ],
  [
    "DW Deutsch",
    "https://rss.dw.com/xml/rss-de-all",
    "DE"
  ],
  [
    "Google News DE",
    "https://news.google.com/rss?hl=de&gl=DE&ceid=DE:de",
    "DE"
  ],
  [
    "ZDF heute",
    "https://www.zdf.de/rss/zdf/nachrichten",
    "DE"
  ],
  [
    "DER SPIEGEL",
    "https://www.spiegel.de/schlagzeilen/index.rss",
    "DE"
  ],
  [
    "ZEIT ONLINE",
    "https://newsfeed.zeit.de/index",
    "DE"
  ],
  [
    "Frankfurter Allgemeine",
    "https://www.faz.net/rss/aktuell/",
    "DE"
  ],
  [
    "Süddeutsche Zeitung",
    "https://rss.sueddeutsche.de/rss/Topthemen",
    "DE"
  ],
  [
    "WELT",
    "https://www.welt.de/feeds/latest.rss",
    "DE"
  ],
  [
    "ntv",
    "https://www.n-tv.de/rss",
    "DE"
  ],
  [
    "Handelsblatt",
    "https://www.handelsblatt.com/contentexport/feed/schlagzeilen",
    "DE",
    "wirtschaft"
  ],
  [
    "heise online",
    "https://www.heise.de/rss/heise-atom.xml",
    "DE",
    "technik"
  ],
  [
    "SWR Aktuell",
    "https://www.swr.de/~rss/swraktuell/swraktuell-100.xml",
    "DE"
  ],
  [
    "SWR Aktuell Baden-Württemberg",
    "https://www.swr.de/~rss/swraktuell/swraktuell-bw-100.xml",
    "DE",
    null,
    "BW"
  ],
  [
    "SWR Aktuell Rheinland-Pfalz",
    "https://www.swr.de/~rss/swraktuell/swraktuell-rp-100.xml",
    "DE",
    null,
    "RP"
  ],
  [
    "RND",
    "https://www.rnd.de/arc/outboundfeeds/rss/",
    "DE"
  ],
  [
    "t-online Nachrichten",
    "https://www.t-online.de/nachrichten/feed.rss",
    "DE"
  ],
  [
    "t-online Wirtschaft",
    "https://www.t-online.de/finanzen/feed.rss",
    "DE",
    "wirtschaft"
  ],
  [
    "t-online Sport",
    "https://www.t-online.de/sport/feed.rss",
    "DE",
    "sport"
  ],
  [
    "t-online Digital",
    "https://www.t-online.de/digital/feed.rss",
    "DE",
    "technik"
  ],
  [
    "t-online Panorama",
    "https://www.t-online.de/nachrichten/panorama/feed.rss",
    "DE",
    "panorama"
  ],
  [
    "stern",
    "https://www.stern.de/feed/standard/alle-nachrichten/",
    "DE"
  ],
  [
    "Rheinische Post",
    "https://rp-online.de/feed.rss",
    "DE"
  ],
  [
    "BBC World",
    "https://feeds.bbci.co.uk/news/world/rss.xml",
    "UK"
  ],
  [
    "BBC Technology",
    "https://feeds.bbci.co.uk/news/technology/rss.xml",
    "UK",
    "technik"
  ],
  [
    "BBC Science",
    "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml",
    "UK",
    "wissenschaft"
  ],
  [
    "Guardian World",
    "https://www.theguardian.com/world/rss",
    "UK"
  ],
  [
    "Guardian Business",
    "https://www.theguardian.com/business/rss",
    "UK",
    "wirtschaft"
  ],
  [
    "Guardian Science",
    "https://www.theguardian.com/science/rss",
    "UK",
    "wissenschaft"
  ],
  [
    "Guardian Environment",
    "https://www.theguardian.com/environment/rss",
    "UK",
    "umwelt"
  ],
  [
    "Guardian Sport",
    "https://www.theguardian.com/sport/rss",
    "UK"
  ],
  [
    "Guardian Culture",
    "https://www.theguardian.com/culture/rss",
    "UK"
  ],
  [
    "RTP Notícias",
    "https://www.rtp.pt/noticias/rss",
    "PT"
  ],
  [
    "RTP Mundo",
    "https://www.rtp.pt/noticias/rss/mundo",
    "PT"
  ],
  [
    "RTP Desporto",
    "https://www.rtp.pt/noticias/rss/desporto",
    "PT"
  ],
  [
    "RTP Economia",
    "https://www.rtp.pt/noticias/rss/economia",
    "PT"
  ],
  [
    "Google News Portugal",
    "https://news.google.com/rss?hl=pt-PT&gl=PT&ceid=PT:pt",
    "PT"
  ],
  [
    "Google News World",
    "https://news.google.com/rss/search?q=world+news&hl=en-US&gl=US&ceid=US:en",
    "INT"
  ],
  [
    "NPR World",
    "https://feeds.npr.org/1004/rss.xml",
    "US"
  ],
  [
    "NPR Technology",
    "https://feeds.npr.org/1019/rss.xml",
    "US",
    "technik"
  ],
  [
    "NPR Science",
    "https://feeds.npr.org/1007/rss.xml",
    "US",
    "wissenschaft"
  ],
  [
    "NPR Business",
    "https://feeds.npr.org/1006/rss.xml",
    "US"
  ],
  [
    "NASA",
    "https://www.nasa.gov/rss/dyn/breaking_news.rss",
    "US",
    "wissenschaft"
  ],
  [
    "France24 English",
    "https://www.france24.com/en/rss",
    "INT"
  ],
  [
    "Euronews",
    "https://www.euronews.com/rss?level=theme&name=news",
    "INT"
  ],
  [
    "Al Jazeera",
    "https://www.aljazeera.com/xml/rss/all.xml",
    "INT"
  ],
  [
    "The Verge",
    "https://www.theverge.com/rss/index.xml",
    "US",
    "technik"
  ],
  [
    "Ars Technica",
    "https://feeds.arstechnica.com/arstechnica/index",
    "US",
    "technik"
  ],
  [
    "New Scientist",
    "https://www.newscientist.com/feed/home/",
    "INT",
    "wissenschaft"
  ],
  [
    "ESA",
    "https://www.esa.int/rssfeed/Our_Activities",
    "INT",
    "wissenschaft"
  ],
  [
    "NOAA",
    "https://www.noaa.gov/rss.xml",
    "US",
    "umwelt"
  ],
  [
    "WHO",
    "https://www.who.int/rss-feeds/news-english.xml",
    "INT"
  ]
];

const isHttpUrl=value=>{try{const u=new URL(String(value||""));return u.protocol==="https:"||u.protocol==="http:"}catch{return false}};

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
  if(a.stateHint&&b.stateHint&&a.stateHint!==b.stateHint)return false;
  const titleScore=jaccard(a.title,b.title);
  const textScore=jaccard(a.title+" "+a.summary,b.title+" "+b.summary);
  const A=[...tokens(a.title)].filter(x=>x.length>=6),B=[...tokens(b.title)].filter(x=>x.length>=6);
  const shared=A.filter(x=>B.includes(x)).length;
  return titleScore>=0.55 || (shared>=2 && textScore>=0.32);
};

const now=Date.now(),cutoff=now-24*60*60*1000,fresh=[];
for(const [source,url,country,feedTopic,stateHint] of feeds){
  try{
    const res=await fetch(url,{headers:{"user-agent":"PulseNews/1.0 (+https://rololol.github.io/pulse-news/)"}});
    if(!res.ok) throw new Error("HTTP "+res.status);
    const xml=await res.text();
    const items=[...xml.matchAll(/<item[\s\S]*?<\/item>/gi)];
    for(const match of items.slice(0,60)){
      const raw=match[0];
      const get=k=>clean(raw.match(new RegExp("<"+k+"[^>]*>([\\s\\S]*?)<\\/"+k+">","i"))?.[1]);
      const title=get("title"),link=get("link"),desc=get("description"),rawDate=get("pubDate")||get("dc:date");
      const time=Date.parse(rawDate||"");
      if(!title||!link||!isHttpUrl(link)||!Number.isFinite(time)||time<cutoff||time>now+6*60*60*1000)continue;
      const tickerLike=/newsticker|liveticker|live-ticker|kurz und informativ|morgen-ticker|abend-ticker/i.test(title+" "+link);
      if(tickerLike)continue;
      fresh.push({title,url:link,summary:desc.slice(0,700),source,date:new Date(time).toISOString(),topic:feedTopic||topicOf(title,desc),country,stateHint:stateHint||""});
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
    best={id:"story-"+(clusters.length+1),topic:item.topic,country:item.country,stateHint:item.stateHint||"",date:item.date,items:[]};
    clusters.push(best);
  }
  const sameSource=best.items.some(x=>x.source===item.source);
  if(!sameSource && best.items.length<8) best.items.push(item);
  if(Date.parse(item.date)>Date.parse(best.date)) best.date=item.date;
  if(!best.stateHint&&item.stateHint) best.stateHint=item.stateHint;
}

const result=clusters
  .filter(c=>c.items.length>=2)
  .sort((a,b)=>(b.items.length-a.items.length)||Date.parse(b.date)-Date.parse(a.date))
  .slice(0,120)
  .map(c=>({
    id:c.id,topic:c.topic,country:c.country,stateHint:c.stateHint||"",date:c.date,
    sources:c.items.map(x=>({source:x.source,url:x.url,date:x.date,snippet:x.summary,title:x.title})),
    title:c.items[0].title,
    summary:c.items.map(x=>x.title+" "+x.summary).join("\n").slice(0,2500)
  }));

await fs.mkdir("data",{recursive:true});
await fs.writeFile("data/news.json",JSON.stringify(result,null,2));
console.log("Wrote",result.length,"clusters from",fresh.length,"fresh RSS items. Window: 24h.");