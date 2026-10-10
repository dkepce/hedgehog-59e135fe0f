/* Hedgehog — weekly planner. Plain JS, no build step. Data lives in this browser (localStorage). */
const $=s=>document.querySelector(s);
const DAYN=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];
const THEMES={
  pastel:{name:"Pastel rainbow",dark:false,colors:["#dccbe3","#b9d6dc","#c4e6c8","#eadc8e","#f6c7a0","#f7b2a6","#f3adb9"]},
  lavender:{name:"Lavender",dark:false,colors:["#d8cdf0","#cdd6f5","#d6e9f7","#e4d3f2","#e9c9ee","#f3c9e3","#d1c4ea"]},
  sage:{name:"Sage",dark:false,colors:["#d6e2c8","#c5dcc9","#bcd9d3","#e2e6bc","#d9d0b4","#ebd5b8","#cfe3d8"]},
  night:{name:"Night",dark:true,colors:["#a995d6","#7fb2c6","#86c9a4","#d9c36a","#e3a574","#e58f8f","#d98fb3"]},
  ocean:{name:"Ocean",dark:false,colors:["#c3dcef","#b5e0e6","#bfe7d9","#cfe4f7","#c9d3f0","#b7d7e8","#d3e6ee"]},
  sunset:{name:"Sunset",dark:false,colors:["#f9d3b4","#f8c3a6","#f6b3a8","#f4bcc8","#f9dfa5","#f7c9a0","#eebfd0"]},
  candy:{name:"Cotton candy",dark:false,colors:["#f9c6de","#c9e4f9","#d5f0d0","#fbe9b0","#e3d1f5","#fcd0c0","#bfeee6"]},
  berry:{name:"Berry",dark:false,colors:["#e6c1d8","#d9c0e6","#f0bfc9","#c9c3ea","#eec0dc","#f5c8d0","#d6bfe0"]},
  autumn:{name:"Autumn",dark:false,colors:["#e6cfae","#d9d2a0","#c6d3a8","#e8bf9e","#d8b9a5","#cdbfa3","#e3c98f"]},
  slate:{name:"Slate",dark:false,colors:["#d9dde3","#cfd6dd","#dcdad5","#d3d8d6","#dcd5d0","#d5d9e0","#e0dde4"]},
  midnight:{name:"Midnight",dark:true,colors:["#7ea6e0","#6fc1d4","#7dd3b0","#e0c878","#e6a67a","#e68f9a","#b496e0"]},
  forest:{name:"Forest",dark:true,colors:["#8fc08a","#6fb8a0","#a8c97a","#d6c473","#d9a36a","#c98a7a","#9bb5a0"]}
};
const DEF_EMOJI=["🌸","🌿","🍀","☀️","🧺","🎈","🌙"];
const DEFAULT_S={theme:"pastel",colors:THEMES.pastel.colors.slice(),emoji:DEF_EMOJI.slice(),weekStart:1,
  lblBanner:"HEDGEHOG",lblFocus:"today's focus:",lblEvents:"Events",lblTasks:"Tasks",labUrl:"https://dkepce.github.io/labgorilla/"};
const KINDS=[["daily","Every day"],["weekdays","Every weekday (Mon–Fri)"],["weekly","Every week"],["biweekly","Every 2 weeks"],["monthly","Every month (same date)"],["yearly","Every year"]];

/* ---------- storage ---------- */
function load(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}}
// (older builds used the "planner.*" keys — read them once so nothing is lost)
let S=Object.assign({},DEFAULT_S,load("hedgehog.settings",null)||load("planner.settings",null)||{});
if(S.lblBanner==="WEEKLY PLAN")S.lblBanner="HEDGEHOG";
let D=load("hedgehog.data",null)||load("planner.data",null)||{};

/* ---------- small helpers ---------- */
const uid=()=>Math.random().toString(36).slice(2,9);
function key(d){return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
function parseKey(k){const[y,m,d]=k.split("-").map(Number);return new Date(y,m-1,d)}
function addDays(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x}
function startOf(d,ws){const x=new Date(d.getFullYear(),d.getMonth(),d.getDate());x.setDate(x.getDate()-((x.getDay()-ws+7)%7));return x}
function esc(s){return String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}
function fmtLong(d){return MONTHS[d.getMonth()].slice(0,3)+" "+d.getDate()+", "+d.getFullYear()}
function pct(list){if(!list.length)return null;return Math.round(list.filter(x=>x.d).length/list.length*100)}
function to24(t){const m=String(t||"").trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);if(!m)return"";let h=+m[1];const mi=m[2]||"00",ap=(m[3]||"").toUpperCase();if(ap==="PM"&&h<12)h+=12;if(ap==="AM"&&h===12)h=0;return String(h).padStart(2,"0")+":"+mi}
function hOpts(v){return '<option value="">--</option>'+Array.from({length:24},(_,h)=>{const x=String(h).padStart(2,"0");return `<option ${x===v?"selected":""}>${x}</option>`}).join("")}
function mOpts(v){const l=Array.from({length:12},(_,i)=>String(i*5).padStart(2,"0"));if(v&&!l.includes(v)){l.push(v);l.sort()}return l.map(x=>`<option ${x===v?"selected":""}>${x}</option>`).join("")}

/* make sure the data has every part the app expects (also runs after a restore) */
function fixData(){
  D.days=D.days||{};D.todo=D.todo||{};D.series=D.series||[];D.habits=D.habits||[];D.hlog=D.hlog||{};
  Object.values(D.days).forEach(x=>{x.events=x.events||[];x.tasks=x.tasks||[];x.events.forEach(e=>{if(!/^\d\d:\d\d$/.test(e.time||""))e.time=to24(e.time)})});
  D.series.forEach(s=>{s.skip=s.skip||[];s.over=s.over||{};s.days=s.days||[]});
}
fixData();

/* A real change bumps savedAt; re-rendering the same data does not. */
let savedAt=0;try{savedAt=+localStorage.getItem("hedgehog.savedAt")||0}catch(e){}
let lastSer=JSON.stringify({S,D});
function payload(){return {app:"hedgehog",version:2,saved:new Date(savedAt||Date.now()).toISOString(),settings:S,data:D}}
function persistLocal(){try{localStorage.setItem("hedgehog.settings",JSON.stringify(S));localStorage.setItem("hedgehog.data",JSON.stringify(D));localStorage.setItem("hedgehog.savedAt",String(savedAt))}catch(e){}}
function save(){
  const ser=JSON.stringify({S,D});
  if(ser===lastSer)return;
  lastSer=ser;savedAt=Date.now();persistLocal();scheduleFileWrite();
}

function day(k){return D.days[k]||(D.days[k]={focus:"",events:[],tasks:[]})}
const todoOf=()=>D.todo[key(view)]||(D.todo[key(view)]=[]);
function peek(k){return D.days[k]||{focus:"",events:[],tasks:[]}}

/* ---------- lab book link (read-only) ----------
   She links LabGorilla.lbk once (same idea as the .hdg file). Hedgehog only READS it and draws the
   experiments + planned lab events on their days. Nothing is written into her planner data. */
