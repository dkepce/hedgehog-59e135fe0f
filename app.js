/* Hedgehog — weekly planner. Plain JS, no build step. Data lives in this browser (localStorage). */
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
const DEFAULT_S={theme:"pastel",colors:THEMES.pastel.colors.slice(),emoji:DEF_EMOJI.slice(),weekStart:1,
  lblBanner:"HEDGEHOG",lblFocus:"today's focus:",lblEvents:"Events",lblTasks:"Tasks"};
const KINDS=[["daily","Every day"],["weekdays","Every weekday (Mon–Fri)"],["weekly","Every week"],["biweekly","Every 2 weeks"],["monthly","Every month (same date)"],["yearly","Every year"]];

/* ---------- storage ---------- */
function load(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}}
function save(){try{localStorage.setItem("hedgehog.settings",JSON.stringify(S));localStorage.setItem("hedgehog.data",JSON.stringify(D))}catch(e){}}
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

function day(k){return D.days[k]||(D.days[k]={focus:"",events:[],tasks:[]})}
function peek(k){return D.days[k]||{focus:"",events:[],tasks:[]}}

/* ---------- repeating events ---------- */
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
  return a.sort((x,y)=>(x.time||"99:99").localeCompare(y.time||"99:99"));
}

/* ---------- state ---------- */
let sel=key(new Date());
let view=startOf(new Date(),S.weekStart);
let mini=new Date(view.getFullYear(),view.getMonth(),1);
let editing=null;   // {type:"t"|"ev"|"td"|"h", k, ref}
const isEd=(type,k,ref)=>editing&&editing.type===type&&editing.k===k&&editing.ref===String(ref);

/* ---------- rendering ---------- */
function moveOpts(k){return Array.from({length:7},(_,i)=>{const d=addDays(view,i),kk=key(d);return `<option value="${kk}" ${kk===k?"selected":""}>${DAYN[d.getDay()].slice(0,3)} ${d.getDate()}</option>`}).join("")+'<option value="next">Next week →</option>'}
function moveBox(k,extra){
  return `<div class="row2"><span class="seg"><label><input type="radio" name="mode" value="move" checked> Move</label><label><input type="radio" name="mode" value="copy"> Copy</label></span> to <select class="mv">${moveOpts(k)}</select></div>
  <div class="row2 hintline">Copy leaves the original as it was.</div>${extra||""}`;
}
function taskRow(t,j,k){
  if(isEd("t",k,j))return `<div class="task edit"><input class="ed" value="${esc(t.t)}"><button class="ok" type="button" data-save="1">✓</button><button class="no" type="button" data-cancel="1">✕</button>${moveBox(k)}</div>`;
  return `<div class="task ${t.d?"done":""}" draggable="true" data-drag="t" data-ref="${j}"><input type="checkbox" data-t="${j}" ${t.d?"checked":""}><span class="t" data-edit="t" data-ref="${j}">${esc(t.t)}</span><button class="x" data-del="${j}" type="button">✕</button></div>`}
function evRow(e,k){
  if(isEd("ev",k,e.ref)){
    const[h,m]=(e.time||":").split(":");
    const ser=e.src==="s"?`<div class="row2"><button class="lnk" type="button" data-series="${e.sid}">↻ Edit the whole series…</button></div>`:"";
    return `<div class="ev edit"><select class="eh">${hOpts(h)}</select>:<select class="em">${mOpts(m||"00")}</select><input class="ed" value="${esc(e.t)}"><button class="ok" type="button" data-save="1">✓</button><button class="no" type="button" data-cancel="1">✕</button>${moveBox(k,ser)}</div>`}
  return `<div class="ev" draggable="true" data-drag="ev" data-edit="ev" data-ref="${e.ref}"><span>${esc(e.time)}</span>${esc(e.t)}${e.src==="s"?'<b class="rep" title="Repeating event">↻</b>':""}<button class="x" data-evdel="${e.ref}" type="button" title="${e.src==="s"?"Remove only this one":"Delete"}">✕</button></div>`}

