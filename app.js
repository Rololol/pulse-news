const topics=["Alle","Politik","Wissenschaft","Technologie","Gesundheit","Wirtschaft","Klima","Sport","Kultur","Raumfahrt","Energie","Digitales","Mobilität","Finanzen","Bildung"];
const countries=["Alle","DE","UK","US","INT"];let data=[],topic="Alle",country="Alle";
const nav=document.querySelector("#nav"),chips=document.querySelector("#topics"),countriesEl=document.querySelector("#countries"),news=document.querySelector("#news"),hero=document.querySelector("#hero"),search=document.querySelector("#search"),count=document.querySelector("#count");
nav.innerHTML=topics.slice(0,9).map(x=>"<button>"+x+"</button>").join("");
countriesEl.innerHTML='<div class="chips">'+countries.map(x=>'<button class="chip country-chip '+(x==="Alle"?"active":"")+'">'+x+"</button>").join("")+"</div>";
chips.innerHTML='<div class="chips">'+topics.map(x=>'<button class="chip '+(x==="Alle"?"active":"")+'">'+x+"</button>").join("")+"</div>";
function esc(s=""){return String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}
function render(){
 let q=search.value.toLowerCase();
 let list=data.filter(x=>(topic==="Alle"||x.topic===topic)&&(country==="Alle"||x.country===country)&&(!q||(x.title+" "+x.summary+" "+(x.sources||[]).map(s=>s.source).join(" ")).toLowerCase().includes(q)));
 count.textContent=list.length+" Meldungen";
 hero.innerHTML=list[0]?`<div class="hero"><span class="meta">${esc(list[0].source||"Pulse News")} · ${list[0].sourceCount||1} Quelle(n) · ${new Date(list[0].date).toLocaleString("de-DE")}</span><h2>${esc(list[0].title)}</h2><p>${esc(list[0].aiSummary||list[0].summary||"Aktuelle Meldung.")}</p></div>`:"";
 news.innerHTML=list.length?list.map(x=>`<article class="card"><span class="meta">${esc(x.topic)} · ${esc(x.country||"INT")} · ${x.sourceCount||1} Quellen</span><h3>${esc(x.title)}</h3><p>${esc(x.aiSummary||x.summary||"Quelle öffnen für Details.")}</p><div class="source">${(x.sources||[]).slice(0,4).map(s=>'<a href="'+s.url+'" target="_blank" rel="noopener">'+esc(s.source)+'</a>').join(" · ")}</div></article>`).join(""):'<div class="empty">Keine Meldungen für diese Auswahl.</div>';
}
async function load(){try{const r=await fetch("data/news.json?"+Date.now());data=await r.json()}catch(e){data=[]}render()}
function setTopic(v){topic=v;document.querySelectorAll(".chip").forEach(x=>x.classList.toggle("active",x.textContent===topic));render()}
document.querySelectorAll(".country-chip").forEach(b=>b.onclick=()=>{country=b.textContent;document.querySelectorAll(".country-chip").forEach(x=>x.classList.toggle("active",x.textContent===country));render()});
document.querySelectorAll("#topics .chip").forEach(b=>b.onclick=()=>setTopic(b.textContent));
document.querySelectorAll("#nav button").forEach(b=>b.onclick=()=>setTopic(b.textContent));
search.oninput=render;
document.querySelector("#theme").onclick=()=>document.body.classList.toggle("dark");
document.querySelectorAll(".bottom button").forEach(b=>b.onclick=()=>{if(b.dataset.nav==="search")search.focus();else if(b.dataset.nav==="topics")document.querySelector(".toolbar").scrollIntoView();else{topic="Alle";country="Alle";render()}});
load();setInterval(load,300000);