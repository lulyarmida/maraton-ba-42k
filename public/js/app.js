let RAW;
const YEARS = [2024, 2025, 2026];
const AGES = ["18 a 29","30 a 34","35 a 39","40 a 44","45 a 49","50 a 54","55 a 59","60 a 64","65 o más"];
const X0 = 120, X1 = 430;                   // minutos
const state = {sex:"all", age:"all", tipo:"n", view:"dens", visible:new Set(YEARS), mine:null, hover:null};

const ageSel = document.getElementById("age");
AGES.forEach((a,i)=>{const o=document.createElement("option");o.value=i;o.textContent=a+" años";ageSel.appendChild(o);});

const fmtHM = m => { const t=Math.round(m); const h=Math.floor(t/60), mm=t%60; return mm? `${h}h${String(mm).padStart(2,"0")}` : `${h}h`; };
const fmtHMS = m => { const s=Math.round(m*60); const h=Math.floor(s/3600), mm=Math.floor(s%3600/60), ss=s%60; return `${h}:${String(mm).padStart(2,"0")}:${String(ss).padStart(2,"0")}`; };
const fmtDiff = m => { const s=Math.round(Math.abs(m)*60); const mm=Math.floor(s/60), ss=s%60; return mm? `${mm}m ${String(ss).padStart(2,"0")}s` : `${ss}s`; };
const pct = v => (v<1 && v>0 ? "<1" : Math.round(v)) + "%";
const nf = new Intl.NumberFormat("es-AR");
const color = y => `var(--y${y})`;

function subset(){
  const out = {}; YEARS.forEach(y=>out[y]=[]);
  const {y,s,a} = RAW, t = RAW[state.tipo];
  for (let i=0;i<t.length;i++){
    if (state.sex!=="all" && s[i]!==+state.sex) continue;
    if (state.age!=="all" && a[i]!==+state.age) continue;
    out[YEARS[y[i]]].push(t[i]/60);
  }
  YEARS.forEach(k=>out[k].sort((p,q)=>p-q));
  return out;
}
function below(arr, x){ let lo=0,hi=arr.length; while(lo<hi){const m=(lo+hi)>>1; if(arr[m]<x) lo=m+1; else hi=m;} return lo; }
function quant(arr,p){ if(!arr.length) return NaN; const i=(arr.length-1)*p, lo=Math.floor(i), hi=Math.ceil(i); return arr[lo]+(arr[hi]-arr[lo])*(i-lo); }
function density(arr){
  const n=X1-X0+1, c=new Float64Array(n);
  arr.forEach(v=>{const i=Math.round(v-X0); if(i>=0&&i<n) c[i]++;});
  const sig = Math.max(3, 1.06*d3.deviation(arr||[0])*Math.pow(arr.length||1,-0.2)) || 4;
  const R=Math.ceil(sig*3), k=[]; let ks=0;
  for(let j=-R;j<=R;j++){const w=Math.exp(-0.5*(j/sig)**2);k.push(w);ks+=w;}
  const out=[];
  for(let i=0;i<n;i++){let s=0;for(let j=-R;j<=R;j++){const q=i+j;if(q>=0&&q<n)s+=c[q]*k[j+R];} out.push([X0+i, s/ks/(arr.length||1)]);}
  return out;
}

const svg = d3.select("#chart"), tip = document.getElementById("tip"), box = document.querySelector(".chartbox");
let DATA = null, geom = null;