const lab={handle:null,state:"none",items:load("hedgehog.lab",{})};
/* ---------- repeating events ---------- */
/* Kalenderwoche (ISO 8601): week 1 is the week with the first Thursday of the year */
function isoWeek(d){const t=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));t.setUTCDate(t.getUTCDate()+4-(t.getUTCDay()||7));
  return Math.ceil(((t-Date.UTC(t.getUTCFullYear(),0,1))/864e5+1)/7)}
function lastDom(d){return new Date(d.getFullYear(),d.getMonth()+1,0).getDate()}
function occurs(s,k){
  if(k<s.start||(s.until&&k>s.until)||s.skip.includes(k))return false;
  const d=parseKey(k),st=parseKey(s.start),dow=d.getDay();
  const days=s.days&&s.days.length?s.days:[st.getDay()];
  switch(s.kind){
    case"daily":return true;
    case"weekdays":return dow>=1&&dow<=5;
    case"weekly":return days.includes(dow);
    case"biweekly":return Math.round((startOf(d,1)-startOf(st,1))/6048e5)%2===0&&days.includes(dow);
    case"monthly":return d.getDate()===Math.min(st.getDate(),lastDom(d));
    case"yearly":return d.getMonth()===st.getMonth()&&d.getDate()===Math.min(st.getDate(),lastDom(d));
  }
  return false;
}
/* every event shown on a day: its own events + occurrences of repeating series, sorted by time */
function dayEvents(k){
  const a=peek(k).events.map((e,i)=>({src:"o",ref:"o"+i,t:e.t,time:e.time||""}));
  D.series.forEach(s=>{if(occurs(s,k)){const o=s.over[k]||s;a.push({src:"s",ref:"s"+s.id,sid:s.id,t:o.t,time:o.time||""})}});
  (lab.items[k]||[]).forEach(x=>a.push({src:"l",ref:"l",t:x.t,time:x.time||"",href:x.code?"#/entry/"+encodeURIComponent(x.code):"#/calendar/"+k}));   // read-only lab book items
  return a.sort((x,y)=>(x.time||"99:99").localeCompare(y.time||"99:99"));
}

/* ---------- state ---------- */
let sel=key(new Date());
let view=startOf(new Date(),S.weekStart);
let mini=new Date(view.getFullYear(),view.getMonth(),1);
let editing=null;   // {type:"t"|"ev"|"td"|"h", k, ref}
const isEd=(type,k,ref)=>editing&&editing.type===type&&editing.k===k&&editing.ref===String(ref);

/* ---------- rendering ---------- */
function moveOpts(k,sel0){sel0=sel0||k;return Array.from({length:7},(_,i)=>{const d=addDays(view,i),kk=key(d);return `<option value="${kk}" ${kk===sel0?"selected":""}>${DAYN[d.getDay()].slice(0,3)} ${d.getDate()}</option>`}).join("")+'<option value="next">Next week →</option>'}
function moveBox(k,extra){
  const dup=editing&&editing.mode==="copy";
  const nk=key(addDays(parseKey(k),1)),def=dup&&nk<=key(addDays(view,6))?nk:k;   // duplicating? suggest the next day
  return `<div class="row2"><span class="seg"><label><input type="radio" name="mode" value="move" ${dup?"":"checked"}> Move</label><label><input type="radio" name="mode" value="copy" ${dup?"checked":""}> Duplicate</label></span> to <select class="mv">${moveOpts(k,def)}</select></div>
  <div class="row2 hintline">Duplicate keeps the original where it is.</div>${extra||""}`;
}
function taskRow(t,j,k){
  if(isEd("t",k,j))return `<div class="task edit"><input class="ed" value="${esc(t.t)}"><button class="ok" type="button" data-save="1">✓</button><button class="no" type="button" data-cancel="1">✕</button>${moveBox(k)}</div>`;
  return `<div class="task ${t.d?"done":""}" draggable="true" data-drag="t" data-ref="${j}"><input type="checkbox" data-t="${j}" ${t.d?"checked":""}><span class="t" data-edit="t" data-ref="${j}">${esc(t.t)}</span><button class="x dup" data-dup="t|${j}" type="button" title="Duplicate">⧉</button><button class="x" data-del="${j}" type="button" title="Delete">✕</button></div>`}
function evRow(e,k){
  if(isEd("ev",k,e.ref)){
    const[h,m]=(e.time||":").split(":");
    const ser=e.src==="s"?`<div class="row2"><button class="lnk" type="button" data-series="${e.sid}">↻ Edit the whole series…</button></div>`:"";
    return `<div class="ev edit"><select class="eh">${hOpts(h)}</select>:<select class="em">${mOpts(m||"00")}</select><input class="ed" value="${esc(e.t)}"><button class="ok" type="button" data-save="1">✓</button><button class="no" type="button" data-cancel="1">✕</button>${moveBox(k,ser)}</div>`}
  if(e.src==="l")return `<div class="ev lab" title="From your lab book (read-only)"><span>${esc(e.time)}</span>🧪 ${esc(e.t)}<a class="labl" href="${esc((S.labUrl||"").replace(/#.*$/,"")+e.href)}" target="_blank" rel="noopener" title="Open in Lab book">↗</a></div>`;
  return `<div class="ev" draggable="true" data-drag="ev" data-edit="ev" data-ref="${e.ref}"><span>${esc(e.time)}</span>${esc(e.t)}${e.src==="s"?'<b class="rep" title="Repeating event">↻</b>':""}<button class="x dup" data-dup="ev|${e.ref}" type="button" title="Duplicate">⧉</button><button class="x" data-evdel="${e.ref}" type="button" title="${e.src==="s"?"Remove only this one":"Delete"}">✕</button></div>`}

