const $=s=>document.querySelector(s);
const DAYN=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];
const THEMES={
  pastel:{name:"Pastel rainbow",dark:false,colors:["#dccbe3","#b9d6dc","#c4e6c8","#eadc8e","#f6c7a0","#f7b2a6","#f3adb9"]},
  lavender:{name:"Lavender",dark:false,colors:["#d8cdf0","#cdd6f5","#d6e9f7","#e4d3f2","#e9c9ee","#f3c9e3","#d1c4ea"]},
  sage:{name:"Sage",dark:false,colors:["#d6e2c8","#c5dcc9","#bcd9d3","#e2e6bc","#d9d0b4","#ebd5b8","#cfe3d8"]},
  night:{name:"Night",dark:true,colors:["#a995d6","#7fb2c6","#86c9a4","#d9c36a","#e3a574","#e58f8f","#d98fb3"]}
};
const DEF_EMOJI=["🌸","🌿","🍀","☀️","🧺","🎈","🌙"];
let S=load("planner.settings",{theme:"pastel",colors:THEMES.pastel.colors.slice(),emoji:DEF_EMOJI.slice(),weekStart:1,
  lblBanner:"WEEKLY PLAN",lblFocus:"today's focus:",lblEvents:"Events",lblTasks:"Tasks"});
let D=load("planner.data",null);
const HOURS='<option value="">--</option>'+Array.from({length:24},(_,h)=>`<option>${String(h).padStart(2,"0")}</option>`).join("");
const MINS=Array.from({length:12},(_,i)=>`<option>${String(i*5).padStart(2,"0")}</option>`).join("");
function to24(t){const m=String(t||"").trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);if(!m)return"";let h=+m[1];const mi=m[2]||"00",ap=(m[3]||"").toUpperCase();if(ap==="PM"&&h<12)h+=12;if(ap==="AM"&&h===12)h=0;return String(h).padStart(2,"0")+":"+mi}
function sortEv(a){a.forEach(e=>{if(!/^\d\d:\d\d$/.test(e.time||""))e.time=to24(e.time)});a.sort((x,y)=>(x.time||"99:99").localeCompare(y.time||"99:99"))}
function parseKey(k){const[y,m,d]=k.split("-").map(Number);return new Date(y,m-1,d)}
let sel=key(new Date());
let view=startOf(new Date(),S.weekStart);
let mini=new Date(view.getFullYear(),view.getMonth(),1);

