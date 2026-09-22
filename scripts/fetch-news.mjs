import fs from "node:fs/promises";
const feeds=[
["Tagesschau","https://www.tagesschau.de/xml/rss2"],
["DW Deutsch","https://rss.dw.com/xml/rss-de-all"],
["BBC World","https://feeds.bbci.co.uk/news/world/rss.xml"],
["BBC Technology","https://feeds.bbci.co.uk/news/technology/rss.xml"],
["BBC Science","https://feeds.bbci.co.uk/news/science_and_environment/rss.xml"],
["Guardian World","https://www.theguardian.com/world/rss"],
["Guardian Science","https://www.theguardian.com/science/rss"],
["Guardian Business","https://www.theguardian.com/business/rss"],
["NASA","https://www.nasa.gov/rss/dyn/breaking_news.rss"],
["NPR","https://feeds.npr.org/1001/rss.xml"]
];
const topicOf=(t,s)=>{t=(t+" "+s).toLowerCase();if(/science|wissenschaft|nasa|space|raumfahrt/.test(t))return"Raumfahrt";if(/technology|technologie|digital|ai|ki/.test(t))return"Technologie";if(/health|gesund|medizin/.test(t))return"Gesundheit";if(/business|econom|wirtschaft|market|markt|finance/.test(t))return"Wirtschaft";if(/climate|klima|energy|energie/.test(t))return"Klima";if(/sport|football|soccer/.test(t))return"Sport";if(/culture|kultur|film|music/.test(t))return"Kultur";if(/politic|politik|government|wahl|election/.test(t))return"Politik";return"Alle"};
const clean=s=>String(s||"").replace(/<!\[CDATA\[|\]\]>/g,"").replace(/<[^>]+>/g,"").replace(/&amp;/g,"&").trim();
const out=[];
for(const [source,url] of feeds){try{const text=await (await fetch(url,{headers:{"user-agent":"PulseNews/1.0"}})).text();const items=[...text.matchAll(/<item[\s\S]*?<\/item>/gi)].map(m=>m[0]);for(const raw of items.slice(0,20)){const get=k=>clean(raw.match(new RegExp("<"+k+"[^>]*>([\\s\\S]*?)<\/"+k+">","i"))?.[1]);const title=get("title"),link=get("link"),desc=get("description"),date=get("pubDate")||new Date().toISOString();if(title&&link)out.push({title,url:link,summary:desc.slice(0,260),source,date,topic:topicOf(title,desc),country:/tagesschau|dw deutsch/i.test(source)?"DE":/bbc|guardian|npr|nasa/i.test(source)?"INT":"INT"});}}catch(e){console.log(source,e.message)}}
out.sort((a,b)=>new Date(b.date)-new Date(a.date));const seen=new Set();const unique=out.filter(x=>{const k=x.title.toLowerCase().replace(/[^a-z0-9äöüß]+/g," ").slice(0,100);if(seen.has(k))return false;seen.add(k);return true}).slice(0,200);await fs.mkdir("data",{recursive:true});await fs.writeFile("data/news.json",JSON.stringify(unique,null,2));console.log("Wrote",unique.length,"stories");