function render(){
  document.body.classList.toggle("dark",THEMES[S.theme]?.dark||false);
  const end=addDays(view,6);
  $("#title").innerHTML=`<span class="kw" title="Kalenderwoche">KW ${isoWeek(addDays(view,3))}</span> `+esc(fmtLong(view).toUpperCase()+" – "+fmtLong(end).toUpperCase());
  $("#wkStart").textContent=fmtLong(view);$("#wkEnd").textContent=fmtLong(end);
  $("#bannerTxt").textContent=S.lblBanner;
  const todayK=key(new Date());
  let all=[];
  $("#board").innerHTML=Array.from({length:7},(_,i)=>{
    const d=addDays(view,i),k=key(d),dd=peek(k),wd=d.getDay(),c=S.colors[wd],p=pct(dd.tasks);
    all=all.concat(dd.tasks);
    return `<section class="day ${k===todayK?"today":""} ${k===sel?"sel":""}" style="--c:${c}" data-k="${k}">
      <div class="dh">${S.emoji[wd]||""} ${DAYN[wd]}</div><div class="dd">${fmtLong(d)}</div>
      <div class="focus"><small>${esc(S.lblFocus)}</small><input data-f="focus" value="${esc(dd.focus)}" placeholder="…"></div>
      <div class="sec">${esc(S.lblEvents)}</div>
      ${dayEvents(k).map(e=>evRow(e,k)).join("")}
      <div class="addev"><select class="eh" title="Hour">${hOpts("")}</select>:<select class="em" title="Minute">${mOpts("00")}</select><input data-add="ev" placeholder="+ add event"><button type="button" data-addev="1" title="Add event">+</button><button type="button" class="rp" data-repeat="1" title="Add a repeating event…">↻</button></div>
      <div class="sec">${esc(S.lblTasks)}</div>
      <div class="prog"><div class="bar"><i style="width:${p||0}%"></i><em>${p==null?"":p+"%"}</em></div></div>
      ${dd.tasks.map((t,j)=>taskRow(t,j,k)).join("")}
      <input class="add" data-add="task" placeholder="+ add task">
    </section>`}).join("");
  const wp=pct(all);$("#wkBar").style.width=(wp||0)+"%";$("#wkPct").textContent=wp==null?"–":wp+"%";
  const td=D.todo[key(view)]||[];
  $("#todo").innerHTML=td.map((t,j)=>isEd("td","",j)?`<div class="task edit" style="--c:#cfc9bb"><input class="ed" value="${esc(t.t)}"><button class="ok" type="button" data-save="1">✓</button><button class="no" type="button" data-cancel="1">✕</button></div>`:`<div class="task ${t.d?"done":""}"><input type="checkbox" data-td="${j}" ${t.d?"checked":""}><span class="t" data-edit="td" data-ref="${j}">${esc(t.t)}</span><button class="x" data-tdel="${j}" type="button">✕</button></div>`).join("")+`<input class="add" id="addTodo" style="--c:#cfc9bb" placeholder="+ add to weekly to-do">`;
  const tp=pct(td);$("#tdBar").style.width=(tp||0)+"%";$("#tdPct").textContent=tp==null?"–":tp+"%";
  renderHabits();renderCal();save();renderChip();
  const ed=document.querySelector(".ed");if(ed&&editing&&!document.activeElement.classList.contains("ed")){ed.focus();ed.select()}
}
function renderHabits(){
  const days=Array.from({length:7},(_,i)=>addDays(view,i));
  let h=`<div class="hgrid hhead"><span></span>${days.map(d=>`<span class="hd ${key(d)===sel?"sel":""}" style="--c:${S.colors[d.getDay()]}">${DAYN[d.getDay()][0]}</span>`).join("")}<span></span></div>`;
  let total=0;
  D.habits.forEach(hb=>{
    const log=days.map(d=>!!(D.hlog[key(d)]||{})[hb.id]),n=log.filter(Boolean).length;total+=n;
    if(isEd("h","",hb.id))h+=`<div class="task edit" style="--c:#cfc9bb"><input class="ed" value="${esc(hb.name)}"><button class="ok" type="button" data-save="1">✓</button><button class="no" type="button" data-cancel="1">✕</button><button class="no" type="button" data-hdel="${hb.id}" title="Delete this habit">🗑</button></div>`;
    else h+=`<div class="hgrid"><span class="hn" data-edit="h" data-ref="${hb.id}" title="Click to rename or delete">${esc(hb.name)}</span>${days.map((d,i)=>`<label class="hc" style="--c:${S.colors[d.getDay()]}"><input type="checkbox" data-hb="${hb.id}|${key(d)}" ${log[i]?"checked":""}><i></i></label>`).join("")}<b class="hp">${Math.round(n/7*100)}%</b></div>`;
  });
  h+=`<input class="add" id="addHabit" style="--c:#cfc9bb" placeholder="+ add a habit">`;
  $("#habits").innerHTML=h;
  const p=D.habits.length?Math.round(total/(D.habits.length*7)*100):null;
  $("#hbBar").style.width=(p||0)+"%";$("#hbPct").textContent=p==null?"–":p+"%";
}
function renderCal(){
  const msel=$("#mSel"),ys=$("#ySel");
  if(!msel.options.length){MONTHS.forEach((m,i)=>msel.add(new Option(m,i)));for(let y=2024;y<=2035;y++)ys.add(new Option(y,y))}
  msel.value=mini.getMonth();ys.value=mini.getFullYear();
  const first=startOf(mini,S.weekStart),wsK=key(view),weK=key(addDays(view,6)),tk=key(new Date());
  let h='<div class="dow kwh">KW</div>'+Array.from({length:7},(_,i)=>`<div class="dow">${DAYN[(S.weekStart+i)%7][0]}</div>`).join("");
  for(let i=0;i<42;i++){const d=addDays(first,i),k=key(d);
    if(i%7===0){const kw=isoWeek(addDays(d,3));h+=`<button class="kwn ${k===wsK?"inweek":""}" data-d="${k}" title="Go to KW ${kw}">${kw}</button>`}
    h+=`<button data-d="${k}" class="${d.getMonth()!==mini.getMonth()?"out ":""}${k>=wsK&&k<=weK?"inweek ":""}${k===tk?"today ":""}${k===sel?"sel":""}">${d.getDate()}</button>`}
  $("#cal").innerHTML=h;
  $("#side").style.setProperty("--ac",S.colors[parseKey(sel).getDay()]);document.documentElement.style.setProperty("--ac",S.colors[parseKey(sel).getDay()]);   // calendar takes the active day's color
}
function go(d){sel=key(d);view=startOf(d,S.weekStart);mini=new Date(view.getFullYear(),view.getMonth(),1);render();$("#side").classList.remove("open");
  const el=document.querySelector(".day.sel");if(el)el.scrollIntoView({inline:"nearest",block:"nearest",behavior:"smooth"})}
function shift(n){go(addDays(parseKey(sel),7*n))}

/* ---------- navigation ---------- */
$("#prev").onclick=()=>shift(-1);
$("#next").onclick=()=>shift(1);
$("#today").onclick=()=>go(new Date());
$("#menuBtn").onclick=()=>$("#side").classList.toggle("open");
$("#mPrev").onclick=()=>{mini=new Date(mini.getFullYear(),mini.getMonth()-1,1);renderCal()};
$("#mNext").onclick=()=>{mini=new Date(mini.getFullYear(),mini.getMonth()+1,1);renderCal()};
$("#mSel").onchange=e=>{mini=new Date(mini.getFullYear(),+e.target.value,1);renderCal()};
$("#ySel").onchange=e=>{mini=new Date(+e.target.value,mini.getMonth(),1);renderCal()};
$("#cal").onclick=e=>{const b=e.target.closest("[data-d]");if(b)go(parseKey(b.dataset.d))};
let sx=null;const tb=$("#topbar");
tb.addEventListener("touchstart",e=>{sx=e.touches[0].clientX},{passive:true});
tb.addEventListener("touchend",e=>{if(sx==null)return;const dx=e.changedTouches[0].clientX-sx;sx=null;if(Math.abs(dx)>60)shift(dx<0?1:-1)});
document.addEventListener("keydown",e=>{if(["INPUT","SELECT","TEXTAREA"].includes(e.target.tagName)||document.querySelector("dialog[open]"))return;if(e.key==="ArrowLeft")shift(-1);if(e.key==="ArrowRight")shift(1)});