function load(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}}
function save(){try{localStorage.setItem("planner.settings",JSON.stringify(S));localStorage.setItem("planner.data",JSON.stringify(D))}catch(e){}}
function key(d){return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
function addDays(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x}
function startOf(d,ws){const x=new Date(d.getFullYear(),d.getMonth(),d.getDate());x.setDate(x.getDate()-((x.getDay()-ws+7)%7));return x}
function esc(s){return String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}
function day(k){return D.days[k]||(D.days[k]={focus:"",events:[],tasks:[]})}
function fmtLong(d){return MONTHS[d.getMonth()].slice(0,3)+" "+d.getDate()+", "+d.getFullYear()}

function seed(){D={days:{},todo:{}};save()}
if(!D)seed();

function pct(list){if(!list.length)return null;return Math.round(list.filter(x=>x.d).length/list.length*100)}

let editing=null;
function hOpts(v){return '<option value="">--</option>'+Array.from({length:24},(_,h)=>{const x=String(h).padStart(2,"0");return `<option ${x===v?"selected":""}>${x}</option>`}).join("")}
function mOpts(v){const l=Array.from({length:12},(_,i)=>String(i*5).padStart(2,"0"));if(v&&!l.includes(v)){l.push(v);l.sort()}return l.map(x=>`<option ${x===v?"selected":""}>${x}</option>`).join("")}
function moveOpts(k){return Array.from({length:7},(_,i)=>{const d=addDays(view,i),kk=key(d);return `<option value="${kk}" ${kk===k?"selected":""}>${DAYN[d.getDay()].slice(0,3)} ${d.getDate()}</option>`}).join("")+'<option value="next">Next week →</option>'}
const isEd=(type,k,i)=>editing&&editing.type===type&&editing.k===k&&editing.i===i;
function taskRow(t,j,k){
  if(isEd("t",k,j))return `<div class="task edit"><input class="ed" value="${esc(t.t)}"><button class="ok" type="button" data-save="1">✓</button><button class="no" type="button" data-cancel="1">✕</button><div class="row2">Move to <select class="mv">${moveOpts(k)}</select></div></div>`;
  return `<div class="task ${t.d?"done":""}" draggable="true" data-drag="t" data-i="${j}"><input type="checkbox" data-t="${j}" ${t.d?"checked":""}><span class="t" data-edit="t" data-i="${j}">${esc(t.t)}</span><button class="x" data-del="${j}" type="button">✕</button></div>`}
function evRow(e,j,k){
  if(isEd("ev",k,j)){const[h,m]=(e.time||":").split(":");return `<div class="ev edit"><select class="eh">${hOpts(h)}</select>:<select class="em">${mOpts(m||"00")}</select><input class="ed" value="${esc(e.t)}"><button class="ok" type="button" data-save="1">✓</button><button class="no" type="button" data-cancel="1">✕</button><div class="row2">Move to <select class="mv">${moveOpts(k)}</select></div></div>`}
  return `<div class="ev" draggable="true" data-drag="ev" data-edit="ev" data-i="${j}"><span>${esc(e.time)}</span>${esc(e.t)}<button class="x" data-ev="${j}">✕</button></div>`}
function render(){
  document.body.classList.toggle("dark",THEMES[S.theme]?.dark||false);
  const end=addDays(view,6);
  $("#title").textContent=fmtLong(view).toUpperCase()+" – "+fmtLong(end).toUpperCase();
  $("#wkStart").textContent=fmtLong(view);$("#wkEnd").textContent=fmtLong(end);
  $("#bannerTxt").textContent=S.lblBanner;
  const todayK=key(new Date());
  Object.values(D.days).forEach(x=>sortEv(x.events));
  let all=[];
  $("#board").innerHTML=Array.from({length:7},(_,i)=>{
    const d=addDays(view,i),k=key(d),dd=day(k),wd=d.getDay(),c=S.colors[wd],p=pct(dd.tasks);
    all=all.concat(dd.tasks);
    return `<section class="day ${k===todayK?"today":""} ${k===sel?"sel":""}" style="--c:${c}" data-k="${k}">
      <div class="dh">${S.emoji[wd]||""} ${DAYN[wd]}</div><div class="dd">${fmtLong(d)}</div>
      <div class="focus"><small>${esc(S.lblFocus)}</small><input data-f="focus" value="${esc(dd.focus)}" placeholder="…"></div>
      <div class="sec">${esc(S.lblEvents)}</div>
      ${dd.events.map((e,j)=>evRow(e,j,k)).join("")}
      <div class="addev"><select class="eh" title="Hour">${HOURS}</select>:<select class="em" title="Minute">${MINS}</select><input data-add="ev" placeholder="+ add event"><button type="button" data-addev="1">+</button></div>
      <div class="sec">${esc(S.lblTasks)}</div>
      <div class="prog"><div class="bar"><i style="width:${p||0}%"></i><em>${p==null?"":p+"%"}</em></div></div>
      ${dd.tasks.map((t,j)=>taskRow(t,j,k)).join("")}
      <input class="add" data-add="task" placeholder="+ add task">
    </section>`}).join("");
  const wp=pct(all);$("#wkBar").style.width=(wp||0)+"%";$("#wkPct").textContent=wp==null?"–":wp+"%";
  const tk=key(view),td=D.todo[tk]||(D.todo[tk]=[]);
  $("#todo").innerHTML=td.map((t,j)=>isEd("td","",j)?`<div class="task edit" style="--c:#cfc9bb"><input class="ed" value="${esc(t.t)}"><button class="ok" type="button" data-save="1">✓</button><button class="no" type="button" data-cancel="1">✕</button></div>`:`<div class="task ${t.d?"done":""}"><input type="checkbox" data-td="${j}" ${t.d?"checked":""}><span class="t" data-edit="td" data-i="${j}">${esc(t.t)}</span><button class="x" data-tdel="${j}" type="button">✕</button></div>`).join("")+`<input class="add" id="addTodo" style="--c:#cfc9bb" placeholder="+ add to weekly to-do">`;
  const tp=pct(td);$("#tdBar").style.width=(tp||0)+"%";$("#tdPct").textContent=tp==null?"–":tp+"%";
  renderCal();save();
  const ed=document.querySelector(".ed");if(ed&&editing&&!document.activeElement.classList.contains("ed")){ed.focus();ed.select()}
}
function renderCal(){
  const msel=$("#mSel"),ys=$("#ySel");
  if(!msel.options.length){MONTHS.forEach((m,i)=>msel.add(new Option(m,i)));for(let y=2024;y<=2032;y++)ys.add(new Option(y,y))}
  msel.value=mini.getMonth();ys.value=mini.getFullYear();
  const first=startOf(mini,S.weekStart),wsK=key(view),weK=key(addDays(view,6)),tk=key(new Date());
  let h=Array.from({length:7},(_,i)=>`<div class="dow">${DAYN[(S.weekStart+i)%7][0]}</div>`).join("");
  for(let i=0;i<42;i++){const d=addDays(first,i),k=key(d);
    h+=`<button data-d="${k}" class="${d.getMonth()!==mini.getMonth()?"out ":""}${k>=wsK&&k<=weK?"inweek ":""}${k===tk?"today ":""}${k===sel?"sel":""}">${d.getDate()}</button>`}
  $("#cal").innerHTML=h;
}
function go(d){sel=key(d);view=startOf(d,S.weekStart);mini=new Date(view.getFullYear(),view.getMonth(),1);render();$("#side").classList.remove("open");
  const el=document.querySelector(".day.sel");if(el)el.scrollIntoView({inline:"nearest",block:"nearest",behavior:"smooth"})}
function shift(n){go(addDays(parseKey(sel),7*n))}

$("#prev").onclick=()=>shift(-1);
$("#next").onclick=()=>shift(1);
$("#today").onclick=()=>go(new Date());
$("#menuBtn").onclick=()=>$("#side").classList.toggle("open");
$("#mPrev").onclick=()=>{mini=new Date(mini.getFullYear(),mini.getMonth()-1,1);renderCal()};
$("#mNext").onclick=()=>{mini=new Date(mini.getFullYear(),mini.getMonth()+1,1);renderCal()};
$("#mSel").onchange=e=>{mini=new Date(mini.getFullYear(),+e.target.value,1);renderCal()};
$("#ySel").onchange=e=>{mini=new Date(+e.target.value,mini.getMonth(),1);renderCal()};
$("#cal").onclick=e=>{const b=e.target.closest("[data-d]");if(b){const[y,m,d]=b.dataset.d.split("-").map(Number);go(new Date(y,m-1,d))}};

$("#board").addEventListener("change",e=>{
  const s=e.target.closest(".day");if(!s)return;const dd=day(s.dataset.k);
  if(e.target.dataset.t!=null){dd.tasks[+e.target.dataset.t].d=e.target.checked;render()}
  if(e.target.dataset.f==="focus"){dd.focus=e.target.value;save()}
});
$("#board").addEventListener("click",e=>{
  const s=e.target.closest(".day");if(!s)return;const dd=day(s.dataset.k);
  if(e.target.dataset.del!=null){e.preventDefault();dd.tasks.splice(+e.target.dataset.del,1);render()}
  if(e.target.dataset.ev!=null){dd.events.splice(+e.target.dataset.ev,1);render()}
});
function addEvent(sec){
  const inp=sec.querySelector("[data-add=ev]"),v=inp.value.trim();if(!v){inp.focus();return}
  const h=sec.querySelector(".eh").value,m=sec.querySelector(".em").value;
  const dd=day(sec.dataset.k);dd.events.push({time:h?h+":"+m:"",t:v});render();
}
$("#board").addEventListener("keydown",e=>{
  if(e.key!=="Enter"||!e.target.dataset.add)return;const sec=e.target.closest(".day");
  if(e.target.dataset.add==="ev"){addEvent(sec);return}
  const v=e.target.value.trim();if(!v)return;day(sec.dataset.k).tasks.push({t:v,d:false});render();
});
$("#board").addEventListener("click",e=>{if(e.target.dataset.addev){addEvent(e.target.closest(".day"))}});
$("#todo").addEventListener("change",e=>{if(e.target.dataset.td!=null){D.todo[key(view)][+e.target.dataset.td].d=e.target.checked;render()}});
$("#todo").addEventListener("click",e=>{if(e.target.dataset.tdel!=null){e.preventDefault();D.todo[key(view)].splice(+e.target.dataset.tdel,1);render()}});
$("#todo").addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.id==="addTodo"&&e.target.value.trim()){D.todo[key(view)].push({t:e.target.value.trim(),d:false});render()}});