function render(){
  document.body.classList.toggle("dark",THEMES[S.theme]?.dark||false);
  const end=addDays(view,6);
  $("#title").textContent=fmtLong(view).toUpperCase()+" – "+fmtLong(end).toUpperCase();
  $("#wkStart").textContent=fmtLong(view);$("#wkEnd").textContent=fmtLong(end);
  $("#bannerTxt").textContent=S.lblBanner;
  const todayK=key(new Date());
  let all=[];
  $("#board").innerHTML=Array.from({length:7},(_,i)=>{
    const d=addDays(view,i),k=key(d),dd=day(k),wd=d.getDay(),c=S.colors[wd],p=pct(dd.tasks);
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
  const tk=key(view),td=D.todo[tk]||(D.todo[tk]=[]);
  $("#todo").innerHTML=td.map((t,j)=>isEd("td","",j)?`<div class="task edit" style="--c:#cfc9bb"><input class="ed" value="${esc(t.t)}"><button class="ok" type="button" data-save="1">✓</button><button class="no" type="button" data-cancel="1">✕</button></div>`:`<div class="task ${t.d?"done":""}"><input type="checkbox" data-td="${j}" ${t.d?"checked":""}><span class="t" data-edit="td" data-ref="${j}">${esc(t.t)}</span><button class="x" data-tdel="${j}" type="button">✕</button></div>`).join("")+`<input class="add" id="addTodo" style="--c:#cfc9bb" placeholder="+ add to weekly to-do">`;
  const tp=pct(td);$("#tdBar").style.width=(tp||0)+"%";$("#tdPct").textContent=tp==null?"–":tp+"%";
  renderHabits();renderCal();save();
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
  let h=Array.from({length:7},(_,i)=>`<div class="dow">${DAYN[(S.weekStart+i)%7][0]}</div>`).join("");
  for(let i=0;i<42;i++){const d=addDays(first,i),k=key(d);
    h+=`<button data-d="${k}" class="${d.getMonth()!==mini.getMonth()?"out ":""}${k>=wsK&&k<=weK?"inweek ":""}${k===tk?"today ":""}${k===sel?"sel":""}">${d.getDate()}</button>`}
  $("#cal").innerHTML=h;
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
});
$("#board").addEventListener("keydown",e=>{
  if(e.key!=="Enter"||!e.target.dataset.add)return;const sec=e.target.closest(".day");
  if(e.target.dataset.add==="ev"){addEvent(sec);return}
  const v=e.target.value.trim();if(!v)return;day(sec.dataset.k).tasks.push({t:v,d:false});render();
});

/* weekly to-do */
$("#todo").addEventListener("change",e=>{if(e.target.dataset.td!=null){D.todo[key(view)][+e.target.dataset.td].d=e.target.checked;render()}});
$("#todo").addEventListener("click",e=>{if(e.target.dataset.tdel!=null){D.todo[key(view)].splice(+e.target.dataset.tdel,1);render()}});
$("#todo").addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.id==="addTodo"&&e.target.value.trim()){D.todo[key(view)].push({t:e.target.value.trim(),d:false});render()}});

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
function weeksFor(){
  if(document.querySelector("input[name=xr]:checked").value==="this")return[view];
  let a=$("#xFrom").value,b=$("#xTo").value;if(!a||!b)return[];if(b<a)[a,b]=[b,a];
  const out=[];for(let w=startOf(parseKey(a),S.weekStart),last=startOf(parseKey(b),S.weekStart);w<=last&&out.length<60;w=addDays(w,7))out.push(w);
  return out;
}
function updateExportInfo(){
  const n=weeksFor().length,any=$("#xEv").checked||$("#xTk").checked||$("#xHb").checked||$("#xTd").checked;
  $("#xCount").textContent=n?`${n} week${n>1?"s":""} → ${n} page${n>1?"s":""} (landscape A4)`:"Pick a start and end date.";
  $("#xGo").disabled=!n||!any;
}
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
  return `<section class="pp"><header><b>${esc(S.lblBanner)}</b><span>${fmtLong(ws)} – ${fmtLong(addDays(ws,6))}</span></header><div class="pgrid">${cols}</div>${bottom?`<div class="pbottom">${bottom}</div>`:""}</section>`;
}
function fillPrint(){
  const o={ev:$("#xEv").checked,tk:$("#xTk").checked,hb:$("#xHb").checked,td:$("#xTd").checked};
  $("#printRoot").innerHTML=weeksFor().map(w=>printWeek(w,o)).join("");
}
$("#exportBtn").onclick=()=>{
  $("#xThis").textContent=fmtLong(view)+" – "+fmtLong(addDays(view,6));
  $("#xFrom").value=key(view);$("#xTo").value=key(view);updateExportInfo();$("#dlgExport").showModal();
};
$("#dlgExport").addEventListener("input",updateExportInfo);
$("#dlgExport").addEventListener("change",updateExportInfo);
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
$("#cust").onclick=()=>{buildDlg();$("#bkMsg").textContent="";$("#dlg").showModal()};
$("#dlg").addEventListener("click",e=>{const t=e.target.closest("[data-th]");if(t){S.theme=t.dataset.th;S.colors=THEMES[S.theme].colors.slice();render();buildDlg()}});
$("#dlg").addEventListener("input",e=>{
  const t=e.target;
  if(t.dataset.c!=null)S.colors[+t.dataset.c]=t.value;
  if(t.dataset.e!=null)S.emoji[+t.dataset.e]=t.value;
  if(t.id==="lblBanner")S.lblBanner=t.value;if(t.id==="lblFocus")S.lblFocus=t.value;
  if(t.id==="lblEvents")S.lblEvents=t.value;if(t.id==="lblTasks")S.lblTasks=t.value;
  if(t.id==="wsSel"){S.weekStart=+t.value;view=startOf(parseKey(sel),S.weekStart);mini=new Date(view.getFullYear(),view.getMonth(),1)}
  if(t.id==="bkFile")return;
  render();
});
$("#bkSave").onclick=()=>{
  const blob=new Blob([JSON.stringify({app:"hedgehog",version:1,saved:new Date().toISOString(),settings:S,data:D},null,1)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="hedgehog-backup-"+key(new Date())+".json";
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),2000);
  $("#bkMsg").textContent="Backup saved to your Downloads folder.";
};
$("#bkFile").addEventListener("change",async e=>{
  const f=e.target.files[0];e.target.value="";if(!f)return;
  try{
    const j=JSON.parse(await f.text());
    if(j.app!=="hedgehog"||!j.data||!j.data.days)throw new Error("not a Hedgehog backup");
    if(!confirm("Replace everything in the app with the backup from "+(j.saved||"").slice(0,10)+"?"))return;
    S=Object.assign({},DEFAULT_S,j.settings);D=j.data;fixData();editing=null;
    view=startOf(new Date(),S.weekStart);sel=key(new Date());mini=new Date(view.getFullYear(),view.getMonth(),1);
    render();buildDlg();$("#bkMsg").textContent="Backup restored.";
  }catch(err){$("#bkMsg").textContent="That file isn't a Hedgehog backup.";}
});

render();

/* installable + works offline */
if("serviceWorker" in navigator && location.protocol.startsWith("http")){
  window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
}