/* ---------- board: tasks, events ---------- */
$("#board").addEventListener("change",e=>{
  const s=e.target.closest(".day");if(!s)return;const dd=day(s.dataset.k);
  if(e.target.dataset.t!=null){dd.tasks[+e.target.dataset.t].d=e.target.checked;render()}
  if(e.target.dataset.f==="focus"){dd.focus=e.target.value;save()}
});
function delEvent(k,ref){
  if(ref[0]==="o")day(k).events.splice(+ref.slice(1),1);
  else D.series.find(s=>s.id===ref.slice(1)).skip.push(k);   // repeating: remove just this day
  render();
}
function addEvent(sec){
  const inp=sec.querySelector("[data-add=ev]"),v=inp.value.trim();if(!v){inp.focus();return}
  const h=sec.querySelector(".eh").value,m=sec.querySelector(".em").value;
  day(sec.dataset.k).events.push({time:h?h+":"+m:"",t:v});render();
}
$("#board").addEventListener("click",e=>{
  const s=e.target.closest(".day");if(!s)return;const k=s.dataset.k,tg=e.target;
  if(tg.dataset.del!=null){day(k).tasks.splice(+tg.dataset.del,1);render()}
  else if(tg.dataset.evdel){delEvent(k,tg.dataset.evdel)}
  else if(tg.dataset.addev){addEvent(s)}
  else if(tg.dataset.repeat){
    const h=s.querySelector(".eh").value,m=s.querySelector(".em").value;
    openSeries({t:s.querySelector("[data-add=ev]").value.trim(),time:h?h+":"+m:"",start:k,kind:"weekly",days:[parseKey(k).getDay()],until:""});
  }
  else if(tg.dataset.series){editing=null;openSeries(D.series.find(x=>x.id===tg.dataset.series))}
  else if(tg.dataset.dup){const[type,ref]=tg.dataset.dup.split("|");editing={type,k,ref,mode:"copy"};render()}
});
$("#board").addEventListener("keydown",e=>{
  if(e.key!=="Enter"||!e.target.dataset.add)return;const sec=e.target.closest(".day");
  if(e.target.dataset.add==="ev"){addEvent(sec);return}
  const v=e.target.value.trim();if(!v)return;day(sec.dataset.k).tasks.push({t:v,d:false});render();
});

/* weekly to-do */
$("#todo").addEventListener("change",e=>{if(e.target.dataset.td!=null){D.todo[key(view)][+e.target.dataset.td].d=e.target.checked;render()}});
$("#todo").addEventListener("click",e=>{if(e.target.dataset.tdel!=null){D.todo[key(view)].splice(+e.target.dataset.tdel,1);render()}});
$("#todo").addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.id==="addTodo"&&e.target.value.trim()){todoOf().push({t:e.target.value.trim(),d:false});render()}});

/* habits */
$("#habits").addEventListener("change",e=>{
  const v=e.target.dataset.hb;if(!v)return;const[id,k]=v.split("|");
  const l=D.hlog[k]||(D.hlog[k]={});if(e.target.checked)l[id]=true;else delete l[id];render();
});
$("#habits").addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.id==="addHabit"&&e.target.value.trim()){D.habits.push({id:uid(),name:e.target.value.trim()});render()}});
$("#habits").addEventListener("click",e=>{
  const id=e.target.dataset.hdel;
  if(id&&confirm("Delete this habit and its history?")){D.habits=D.habits.filter(h=>h.id!==id);Object.values(D.hlog).forEach(l=>delete l[id]);editing=null;render()}
});

/* ---------- edit / move / copy / drag ---------- */
function saveEdit(root){
  const ed=editing;if(!ed)return;
  const txt=root.querySelector(".ed").value.trim();
  if(ed.type==="td"){if(txt)D.todo[key(view)][+ed.ref].t=txt;editing=null;render();return}
  if(ed.type==="h"){const h=D.habits.find(x=>x.id===ed.ref);if(h&&txt)h.name=txt;editing=null;render();return}
  const copy=root.querySelector("input[name=mode]:checked").value==="copy";
  let to=root.querySelector(".mv").value;if(to==="next")to=key(addDays(parseKey(ed.k),7));
  const dd=day(ed.k);
  if(ed.type==="t"){
    const it=dd.tasks[+ed.ref];
    if(copy)day(to).tasks.push({t:txt||it.t,d:false});
    else{if(txt)it.t=txt;if(to!==ed.k){dd.tasks.splice(+ed.ref,1);day(to).tasks.push(it)}}
  }else{
    const h=root.querySelector(".eh").value,m=root.querySelector(".em").value,time=h?h+":"+m:"";
    if(ed.ref[0]==="o"){
      const i=+ed.ref.slice(1),it=dd.events[i];
      if(copy)day(to).events.push({t:txt||it.t,time});
      else{if(txt)it.t=txt;it.time=time;if(to!==ed.k){dd.events.splice(i,1);day(to).events.push(it)}}
    }else{
      const s=D.series.find(x=>x.id===ed.ref.slice(1)),cur=s.over[ed.k]||s,t=txt||cur.t;
      if(copy)day(to).events.push({t,time});
      else if(to===ed.k)s.over[ed.k]={t,time};                       // change only this one day
      else{s.skip.push(ed.k);day(to).events.push({t,time})}          // moved away: becomes a normal event
    }
  }
  editing=null;render();
}
document.addEventListener("click",e=>{
  const tg=e.target;
  if(tg.closest("[data-save]")){saveEdit(tg.closest(".edit"));return}
  if(tg.closest("[data-cancel]")){editing=null;render();return}
  const ed=tg.closest("[data-edit]");
  if(ed&&!tg.closest(".x")&&!tg.closest(".edit")){
    const sec=ed.closest(".day");editing={type:ed.dataset.edit,k:sec?sec.dataset.k:"",ref:ed.dataset.ref};render();
  }
});
document.addEventListener("keydown",e=>{
  if(!e.target.classList||!e.target.classList.contains("ed"))return;
  if(e.key==="Enter")saveEdit(e.target.closest(".edit"));
  if(e.key==="Escape"){editing=null;render()}
});
$("#board").addEventListener("dragstart",e=>{
  const r=e.target.closest&&e.target.closest("[data-drag]");if(!r)return;
  e.dataTransfer.setData("text/plain",r.closest(".day").dataset.k+"|"+r.dataset.drag+"|"+r.dataset.ref);e.dataTransfer.effectAllowed="copyMove";
});
$("#board").addEventListener("dragover",e=>{const d=e.target.closest(".day");if(d){e.preventDefault();document.querySelectorAll(".day.over").forEach(x=>x!==d&&x.classList.remove("over"));d.classList.add("over")}});
$("#board").addEventListener("dragleave",e=>{if(!e.relatedTarget||!e.relatedTarget.closest||!e.relatedTarget.closest(".board"))document.querySelectorAll(".day.over").forEach(x=>x.classList.remove("over"))});
$("#board").addEventListener("drop",e=>{
  const d=e.target.closest(".day");if(!d)return;e.preventDefault();
  const[from,type,ref]=e.dataTransfer.getData("text/plain").split("|"),to=d.dataset.k,copy=e.altKey;   // hold Option/Alt = copy
  if(!from||from===to){render();return}
  if(type==="t"){
    const it=day(from).tasks[+ref];
    if(copy)day(to).tasks.push({t:it.t,d:false});else day(to).tasks.push(day(from).tasks.splice(+ref,1)[0]);
  }else if(ref[0]==="o"){
    const it=day(from).events[+ref.slice(1)];
    if(copy)day(to).events.push({t:it.t,time:it.time});else day(to).events.push(day(from).events.splice(+ref.slice(1),1)[0]);
  }else{
    const s=D.series.find(x=>x.id===ref.slice(1)),cur=s.over[from]||s;
    day(to).events.push({t:cur.t,time:cur.time||""});if(!copy)s.skip.push(from);
  }
  render();
});