// swipe on the top bar to change week (touch)
let sx=null;const tb=$("#topbar");
tb.addEventListener("touchstart",e=>{sx=e.touches[0].clientX},{passive:true});
tb.addEventListener("touchend",e=>{if(sx==null)return;const dx=e.changedTouches[0].clientX-sx;sx=null;if(Math.abs(dx)>60)shift(dx<0?1:-1)});
// keyboard arrows
document.addEventListener("keydown",e=>{if(e.target.tagName==="INPUT"||e.target.tagName==="SELECT")return;if(e.key==="ArrowLeft")shift(-1);if(e.key==="ArrowRight")shift(1)});

// edit / move / drag
function saveEdit(root){
  const ed=editing;if(!ed)return;
  const txt=root.querySelector(".ed").value.trim();
  if(ed.type==="td"){if(txt)D.todo[key(view)][ed.i].t=txt;editing=null;render();return}
  const dd=day(ed.k),list=ed.type==="t"?dd.tasks:dd.events,it=list[ed.i];
  if(txt)it.t=txt;
  if(ed.type==="ev"){const h=root.querySelector(".eh").value,m=root.querySelector(".em").value;it.time=h?h+":"+m:""}
  let to=root.querySelector(".mv").value;if(to==="next")to=key(addDays(parseKey(ed.k),7));
  if(to!==ed.k){list.splice(ed.i,1);const t=day(to);(ed.type==="t"?t.tasks:t.events).push(it)}
  editing=null;render();
}
document.addEventListener("click",e=>{
  const tg=e.target;
  if(tg.closest("[data-save]")){saveEdit(tg.closest(".edit"));return}
  if(tg.closest("[data-cancel]")){editing=null;render();return}
  const ed=tg.closest("[data-edit]");
  if(ed&&!tg.closest(".x")&&!tg.closest(".edit")){
    const sec=ed.closest(".day");editing={type:ed.dataset.edit,k:sec?sec.dataset.k:"",i:+ed.dataset.i};render();
  }
});
document.addEventListener("keydown",e=>{
  if(!e.target.classList||!e.target.classList.contains("ed"))return;
  if(e.key==="Enter")saveEdit(e.target.closest(".edit"));
  if(e.key==="Escape"){editing=null;render()}
});
$("#board").addEventListener("dragstart",e=>{
  const r=e.target.closest&&e.target.closest("[data-drag]");if(!r)return;
  e.dataTransfer.setData("text/plain",r.closest(".day").dataset.k+"|"+r.dataset.drag+"|"+r.dataset.i);e.dataTransfer.effectAllowed="move";
});
$("#board").addEventListener("dragover",e=>{const d=e.target.closest(".day");if(d){e.preventDefault();document.querySelectorAll(".day.over").forEach(x=>x!==d&&x.classList.remove("over"));d.classList.add("over")}});
$("#board").addEventListener("dragleave",e=>{if(!e.relatedTarget||!e.relatedTarget.closest||!e.relatedTarget.closest(".board"))document.querySelectorAll(".day.over").forEach(x=>x.classList.remove("over"))});
$("#board").addEventListener("drop",e=>{
  const d=e.target.closest(".day");if(!d)return;e.preventDefault();
  const[from,type,i]=e.dataTransfer.getData("text/plain").split("|");const to=d.dataset.k;
  if(!from||from===to){render();return}
  const a=day(from),b=day(to),la=type==="t"?a.tasks:a.events,lb=type==="t"?b.tasks:b.events;
  lb.push(la.splice(+i,1)[0]);render();
});

