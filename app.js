"use strict";

const CATEGORIES=[
  ["Politik","#b5541b"],["Wirtschaft","#9c7a1f"],["Technologie","#0f766e"],
  ["Wissenschaft","#6a4fae"],["Gesundheit","#b23a5a"],["Klima","#2f7d4f"],
  ["Kultur","#8a5a2f"],["Sport","#3d6b6b"],["Raumfahrt","#34507a"],
  ["Energie","#a65f1f"],["Bildung","#725b2b"],["Umwelt","#2f7d4f"],["KI","#5f4bb6"]
];
const REGION_NAME={DE:"Deutschland",US:"USA",UK:"UK",EU:"Europa",INT:"International"};
const catColor=c=>(CATEGORIES.find(x=>x[0]===c)||[])[1]||"#34507a";
const $=id=>document.getElementById(id);
let stories=[],activeCat="Alle",query="";

function esc(s=""){return String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}
function fmt(d){try{return new Intl.DateTimeFormat("de-DE",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}).format(new Date(d))}catch{return""}}
function relTime(d){
  const diff=Math.max(0,Date.now()-new Date(d).getTime()),m=Math.floor(diff/60000);
  if(m<1)return"gerade eben";if(m<60)return"vor "+m+" Min.";const h=Math.floor(m/60);
  if(h<24)return"vor "+h+" Std.";return new Intl.DateTimeFormat("de-DE",{day:"2-digit",month:"2-digit"}).format(new Date(d));
}
function sourcesFor(s){return Array.isArray(s.sources)?s.sources:[]}
function consensus(s){return Number.isFinite(Number(s.consensus))?Math.max(0,Math.min(100,Number(s.consensus))):null}
function summaryFor(s){return s.aiSummary||s.summary||"Keine KI-Zusammenfassung verfügbar."}
function sourceCount(s){return Number(s.sourceCount)||sourcesFor(s).length||1}

function consensusBar(pct){
  if(pct===null)return '<div class="ai-label"><i></i>KI-Abgleich nicht verfügbar</div>';
  return '<div class="consbar"><div class="track"><div class="fill" style="width:'+pct+'%"></div></div><span>'+pct+'% Quellenübereinstimmung</span></div>';
}

function filtered(){
  const q=query.trim().toLowerCase();
  return stories.filter(s=>{
    if(activeCat!=="Alle"&&s.topic!==activeCat)return false;
    if(q){
      const hay=[s.title,summaryFor(s),s.topic,s.country,...sourcesFor(s).map(x=>x.source)].join(" ").toLowerCase();
      if(!hay.includes(q))return false;
    }
    return true;
  });
}

function renderChips(){
  const all='<button type="button" class="chip" data-cat="Alle" aria-pressed="'+(activeCat==="Alle")+'">Alle</button>';
  const rest=CATEGORIES.map(([name,c])=>'<button type="button" class="chip" data-cat="'+esc(name)+'" style="--c:'+c+'" aria-pressed="'+(activeCat===name)+'"><i></i>'+esc(name)+'</button>').join("");
  $("chips").innerHTML=all+rest;
  $("chips").querySelectorAll("[data-cat]").forEach(b=>b.onclick=()=>{activeCat=b.dataset.cat;render()});
}

function leadStory(){
  const list=[...stories].sort((a,b)=>
    (sourceCount(b)-sourceCount(a))||
    ((consensus(b)??0)-(consensus(a)??0))||
    (new Date(b.date)-new Date(a.date))
  );
  return list[0]||null;
}

function renderLead(){
  const lead=leadStory();
  if(!lead){$("lead").innerHTML="";return}
  const n=sourceCount(lead), pct=consensus(lead);
  $("lead").innerHTML=
    '<div class="lead-eyebrow"><span class="liveline"></span>Meistabgeglichene Meldung gerade eben</div>'+
    '<h1>'+esc(lead.title)+'</h1>'+
    '<p>'+esc(summaryFor(lead))+'</p>'+
    '<div class="leadmeta">'+consensusBar(pct)+'<span style="font-size:12.5px;color:var(--faint)">'+n+' Quellen ausgewertet</span></div>'+
    '<div class="ai-note">KI-Synthese aus den sichtbaren RSS-Kurztexten · keine Volltexte</div>'+
    '<button class="lead-btn" id="leadOpen" type="button">Quellenabgleich ansehen'+
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>';
  $("leadOpen").onclick=()=>openDetail(lead.id);
}

function renderList(){
  const lead=leadStory();
  let list=filtered();
  if(activeCat==="Alle"&&!query.trim()&&lead)list=list.filter(s=>s.id!==lead.id);
  $("statusText").textContent=list.length+" Meldung"+(list.length===1?"":"en");
  $("syncText").textContent="Zuletzt abgeglichen um "+new Intl.DateTimeFormat("de-DE",{hour:"2-digit",minute:"2-digit"}).format(new Date())+" Uhr";
  $("list").innerHTML=list.length?list.map(s=>{
    const pct=consensus(s), n=sourceCount(s);
    return '<button type="button" class="item" data-open="'+esc(s.id)+'">'+
      '<time>'+esc(relTime(s.date))+'</time>'+
      '<div class="body">'+
      '<div class="taglabel" style="--c:'+catColor(s.topic)+'"><i></i>'+esc(s.topic)+' · '+esc(REGION_NAME[s.country]||s.country||"International")+'</div>'+
      '<h3>'+esc(s.title)+'</h3>'+
      '<p>'+esc(summaryFor(s))+'</p>'+
      '<div class="foot">'+consensusBar(pct)+'<span class="srcs">'+n+' Quellen</span></div>'+
      '</div>'+
      '<span class="chevron"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6"/></svg></span>'+
      '</button>';
  }).join(""):'<div class="empty"><strong>Keine Meldungen für diese Auswahl</strong>Versuche eine andere Kategorie oder Suche.</div>';
  $("list").querySelectorAll("[data-open]").forEach(b=>b.onclick=()=>openDetail(b.dataset.open));
}