/* ---------- repeating-event dialog ---------- */
let seriesId=null;
$("#sKind").innerHTML=KINDS.map(([v,n])=>`<option value="${v}">${n}</option>`).join("");
$("#sH").innerHTML=hOpts("");$("#sM").innerHTML=mOpts("00");
$("#sDays").innerHTML=[1,2,3,4,5,6,0].map(w=>`<label class="chip"><input type="checkbox" value="${w}"><span>${DAYN[w].slice(0,2)}</span></label>`).join("");
function syncSeriesForm(){
  const k=$("#sKind").value;$("#sDaysRow").style.display=(k==="weekly"||k==="biweekly")?"":"none";
}
$("#sKind").onchange=syncSeriesForm;
function openSeries(s){
  seriesId=s.id||null;
  $("#sHead").textContent=seriesId?"↻ Edit repeating event":"↻ New repeating event";
  $("#sTitle").value=s.t||"";
  const[h,m]=(s.time||":").split(":");$("#sH").innerHTML=hOpts(h);$("#sM").innerHTML=mOpts(m||"00");
  $("#sStart").value=s.start;$("#sKind").value=s.kind;
  $("#sDays").querySelectorAll("input").forEach(i=>i.checked=(s.days||[]).includes(+i.value));
  document.querySelector(`input[name=sEnd][value=${s.until?"until":"never"}]`).checked=true;$("#sUntil").value=s.until||"";
  $("#sDelete").style.display=seriesId?"":"none";
  syncSeriesForm();$("#dlgSeries").showModal();
}
$("#sUntil").addEventListener("focus",()=>document.querySelector("input[name=sEnd][value=until]").checked=true);
$("#sCancel").onclick=()=>$("#dlgSeries").close();
$("#sDelete").onclick=()=>{if(confirm("Delete this repeating event everywhere?")){D.series=D.series.filter(s=>s.id!==seriesId);$("#dlgSeries").close();editing=null;render()}};
$("#sSave").onclick=()=>{
  const t=$("#sTitle").value.trim(),start=$("#sStart").value;
  if(!t){$("#sTitle").focus();return}
  if(!start){$("#sStart").focus();return}
  const h=$("#sH").value,m=$("#sM").value,kind=$("#sKind").value;
  let days=[...$("#sDays").querySelectorAll("input:checked")].map(i=>+i.value);
  if((kind==="weekly"||kind==="biweekly")&&!days.length)days=[parseKey(start).getDay()];
  const until=document.querySelector("input[name=sEnd]:checked").value==="until"?$("#sUntil").value:"";
  if(until&&until<start){$("#sUntil").focus();$("#sErr").textContent="The end date is before the start date.";return}
  $("#sErr").textContent="";
  const o={t,time:h?h+":"+m:"",kind,days,start,until};
  if(seriesId)Object.assign(D.series.find(s=>s.id===seriesId),o);else D.series.push(Object.assign({id:uid(),skip:[],over:{}},o));
  $("#dlgSeries").close();editing=null;render();
};

