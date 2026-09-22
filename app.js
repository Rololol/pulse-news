const topics=["Alle","Politik","Wissenschaft","Technologie","Gesundheit","Wirtschaft","Klima","Sport","Kultur","Raumfahrt","Energie","Digitales","Mobilität","Finanzen","Bildung","Umwelt","Lifestyle","Reisen","Auto","Gaming","KI"];
const homeTopics=["Top","Alle","Politik","Technologie","Wissenschaft"];
const countries=["Alle","DE","UK","US","EU","INT"];
let data=[],topic="Top",country="Alle";
const nav=document.querySelector("#nav"),homeTabs=document.querySelector("#homeTabs"),allTopics=document.querySelector("#allTopics"),countriesEl=document.querySelector("#countries"),news=document.querySelector("#news"),search=document.querySelector("#search"),count=document.querySelector("#count"),feedTitle=document.querySelector("#feedTitle");
function esc(s=""){return String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}
function topicButton(x,cls=""){return '<button class="chip '+cls+'">'+esc(x)+"</button>"}
nav.innerHTML=homeTopics.slice(1).map(x=>"<button>"+esc(x)+"</button>").join("");
homeTabs.innerHTML=homeTopics.map(x=>topicButton(x,x==="Top"?"active":"")).join("");
allTopics.innerHTML=topics.filter(x=>!homeTopics.includes(x)).map(x=>'<button class="topic-option" data-topic="'+esc(x)+'"><span>'+esc(x)+'</span><b>›</b></button>').join("");
countriesEl.innerHTML='<div class="chips">'+countries.map(x=>topicButton(x,"country-chip "+(x==="Alle"?"active":""))).join("")+"</div>";
function filtered(){const q=search.value.toLowerCase();let list=data.filter(x=>(topic==="Top"||topic==="Alle"||x.topic===topic)&&(country==="Alle"||x.country===country)&&(!q||(x.title+" "+(x.aiSummary||x.summary)+" "+(x.sources||[]).map(s=>s.source).join(" ")).toLowerCase().includes(q)));if(topic==="Top")list=list.slice().sort((a,b)=>(b.sourceCount||1)-(a.sourceCount||1)||new Date(b.date)-new Date(a.date));return list}
function render(){const list=filtered();feedTitle.textContent=topic==="Top"?"Top News":topic;count.textContent=list.length+" Meldungen";news.innerHTML=list.length?list.map(x=>'<article class="card"><div class="card-top"><span class="pill">'+esc(x.topic)+'</span><span class="meta">'+esc(x.country||"INT")+' · '+(x.sourceCount||1)+' Quellen</span></div><h3>'+esc(x.title)+'</h3><p>'+esc(x.aiSummary||x.summary||"Quelle öffnen für Details.")+'</p><div class="source">'+(x.sources||[]).slice(0,4).map(s=>'<a href="'+s.url+'" target="_blank" rel="noopener">'+esc(s.source)+'</a>').join("")+'</div></article>').join(""):'<div class="empty">Keine Meldungen für diese Auswahl.</div>';document.querySelectorAll(".home-tabs .chip").forEach(b=>b.classList.toggle("active",b.textContent===topic))}
function setTopic(v){topic=v;render();window.scrollTo({top:0,behavior:"smooth"})}
function toggleTheme(){document.body.classList.toggle("dark")}
document.querySelectorAll(".home-tabs .chip").forEach(b=>b.onclick=()=>setTopic(b.textContent));
document.querySelectorAll("#nav button").forEach(b=>b.onclick=()=>setTopic(b.textContent));
document.querySelectorAll(".country-chip").forEach(b=>b.onclick=()=>{country=b.textContent;document.querySelectorAll(".country-chip").forEach(x=>x.classList.toggle("active",x.textContent===country));render()});
document.querySelectorAll(".topic-option").forEach(b=>b.onclick=()=>{setTopic(b.dataset.topic);closeTopics()});
search.oninput=render;document.querySelector("#theme").onclick=toggleTheme;document.querySelector("#desktopTheme").onclick=toggleTheme;
const modal=document.querySelector("#topicModal");function openTopics(){modal.classList.add("open");modal.setAttribute("aria-hidden","false")}function closeTopics(){modal.classList.remove("open");modal.setAttribute("aria-hidden","true")}
document.querySelector("#openTopics").onclick=openTopics;document.querySelector("#closeTopics").onclick=closeTopics;modal.onclick=e=>{if(e.target===modal)closeTopics()};
document.querySelectorAll(".bottom button").forEach(b=>b.onclick=()=>{if(b.dataset.nav==="search")search.focus();else if(b.dataset.nav==="topics")openTopics();else setTopic("Top")});
async function load(){try{const r=await fetch("data/news.json?"+Date.now());data=await r.json()}catch(e){data=[]}render()}load();setInterval(load,300000);