function draw(){
  const W = svg.node().getBoundingClientRect().width || 900;
  const H = Math.max(300, Math.min(440, W*0.5));
  const m = {t:26,r:14,b:34,l: state.view==="cum"?44:14};
  svg.attr("viewBox",`0 0 ${W} ${H}`).attr("height",H);
  svg.selectAll("*").remove();
  const x = d3.scaleLinear([X0,X1],[m.l,W-m.r]);
  const vis = YEARS.filter(y=>state.visible.has(y) && DATA[y].length);
  let y;
  const series = {};
  if (state.view==="dens"){
    vis.forEach(yr=>series[yr]=density(DATA[yr]));
    const ymax = d3.max(vis.flatMap(yr=>series[yr].map(d=>d[1]))) || 1;
    y = d3.scaleLinear([0,ymax*1.12],[H-m.b,m.t]);
  } else {
    vis.forEach(yr=>{const a=DATA[yr]; series[yr]=d3.range(X0,X1+1).map(t=>[t, below(a,t)/a.length*100]);});
    y = d3.scaleLinear([0,100],[H-m.b,m.t]);
  }
  const step = W<560 ? 60 : 30;
  const ticks = d3.range(Math.ceil(X0/step)*step, X1+1, step);
  svg.append("g").attr("class","grid").attr("transform",`translate(0,${H-m.b})`)
     .call(d3.axisBottom(x).tickValues(ticks).tickSize(-(H-m.b-m.t)).tickFormat(""));
  svg.append("g").attr("class","axis").attr("transform",`translate(0,${H-m.b})`)
     .call(d3.axisBottom(x).tickValues(ticks).tickFormat(fmtHM).tickSizeOuter(0));
  if (state.view==="cum"){
    svg.append("g").attr("class","axis").attr("transform",`translate(${m.l},0)`)
       .call(d3.axisLeft(y).ticks(5).tickFormat(d=>d+"%").tickSizeOuter(0));
  }
  const line = d3.line().x(d=>x(d[0])).y(d=>y(d[1])).curve(d3.curveBasis);
  vis.forEach(yr=>{
    if (state.view==="dens"){
      const area = d3.area().x(d=>x(d[0])).y0(y(0)).y1(d=>y(d[1])).curve(d3.curveBasis);
      svg.append("path").attr("class","area").attr("d",area(series[yr])).style("fill",color(yr));
    }
    svg.append("path").attr("class","curve").attr("d",line(series[yr])).style("stroke",color(yr));
    const med = quant(DATA[yr],.5);
    svg.append("line").attr("class","med").attr("x1",x(med)).attr("x2",x(med))
       .attr("y1",state.view==="cum"?y(50):y.range()[1]).attr("y2",H-m.b).style("stroke",color(yr));
  });
  if (state.view==="cum") svg.append("line").attr("class","med").attr("x1",m.l).attr("x2",W-m.r)
       .attr("y1",y(50)).attr("y2",y(50)).style("stroke","var(--rule)");
  if (state.mine!=null && state.mine>=X0 && state.mine<=X1){
    const mx=x(state.mine);
    svg.append("line").attr("class","mine-line").attr("x1",mx).attr("x2",mx).attr("y1",m.t-6).attr("y2",H-m.b);
    svg.append("text").attr("class","mine-label").attr("x",mx+(mx>W-120?-6:6)).attr("y",m.t+4)
       .attr("text-anchor",mx>W-120?"end":"start").text("Tu tiempo");
  }
  const hl = svg.append("line").attr("class","hover-line").attr("y1",m.t).attr("y2",H-m.b).style("display","none");
  geom = {x, W, H, m, hl, vis};
  svg.append("rect").attr("x",m.l).attr("y",m.t).attr("width",W-m.l-m.r).attr("height",H-m.t-m.b)
     .attr("fill","transparent").on("pointermove",hover).on("pointerleave",unhover);
  svg.attr("aria-label", state.view==="dens" ? "Curvas de distribución de tiempos por año" : "Porcentaje acumulado de llegadas por año");
}

function hover(ev){
  const {x,W,m,hl,vis} = geom; const [px] = d3.pointer(ev);
  const t = Math.max(X0, Math.min(X1, x.invert(px)));
  hl.attr("x1",x(t)).attr("x2",x(t)).style("display",null);
  let html = `<b>${fmtHM(t)}</b><div style="opacity:.75;margin-bottom:4px">ya había llegado</div>`;
  vis.slice().reverse().forEach(yr=>{ const a=DATA[yr];
    html += `<div class="r"><span><span class="sw" style="background:${color(yr)}"></span>${yr}</span><span>${pct(below(a,t)/a.length*100)}</span></div>`; });
  tip.innerHTML = html; tip.style.opacity = 1;
  const r = svg.node().getBoundingClientRect(), br = box.getBoundingClientRect();
  const left = r.left - br.left + x(t)*(r.width/W);
  const tw = tip.offsetWidth;
  tip.style.left = (left + 14 + tw > br.width ? left - 14 - tw : left + 14) + "px";
  tip.style.top = (r.top - br.top + 30) + "px";
}
function unhover(){ if(geom) geom.hl.style("display","none"); tip.style.opacity = 0; }