/* ---------- PDF export (print dialog → "Save as PDF") ---------- */
const xMode=()=>document.querySelector("input[name=xm]:checked").value;
function unitsFor(){
  const isDay=xMode()==="day";
  if(document.querySelector("input[name=xr]:checked").value==="this")return[isDay?parseKey(sel):view];
  let a=$("#xFrom").value,b=$("#xTo").value;if(!a||!b)return[];if(b<a)[a,b]=[b,a];
  const out=[];
  if(isDay){for(let d=parseKey(a),last=parseKey(b);d<=last&&out.length<62;d=addDays(d,1))out.push(d)}
  else for(let w=startOf(parseKey(a),S.weekStart),last=startOf(parseKey(b),S.weekStart);w<=last&&out.length<60;w=addDays(w,7))out.push(w);
  return out;
}
function syncExportForm(){
  const isDay=xMode()==="day";
  $("#xWhich").textContent=isDay?"Which days?":"Which weeks?";
  $("#xThisLbl").textContent=isDay?"The day I’m looking at":"The week I’m looking at";
  $("#xThis").textContent=isDay?fmtLong(parseKey(sel)):fmtLong(view)+" – "+fmtLong(addDays(view,6));
  $("#xRangeLbl").textContent=isDay?"Selected days":"Selected weeks";
  $("#xTdRow").style.display=isDay?"none":"";
  const n=unitsFor().length,any=$("#xEv").checked||$("#xTk").checked||$("#xHb").checked||(!isDay&&$("#xTd").checked);
  $("#xCount").textContent=n?`${n} ${isDay?"day":"week"}${n>1?"s":""} → ${n} page${n>1?"s":""} (landscape A4)`:"Pick a start and end date.";
  $("#xGo").disabled=!n||!any;
}
function resetRange(){const k=xMode()==="day"?sel:key(view);$("#xFrom").value=k;$("#xTo").value=k}
function printWeek(ws,o){
  const days=Array.from({length:7},(_,i)=>addDays(ws,i));
  const cols=days.map(d=>{
    const k=key(d),dd=peek(k),wd=d.getDay();
    let h=`<div class="pc" style="--c:${S.colors[wd]}"><div class="ph">${esc(S.emoji[wd]||"")} ${DAYN[wd]}</div><div class="pd">${fmtLong(d)}</div>`;
    if(dd.focus)h+=`<div class="pf">${esc(dd.focus)}</div>`;
    if(o.ev){const evs=dayEvents(k);h+=`<div class="ps">${esc(S.lblEvents)}</div>`+(evs.length?evs.map(e=>`<div class="pe"><b>${esc(e.time)}</b> ${esc(e.t)}${e.src==="s"?" ↻":""}</div>`).join(""):'<div class="pn">–</div>')}
    if(o.tk){const p=pct(dd.tasks);h+=`<div class="ps">${esc(S.lblTasks)}${p==null?"":" · "+p+"%"}</div>`+(dd.tasks.length?dd.tasks.map(t=>`<div class="pt ${t.d?"d":""}"><i>${t.d?"✓":""}</i><span>${esc(t.t)}</span></div>`).join(""):'<div class="pn">–</div>')}
    return h+"</div>";
  }).join("");
  let bottom="";
  if(o.hb&&D.habits.length){
    const rows=D.habits.map(hb=>{const log=days.map(d=>!!(D.hlog[key(d)]||{})[hb.id]),n=log.filter(Boolean).length;
      return `<tr><td>${esc(hb.name)}</td>${log.map(x=>`<td class="c">${x?"✓":"·"}</td>`).join("")}<td class="c">${Math.round(n/7*100)}%</td></tr>`}).join("");
    bottom+=`<div class="pb"><div class="ps">Habits</div><table><tr><th></th>${days.map(d=>`<th class="c">${DAYN[d.getDay()][0]}</th>`).join("")}<th class="c">%</th></tr>${rows}</table></div>`;
  }
  if(o.td){const td=D.todo[key(ws)]||[];
    if(td.length)bottom+=`<div class="pb"><div class="ps">Weekly to-do · ${pct(td)}%</div>${td.map(t=>`<div class="pt ${t.d?"d":""}"><i>${t.d?"✓":""}</i><span>${esc(t.t)}</span></div>`).join("")}</div>`;
  }
  return `<section class="pp"><header><b>${esc(S.lblBanner)}</b><span>KW ${isoWeek(addDays(ws,3))} · ${fmtLong(ws)} – ${fmtLong(addDays(ws,6))}</span></header><div class="pgrid">${cols}</div>${bottom?`<div class="pbottom">${bottom}</div>`:""}</section>`;
}
function printDay(d,o){
  const k=key(d),dd=peek(k),wd=d.getDay(),c=S.colors[wd];
  let left="",right="";
  if(o.ev){const evs=dayEvents(k);left+=`<div class="ds">${esc(S.lblEvents)}</div>`+(evs.length?evs.map(e=>`<div class="de"><b>${esc(e.time)||"all day"}</b><span>${esc(e.t)}${e.src==="s"?" ↻":""}</span></div>`).join(""):'<div class="dn">–</div>')}
  if(o.hb&&D.habits.length){const log=D.hlog[k]||{};left+=`<div class="ds">Habits</div>`+D.habits.map(h=>`<div class="dt ${log[h.id]?"d":""}"><i>${log[h.id]?"✓":""}</i><span>${esc(h.name)}</span></div>`).join("")}
  if(o.tk){const p=pct(dd.tasks);right+=`<div class="ds">${esc(S.lblTasks)}${p==null?"":" · "+p+"%"}</div>`+dd.tasks.map(t=>`<div class="dt ${t.d?"d":""}"><i>${t.d?"✓":""}</i><span>${esc(t.t)}</span></div>`).join("")+Array.from({length:Math.max(0,12-dd.tasks.length)},()=>'<div class="dt blank"><i></i><span></span></div>').join("")}
  return `<section class="pp dayp" style="--c:${c}"><div class="dhd"><b>${esc(S.emoji[wd]||"")} ${DAYN[wd]}</b><span>${fmtLong(d)} · KW ${isoWeek(d)}</span></div>${dd.focus?`<div class="dfocus"><small>${esc(S.lblFocus)}</small> ${esc(dd.focus)}</div>`:""}<div class="dgrid ${left&&right?"":"one"}">${left?`<div class="dl">${left}</div>`:""}${right?`<div class="dr">${right}</div>`:""}</div><div class="dfoot">${esc(S.lblBanner)}</div></section>`;
}
function fillPrint(){
  const o={ev:$("#xEv").checked,tk:$("#xTk").checked,hb:$("#xHb").checked,td:$("#xTd").checked},isDay=xMode()==="day";
  $("#printRoot").innerHTML=unitsFor().map(u=>isDay?printDay(u,o):printWeek(u,o)).join("");
}
$("#exportBtn").onclick=()=>{resetRange();syncExportForm();$("#dlgExport").showModal()};
document.querySelectorAll("input[name=xm]").forEach(r=>r.addEventListener("change",resetRange));
$("#dlgExport").addEventListener("input",syncExportForm);
$("#dlgExport").addEventListener("change",syncExportForm);
$("#xCancel").onclick=()=>$("#dlgExport").close();
$("#xGo").onclick=()=>{fillPrint();$("#dlgExport").close();setTimeout(()=>window.print(),150)};
window.addEventListener("afterprint",()=>{$("#printRoot").innerHTML=""});

/* ---------- customize + backup ---------- */
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

/* ---------- planner file (.hdg) ----------
   Chrome/Edge: she picks a .hdg file once; every change is written to it automatically.
   Safari can't write files by itself, so there the app keeps saving in the browser and
   offers a one-click "Backup" copy instead. */
const FS_OK=!!(window.showSaveFilePicker&&window.showOpenFilePicker);
const HDG_TYPES=[{description:"Hedgehog planner",accept:{"application/x-hedgehog":[".hdg"]}}];
let fileHandle=null,fileState=FS_OK?"none":"local",fileTimer=null,lastWrite=0;   // none | saving | ok | needs | error | local
const hasContent=()=>D.series.length||D.habits.length||Object.values(D.days).some(d=>d.events.length||d.tasks.length||d.focus);
const lastCopy=()=>{try{return +localStorage.getItem("hedgehog.lastCopy")||0}catch(e){return 0}};
let isBrave=false;
const firstUse=()=>{try{let v=+localStorage.getItem("hedgehog.firstUse")||0;if(!v&&hasContent()){v=Date.now();localStorage.setItem("hedgehog.firstUse",String(v))}return v}catch(e){return 0}};
/* nudge to make a backup copy: 3 days after she starts using it, then every 2 weeks */
const backupDue=()=>{if(!hasContent())return false;const lc=lastCopy(),base=lc||firstUse();return !!base&&Date.now()-base>(lc?14:3)*864e5};

