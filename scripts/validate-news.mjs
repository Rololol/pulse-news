import fs from "node:fs/promises";

const data=JSON.parse(await fs.readFile("data.json","utf8"));
if(!Array.isArray(data)||!data.length||data.length>400)throw new Error("Ungültiger Nachrichtenbestand");
const allowedCountries=new Set(["DE","INT"]);
const allowedCategories=new Set(["politik","wirtschaft","sport","wissenschaft","technik","panorama","umwelt"]);
const ids=new Set();
const titles=new Set();
const now=Date.now();

const httpUrl=value=>{
  try{
    const u=new URL(String(value||""));
    return (u.protocol==="https:"||u.protocol==="http:")&&u.hostname.length>0&&String(value).length<=2048;
  }catch{return false}
};
const text=value=>typeof value==="string"&&value.trim().length>0;

for(const x of data){
  if(!x||typeof x!=="object")throw new Error("Ungültiger Meldungseintrag");
  for(const key of ["id","t","s","m","c","k","d"])if(!text(x[key]))throw new Error("Pflichtfeld fehlt: "+key);
  if(ids.has(x.id))throw new Error("Doppelte ID: "+x.id);
  ids.add(x.id);
  const title=x.t.trim().toLowerCase();
  if(titles.has(title))throw new Error("Doppelter Titel: "+x.t);
  titles.add(title);
  if(!allowedCountries.has(x.c))throw new Error("Ungültiges Land: "+x.id);
  if(!allowedCategories.has(x.k))throw new Error("Ungültige Kategorie: "+x.id);
  if(x.lang!=="de")throw new Error("Meldung nicht als Deutsch markiert: "+x.id);
  const time=Date.parse(x.d);
  if(!Number.isFinite(time))throw new Error("Ungültiges Datum: "+x.id);
  if(time>now+6*60*60*1000)throw new Error("Meldung liegt zu weit in der Zukunft: "+x.id);
  if(x.t.length>180||x.s.length>700||x.m.length>1600||x.r.length>500||String(x.chg||"").length>500)throw new Error("Textfeld zu lang: "+x.id);
  if(!Array.isArray(x.srcs)||x.srcs.length<2||x.srcs.length>8)throw new Error("Meldung braucht mindestens zwei Quellen: "+x.id);
  const sourceUrls=new Set();
  for(const src of x.srcs){
    if(!text(src?.name)||!httpUrl(src?.url))throw new Error("Ungültige Quelle: "+x.id);
    if(sourceUrls.has(src.url))throw new Error("Doppelte Quellen-URL: "+x.id);
    sourceUrls.add(src.url);
    if(src.date&&(!Number.isFinite(Date.parse(src.date))||Date.parse(src.date)>now+6*60*60*1000))throw new Error("Ungültiges Quelldatum: "+x.id);
  }
  if(!Number.isInteger(x.p)||x.p<1||x.p>5)throw new Error("Ungültige Wichtigkeit: "+x.id);
  if(typeof x.agree!=="string"||!Array.isArray(x.diff)||typeof x.chg!=="string")throw new Error("Ungültige Vergleichsfelder: "+x.id);
  if(x.independent!==undefined&&(!Number.isInteger(x.independent)||x.independent<1||x.independent>x.srcs.length))throw new Error("Ungültige Domainanzahl: "+x.id);
  for(const field of ["t","s","m","r","agree","chg"])if(/<script|javascript:|onerror\s*=|onload\s*=/i.test(String(x[field]||"")))throw new Error("Unsicherer Inhalt: "+x.id);
  for(const d of x.diff){
    if(!d||!text(d.name)||!text(d.note)||d.name.length>160||d.note.length>500)throw new Error("Ungültiger Quellenvergleich: "+x.id);
  }
}
const archive=JSON.parse(await fs.readFile("data/archive/index.json","utf8"));
if(!Array.isArray(archive))throw new Error("Archivindex ungültig");
for(const entry of archive){
  if(!entry||!/^\d{4}-\d{2}$/.test(entry.month)||entry.file!==entry.month+".json")throw new Error("Ungültiger Archivindex");
  const items=JSON.parse(await fs.readFile("data/archive/"+entry.file,"utf8"));
  if(!Array.isArray(items))throw new Error("Ungültiges Archiv: "+entry.month);
  const archiveIds=new Set();
  for(const x of items){
    if(!x?.id||archiveIds.has(x.id))throw new Error("Doppelte Archiv-ID: "+x.id);
    archiveIds.add(x.id);
    if(!text(x.t)||!text(x.s)||!text(x.d))throw new Error("Unvollständige Archivmeldung: "+x.id);
  }
}
console.log("News-Health-Check OK:",data.length,"aktuelle Meldungen,",archive.length,"Archivmonate.");