function summary(){
  const rows = YEARS.map(y=>{const a=DATA[y]; return {y, n:a.length, med:quant(a,.5), s4:a.length? below(a,240)/a.length*100 : NaN};});
  let h = `<thead><tr><th>Año</th><th>Llegaron</th><th>Mediana</th><th>Bajo 4 horas</th><th>vs año anterior</th></tr></thead><tbody>`;
  rows.forEach((r,i)=>{
    let diff = "–";
    if (i>0 && rows[i-1].n && r.n){ const d=r.med-rows[i-1].med;
      diff = Math.abs(d)<1/60 ? "igual" : `<span class="${d<0?"faster":"slower"}">${fmtDiff(d)} ${d<0?"más rápido":"más lento"}</span>`; }
    h += `<tr><td><span class="dot" style="background:${color(r.y)}"></span>${r.y}</td><td>${r.n?nf.format(r.n):"sin datos"}</td><td>${r.n?fmtHMS(r.med):"–"}</td><td>${r.n?pct(r.s4):"–"}</td><td>${diff}</td></tr>`;
  });
  document.getElementById("summary").innerHTML = h + "</tbody>";
  const small = rows.filter(r=>r.n>0 && r.n<40).map(r=>r.y);
  document.getElementById("sumNote").textContent = small.length
    ? `Pocos corredores en ${small.join(" y ")} con este filtro: tomá las diferencias con cautela.`
    : "La comparación usa la mediana: el tiempo en el que llegó la mitad de los corredores.";
}

function mineText(){
  const out = document.getElementById("mineOut");
  if (state.mine==null){ out.innerHTML = `<p class="note">Escribí un tiempo y lo marcamos en el gráfico.</p>`; return; }
  let h = "";
  YEARS.forEach(y=>{ const a=DATA[y]; if(!a.length) return;
    const faster = (a.length-below(a,state.mine))/a.length*100;
    h += `<p><span class="dot" style="display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:8px;background:${color(y)}"></span>En ${y} habrías llegado antes que el <span class="big">${pct(faster)}</span> de los corredores.</p>`; });
  out.innerHTML = h || `<p class="note">No hay corredores con este filtro.</p>`;
}
function parseTime(s){
  const p = s.trim().replace(/[.,h]/g,":").replace(/[^0-9:]/g,"").split(":").filter(Boolean).map(Number);
  if (!p.length || p.some(isNaN)) return null;
  const [h,m=0,sec=0] = p; if (m>59||sec>59) return null;
  const t = h*60+m+sec/60; return (t>=60 && t<=600) ? t : null;
}

function refresh(){
  DATA = subset();
  document.getElementById("hint").textContent = state.view==="dens"
    ? "Cuanto más alta la curva, más corredores llegaron en ese tiempo. La línea punteada marca la mediana de cada año."
    : "Cada curva muestra qué porcentaje de corredores ya había cruzado la meta a cada hora.";
  draw(); summary(); mineText();
}

function segment(id, key){
  const el = document.getElementById(id);
  el.addEventListener("click", e=>{ const b=e.target.closest("button"); if(!b) return;
    el.querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed", x===b));
    state[key]=b.dataset.v; refresh(); });
}
segment("sex","sex"); segment("tipo","tipo"); segment("view","view");
ageSel.addEventListener("change", ()=>{state.age=ageSel.value; refresh();});
const yb = document.getElementById("years");
YEARS.forEach(y=>{ const b=document.createElement("button"); b.className="yr"; b.textContent=y;
  b.style.setProperty("--c",color(y)); b.setAttribute("aria-pressed","true");
  b.addEventListener("click",()=>{ if(state.visible.has(y)){ if(state.visible.size===1) return; state.visible.delete(y);} else state.visible.add(y);
    b.setAttribute("aria-pressed", state.visible.has(y)); draw(); });
  yb.appendChild(b); });
document.getElementById("mine").addEventListener("input", e=>{ state.mine = parseTime(e.target.value); draw(); mineText(); });
let rt; window.addEventListener("resize", ()=>{clearTimeout(rt); rt=setTimeout(draw,120);});
fetch("data/resultados.json")
  .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
  .then(d => { RAW = d; refresh(); })
  .catch(() => { document.getElementById("hint").textContent = "No se pudieron cargar los datos. Recargá la página."; });