function idb(){return new Promise((res,rej)=>{const r=indexedDB.open("hedgehog",1);r.onupgradeneeded=()=>r.result.createObjectStore("kv");r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function idbGet(k){try{const db=await idb();return await new Promise((res,rej)=>{const q=db.transaction("kv").objectStore("kv").get(k);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)})}catch(e){return null}}
async function idbSet(k,v){try{const db=await idb();await new Promise((res,rej)=>{const t=db.transaction("kv","readwrite");t.objectStore("kv").put(v,k);t.oncomplete=res;t.onerror=()=>rej(t.error)})}catch(e){}}
async function perm(h,ask){
  if(!h.queryPermission)return true;
  const o={mode:"readwrite"};
  if(await h.queryPermission(o)==="granted")return true;
  return !!ask&&(await h.requestPermission(o))==="granted";
}
function setFileState(s){fileState=s;renderChip();if($("#dlgFile").open)renderFileDlg()}
function renderChip(){
  const c=$("#fileChip"),name=fileHandle?fileHandle.name:"";
  const m={ok:["✓ Saved","ok","Saved in "+name],saving:["Saving…","ok","Saving…"],needs:["⚠ Reconnect file","warn","Click to let Hedgehog save to "+name+" again"],
    error:["⚠ Can’t save to file","warn","Click for help"],none:["💾 Choose a file","warn","Choose where Hedgehog keeps your planner"]};
  const v=m[fileState]||(backupDue()?["⚠ Back up now","warn","Save a backup copy of your planner"]:["✓ Saved on this Mac","ok","Everything is saved automatically in this browser"]);
  c.textContent=v[0];c.className="chip2 "+v[1];c.title=v[2];
}
function scheduleFileWrite(){if(!fileHandle)return;setFileState("saving");clearTimeout(fileTimer);fileTimer=setTimeout(()=>writeFile(false),500)}
async function writeFile(ask){
  if(!fileHandle)return false;
  clearTimeout(fileTimer);
  try{
    if(!await perm(fileHandle,ask)){setFileState("needs");return false}
    const w=await fileHandle.createWritable();await w.write(JSON.stringify(payload(),null,1));await w.close();
    lastWrite=Date.now();setFileState("ok");return true;
  }catch(e){setFileState("error");return false}
}
async function readFile(h){return JSON.parse(await (await h.getFile()).text())}
function checkPayload(j){if(!j||j.app!=="hedgehog"||!j.data||!j.data.days)throw new Error("not a Hedgehog file");return j}
function applyPayload(j){
  checkPayload(j);
  S=Object.assign({},DEFAULT_S,j.settings);D=j.data;fixData();editing=null;
  savedAt=j.saved?Date.parse(j.saved)||Date.now():Date.now();lastSer=JSON.stringify({S,D});persistLocal();
  view=startOf(new Date(),S.weekStart);sel=key(new Date());mini=new Date(view.getFullYear(),view.getMonth(),1);
  render();
}
async function linkHandle(h,takeFile){
  fileHandle=h;await idbSet("file",h);
  if(takeFile)applyPayload(await readFile(h));else await writeFile(true);
  setFileState(fileState==="error"||fileState==="needs"?fileState:"ok");
}
async function syncFromFile(){
  try{
    const j=checkPayload(await readFile(fileHandle)),fsaved=Date.parse(j.saved)||0;
    if(fsaved>savedAt+1000)applyPayload(j);            // file is newer (edited elsewhere / restored)
    else if(savedAt>fsaved+1000)await writeFile(false); // browser copy is newer → bring the file up to date
    setFileState("ok");
  }catch(e){setFileState("error")}
}
async function createFile(){
  try{const h=await showSaveFilePicker({suggestedName:"Hedgehog.hdg",types:HDG_TYPES,excludeAcceptAllOption:true});await linkHandle(h,false);fMsg("Done — your planner now saves itself into "+h.name+".")}
  catch(e){if(e.name!=="AbortError")fMsg("That didn’t work: "+e.message)}
}
async function openFile(){
  try{
    const[h]=await showOpenFilePicker({types:HDG_TYPES,excludeAcceptAllOption:true});
    const j=checkPayload(await readFile(h));
    if(hasContent()&&!confirm("Open “"+h.name+"”? What is on screen now will be replaced by the file’s contents."))return;
    fileHandle=h;await idbSet("file",h);applyPayload(j);setFileState("ok");fMsg("Opened "+h.name+". It saves itself from now on.");
  }catch(e){if(e.name!=="AbortError")fMsg(e.message==="not a Hedgehog file"?"That isn’t a Hedgehog file.":"That didn’t work: "+e.message)}
}
async function reconnect(){
  if(!fileHandle)return false;
  try{if(await perm(fileHandle,true)){await syncFromFile();return fileState==="ok"}}catch(e){}
  setFileState("needs");return false;
}
function downloadCopy(){
  const blob=new Blob([JSON.stringify(payload(),null,1)],{type:"application/x-hedgehog"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="Hedgehog-"+key(new Date())+".hdg";
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),2000);
  try{localStorage.setItem("hedgehog.lastCopy",String(Date.now()))}catch(e){}
  renderChip();fMsg("Backup saved: Hedgehog-"+key(new Date())+".hdg (look in your Downloads folder).");
}
function fMsg(t){$("#fMsg").textContent=t}
function renderFileDlg(){
  let h="";
  if(!FS_OK){
    h=`<p>Everything you do is <b>saved automatically in this browser</b> — when you reopen Hedgehog, it is all still there.</p>
       <p>A <b>backup</b> is a safety copy as of <i>right now</i>, kept in a file (for example in iCloud Drive). Changes you make afterwards are <b>not</b> added to it — make a new backup to capture them.</p>
       <p class="dim">${lastCopy()?"Last backup: "+new Date(lastCopy()).toLocaleDateString():"No backup copy yet."}</p>`;
    if(isBrave)h+=`<div class="tip"><b>Brave: turn on automatic file saving (one time, about 20 seconds)</b>
       <div class="dlgbtns" style="justify-content:flex-start;margin:8px 0"><button class="iconbtn primary" data-f="bravecopy" type="button">📋 1. Copy the setting’s address</button></div>
       <ol start="2"><li>Open a <b>new tab</b>, paste (<b>⌘V</b> / Ctrl+V) into the address bar and press Enter.</li>
       <li>Set the highlighted item (File System Access API) to <b>Enabled</b>, then click <b>Relaunch</b>.</li>
       <li>Open Hedgehog again → 💾 → <b>Create my planner file…</b></li></ol>
       <span class="dim">If nothing is highlighted, type “file system” in the search box on that page.</span></div>`;
  }else if(fileHandle&&(fileState==="ok"||fileState==="saving")){
    h=`<p class="big">✓ Saved in <b>${esc(fileHandle.name)}</b></p><p class="dim">Every change is saved into this file by itself${lastWrite?" (last at "+new Date(lastWrite).toTimeString().slice(0,5)+")":""}. Nothing to do.</p>
       <div class="dlgbtns" style="justify-content:flex-start"><button class="iconbtn" data-f="now" type="button">Save now</button><button class="iconbtn" data-f="open" type="button">Open another file…</button><button class="iconbtn" data-f="create" type="button">Save as a new file…</button></div>`;
  }else if(fileHandle){
    h=`<p class="big">⚠ Hedgehog needs your permission to save into <b>${esc(fileHandle.name)}</b> again.</p>
       <div class="dlgbtns" style="justify-content:flex-start"><button class="iconbtn primary" data-f="reconnect" type="button">Reconnect</button><button class="iconbtn" data-f="open" type="button">Open another file…</button><button class="iconbtn" data-f="create" type="button">Choose a new file…</button></div>`;
  }else{
    h=`<p>Keep your planner in a file you can see — like <b>Hedgehog.hdg</b> in Documents or iCloud Drive. It then saves itself after every change.</p>
       <div class="dlgbtns" style="justify-content:flex-start"><button class="iconbtn primary" data-f="create" type="button">Create my planner file…</button><button class="iconbtn" data-f="open" type="button">I already have one…</button></div>`;
  }
  h+=`<hr><b>Backup &amp; restore</b><div class="dlgbtns" style="justify-content:flex-start"><button class="iconbtn" data-f="backup" type="button">⬇ Backup</button><label class="iconbtn" style="cursor:pointer">⬆ Restore<input type="file" id="bkFile" accept=".hdg,.json,application/json" hidden></label></div>
       <p class="dim" style="margin:6px 0 0">Backup saves a copy of everything as it is now. Restore replaces what is on screen with the contents of a backup file.</p>`;
  $("#fBody").innerHTML=h;
}
$("#fBody").addEventListener("click",async e=>{
  const a=e.target.dataset.f;if(!a)return;
  if(a==="create")await createFile();
  else if(a==="open")await openFile();
  else if(a==="now"){await writeFile(true);fMsg(fileState==="ok"?"Saved.":"Couldn’t save — try Reconnect.")}
  else if(a==="reconnect"){fMsg((await reconnect())?"Reconnected.":"Not reconnected — click Reconnect and choose Allow.")}
  else if(a==="backup")downloadCopy();
  else if(a==="bravecopy"){
    const url="brave://flags/#file-system-access-api";
    try{await navigator.clipboard.writeText(url);fMsg("Copied! Now open a new tab and paste it into the address bar.")}
    catch(e){fMsg("Couldn’t copy automatically. Type this into a new tab instead: "+url)}
  }
  renderFileDlg();
});
$("#fBody").addEventListener("change",async e=>{
  if(e.target.id!=="bkFile")return;
  const f=e.target.files[0];e.target.value="";if(!f)return;
  try{
    const j=checkPayload(JSON.parse(await f.text()));
    if(!confirm("Replace everything in the app with the backup from "+(j.saved||"").slice(0,10)+"?"))return;
    applyPayload(j);if(fileHandle)await writeFile(true);fMsg("Backup restored.");
  }catch(err){fMsg("That file isn’t a Hedgehog backup.")}
});
$("#fileChip").onclick=async()=>{
  if(fileState==="needs"&&await reconnect())return;
  fMsg("");renderFileDlg();$("#dlgFile").showModal();
};
$("#fClose").onclick=()=>$("#dlgFile").close();
document.addEventListener("keydown",e=>{               // ⌘S / Ctrl+S
  if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="s"){e.preventDefault();
    if(fileHandle)writeFile(true);else if(!FS_OK)downloadCopy();else $("#fileChip").click()}
});
document.addEventListener("visibilitychange",()=>{if(document.hidden&&fileTimer)writeFile(false)});
async function initFile(){
  if(navigator.storage&&navigator.storage.persist)navigator.storage.persist().catch(()=>{});   // ask the browser never to evict our data
  if(navigator.brave&&navigator.brave.isBrave)navigator.brave.isBrave().then(v=>{isBrave=!!v}).catch(()=>{});
  if(window.launchQueue)launchQueue.setConsumer(async p=>{            // double-clicking a .hdg file opens it here
    if(!p.files||!p.files.length)return;
    try{await linkHandle(p.files[0],true)}catch(e){fMsg("That file couldn’t be opened.")}
  });
  renderChip();
  if(!FS_OK)return;
  const h=await idbGet("file");if(!h)return;
  fileHandle=h;
  if(!await perm(h,false)){setFileState("needs");return}
  await syncFromFile();
}

/* ---------- lab book: read LabGorilla.lbk ---------- */
const LBK_TYPES=[{description:"LabGorilla",accept:{"application/x-labgorilla":[".lbk"]}}];
async function permRead(h,ask){
  if(!h.queryPermission)return true;
  const o={mode:"read"};
  if(await h.queryPermission(o)==="granted")return true;
  return !!ask&&(await h.requestPermission(o))==="granted";
}
function labStatus(){
  const m={none:"Not linked. Choose the LabGorilla.lbk file that LabGorilla saves.",ok:"✓ Linked to "+(lab.handle?lab.handle.name:"")+" — updated "+(lab.at?new Date(lab.at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}):""),needs:"⚠ Hedgehog needs your permission to read "+(lab.handle?lab.handle.name:"the file")+" again. Click Reconnect. (Showing the last copy meanwhile.)",error:"⚠ That file could not be read. (Showing the last copy meanwhile.)"};
  const el=$("#labStatus");if(!el)return;
  el.textContent=m[lab.state]||"";
  $("#labLink").textContent=lab.handle?"Choose another file…":"Link LabGorilla.lbk…";
  $("#labReconnect").hidden=lab.state!=="needs";$("#labUnlink").hidden=!lab.handle;
  $("#labUrl").value=S.labUrl||"";
}
async function labRefresh(){
  if(!lab.handle||!window.showOpenFilePicker)return;
  try{
    if(!await permRead(lab.handle,false)){lab.state="needs";labStatus();return}
    const j=JSON.parse(await (await lab.handle.getFile()).text());
    if((j.app!=="labgorilla"&&j.app!=="labbook")||!j.data)throw new Error("not a LabGorilla file");
    const items={},put=(d,x)=>{if(d)(items[d]=items[d]||[]).push(x)};
    Object.values(j.data.entries||{}).forEach(e=>put(e.date,{t:e.code+" · "+e.title,time:"",code:e.code}));
    (j.data.events||[]).forEach(v=>put(v.date,{t:v.title,time:v.time||""}));
    lab.items=items;lab.at=Date.now();lab.state="ok";
    try{localStorage.setItem("hedgehog.lab",JSON.stringify(items))}catch(e){}
    render();labStatus();
  }catch(e){lab.state="error";labStatus()}
}
async function labLink(){
  try{
    const[h]=await showOpenFilePicker({types:LBK_TYPES,excludeAcceptAllOption:true});
    lab.handle=h;await idbSet("lab",h);await labRefresh();
  }catch(e){if(e.name!=="AbortError"){lab.state="error";labStatus()}}
}
$("#labLink").onclick=()=>{if(window.showOpenFilePicker)labLink();else $("#labStatus").textContent="This browser can't read files directly. In Brave, enable “File System Access API” in brave://flags."};
$("#labReconnect").onclick=async()=>{if(lab.handle&&await permRead(lab.handle,true))labRefresh()};
$("#labUnlink").onclick=async()=>{lab.handle=null;lab.items={};lab.state="none";await idbSet("lab",null);try{localStorage.removeItem("hedgehog.lab")}catch(e){}render();labStatus()};
$("#labUrl").addEventListener("input",e=>{S.labUrl=e.target.value.trim();render()});
$("#cust").addEventListener("click",labStatus);
document.addEventListener("visibilitychange",()=>{if(!document.hidden)labRefresh()});
window.addEventListener("focus",labRefresh);
async function initLab(){
  if(!window.showOpenFilePicker)return;
  const h=await idbGet("lab");if(!h)return;
  lab.handle=h;
  if(await permRead(h,false))labRefresh();else{lab.state="needs"}
}

render();
initFile();
initLab();

/* installable + works offline */
if("serviceWorker" in navigator && location.protocol.startsWith("http")){
  window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
}