// customize dialog
function buildDlg(){
  $("#themes").innerHTML=Object.entries(THEMES).map(([id,t])=>`<div class="theme ${S.theme===id?"on":""}" data-th="${id}"><div>${t.colors.slice(0,5).map(c=>`<i style="background:${c}"></i>`).join("")}</div><small>${t.name}</small></div>`).join("");
  const order=[1,2,3,4,5,6,0];
  $("#dayRows").innerHTML=order.map(w=>`<div class="row"><span>${DAYN[w].slice(0,3)}</span><input type="color" data-c="${w}" value="${S.colors[w]}"><input type="text" data-e="${w}" value="${S.emoji[w]}" maxlength="4" placeholder="emoji"></div>`).join("");
  $("#wsSel").innerHTML=DAYN.map((n,i)=>`<option value="${i}" ${S.weekStart===i?"selected":""}>${n}</option>`).join("");
  $("#lblBanner").value=S.lblBanner;$("#lblFocus").value=S.lblFocus;$("#lblEvents").value=S.lblEvents;$("#lblTasks").value=S.lblTasks;
}
$("#cust").onclick=()=>{buildDlg();$("#dlg").showModal()};
$("#dlg").addEventListener("click",e=>{const t=e.target.closest("[data-th]");if(t){S.theme=t.dataset.th;S.colors=THEMES[S.theme].colors.slice();render();buildDlg()}});
$("#dlg").addEventListener("input",e=>{
  const t=e.target;
  if(t.dataset.c!=null)S.colors[+t.dataset.c]=t.value;
  if(t.dataset.e!=null)S.emoji[+t.dataset.e]=t.value;
  if(t.id==="lblBanner")S.lblBanner=t.value;if(t.id==="lblFocus")S.lblFocus=t.value;
  if(t.id==="lblEvents")S.lblEvents=t.value;if(t.id==="lblTasks")S.lblTasks=t.value;
  if(t.id==="wsSel"){S.weekStart=+t.value;view=startOf(parseKey(sel),S.weekStart);mini=new Date(view.getFullYear(),view.getMonth(),1)}
  render();
});
render();

// make it installable + work offline
if("serviceWorker" in navigator && location.protocol.startsWith("http")){
  window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
}