function render(){renderChips();renderLead();renderList()}

function openDetail(id){
  const s=stories.find(x=>String(x.id)===String(id));if(!s)return;
  const srcs=sourcesFor(s),pct=consensus(s);
  const facts=Array.isArray(s.consensusFacts)&&s.consensusFacts.length
    ?s.consensusFacts.map(f=>'<div class="fact"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg><span>'+esc(f)+'</span></div>').join("")
    :'<div class="noDiverg">Die KI hat keine gesonderten übereinstimmenden Einzelangaben aus den gelieferten RSS-Texten extrahiert.</div>';
  const diverg=Array.isArray(s.divergences)&&s.divergences.length
    ?s.divergences.map(d=>'<div class="diverg"><b>'+esc(d.source||"Quelle")+'</b><span>'+esc(d.note||"Abweichende Angabe")+'</span></div>').join("")
    :'<div class="noDiverg">Keine wesentlichen Abweichungen in den gelieferten RSS-Texten erfasst.</div>';
  const sourceRows=srcs.length?srcs.map(src=>{
    const name=esc(src.source||"Quelle"),date=src.date?fmt(src.date):"";
    return '<div class="srcrow">'+
      '<a href="'+esc(src.url||"#")+'" target="_blank" rel="noopener noreferrer">'+name+'</a>'+
      '<small>'+esc(date)+'</small></div>';
  }).join(""):'<div class="srcrow"><small>Keine Quellenlinks verfügbar.</small></div>';

  $("panelBody").innerHTML=
    '<div class="ai-badge"><i></i>KI-Synthese · transparent aus RSS-Daten</div>'+
    '<div class="pmeta" style="--c:'+catColor(s.topic)+'"><i></i>'+esc(s.topic)+' · '+esc(REGION_NAME[s.country]||s.country||"International")+' · '+esc(relTime(s.date))+'</div>'+
    '<h2 id="panelTitle">'+esc(s.title)+'</h2>'+
    '<p style="font-size:15px;line-height:1.6;color:var(--sub);margin:0 0 6px">'+esc(summaryFor(s))+'</p>'+
    '<div class="pconsbar">'+consensusBar(pct)+'</div>'+
    '<div class="block"><h4><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>Übereinstimmende Angaben</h4><div class="facts">'+facts+'</div></div>'+
    '<div class="block"><h4><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 0 1 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>Abweichende Angaben</h4>'+diverg+'</div>'+
    '<div class="block"><h4>Ausgewertete Quellen</h4><div class="srclist">'+sourceRows+'</div></div>'+
    '<p class="disclosure">Die KI erhält bei dieser Pipeline nur die RSS-Metadaten und Kurztexte der Quellen. Der Quellenabgleich ist deshalb eine Synthese dieser gelieferten Informationen und kein Ersatz für die Originalberichte.</p>';
  $("scrim").classList.add("show");$("panel").classList.add("show");document.body.style.overflow="hidden";$("closeBtn").focus();
}
function closeDetail(){$("scrim").classList.remove("show");$("panel").classList.remove("show");document.body.style.overflow=""}
$("closeBtn").onclick=closeDetail;$("scrim").onclick=closeDetail;document.addEventListener("keydown",e=>{if(e.key==="Escape")closeDetail()});

let searchTimer;
$("searchInput").oninput=e=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>{query=e.target.value;render()},120)};

function applyThemeIcon(){
  const dark=document.documentElement.getAttribute("data-theme")==="dark"||(!document.documentElement.getAttribute("data-theme")&&matchMedia("(prefers-color-scheme: dark)").matches);
  $("themeIcon").innerHTML=dark
    ?'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'
    :'<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>';
}
$("themeBtn").onclick=()=>{const cur=document.documentElement.getAttribute("data-theme");const next=cur==="dark"?"light":"dark";document.documentElement.setAttribute("data-theme",next);localStorage.setItem("pulseTheme",next);applyThemeIcon()};
const savedTheme=localStorage.getItem("pulseTheme");if(savedTheme)document.documentElement.setAttribute("data-theme",savedTheme);applyThemeIcon();

async function load(){
  try{
    const r=await fetch("data/news.json?ts="+Date.now(),{cache:"no-store"});if(!r.ok)throw Error("HTTP "+r.status);
    const raw=await r.json();
    stories=Array.isArray(raw)?raw:[];
    render();
  }catch(e){
    $("statusText").textContent="News konnten nicht geladen werden";
    $("syncText").textContent="";
    $("lead").innerHTML="";
    $("list").innerHTML='<div class="empty"><strong>News-Feed nicht erreichbar.</strong>Bitte später erneut versuchen.</div>';
  }
}
load();setInterval(load,300000);
