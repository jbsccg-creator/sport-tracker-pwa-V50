const APP_VERSION='18.51';
const RUN_FEEL=[[4,'😌 Facile'],[6,'🙂 Correct'],[8,'😮‍💨 Dur'],[9,'🥵 Très dur']];
const RUN_DISTANCES=[[5,'5 km'],[10,'10 km'],[21.1,'Semi'],[42.2,'Marathon']];
/* Lot 6a — familles d'exercices clés : les paliers sont des FRACTIONS de l'objectif
   personnel (Réglages > Niveau & objectifs). Avec les objectifs par défaut, on retrouve
   exactement les anciens paliers (ex. dips 20 -> 6/12/20/30). */
const GRADE_FAMILIES_DEF=[
  {key:'pushups', label:'Pompes', match:n=>/^pompes$/i.test(n.trim()), factors:[0.25,0.5,0.75,1], ladder:'genoux → normales → gilet 10 kg / déclinées → claquées → archer'},
  {key:'pullups', label:'Tractions', match:n=>/^tractions( supination)?( \(dégressif\))?$/i.test(n.trim()), factors:[0.4,0.8,1.3,2], ladder:'négatives → normales → supination strictes → gilet 10 kg → archer'},
  {key:'dips', label:'Dips', match:n=>/^dips( triceps)?$/i.test(n.trim()), factors:[0.3,0.6,1,1.5], ladder:'sur banc → normaux → gilet 10 kg'},
  {key:'squats', label:'Squats (PDC)', match:n=>/^squats poids du corps$/i.test(n.trim()), factors:[0.3125,0.625,1,1.5], ladder:'PDC → goblet 16/24 kg → bulgare lesté → sautés'}
];
const DEFAULT_GOALS={pushups:60,pullups:10,dips:20,squats:80,run10kMin:40,bikeKmh:35};
function isNewInstall(){ return !!(state&&state.newInstall); }
/* Nouvelle installation : aucun objectif inventé. Installation existante : valeurs d'origine implicites (rien ne change pour l'utilisateur). */
function profileGoals(){ return Object.assign({},isNewInstall()?{}:DEFAULT_GOALS,(state.profile&&state.profile.goals)||{}); }
function goalIsStored(k){ return !!(state.profile&&state.profile.goals&&state.profile.goals[k]!=null&&state.profile.goals[k]!==''); }
function profileLevel(){ return Object.assign({pushups:0,pullups:0,dips:0,squats:0},(state.profile&&state.profile.level)||{}); }
function gradeFamilies(){
  const g=profileGoals();
  return GRADE_FAMILIES_DEF.map(f=>{
    const goal=Math.max(1,toNum(g[f.key])||DEFAULT_GOALS[f.key]);
    return Object.assign({},f,{goalReps:goal, steps:f.factors.map(x=>Math.max(1,Math.round(goal*x))), goal:`objectif : ${goal}`});
  });
}
const GRADE_NAMES=['Débutant','Intermédiaire','Avancé','Confirmé','Élite'];
function gradeFor(best,steps){ let i=0; while(i<steps.length && best>=steps[i]) i++; return i; }
/* --- Lot 6b : matériel disponible + substitution d'exercices --- */
const DEFAULT_EQUIPMENT={kettlebells:[4,8,16,24], dumbbells:[], vest:true, vestKg:10, pullupBar:true, dipStation:true, trainer:true, bike:true, bands:true, abWheel:false, trx:false, jumpRope:false, bench:false, parallettes:false, sliders:true, step:true};
const EMPTY_EQUIPMENT={kettlebells:[], dumbbells:[], vest:false, vestKg:10, pullupBar:false, dipStation:false, trainer:false, bike:false, bands:false, abWheel:false, trx:false, jumpRope:false, bench:false, parallettes:false, sliders:false, step:false};
function baseEquipment(){ return isNewInstall()?EMPTY_EQUIPMENT:DEFAULT_EQUIPMENT; }
let eqCtxIso=null;
var eqSessionIso=null;
/* Salle de sport : barres, haltères, poulies, machines + tout le matériel maison courant */
function gymPreset(b){ b=b||{}; const kb=[...new Set([...(b.kettlebells||[]),8,12,16,20,24,28,32])].sort((x,y)=>x-y); const db=[...new Set([...(b.dumbbells||[]),2.5,5,7.5,10,12.5,15,17.5,20,22.5,25,27.5,30,35,40])].sort((x,y)=>x-y);
  return {gym:true,pullupBar:true,dipStation:true,bench:true,bands:true,trx:true,abWheel:true,jumpRope:true,step:true,trainer:true,kettlebells:kb,dumbbells:db}; }
function equipment(){
  const base=Object.assign({},baseEquipment(),state.equipment||{}); const ci=eqSessionIso||eqCtxIso;
  if(state.trainingPlace==='salle') Object.assign(base,gymPreset(base));
  if(ci && state.sessions && state.sessions[ci] && state.sessions[ci].equipmentOverride){
    return Object.assign(base, state.sessions[ci].equipmentOverride);
  }
  return base;
}
function nearestKb(load){
  const kbs=(equipment().kettlebells||[]).slice().sort((a,b)=>a-b);
  if(!kbs.length||!toNum(load)) return toNum(load);
  const lower=kbs.filter(k=>k<=toNum(load));
  return lower.length?lower[lower.length-1]:kbs[0];
}
/* --- Exercices unilatéraux : total G+D dans une série, ou séries gauche/droite séparées --- */
const UNI_NAME_RE=/une jambe|un bras|une main|unilatéral|bulgare|suitcase|pistol|rowing (kb|haltère)|rowing haltère|one arm/i;
function isUnilateralEx(e){
  if(!e||e.kind==='run'||e.kind==='bike'||e.kind==='activity') return false;
  const ov=state.uniOverrides&&state.uniOverrides[canonicalExerciseName(e.name)];
  if(ov===true||ov===false) return ov;
  return /\/\s*(bras|c[oô]t[eé]|jambe)(?![a-zà-ÿ])/i.test(String(e.reps||'')) || UNI_NAME_RE.test(String(e.name||''));
}
function uniMode(){ return (state.settings&&state.settings.unilateralMode)==='total'?'total':'split'; }
/* Prescription par série : « 22/24/20 » (séquence d'un modèle) -> 22 puis 24 puis 20 ; « 12/côté » -> 12 */
function repsSeq(r){ const s=String(r||'').trim(); return /^\d+(?:\s*\/\s*\d+)+$/.test(s)?s.split('/').map(x=>x.trim()):null; }
function repsForSet(e,setIdx){ const seq=repsSeq(e.reps); if(seq) return seq[Math.min(setIdx,seq.length-1)]; return String(e.reps||'').replace(/\s*\/\s*(bras|c[oô]t[eé]|jambe)(?![a-zà-ÿ])/i,''); }
function toSplitSets(sets){ const out=[]; (sets||[]).forEach(s=>{ if(s.side){ out.push(s); return; } const g=Object.assign({},s,{side:'G'}); delete g.uni; out.push(g); out.push({done:false,actual:'',load:s.load||'',note:'',side:'D'}); }); return out; }
function fromSplitSets(sets){ return (sets||[]).filter(s=>s.side!=='D'||s.done).map(s=>{ const c=Object.assign({},s); delete c.side; return c; }); }
function uniSplit(e){ return isUnilateralEx(e) && uniMode()==='split'; }
function doubleRepsStr(r){ return scaleRepsStr(String(r||'').replace(/\s*\/\s*(bras|c[oô]t[eé]|jambe)(?![a-zà-ÿ])/i,''),2); }
function newSetFor(e,i){ const s={done:false,actual:'',load:'',note:''}; if(isUnilateralEx(e)){ if(uniMode()==='split') s.side=(i%2?'D':'G'); else s.uni='total'; } return s; }
/* Charge : vide = poids du corps pour les exercices au poids du corps ; vide = charge suggérée pour les KB */
function setLoadOf(ex,set){ const v=set&&set.load; return (v!==''&&v!=null&&String(v).trim()!=='')?toNum(v):(ex.bodyweight?0:toNum(ex.defaultLoad)); }
function setRepsPerSide(set,reps){ return set&&set.uni==='total'?Math.round(reps/2):reps; }
/* --- Niveau automatique : tes meilleures séries mettent à jour « Niveau » dans Objectifs (jamais à la baisse) --- */
var levelSyncedOnce=false;
function syncLevelFromRecords(){
  let recs; try{ recs=computeRecords().recs; }catch(e){ return []; }
  state.profile=state.profile||{}; state.profile.level=state.profile.level||{}; state.profile.levelAuto=state.profile.levelAuto||{};
  const updated=[];
  GRADE_FAMILIES_DEF.forEach(f=>{
    let best=0,iso='';
    Object.keys(recs).forEach(n=>{ const r=recs[n]; if(!r||r.timed||!f.match(n)) return; if(toNum(r.maxReps)>best){ best=toNum(r.maxReps); iso=r.maxRepsIso||''; } });
    const cur=toNum(state.profile.level[f.key]);
    if(best>0){ const prevAuto=state.profile.levelAuto[f.key]; if(!prevAuto||best>=toNum(prevAuto.reps)) state.profile.levelAuto[f.key]={reps:best,iso}; }
    if(best>cur){ state.profile.level[f.key]=best; updated.push({label:f.label,reps:best}); }
  });
  return updated;
}
function levelAutoNote(k){ const a=state.profile&&state.profile.levelAuto&&state.profile.levelAuto[k]; return a&&a.reps?`<small class="muted" style="display:block;margin-top:4px">Meilleure série enregistrée : ${a.reps}${a.iso?' ('+fmtDate(a.iso)+')':''} · mise à jour automatique</small>`:''; }
function maxTestsEnabled(){ return !(state.profile&&state.profile.maxTests===false); }
/* Semaine allégée = semaine de test : les tests ouvrent la séance (après l'échauffement),
   remplacent les séries normales du même mouvement, et le reste de la séance est allégé. */
/* --- Références de performance : allures course (méthode VDOT de Daniels) et zones vélo (% FTP) ---
   Calculées sur ce que tu SAIS faire (course de référence, FTP), jamais sur l'objectif. */
function parseTimeToSec(v){ const p=String(v||'').trim().split(':').map(x=>parseFloat(String(x).replace(',','.'))); if(!p.length||p.some(x=>isNaN(x))) return 0; if(p.length===3) return Math.round(p[0]*3600+p[1]*60+p[2]); if(p.length===2) return Math.round(p[0]*60+p[1]); return Math.round(p[0]*60); }
function vdotFrom(km,sec){ const t=sec/60; const v=km*1000/t; const vo2=-4.60+0.182258*v+0.000104*v*v; const pct=0.8+0.1894393*Math.exp(-0.012778*t)+0.2989558*Math.exp(-0.1932605*t); return vo2/pct; }
function velocityAt(vo2){ const a=0.000104,b=0.182258,c=-(vo2+4.60); return (-b+Math.sqrt(b*b-4*a*c))/(2*a); }
function paceAtPct(vdot,pct){ return 1000/velocityAt(vdot*pct); }
function fmtPace(minPerKm){ const s=Math.round(minPerKm*60); return Math.floor(s/60)+':'+String(s%60).padStart(2,'0'); }
function runReference(){
  let best=null;
  allCompletedSessions().forEach(({iso,s})=>{ const m=s.metrics||{}; const km=toNum(m.runDistanceKm), sec=toNum(m.runDurationSec);
    if(m.runReference && km>=3 && sec>0 && daysBetween(iso,isoToday())<=112 && (!best||iso>best.date)) best={km,sec,date:iso,source:'séance'}; });
  if(best) return best;
  const r=state.profile&&state.profile.runRef;
  return (r&&r.effort!=='facile'&&toNum(r.km)>=3&&toNum(r.sec)>0)?{km:toNum(r.km),sec:toNum(r.sec),date:r.date||'',source:'profil',rpe:r.rpe}:null;
}
function runPaces(){ const r=runReference(); if(!r) return null; const vd=vdotFrom(r.km,r.sec);
  return {vdot:vd,ref:r,E:[paceAtPct(vd,0.74),paceAtPct(vd,0.65)],M:paceAtPct(vd,0.80),T:[paceAtPct(vd,0.88),paceAtPct(vd,0.86)],I:[paceAtPct(vd,0.98),paceAtPct(vd,0.95)],race10k:null}; }
function runCapacity(){
  const rp=state.profile&&state.profile.runProfile; if(!rp) return null;
  const max=toNum(rp.maxRecentKm), comf0=toNum(rp.comfortableKm); if(!max&&!comf0) return null;
  const mx=max||comf0, comf=Math.min(comf0||mx,mx), runs=toNum(rp.runsPerWeek);
  const r=state.profile.runRef; const hardRef=r&&r.effort!=='facile'&&toNum(r.rpe)>=9;
  return {max:mx,comf:hardRef?Math.max(1,Math.min(comf,Math.round(mx*0.7))):comf,runs,lowBase:comf<6||(runs>0&&runs<3),hardRef:!!hardRef};
}
function applyRunCapacity(plan){
  const cap=runCapacity(); if(!cap||!plan||!Array.isArray(plan.exercises)||!runEnabled()) return plan;
  if(!plan.exercises.some(e=>e.kind==='run')) return plan;
  const easyHi=Math.max(1,Math.round(cap.comf)), easyLo=Math.max(1,easyHi-1), longHi=Math.max(1,Math.round(cap.max)), longLo=Math.max(1,Math.min(easyHi,longHi-1));
  const km=(a,b)=>a===b?`${b} km`:`${a}-${b} km`;
  const quality=plan.exercises.some(e=>e.kind==='run'&&/intervalle|seuil|tempo|vo2/i.test(e.target||''));
  const others=plan.exercises.filter(e=>e.kind!=='run');
  let runs, title=plan.title;
  if(quality&&cap.lowBase){
    runs=[ex('Course libre',1,km(easyLo,easyHi),'Footing facile, conversation possible',0,'run'),ex('Course libre',4,'100 m','Accélérations progressives et relâchées, retour en marchant',60,'run')];
    title='Footing facile + accélérations';
  } else {
    runs=plan.exercises.filter(e=>e.kind==='run').filter(e=>!(cap.lowBase&&/bloc tempo/i.test(e.target||''))).map(e=>{
      const t=String(e.target||'');
      if(/longue/i.test(t)||/longue/i.test(plan.title||'')&&/sortie|longue|facile/i.test(t)) return Object.assign({},e,{sets:1,reps:km(longLo,longHi),target:'Sortie la plus longue de la semaine, facile — jamais au-delà de ta distance max récente'});
      if(/intervalle|seuil|tempo|vo2|échauffement|retour au calme|lignes droites|accélération/i.test(t)) return e;
      return Object.assign({},e,{sets:1,reps:km(easyLo,easyHi),target:'Footing facile, conversation possible'});
    });
  }
  return Object.assign({},plan,{title,exercises:[...runs,...others],objective:(plan.objective||'')+` Calibré sur ta capacité actuelle : ${cap.comf} km confortables, ${cap.max} km au maximum récemment.${cap.hardRef?' Ta référence était un effort très dur : on reste en dessous.':''}`});
}
/* Départ « reprise » ou « doucement » : le cardio est allégé lui aussi, pas seulement la musculation */
function applyResumeCardio(plan,iso){
  const ri=resumeInfo(iso); if(!ri||!(ri.loadFactor<1)||!plan||!Array.isArray(plan.exercises)) return plan;
  let touched=false;
  const exs=plan.exercises.map(e=>{ if((e.kind!=='run'&&e.kind!=='bike')||!/min|km|h/i.test(String(e.reps||''))||/\d+\s*m\b/i.test(String(e.reps||''))&&!/km|min/i.test(String(e.reps||''))) return e; touched=true; return Object.assign({},e,{reps:scaleCardioReps(e.reps,ri.loadFactor),target:String(e.target||'')+` · allégé (${ri.label})`}); });
  return touched?Object.assign({},plan,{exercises:exs,objective:(plan.objective||'')+` Cardio allégé à ${Math.round(ri.loadFactor*100)} % (${ri.label}).`}):plan;
}
/* ==========================================================================================
   MOTEUR COURSE v18.42 — profils « course seule ». Plans : débuter (marche-course), premier 5 km,
   courir plus loin, courir plus vite, entretien. Règles :
   • on part de ce que la personne fait MAINTENANT, jamais au-delà de sa distance max récente ;
   • la progression dépend des semaines RÉELLEMENT validées, jamais du simple passage du temps ;
   • une semaine manquée fait reculer d'un cran (on ne rattrape pas), une semaine trop dure fait répéter ;
   • une seule variable augmente à la fois (volume de la sortie longue OU dose de qualité) ;
   • chaque séance est un enchaînement de blocs (échauffement, effort, récupération, retour au calme).
   ========================================================================================== */
function runEngineActive(){ const d=disciplines(); return runEnabled()&&!d.bike; } // course seule ou course + musculation
const r05=x=>Math.round(x*2)/2;
function runBaseline(){
  const rp=(state.profile&&state.profile.runProfile)||{}; let comf=toNum(rp.comfortableKm), max=toNum(rp.maxRecentKm);
  let derived='';
  if(!comf&&!max){ // capacité non saisie : on la déduit de ce que la personne a réellement couru, sinon de sa référence
    const lim=localISO(addDays(parseISO(isoToday()),-56)); const runs=cardioOutings().filter(o=>o.type==='run'&&o.iso>=lim&&o.km>0);
    if(runs.length){ max=r05(Math.max(...runs.map(o=>o.km))); comf=r05(runs.reduce((a,o)=>a+o.km,0)/runs.length); derived='tes sorties des 8 dernières semaines'; }
    else { const rr=state.profile&&state.profile.runRef; if(rr&&toNum(rr.km)>=3){ max=toNum(rr.km); comf=r05(toNum(rr.km)*0.8); derived='ta course de référence'; } } }
  if(!max&&comf) max=comf; if(!comf&&max) comf=Math.max(1,r05(max*0.7)); if(comf>max) comf=max;
  const r=state.profile&&state.profile.runRef; if(r&&r.effort!=='facile'&&toNum(r.rpe)>=9&&comf) comf=Math.max(1,Math.min(comf,r05(max*0.7)));
  return {derived,comf,max,runs:toNum(rp.runsPerWeek),target:toNum(rp.targetKm),targetSec:toNum(rp.targetTimeSec),goal:rp.goalType||'',start:rp.planStart||state.startDate,raceDate:rp.raceDate||''};
}
function runPlanType(b){
  if(b.goal==='decouvrir'||!b.comf||b.comf<2) return 'debuter';
  if(b.target>=30) return 'marathon';
  if(b.target>=20) return 'semi';
  if(b.goal==='courir5'&&b.comf<5) return 'courir5';
  if(b.goal==='entretien') return 'entretien';
  if(b.goal==='plusvite'&&b.comf>=Math.min(5,(b.target||5)*0.8)) return 'plusvite';
  if(b.target&&b.target>b.comf) return 'plusloin';
  return 'entretien';
}
const RUN_PLAN_LABEL={semi:'Préparation semi-marathon',marathon:'Préparation marathon',debuter:'Débuter (marche-course)',courir5:'Premier 5 km',plusloin:'Courir plus loin',plusvite:'Courir plus vite',entretien:'Entretien'};
function runWeekStats(monIso){
  const to=localISO(addDays(parseISO(monIso),6)); let runs=0, hard=false;
  Object.entries(state.sessions||{}).forEach(([d,s])=>{ if(d<monIso||d>to||!s||!s.completed||(s.cardioStatus&&s.cardioStatus.run==='skipped')) return;
    const hasRun=(Array.isArray(s.planSnapshot)&&s.planSnapshot.some(e=>e.kind==='run'))||toNum(s.metrics&&s.metrics.runDistanceKm)>0; if(!hasRun) return; runs++; if(toNum(s.rpe)>=9) hard=true; });
  Object.values(state.freeSessions||{}).forEach(f=>{ if(f&&f.completed&&f.date>=monIso&&f.date<=to&&toNum(f.metrics&&f.metrics.runDistanceKm)>0){ runs++; if(toNum(f.rpe)>=9) hard=true; } });
  return {runs,hard};
}
/* Niveau = semaines validées depuis le début du plan, calculé sur les semaines TERMINÉES uniquement :
   une date future n'hérite d'aucune progression supposée. */
function runLevelAt(iso,b,F){
  const startMon=localISO(mondayOf(parseISO(b.start||isoToday()))); const curMon=localISO(mondayOf(parseISO(iso))); const todayMon=localISO(mondayOf(parseISO(isoToday())));
  const lastMon=curMon<todayMon?curMon:todayMon; const need=Math.max(2,F-1);
  let L=0, m=startMon, guard=0, log=[];
  while(m<lastMon&&guard++<260){ const st=runWeekStats(m); if(st.runs===0){ L=Math.max(0,L-1); log.push('manquée'); } else if(st.runs>=need&&!st.hard){ L++; log.push('validée'); } else log.push(st.hard?'trop dure':'incomplète'); m=localISO(addDays(parseISO(m),7)); }
  return {L,log,need};
}
function runDaysFor(F){
  const sel=(scheduleDays()||[2,4,6]).slice().sort((a,c)=>((a+6)%7)-((c+6)%7));
  if(F>=sel.length) return sel;
  const out=[sel[sel.length-1]]; const step=(sel.length-1)/Math.max(1,F-1);
  for(let k=0;k<F-1;k++) out.push(sel[Math.round(k*step)]);
  return [...new Set(out)].sort((a,c)=>((a+6)%7)-((c+6)%7));
}
function easyPaceMin(){ const pc=runPaces(); return pc?pc.E[1]:7; }
function kmFitting(km,budget){ if(!isFinite(budget)) return km; const pace=easyPaceMin(); return Math.max(1,Math.min(km,r05((budget-2)/pace))); }
const WALK_RUN=[[6,1,90],[6,1.5,90],[5,2,90],[4,3,90],[3,5,120],[2,8,120],[2,10,60],[1,20,0],[1,25,0],[1,30,0]];
const RACE_REQ={semi:{comf:8,max:12,cap:20,rate:1.5,taper:[0.5,0.75],label:'semi-marathon'},marathon:{comf:12,max:18,cap:32,rate:2,taper:[0.45,0.65,0.8],label:'marathon'}};
/* Sortie longue d'une préparation longue : +1 km toutes les 2 semaines validées jusqu'au prérequis (phase de base),
   puis +1,5 km (semi) / +2 km (marathon) jusqu'au plafond. Toujours depuis ce que la personne fait déjà. */
function raceLongAt(b,L,req){ let long=Math.min(b.max,b.comf+1); for(let k=0;k<Math.floor(L/2);k++) long=Math.min(req.cap,long+(long<req.max?1:req.rate)); return r05(long); }
const mondayFirst=(a,c)=>((a+6)%7)-((c+6)%7);
/* Répartition de la semaine. Course seule : identique à la v18.42. Course + musculation : sortie longue en fin de semaine,
   musculation sur les autres jours, jamais de séance jambes la veille de la sortie longue ou de la séance de qualité. */
function weekAllocation(){
  const b=runBaseline(); const type=runPlanType(b); const sel=(scheduleDays()||[2,4,6]).slice().sort(mondayFirst); const N=sel.length; const alloc={};
  const wantsQuality=t=>t==='plusvite'||t==='semi'||t==='marathon';
  if(!strengthEnabled()){
    const F=Math.max(1,Math.min(N,b.runs?b.runs+1:7,6)); const days=runDaysFor(F);
    days.forEach((d,i)=>{ alloc[d]={kind:'run',role:(days.length>1&&i===days.length-1)?'long':((type==='plusvite'&&days.length>=3&&i===0)?'quality':(((type==='semi'||type==='marathon')&&days.length>=3&&i===0)?'quality':'easy')),strides:i===Math.floor(days.length/2)&&days.length>=2}; });
    return alloc;
  }
  if(N<=1){ if(N===1) alloc[sel[0]]={kind:'run',role:'long',strides:false}; return alloc; }
  let R=Math.max(1,Math.min(b.runs||(N>=5?3:2),N-1)); if(N>=4) R=Math.min(R,N-2); let S=N-R; if(S>3){ S=3; R=N-3; }
  const longDay=sel[N-1]; const pool=sel.slice(0,N-1); const runDays=[longDay];
  if(R>1){ const step=pool.length/(R-1); for(let k=0;k<R-1;k++){ const d=pool[Math.min(pool.length-1,Math.floor(k*step))]; if(!runDays.includes(d)) runDays.push(d); } pool.forEach(d=>{ if(runDays.length<R&&!runDays.includes(d)) runDays.push(d); }); }
  runDays.sort(mondayFirst);
  const rd=runDays.filter(d=>d!==longDay);
  runDays.forEach(d=>{ alloc[d]={kind:'run',role:d===longDay?'long':'easy',strides:false}; });
  if(wantsQuality(type)&&runDays.length>=3&&rd.length) alloc[rd[0]].role='quality';
  if(rd.length) alloc[rd[Math.floor(rd.length/2)]].strides=alloc[rd[Math.floor(rd.length/2)]].role==='easy';
  const sDays=sel.filter(d=>!runDays.includes(d));
  const beforeHard=d=>{ const n=(d+1)%7; return !!(alloc[n]&&alloc[n].kind==='run'&&(alloc[n].role==='long'||alloc[n].role==='quality')); };
  if(sDays.length>=3){ const legs=sDays.slice().reverse().find(d=>!beforeHard(d)); const ups=sDays.filter(d=>d!==legs).slice(0,2);
    if(legs!==undefined){ alloc[ups[0]]={kind:'strength',key:1}; alloc[ups[1]]={kind:'strength',key:4}; alloc[legs]={kind:'strength',key:'legs'}; }
    else { alloc[sDays[0]]={kind:'strength',key:1}; alloc[sDays[1]]={kind:'strength',key:4,addSquats:true}; } }
  else if(sDays.length===2){ alloc[sDays[0]]={kind:'strength',key:1}; alloc[sDays[1]]={kind:'strength',key:4,addSquats:true}; }
  else if(sDays.length===1){ alloc[sDays[0]]={kind:'strength',key:1,addSquats:true}; }
  return alloc;
}
/* Dernière sortie réellement faite dans les 3 jours précédents, et son ressenti */
const HARD_RE=/longue|intervalles|seuil|vo2|jambes|test de max|force|haut du corps/i;
function isHardPlan(pl){ return !!pl&&!isRestDay(pl)&&HARD_RE.test(pl.title||''); }
function moveCheck(a){ const s=state.sessions&&state.sessions[a]; if(s&&s.completed) return 'Cette séance est terminée : son historique est protégé, elle ne peut pas être déplacée.'; if(isRestDay(planForDate(a).plan)) return 'Pas de séance prévue ce jour-là.'; return ''; }
function hardNeighbourWarning(d){ const pl=planForDate(d).plan; if(!isHardPlan(pl)) return ''; const nb=[-1,1].map(k=>localISO(addDays(parseISO(d),k))).filter(x=>isHardPlan(planForDate(x).plan)); return nb.length?`Attention : « ${pl.title} » se retrouve à côté d'une autre séance exigeante (${nb.map(fmtDate).join(', ')}). Ce n'est pas interdit, mais la récupération sera plus courte.`:''; }
/* Applique un nouveau contenu sur des dates, en déplaçant AVEC lui les données déjà saisies (jamais les séances terminées) */
function relocateAndSet(newContent){
  const dates=Object.keys(newContent); const before={}; dates.forEach(d=>{ before[d]=planContentAt(d); });
  const objs={}; dates.forEach(d=>{ const s=state.sessions&&state.sessions[d]; if(s&&!s.completed&&before[d]) objs[before[d]]={obj:s,from:d}; });
  state.moves=state.moves||{};
  dates.forEach(d=>{ const p=newContent[d]; if(p===d||p==null) delete state.moves[d]; else state.moves[d]={from:p,at:new Date().toISOString()}; });
  Object.values(objs).forEach(o=>{ if(state.sessions[o.from]===o.obj) delete state.sessions[o.from]; });
  Object.entries(objs).forEach(([p,o])=>{ const d=dates.find(x=>planContentAt(x)===p); if(d){ o.obj.plannedFor=p; state.sessions[d]=o.obj; } else state.sessions[o.from]=o.obj; });
}
function recordMoveOp(dates,label){ const movesBefore={}; dates.forEach(d=>{ movesBefore[d]=state.moves&&state.moves[d]?Object.assign({},state.moves[d]):null; }); return {id:'mv-'+Date.now()+'-'+Math.random().toString(36).slice(2,6),dates,movesBefore,label,at:new Date().toISOString()}; }
/* a → b : si b porte déjà une séance, c'est une inversion explicite ; sinon un simple déplacement */
function moveSession(a,b,opts){ opts=opts||{};
  if(a===b) return {ok:false,why:'Même jour.'};
  const err=moveCheck(a); if(err) return {ok:false,why:err};
  const sb2=state.sessions&&state.sessions[b]; if(sb2&&sb2.completed) return {ok:false,why:'Le jour choisi contient une séance terminée : choisis un autre jour.'};
  const ca=planContentAt(a), cb=planContentAt(b); const bBusy=cb&&!isRestDay(planForDate(b).plan);
  if(bBusy&&!opts.swap) return {ok:false,needSwap:true,why:`Le ${fmtDate(b)} a déjà « ${planForDate(b).plan.title} ».`};
  const op=recordMoveOp(bBusy?[a,b]:[a,b].concat(ca!==a&&ca?[]:[]),bBusy?'Inversion':'Déplacement');
  if(bBusy) relocateAndSet({[a]:cb,[b]:ca}); else relocateAndSet({[b]:ca,[a]:(ca===a?a:null)});
  // une date vidée qui affichait un contenu emprunté redevient son contenu naturel… s'il n'est pas déjà affiché ailleurs
  if(!bBusy&&ca!==a&&state.moves&&!state.moves[a]&&moveTargetOf(a)===null){ /* contenu naturel de a réapparaît : normal */ }
  state.moveHistory=(state.moveHistory||[]).concat([op]).slice(-60); saveState();
  return {ok:true,swapped:!!bBusy,warning:hardNeighbourWarning(b)||(bBusy?hardNeighbourWarning(a):'')};
}
function postponeSession(a){ const start=a>isoToday()?a:isoToday();
  for(let k=1;k<=7;k++){ const d=localISO(addDays(parseISO(start),k)); const s=state.sessions&&state.sessions[d]; if(!(s&&s.completed)&&isRestDay(planForDate(d).plan)) return Object.assign(moveSession(a,d),{to:d}); }
  return {ok:false,why:'Aucun jour de repos libre dans les 7 prochains jours : choisis un jour (inversion possible).'}; }
function doToday(a){ return Object.assign(moveSession(a,isoToday(),{swap:true}),{to:isoToday()}); }
function lastMoveOpFor(iso){ const h=state.moveHistory||[]; for(let i=h.length-1;i>=0;i--) if(h[i].dates.includes(iso)) return {op:h[i],idx:i}; return null; }
function undoMove(iso){
  const f=lastMoveOpFor(iso); if(!f) return {ok:false,why:'Aucun déplacement à annuler pour ce jour.'};
  const later=(state.moveHistory||[]).slice(f.idx+1).find(o=>o.dates.some(d=>f.op.dates.includes(d)));
  if(later) return {ok:false,why:`Annule d'abord le déplacement plus récent (${later.dates.map(fmtDate).join(' ↔ ')}).`};
  const target={}; f.op.dates.forEach(d=>{ const mb=f.op.movesBefore[d]; target[d]=mb&&mb.from?mb.from:(moveTargetOf(d)&&!(state.moves[d])?null:d); });
  // contenu d'origine de chaque date : celui d'avant l'opération
  f.op.dates.forEach(d=>{ const mb=f.op.movesBefore[d]; if(mb&&mb.from) target[d]=mb.from; else target[d]=d; });
  relocateAndSet(target);
  state.moveHistory.splice(f.idx,1); saveState(); return {ok:true};
}
var REPDB_BY_ID=null, REPDB_LINK_CANON=null;
function repdbIndex(){ if(!REPDB_BY_ID&&typeof REPDB!=='undefined'){ REPDB_BY_ID={}; REPDB.forEach(x=>{ REPDB_BY_ID[x.id]=x; }); REPDB_LINK_CANON={}; Object.entries(typeof REPDB_LINK!=='undefined'?REPDB_LINK:{}).forEach(([k,v])=>{ REPDB_LINK_CANON[k]=v; try{ REPDB_LINK_CANON[canonicalExerciseName(k)]=v; }catch(e){} }); } return REPDB_BY_ID||{}; }
function repdbFor(e){ if(!e) return null; const idx=repdbIndex(); const L=REPDB_LINK_CANON||{}; let cn=''; try{ cn=canonicalExerciseName(e.name); }catch(_){} const id=e.repdbId||L[e.srcName]||L[e.name]||L[cn]; return id?idx[id]||null:null; }
function repdbImg(x,pose){ return `vendor/repdb/flat/${x.id}-${pose}.webp`; }
function repdbPicsHtml(x,size){ if(!x||!x.img||!x.img.length) return ''; const s=size||150; return `<div class="rd-pics">${x.img.map(pp=>`<img src="${repdbImg(x,pp)}" alt="${esc(x.n)} — ${pp==='start'?'position de départ':(pp==='peak'?'position finale':'position')}" loading="lazy" width="${s}" height="${s}">`).join('')}</div>`; }
const libNorm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const REPDB_ZONE={pectoralis_major:'pectoraux',latissimus_dorsi:'dos',rhomboids:'dos',trapezius:'haut du dos',erector_spinae:'lombaires',quadratus_lumborum:'lombaires',anterior_deltoid:'epaules',lateral_deltoid:'epaules',posterior_deltoid:'epaules',serratus_anterior:'epaules',supraspinatus:'epaules',biceps_brachii:'biceps',brachialis:'biceps',brachioradialis:'avant-bras',forearms:'avant-bras',forearm_flexors:'avant-bras',forearm_extensors:'avant-bras',triceps_brachii:'triceps',quadriceps:'jambes',hamstrings:'ischios',adductors:'jambes',hip_flexors:'jambes',tibialis_anterior:'jambes',gluteus_maximus:'fessiers',gluteus_medius:'fessiers',abductors:'fessiers',gastrocnemius:'mollets',soleus:'mollets',rectus_abdominis:'gainage',transverse_abdominis:'gainage',obliques:'gainage'};
function repdbZones(x){ return [...new Set((x.pm||[]).map(m=>REPDB_ZONE[m]).filter(Boolean))]; }
function repdbAvailable(x,eq){ eq=eq||equipment(); const k=x.eq; if(!k) return true;
  const m={kettlebell:(eq.kettlebells||[]).length>0,dumbbell:(eq.dumbbells||[]).length>0,pull_up_bar:!!eq.pullupBar,dip_station:!!eq.dipStation,resistance_band:!!eq.bands,loop_band:!!eq.bands,suspension_trainer:!!eq.trx,rings:!!eq.trx,jump_rope:!!eq.jumpRope,flat_bench:!!eq.bench,ab_wheel:!!eq.abWheel,plyo_box:!!eq.step,stationary_bike:!!(eq.trainer||eq.bike)};
  return (k in m)?m[k]:!!eq.gym; }
var libState={q:'',cat:'',eq:'',mus:'',avail:false,limit:60};
function libFiltered(){ const q=libNorm(libState.q); return (typeof REPDB!=='undefined'?REPDB:[]).filter(x=>(!libState.cat||x.c===libState.cat)&&(!libState.eq||(libState.eq==='_bw'?!x.eq:x.eq===libState.eq))&&(!libState.mus||x.pm.includes(libState.mus)||x.sm.includes(libState.mus))&&(!libState.avail||repdbAvailable(x))&&(!q||libNorm(x.n+' '+x.en).includes(q))); }
function libListHtml(){ const all=libFiltered(); const shown=all.slice(0,libState.limit);
  return `<p class="muted" style="margin:6px 0">${all.length} exercice${all.length>1?'s':''}</p>${shown.map(x=>`<button type="button" class="lib-item" data-rd="${esc(x.id)}">${x.img.length?`<img src="${repdbImg(x,x.img[0])}" alt="" loading="lazy" width="56" height="56">`:'<span class="lib-noimg">🏋️</span>'}<span><strong>${esc(x.n)}</strong><small class="muted">${esc(REPDB_CAT[x.c]||x.c)} · ${esc(x.eq?(REPDB_EQUIP[x.eq]||x.eq):'Poids du corps')} · ${esc((x.pm||[]).map(m=>REPDB_MUSCLES[m]||m).slice(0,2).join(', '))}</small></span></button>`).join('')}${all.length>shown.length?`<button class="ghost" type="button" data-libmore>Voir plus (${all.length-shown.length})</button>`:''}`; }
function libraryHtml(){
  const opt=(v,l,cur)=>`<option value="${esc(v)}" ${cur===v?'selected':''}>${esc(l)}</option>`;
  const eqKeys=[...new Set(REPDB.map(x=>x.eq).filter(Boolean))].sort((a,b)=>(REPDB_EQUIP[a]||a).localeCompare(REPDB_EQUIP[b]||b,'fr'));
  return `<div class="focus-wrap"><div class="between"><h2 style="margin:0">📚 Exercices</h2><button type="button" class="focus-icon" data-libclose aria-label="Fermer">✕</button></div>
  <input id="libQ" type="search" placeholder="Rechercher (ex : développé, squat, curl…)" value="${esc(libState.q)}">
  <div class="grid grid-2"><select id="libCat">${opt('','Tous les types',libState.cat)}${Object.entries(REPDB_CAT).map(([k,l])=>opt(k,l,libState.cat)).join('')}</select><select id="libEq">${opt('','Tout matériel',libState.eq)}${opt('_bw','Poids du corps',libState.eq)}${eqKeys.map(k=>opt(k,REPDB_EQUIP[k]||k,libState.eq)).join('')}</select><select id="libMus">${opt('','Tous les muscles',libState.mus)}${Object.entries(REPDB_MUSCLES).sort((a,b)=>a[1].localeCompare(b[1],'fr')).map(([k,l])=>opt(k,l,libState.mus)).join('')}</select><label class="gear-check"><input type="checkbox" id="libAvail" ${libState.avail?'checked':''}><span>Avec mon matériel${state.trainingPlace==='salle'?' (salle)':''}</span></label></div>
  <div id="libList">${libListHtml()}</div><p class="muted" style="font-size:12px;margin-top:10px">${esc(REPDB_CREDIT)} — <a href="https://repdb.co" target="_blank" rel="noopener">repdb.co</a></p></div>`;
}
function openLibrary(){
  if(typeof REPDB==='undefined') return;
  const o=document.createElement('div'); o.id='libOverlay'; o.className='focus-overlay'; o.innerHTML=libraryHtml(); document.body.appendChild(o); document.body.classList.add('focus-on');
  pushOverlay(()=>{ o.remove(); document.body.classList.remove('focus-on'); });
  const list=()=>{ const l=o.querySelector('#libList'); if(l) l.innerHTML=libListHtml(); };
  o.addEventListener('input',ev=>{ if(ev.target.id==='libQ'){ libState.q=ev.target.value; libState.limit=60; list(); } });
  o.addEventListener('change',ev=>{ const id=ev.target.id; if(id==='libCat') libState.cat=ev.target.value; if(id==='libEq') libState.eq=ev.target.value; if(id==='libMus') libState.mus=ev.target.value; if(id==='libAvail') libState.avail=ev.target.checked; libState.limit=60; list(); });
  o.addEventListener('click',ev=>{ const t=ev.target; if(t.closest('[data-libclose]')){ requestCloseOverlay(); return; } if(t.closest('[data-libmore]')){ libState.limit+=60; list(); return; } const it=t.closest('[data-rd]'); if(it) openRepdbFiche(it.dataset.rd); });
}
function repdbHistoryFor(x){ const names=Object.keys(typeof REPDB_LINK!=='undefined'?REPDB_LINK:{}).filter(k=>REPDB_LINK[k]===x.id).map(k=>{ try{ return canonicalExerciseName(k); }catch(e){ return k; } });
  const all=[...new Set(names.concat([x.n]))]; let n=0, best=0; all.forEach(nm=>{ const s=exerciseSeries(nm); n+=s.length; s.forEach(r=>{ best=Math.max(best,r.bestReps); }); }); return {n,best}; }
function repdbFicheHtml(x){
  const h=repdbHistoryFor(x);
  return `<div class="between"><div><h3 style="margin:0">${esc(x.n)}</h3><small class="muted">${esc(x.en)}</small></div><button class="ghost small" type="button" data-close>✕</button></div>${repdbPicsHtml(x,150)}
  <div class="rd-chips"><span class="reco-chip">${esc(REPDB_CAT[x.c]||x.c)}</span>${x.d?`<span class="reco-chip">${esc(REPDB_DIFF[x.d]||x.d)}</span>`:''}<span class="reco-chip">${esc(x.eq?(REPDB_EQUIP[x.eq]||x.eq):'Poids du corps')}</span>${x.uni?'<span class="reco-chip">Un côté à la fois</span>':''}</div>
  <p class="muted">${esc(x.desc)}</p>
  <p style="margin:6px 0"><strong>Muscles principaux :</strong> ${esc((x.pm||[]).map(m=>REPDB_MUSCLES[m]||m).join(', ')||'—')}${(x.sm||[]).length?`<br><strong>En soutien :</strong> ${esc(x.sm.map(m=>REPDB_MUSCLES[m]||m).join(', '))}`:''}</p>
  ${h.n?`<p class="muted">Tu l'as fait ${h.n} fois · meilleure série : ${h.best}</p>`:''}
  ${x.ins.length?`<details><summary>Consignes (en anglais pour l'instant)</summary><ol class="instruction-list">${x.ins.map(s=>`<li>${esc(s)}</li>`).join('')}</ol></details>`:''}
  <div class="footer-actions" style="margin-top:10px"><button class="primary small" type="button" data-rdadd="free">＋ Séance libre</button><button class="ghost small" type="button" data-rdadd="tpl">＋ Nouvelle séance type</button></div>
  <p class="muted" style="font-size:11px;margin-top:8px">${esc(REPDB_CREDIT)}</p>`;
}
function repdbExercise(x){ const stretch=x.c==='stretching'; return {name:x.n,kind:stretch?'mobility':'strength',muscles:repdbZones(x),bodyweight:!!x.bw,restSec:stretch?20:75,repdbId:x.id,sets:Array.from({length:stretch?2:3},()=>({reps:stretch?'30 s':'10',load:0}))}; }
function addRepdbToFree(id){
  const x=repdbIndex()[id]; if(!x) return null; const te=repdbExercise(x);
  state.freeSessions=state.freeSessions||{}; let sid=Object.keys(state.freeSessions).find(k=>{ const f=state.freeSessions[k]; return f&&f.date===isoToday()&&!f.completed&&f.title==='Séance libre'; });
  if(!sid){ sid='free-'+Date.now(); state.freeSessions[sid]=newFreeSession('Séance libre',isoToday()); state.freeSessions[sid].extraExercises=[]; state.freeSessions[sid].exercises={}; }
  const fs=state.freeSessions[sid]; const eid='free-'+Date.now()+'-'+(fs.extraExercises||[]).length;
  fs.extraExercises=(fs.extraExercises||[]).concat([{id:eid,name:te.name,sets:te.sets.length,reps:te.sets[0].reps,target:'Bibliothèque',restSec:te.restSec,kind:te.kind,muscles:te.muscles,bodyweight:te.bodyweight,defaultLoad:0,repdbId:x.id}]);
  saveState(); return sid;
}
function openRepdbFiche(id){
  const x=repdbIndex()[id]; if(!x) return; const o=sheetOverlay(repdbFicheHtml(x));
  o.querySelectorAll('[data-rdadd]').forEach(b=>b.onclick=()=>{ if(b.dataset.rdadd==='free'){ const sid=addRepdbToFree(id); prToast('Ajouté à ta séance libre du jour ✔'); while(document.getElementById('libOverlay')||document.querySelector('.sheet-overlay')){ if(!requestCloseOverlay||overlayStack.length===0) break; requestCloseOverlay(); } selectedFreeId=sid; selectedDate=isoToday(); setView('session'); }
    else { requestCloseOverlay(); openTemplateEditor({name:'',fresh:true,exercises:[repdbExercise(x)]}); } });
}
/* ================== Trophées (v18.50) ==================
   Calculés UNIQUEMENT sur des données réellement enregistrées (séries validées, distances saisies).
   Un palier obtenu reste acquis. Une semaine allégée, un repos ou un déplacement ne cassent aucune série. */
const TROPHY_TIERS=[{n:'Bronze',c1:'#e0a370',c2:'#8a4f22'},{n:'Argent',c1:'#eef1f6',c2:'#8b93a3'},{n:'Or',c1:'#ffe27a',c2:'#b8860b'},{n:'Platine',c1:'#c9f4ff',c2:'#4aa6c2'}];
const TROPHY_FAMILIES={force:{label:'Force',icon:'force'},vitesse:{label:'Rapidité',icon:'speed'},endurance:{label:'Endurance',icon:'flame'},regularite:{label:'Régularité',icon:'calendar'},polyvalence:{label:'Polyvalence',icon:'triad'},recuperation:{label:'Récupération',icon:'leaf'},exploration:{label:'Exploration',icon:'compass'}};
const fmtT=s=>mmss(s);
const TROPHY_DEFS=[
 {id:'pullups',fam:'force',name:'Traction féline',what:'Tractions strictes en une série',unit:'reps',t:[1,5,10,15],m:S=>S.best.pullups},
 {id:'pushups',fam:'force',name:'Pompes d\'acier',what:'Pompes en une série',unit:'reps',t:[10,25,50,75],m:S=>S.best.pushups},
 {id:'dips',fam:'force',name:'Dips de fer',what:'Dips en une série',unit:'reps',t:[5,15,25,40],m:S=>S.best.dips},
 {id:'squats',fam:'force',name:'Jambes infatigables',what:'Squats au poids du corps en une série',unit:'reps',t:[20,50,80,120],m:S=>S.best.squats},
 {id:'weighted',fam:'force',name:'Poids lourd',what:'Lest sur une traction',unit:'kg',t:[5,10,20,30],m:S=>S.weightedPull},
 {id:'stronger',fam:'force',name:'Toujours plus fort',what:'Progression de ton meilleur pilier depuis ton premier repère',unit:'%',t:[10,25,50,100],m:S=>S.pillarGain},
 {id:'maxtests',fam:'force',name:'Testeur',what:'Tests de max réalisés',unit:'tests',t:[1,3,6,12],m:S=>S.maxTests},
 {id:'fast5k',fam:'vitesse',name:'Éclair',what:'Temps sur 5 km',unit:'time',lower:true,t:[2100,1800,1500,1260],m:S=>S.best5k},
 {id:'faster',fam:'vitesse',name:'Plus vite qu\'hier',what:'Amélioration de ton allure sur 5 km ou plus',unit:'%',t:[2,5,10,15],m:S=>S.paceGain},
 {id:'longrun',fam:'endurance',name:'Souffle long',what:'Plus longue course',unit:'km',t:[5,10,21.1,42.2],m:S=>S.longestRun},
 {id:'longride',fam:'endurance',name:'Grand rouleur',what:'Plus longue sortie vélo',unit:'km',t:[20,50,100,150],m:S=>S.longestRide},
 {id:'runkm',fam:'endurance',name:'Kilomètres au compteur',what:'Kilomètres courus au total',unit:'km',t:[50,200,500,1000],m:S=>S.runKm},
 {id:'streak',fam:'regularite',name:'Infatigable',what:'Semaines régulières d\'affilée (record)',unit:'semaines',t:[4,12,26,52],m:S=>S.bestStreak},
 {id:'sessions',fam:'regularite',name:'Assidu',what:'Séances terminées avec des données',unit:'séances',t:[10,50,150,300],m:S=>S.sessions},
 {id:'hybrid',fam:'polyvalence',name:'Hybride',what:'Semaines avec au moins deux disciplines',unit:'semaines',t:[1,4,12,26],m:S=>S.hybridWeeks},
 {id:'triple',fam:'polyvalence',name:'Triathlète du quotidien',what:'Semaines avec musculation, course et vélo',unit:'semaines',t:[1,4,12,26],m:S=>S.tripleWeeks},
 {id:'deload',fam:'recuperation',name:'Maître du repos',what:'Semaines allégées respectées',unit:'semaines',t:[1,3,6,12],m:S=>S.deloadWeeks},
 {id:'explore',fam:'exploration',name:'Explorateur',what:'Exercices différents pratiqués',unit:'exercices',t:[15,30,60,100],m:S=>S.distinctEx},
 {id:'library',fam:'exploration',name:'Curieux',what:'Exercices de la bibliothèque essayés',unit:'exercices',t:[3,10,25,50],m:S=>S.libraryEx},
 {id:'sports',fam:'exploration',name:'Touche-à-tout',what:'Disciplines pratiquées',unit:'sports',t:[2,3],m:S=>S.sports}
];
function sessionHasRealData(s){ if(!s) return false; const m=s.metrics||{}; if(toNum(m.runDistanceKm)>0||toNum(m.bikeDistanceKm)>0) return true; return Object.values(s.exercises||{}).some(l=>(l.sets||[]).some(x=>x.done&&String(x.actual||'').trim()!=='')); }
function computeTrophyStats(){
  const S={best:{pullups:0,pushups:0,dips:0,squats:0},weightedPull:0,pillarGain:0,maxTests:0,best5k:0,paceGain:0,longestRun:0,longestRide:0,runKm:0,bestStreak:0,sessions:0,hybridWeeks:0,tripleWeeks:0,deloadWeeks:0,distinctEx:0,libraryEx:0,sports:0};
  let gain=0; GRADE_FAMILIES_DEF.forEach(f=>{ const h=familyHistory(f.key); if(!h.length) return; S.best[f.key]=Math.max(...h.map(x=>x.best)); if(h.length>=2&&h[0].best>0) gain=Math.max(gain,Math.round((S.best[f.key]/h[0].best-1)*100)); });
  S.pillarGain=gain;
  try{ S.weightedPull=Math.max(0,...exerciseSeries('Tractions lestées').map(x=>x.bestLoad)); }catch(e){}
  const runs=runSessionsDone(); const rides=cardioOutings().filter(o=>o.type==='bike');
  S.longestRun=runs.length?Math.max(...runs.map(r=>r.km)):0; S.runKm=Math.round(runs.reduce((a,r)=>a+r.km,0)*10)/10; S.longestRide=rides.length?Math.max(...rides.map(o=>o.km)):0;
  const r5=runDistanceRecords().find(r=>r.d===5); S.best5k=r5&&r5.best?r5.timeFor:0;
  const long5=runs.filter(r=>r.km>=5&&r.sec>0); if(long5.length>=2){ const p0=long5[0].sec/long5[0].km, pb=Math.min(...long5.map(r=>r.sec/r.km)); S.paceGain=Math.max(0,Math.round((1-pb/p0)*100)); }
  const weeks={}; const names=new Set(), lib=new Set(), sports=new Set();
  allCompletedSessions().forEach(({iso,s})=>{ if(!sessionHasRealData(s)) return; S.sessions++;
    const exs=s.freeMode?(s.extraExercises||[]):plannedExercisesFor(iso,s); const d=new Set();
    exs.forEach(x=>{ const lg=s.exercises&&s.exercises[x.id||makeId(x.name+'-'+(x.kind||''))]; const done=lg&&(lg.sets||[]).some(z=>z.done&&String(z.actual||'').trim()!=='');
      if(!done) return; if(x.kind==='strength'||x.kind==='mobility'){ d.add('strength'); try{ names.add(canonicalExerciseName(x.name)); }catch(e){ names.add(x.name); } if(x.repdbId) lib.add(x.repdbId); if(x.maxTest) S.maxTests++; } });
    const m=s.metrics||{}; if(toNum(m.runDistanceKm)>0) d.add('run'); if(toNum(m.bikeDistanceKm)>0) d.add('bike');
    d.forEach(x=>sports.add(x)); const mon=localISO(mondayOf(parseISO(iso))); const w=weeks[mon]||(weeks[mon]={n:0,d:new Set(),hard:false}); w.n++; d.forEach(x=>w.d.add(x)); if(toNum(s.rpe)>=9) w.hard=true; });
  S.distinctEx=names.size; S.libraryEx=lib.size; S.sports=sports.size;
  const mons=Object.keys(weeks).sort(); let cur=0, best=0;
  if(mons.length){ let m=mons[0]; const last=localISO(mondayOf(new Date())); let g=0;
    while(m<=last&&g++<600){ const w=weeks[m]; const deload=weekIndexFor(m)%4===0; const need=deload?1:Math.min(2,(scheduleDays()||[1,2,3,4,5,6]).length);
      if(w&&w.n>=need){ cur++; best=Math.max(best,cur); if(deload&&!w.hard) S.deloadWeeks++; } else if(m!==last) cur=0; // la semaine en cours ne casse jamais la série
      if(w&&w.d.size>=2) S.hybridWeeks++; if(w&&w.d.size>=3) S.tripleWeeks++;
      m=localISO(addDays(parseISO(m),7)); } }
  S.bestStreak=best;
  return S;
}
function trophyTier(def,v){ if(!v) return -1; let k=-1; def.t.forEach((th,i)=>{ if(def.lower?v<=th:v>=th) k=i; }); return k; }
function fmtTrophyVal(def,v){ if(def.unit==='time') return v?fmtT(v):'—'; if(def.unit==='%') return `${v||0} %`; return `${formatDecimal(v||0,def.unit==='km'?1:0)} ${def.unit}`; }
function evaluateTrophies(){ const S=computeTrophyStats(); return TROPHY_DEFS.map(def=>{ const v=def.m(S)||0; const tier=trophyTier(def,v); const next=tier+1<def.t.length?def.t[tier+1]:null;
  const pct=next==null?100:(def.lower?(v?Math.max(0,Math.min(100,Math.round(next/v*100))):0):Math.max(0,Math.min(100,Math.round(v/next*100)))); return {def,v,tier,next,pct}; }); }
/* Enregistre les nouveaux paliers ; renvoie ceux qui viennent d'être débloqués */
function checkTrophies(announce){
  state.trophies=state.trophies||{}; const fresh=[]; const first=!state.migrations||!state.migrations.trophies1;
  evaluateTrophies().forEach(r=>{ if(r.tier<0) return; const cur=state.trophies[r.def.id]||{tier:-1,dates:{}}; if(r.tier>cur.tier){ for(let k=cur.tier+1;k<=r.tier;k++){ cur.dates[k]=first?'historique':isoToday(); if(!first) fresh.push({def:r.def,tier:k}); } cur.tier=r.tier; state.trophies[r.def.id]=cur; } });
  if(first){ state.migrations=Object.assign({},state.migrations,{trophies1:new Date().toISOString()}); }
  if(fresh.length||first) saveState({sync:false});
  if(announce&&fresh.length){ const top=fresh[fresh.length-1]; trophyToast(top.def,top.tier,fresh.length); }
  return fresh;
}
function trophyIcon(name){ const P={force:'<rect x="9" y="22" width="5" height="12" rx="1.5"/><rect x="34" y="22" width="5" height="12" rx="1.5"/><rect x="5" y="25" width="4" height="6" rx="1"/><rect x="39" y="25" width="4" height="6" rx="1"/><rect x="14" y="26.5" width="20" height="3"/>',
  speed:'<polygon points="27,8 13,30 23,30 19,48 37,22 26,22"/>',flame:'<path d="M24 8c2 8 10 11 10 21a10 10 0 0 1-20 0c0-6 4-8 5-14 2 4 4 5 5 7 1-4 0-9 0-14z"/>',
  calendar:'<rect x="11" y="14" width="26" height="24" rx="3" fill="none" stroke="#fff" stroke-width="3"/><rect x="11" y="14" width="26" height="6"/><path d="M17 30l4 4 8-9" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
  triad:'<circle cx="24" cy="16" r="6"/><circle cx="15" cy="32" r="6"/><circle cx="33" cy="32" r="6"/>',leaf:'<path d="M12 36c0-14 10-22 26-24-1 16-9 26-22 26l-4 4-2-2 4-4z"/>',
  compass:'<circle cx="24" cy="28" r="13" fill="none" stroke="#fff" stroke-width="3"/><polygon points="24,18 28,28 24,38 20,28"/>'};
  return P[name]||P.force; }
function medalSvg(def,tier,size){ const s=size||64; const on=tier>=0; const T=TROPHY_TIERS[Math.max(0,tier)]; const gid='g'+def.id+tier;
  return `<svg viewBox="0 0 48 56" width="${s}" height="${Math.round(s*56/48)}" role="img" aria-label="${esc(def.name)} — ${on?T.n:'à débloquer'}" class="medal${on?'':' locked'}"><defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${on?T.c1:'#475569'}"/><stop offset="1" stop-color="${on?T.c2:'#1e293b'}"/></linearGradient></defs><path d="M14 2h8l-4 14zM26 2h8l-6 14z" fill="${on?'#ef4444':'#334155'}"/><circle cx="24" cy="31" r="22" fill="url(#${gid})"/><circle cx="24" cy="31" r="17" fill="#0f172a" opacity="${on?0.85:0.6}"/><g fill="#fff" opacity="${on?1:0.35}" transform="translate(0,3)">${trophyIcon(TROPHY_FAMILIES[def.fam].icon)}</g></svg>`; }
function trophyToast(def,tier,n){ const t=document.createElement('div'); t.className='toast pr-toast trophy-toast'; t.innerHTML=`${medalSvg(def,tier,28)}<span>Trophée débloqué : <strong>${esc(def.name)}</strong> · ${TROPHY_TIERS[tier].n}${n>1?` (+${n-1})`:''}</span>`; document.body.appendChild(t); setTimeout(()=>t.remove(),3200); }
function trophiesHtml(){
  const R=evaluateTrophies(); const st=state.trophies||{}; const got=R.reduce((a,r)=>a+(r.tier+1),0), total=TROPHY_DEFS.reduce((a,d)=>a+d.t.length,0);
  const card=r=>{ const sv=st[r.def.id]; const tier=Math.max(r.tier,sv?sv.tier:-1); const date=sv&&sv.dates&&sv.dates[tier];
    const thr=r.next!=null?(r.def.lower?`Prochain palier (${TROPHY_TIERS[r.tier+1].n}) : ${fmtTrophyVal(r.def,r.next)}`:`Prochain palier (${TROPHY_TIERS[r.tier+1].n}) : ${fmtTrophyVal(r.def,r.next)}`):'Tous les paliers obtenus 🎉';
    return `<div class="trophy${tier>=0?'':' off'}">${medalSvg(r.def,tier,56)}<div class="trophy-body"><strong>${esc(r.def.name)}</strong>${tier>=0?` <span class="reco-chip tier-${tier}">${TROPHY_TIERS[tier].n}</span>`:''}<small class="muted">${esc(r.def.what)} · actuel : ${esc(fmtTrophyVal(r.def,r.v))}</small><div class="progressbar"><span style="width:${r.pct}%"></span></div><small class="muted">${esc(thr)}${date?` · obtenu ${date==='historique'?'d\'après ton historique':'le '+fmtDate(date)}`:''}</small></div></div>`; };
  return `<div class="focus-wrap"><div class="between"><h2 style="margin:0">🏆 Trophées</h2><button type="button" class="focus-icon" data-trclose aria-label="Fermer">✕</button></div><p class="muted">${got} palier${got>1?'s':''} sur ${total}. Uniquement sur tes performances réellement enregistrées ; un repos, une semaine allégée ou un déplacement ne cassent aucune série.</p>${Object.entries(TROPHY_FAMILIES).map(([k,f])=>`<p class="eyebrow" style="margin-top:14px">${esc(f.label)}</p>${R.filter(r=>r.def.fam===k).map(card).join('')}`).join('')}</div>`;
}
function openTrophies(){ checkTrophies(false); const o=document.createElement('div'); o.id='trOverlay'; o.className='focus-overlay'; o.innerHTML=trophiesHtml(); document.body.appendChild(o); document.body.classList.add('focus-on'); pushOverlay(()=>{ o.remove(); document.body.classList.remove('focus-on'); }); o.addEventListener('click',ev=>{ if(ev.target.closest('[data-trclose]')) requestCloseOverlay(); }); }
function trophySummaryHtml(){ const st=state.trophies||{}; const got=Object.values(st).reduce((a,t)=>a+(t.tier+1),0); const total=TROPHY_DEFS.reduce((a,d)=>a+d.t.length,0);
  const recent=TROPHY_DEFS.map(d=>({d,t:st[d.id]})).filter(x=>x.t&&x.t.tier>=0).sort((a,b)=>String(b.t.dates[b.t.tier]).localeCompare(String(a.t.dates[a.t.tier]))).slice(0,4);
  return `<section class="card"><div class="between"><div><p class="eyebrow">Trophées</p><h3 style="margin:0">${got} / ${total} paliers</h3></div><button class="ghost small" type="button" id="openTrophiesBtn">Voir tout</button></div><div class="medal-row">${recent.length?recent.map(x=>medalSvg(x.d,x.t.tier,44)).join(''):'<span class="muted">Ton premier trophée t\'attend : termine une séance avec tes séries ou ta distance.</span>'}</div></section>`; }
function sheetOverlay(inner){ const o=document.createElement('div'); o.className='sheet-overlay'; o.innerHTML=`<div class="sheet">${inner}</div>`; document.body.appendChild(o); pushOverlay(()=>o.remove()); o.addEventListener('click',ev=>{ if(ev.target===o) requestCloseOverlay(); }); const c=o.querySelector('[data-close]'); if(c) c.onclick=requestCloseOverlay; return o; }
function templatesListHtml(){
  const row=t=>`<div class="tpl-row"><div><strong>${esc(t.name)}</strong><small class="muted" style="display:block">${t.exercises.length} exercice${t.exercises.length>1?'s':''}${t.builtin?' · modèle de l\'app':''}</small></div><div class="tpl-actions"><button class="primary small" type="button" data-tpl="run" data-id="${esc(t.id)}">▶ Lancer</button><button class="ghost small" type="button" data-tpl="plan" data-id="${esc(t.id)}">📅</button>${t.user?`<button class="ghost small" type="button" data-tpl="edit" data-id="${esc(t.id)}">✎</button>`:''}<button class="ghost small" type="button" data-tpl="dup" data-id="${esc(t.id)}" title="Dupliquer">⧉</button>${t.user?`<button class="ghost small" type="button" data-tpl="del" data-id="${esc(t.id)}" title="Supprimer">🗑</button>`:''}</div></div>`;
  const mine=allTemplates().filter(t=>t.user), app=allTemplates().filter(t=>t.builtin);
  return `<div class="between"><h3 style="margin:0">📋 Mes séances</h3><button class="ghost small" type="button" data-close>✕</button></div><p class="muted">Tes séances types, indépendantes du programme. Les modifier ne change jamais les séances déjà faites.</p><button class="primary" type="button" data-tpl="new">＋ Nouvelle séance type</button><p class="eyebrow" style="margin-top:14px">Mes modèles</p>${mine.length?mine.map(row).join(''):'<p class="muted">Aucun pour l\'instant : crée-en un, ou enregistre une séance terminée comme modèle depuis l\'écran Séance.</p>'}<p class="eyebrow" style="margin-top:14px">Modèles de l'app</p>${app.map(row).join('')}`;
}
function openTemplates(){
  const o=sheetOverlay(templatesListHtml());
  const refresh=()=>{ o.querySelector('.sheet').innerHTML=templatesListHtml(); const c=o.querySelector('[data-close]'); if(c) c.onclick=requestCloseOverlay; bind(); };
  const bind=()=>o.querySelectorAll('[data-tpl]').forEach(b=>b.onclick=()=>{ const id=b.dataset.id, a=b.dataset.tpl;
    if(a==='new'){ requestCloseOverlay(); openTemplateEditor(null); }
    if(a==='edit'){ requestCloseOverlay(); openTemplateEditor(findTemplate(id)); }
    if(a==='dup'){ duplicateTemplate(id); prToast('Copie créée ✔'); refresh(); }
    if(a==='del'){ if(confirm('Supprimer ce modèle ? Les séances déjà faites avec lui ne changent pas.')){ deleteUserTemplate(id); refresh(); } }
    if(a==='run'){ requestCloseOverlay(); applyFreeTemplate(id, isoToday(), true); }
    if(a==='plan'){ const d=prompt('Date de la séance (AAAA-MM-JJ) ?', localISO(addDays(new Date(),1))); if(d&&/^\d{4}-\d{2}-\d{2}$/.test(d)){ applyFreeTemplate(id,d,false); prToast(`Ajoutée au planning du ${fmtDate(d)} ✔`); } }
  });
  bind();
}
function templateEditorHtml(d){
  const names=[...new Set(availableLibrary().map(x=>x.name).concat(typeof REPDB!=='undefined'?REPDB.map(x=>x.n):[]))].sort((a,b)=>a.localeCompare(b,'fr'));
  return `<div class="between"><h3 style="margin:0">${d.id?'Modifier':'Nouvelle'} séance type</h3><button class="ghost small" type="button" data-close>✕</button></div>
  <label><span>Nom</span><input id="tplName" type="text" value="${esc(d.name||'')}" placeholder="ex : Full Body 45 min"></label>
  <datalist id="tplLib">${names.map(n=>`<option value="${esc(n)}">`).join('')}</datalist>
  <div id="tplRows">${d.rows.map((r,i)=>`<div class="tpl-ex" data-i="${i}"><label><span>Exercice</span><input data-f="name" list="tplLib" value="${esc(r.name)}"></label><label><span>Séries</span><input data-f="sets" type="number" min="1" inputmode="numeric" value="${r.sets}"></label><label><span>Reps</span><input data-f="reps" value="${esc(r.reps)}" placeholder="10 ou 8/8/6"></label><label><span>Charge kg</span><input data-f="load" type="number" inputmode="decimal" step="0.5" value="${r.load||''}" placeholder="—"></label><label><span>Repos s</span><input data-f="rest" type="number" inputmode="numeric" value="${r.rest}"></label><div class="tpl-ex-btns"><button class="ghost small" type="button" data-row="up" data-i="${i}" ${i===0?'disabled':''}>↑</button><button class="ghost small" type="button" data-row="down" data-i="${i}" ${i===d.rows.length-1?'disabled':''}>↓</button><button class="ghost small" type="button" data-row="del" data-i="${i}">✕ Retirer</button></div></div>`).join('')}</div>
  <button class="ghost" type="button" data-row="add">＋ Ajouter un exercice</button>
  <div class="footer-actions" style="margin-top:12px"><button class="primary" type="button" data-row="save">Enregistrer</button></div><p class="muted" id="tplMsg"></p>`;
}
function tplToRows(t){ return (t&&t.exercises||[]).map(e=>{ const reps=(e.sets||[]).map(s=>String(s.reps)); const same=reps.every(r=>r===reps[0]); return {name:e.name,sets:(e.sets||[]).length||3,reps:same?(reps[0]||'10'):reps.join('/'),load:toNum((e.sets||[{}])[0].load)||'',rest:e.restSec||75,base:e}; }); }
function rowsToExercises(rows){ return rows.filter(r=>String(r.name||'').trim()).map(r=>{ const rd=(typeof REPDB!=='undefined')?REPDB.find(x=>x.n===r.name):null; const lib=availableLibrary().find(x=>x.name===r.name)||(rd?{kind:rd.c==='stretching'?'mobility':'strength',muscles:repdbZones(rd),bodyweight:rd.bw,repdbId:rd.id}:{}); const base=r.base||{}; const n=Math.max(1,Math.round(toNum(r.sets)||1)); const parts=String(r.reps||'10').split('/').map(x=>x.trim()).filter(Boolean);
  return {repdbId:base.repdbId||lib.repdbId||undefined,name:String(r.name).trim(),kind:base.kind||lib.kind||'strength',muscles:base.muscles||lib.muscles||[],bodyweight:base.bodyweight!=null?base.bodyweight:!!lib.bodyweight,restSec:Math.max(0,Math.round(toNum(r.rest)||75)),sets:Array.from({length:parts.length>1?parts.length:n},(_,i)=>({reps:parts.length>1?parts[i]:(parts[0]||'10'),load:toNum(r.load)||0}))}; }); }
function openTemplateEditor(t){
  const d={id:t&&t.user?t.id:null,name:t?(t.user||t.fresh?t.name:t.name+' (copie)'):'',rows:t?tplToRows(t):[{name:'',sets:3,reps:'10',load:'',rest:75}]};
  const o=sheetOverlay(templateEditorHtml(d)); const sheet=o.querySelector('.sheet');
  const collect=()=>{ d.name=(sheet.querySelector('#tplName')||{}).value||d.name; sheet.querySelectorAll('.tpl-ex').forEach(rw=>{ const i=+rw.dataset.i; rw.querySelectorAll('[data-f]').forEach(inp=>{ d.rows[i][inp.dataset.f]=inp.value; }); }); };
  const draw=()=>{ sheet.innerHTML=templateEditorHtml(d); const c=sheet.querySelector('[data-close]'); if(c) c.onclick=requestCloseOverlay; bind(); };
  const bind=()=>sheet.querySelectorAll('[data-row]').forEach(b=>b.onclick=()=>{ collect(); const i=+b.dataset.i, a=b.dataset.row;
    if(a==='add') d.rows.push({name:'',sets:3,reps:'10',load:'',rest:75});
    if(a==='del') d.rows.splice(i,1);
    if(a==='up'&&i>0) [d.rows[i-1],d.rows[i]]=[d.rows[i],d.rows[i-1]];
    if(a==='down'&&i<d.rows.length-1) [d.rows[i+1],d.rows[i]]=[d.rows[i],d.rows[i+1]];
    if(a==='save'){ const ex=rowsToExercises(d.rows); if(!String(d.name).trim()||!ex.length){ const m=sheet.querySelector('#tplMsg'); if(m) m.textContent='Donne un nom et au moins un exercice.'; return; }
      saveUserTemplate({id:d.id,name:String(d.name).trim(),exercises:ex}); requestCloseOverlay(); prToast('Séance type enregistrée ✔'); return; }
    draw(); });
  bind();
}
function openMoveSheet(iso){
  const pl=planForDate(iso).plan; const rest=isRestDay(pl); const done=!!(state.sessions&&state.sessions[iso]&&state.sessions[iso].completed); const canUndo=!!lastMoveOpFor(iso);
  const o=document.createElement('div'); o.className='sheet-overlay';
  const msg=t=>{ const p=o.querySelector('#mvMsg'); if(p) p.textContent=t; };
  o.innerHTML=`<div class="sheet"><div class="between"><h3 style="margin:0">${fmtDate(iso)} · ${esc(pl.title)}</h3><button class="ghost small" type="button" data-close>✕</button></div>
  ${done?'<p class="muted">Séance terminée : son historique est protégé, elle ne peut pas être déplacée.</p>':(rest?'<p class="muted">Pas de séance ce jour-là. Tu peux y amener une séance depuis un autre jour (bouton ⋯ de ce jour).</p>':`
  <div class="move-actions">${iso!==isoToday()?'<button class="primary" type="button" data-mv="today">▶ La faire aujourd\'hui</button>':''}<button class="ghost" type="button" data-mv="postpone">⏭ Reporter au prochain jour libre</button></div>
  <label style="margin-top:10px"><span>Déplacer vers une date</span><input type="date" id="mvDate" value="${iso}"></label><button class="ghost" type="button" data-mv="to">Déplacer</button>`)}
  ${canUndo?'<button class="ghost" type="button" data-mv="undo" style="margin-top:10px">↶ Annuler le déplacement</button>':''}
  <p class="muted" id="mvMsg" style="margin-top:10px"></p></div>`;
  document.body.appendChild(o); const close=()=>o.remove(); pushOverlay(close);
  o.querySelector('[data-close]').onclick=requestCloseOverlay; o.addEventListener('click',ev=>{ if(ev.target===o) requestCloseOverlay(); });
  const finish=(r,txt)=>{ if(!r.ok){ msg(r.why); return; } requestCloseOverlay(); render(); prToast(txt); if(r.warning) setTimeout(()=>alert(r.warning),150); };
  o.querySelectorAll('[data-mv]').forEach(b=>b.onclick=()=>{ const a=b.dataset.mv;
    if(a==='today') finish(doToday(iso),'Séance placée aujourd\'hui ✔');
    if(a==='postpone'){ const r=postponeSession(iso); finish(r,r.to?`Reportée au ${fmtDate(r.to)} ✔`:''); }
    if(a==='to'){ const d=(o.querySelector('#mvDate')||{}).value; if(!d) return; let r=moveSession(iso,d); if(!r.ok&&r.needSwap){ if(confirm(r.why+'\n\nInverser les deux séances ?')) r=moveSession(iso,d,{swap:true}); else { msg('Rien n\'a changé.'); return; } } finish(r,r.swapped?'Séances inversées ✔':`Déplacée au ${fmtDate(d)} ✔`); }
    if(a==='undo') finish(undoMove(iso),'Déplacement annulé ✔');
  });
}
function lastRunBefore(iso){
  const lim=localISO(addDays(parseISO(iso),-3)); let best=null;
  const consider=(d,s)=>{ if(!s||!s.completed||d>=iso||d<lim) return; const hasRun=(Array.isArray(s.planSnapshot)&&s.planSnapshot.some(e=>e.kind==='run'))||toNum(s.metrics&&s.metrics.runDistanceKm)>0; if(!hasRun) return;
    const hardPlan=Array.isArray(s.planSnapshot)&&s.planSnapshot.some(e=>e.kind==='run'&&/intervalle|seuil|allure marathon|plus longue/i.test(e.target||''));
    if(!best||d>best.iso) best={iso:d,rpe:toNum(s.rpe),hard:toNum(s.rpe)>=9,wasHardSession:hardPlan}; };
  Object.entries(state.sessions||{}).forEach(([d,s])=>consider(d,s)); Object.values(state.freeSessions||{}).forEach(f=>f&&consider(f.date,f));
  return best;
}
var runPreviewL=null; // aperçu « si chaque semaine est validée » (jamais utilisé pour le plan réel)
function runEngineStatus(iso){
  if(!runEngineActive()) return null;
  const b=runBaseline(); const type=runPlanType(b); const alloc=weekAllocation(); const F=Math.max(1,Object.values(alloc).filter(x=>x.kind==='run').length);
  const lv=runLevelAt(iso||isoToday(),b,F); return {b,type,F,L:runPreviewL!=null?runPreviewL:lv.L,log:lv.log,need:lv.need};
}
function weeksToRace(iso,race){ if(!race) return null; return Math.floor((dayNum(race)-dayNum(localISO(mondayOf(parseISO(iso)))))/7); }
function runEnginePlanFor(iso){
  const st=runEngineStatus(iso); const {b,type,L,need}=st;
  const slot=weekAllocation()[dayKeyFor(iso)];
  const easyName='Course libre'; const dur=sessionDuration();
  const cool=mob('Mobilité hanches et mollets',1,dur<=20?'3 min':'5 min','Retour au calme',0);
  const fk=x=>String(x).replace('.',',');
  // Jour de course et récupération : prioritaires sur tout le reste
  if(b.raceDate&&(type==='semi'||type==='marathon'||b.target)){
    if(iso===b.raceDate) return {name:'',title:`Jour de course · ${b.target?fk(b.target)+' km':'compétition'} 🎉`,objective:`Jour J. Pars prudemment, régularité avant tout ; bois et ravitaille-toi comme à l'entraînement.`,exercises:[mob('Échauffement en marchant et trottinant',1,'10 min','Réveil musculaire',0),ex(easyName,1,`${fk(b.target||10)} km`,'Ta course : départ prudent, allure régulière',0,'run')],runEngine:true,workout:{plan:type,level:L,blocks:[{type:'course',value:`${b.target} km`}]}};
    const after=daysBetween(b.raceDate,iso); if(after>0&&after<=7&&slot&&slot.kind==='run') return {name:'',title:'Récupération après la course',objective:'Semaine de récupération : footings courts et très faciles, ou marche. Pense à fixer ton prochain objectif dans Objectifs.',exercises:[ex(easyName,1,`${Math.max(2,Math.round(b.comf*0.5))} km`,'Footing très facile, ou marche',0,'run'),cool],runEngine:true,workout:{plan:type,level:L,blocks:[]}};
  }
  if(!slot||slot.kind!=='run') return Object.assign(REST(),{title:'Repos',objective:'Repos, marche ou mobilité douce : la récupération fait partie du plan.',runEngine:true});
  let isLong=slot.role==='long', isQuality=slot.role==='quality'; let adaptTxt='', longCut=1;
  // Séance par séance : après une sortie très dure, la séance difficile suivante est allégée ; jamais deux séances dures d'affilée
  const lr=runPreviewL==null?lastRunBefore(iso):null;
  if(lr&&(isQuality||isLong)){ const yesterday=daysBetween(lr.iso,iso)===1;
    if(lr.hard&&isQuality){ isQuality=false; adaptTxt=` Ajusté : ta sortie du ${fmtDate(lr.iso)} était très dure (${lr.rpe}/10), la séance de qualité devient un footing facile.`; }
    else if(lr.hard&&isLong){ longCut=0.8; adaptTxt=` Ajusté : ta sortie du ${fmtDate(lr.iso)} était très dure (${lr.rpe}/10), sortie longue réduite d'environ 20 %.`; }
    else if(yesterday&&lr.wasHardSession&&isQuality){ isQuality=false; adaptTxt=' Ajusté : tu as fait une séance difficile hier, pas deux d\'affilée — footing facile aujourd\'hui.'; } }
  const longBudget=(type==='semi'||type==='marathon'||dur>=60)?Infinity:Math.round(dur*1.75);
  const consolid=L>0&&L%4===3; const cons=x=>consolid?r05(x*0.85):x;
  let title='', exs=[], why='', blocks=[];
  const wu=dur<=20?5:(dur<=40?10:15), cd=dur<=20?3:(dur<=40?5:10);
  const validTxt=`${L} semaine${L>1?'s':''} validée${L>1?'s':''} (au moins ${need} sorties sans séance trop dure)`;
  if(type==='debuter'){
    const s0=b.comf>=1.5?4:(b.comf>=1?3:0); const k=Math.min(WALK_RUN.length-1,s0+L); let [reps,runMin,walk]=WALK_RUN[k];
    if(reps===1&&dur<=20) runMin=Math.min(runMin,14);
    exs=[mob('Marche rapide',1,'5 min','Échauffement en marchant, bras actifs',0), reps>1?ex(easyName,reps,`${String(runMin).replace('.',',')} min`,`Course très facile, puis ${walk>=60?(walk/60).toString().replace('.',',')+' min':walk+' s'} de marche`,walk,'run'):ex(easyName,1,`${runMin} min`,'Course continue très facile, conversation possible',0,'run'), mob('Marche',1,'5 min','Retour au calme en marchant',0)];
    blocks=[{type:'échauffement',value:'5 min marche'},{type:reps>1?'fractionné':'continu',reps,work:`${runMin} min course`,recovery:walk?`${walk} s marche`:null},{type:'retour au calme',value:'5 min marche'}];
    title=`Marche-course · étape ${k+1}/${WALK_RUN.length}`;
    why=`Plan « débuter » : étape ${k+1}. On passe à l'étape suivante après une semaine validée (${validTxt}). Une semaine sans sortie fait revenir d'une étape : on ne rattrape jamais.`;
  } else {
    const req=RACE_REQ[type]; const race=!!req;
    const T=Math.min(b.target||(type==='courir5'?5:b.comf),15);
    const startLong=Math.min(b.max,b.comf+(type==='entretien'?0:0.5));
    let longKm, easyKm=b.comf, quality=null, phase='';
    if(type==='courir5'){ longKm=Math.min(5,startLong+0.5*L); easyKm=Math.min(longKm,b.comf+0.5*Math.floor(L/2)); }
    if(type==='plusloin'){ longKm=Math.min(T,startLong+1*Math.ceil(L/2)); easyKm=Math.min(r05(longKm*0.7),b.comf+0.5*Math.floor(L/2)); }
    if(type==='entretien'){ longKm=Math.min(b.max,r05(b.comf*1.25)); easyKm=b.comf; }
    if(type==='plusvite'){ const base=Math.min(b.max,Math.max(b.comf,r05((b.target||5)*1.2))); longKm=Math.min(base+1*Math.floor(L/2),Math.max(b.max,(b.target||5)*2)); const q=Math.floor((L+1)/2);
      quality=(b.target||5)<=5?{kind:'int',reps:Math.min(10,5+q),dist:'400 m',rest:90}:{kind:'thr',reps:3,mins:Math.min(12,6+q),rest:120}; }
    if(race){ longKm=raceLongAt(b,L,req); const specific=longKm>=req.max; phase=specific?'préparation spécifique':'phase de base';
      easyKm=Math.min(Math.max(b.comf,r05(longKm*0.55)),b.comf+0.5*Math.floor(L/2)+1);
      if(specific){ const q=Math.floor(L/2); quality={kind:'thr',reps:3,mins:Math.min(15,8+q),rest:120}; } }
    longKm=cons(longKm); easyKm=cons(Math.max(1,easyKm));
    // Affûtage avant la date de course
    let taperTxt=''; const wtr=race?weeksToRace(iso,b.raceDate):null;
    if(race&&wtr!==null&&wtr>=0&&wtr<req.taper.length){ const f=req.taper[wtr]; longKm=r05(longKm*f); easyKm=Math.max(1,r05(easyKm*Math.max(0.6,f))); if(quality) quality=Object.assign({},quality,{reps:Math.max(2,quality.reps-1)}); taperTxt=` Affûtage (${wtr===0?'semaine de la course':`J-${wtr} semaine${wtr>1?'s':''}`}) : volume réduit à ${Math.round(f*100)} %.`; }
    let feasTxt='';
    if(race&&wtr!==null&&wtr>=req.taper.length){ const proj=raceLongAt(b,L+(wtr-req.taper.length)*1,req); if(proj<req.cap*0.75) feasTxt=` Date ambitieuse : même en validant toutes les semaines, ta plus longue sortie atteindrait environ ${fk(proj)} km avant la course. Envisage de décaler la date ou de viser simplement « finir » ; le plan ne progressera pas plus vite pour autant.`; }
    if(isLong){ longKm=r05(longKm*longCut); const km=kmFitting(longKm,longBudget); exs=[ex(easyName,1,`${fk(km)} km`,'Sortie longue facile, la plus longue de la semaine — jamais au-delà de ce que tu as validé',0,'run')];
      if(type==='marathon'&&phase==='préparation spécifique'&&!taperTxt){ const mp=Math.max(3,Math.min(10,Math.round(km*0.25))); exs.push(ex(easyName,1,`${mp} km`,'Dont allure marathon, en fin de sortie',0,'run')); }
      title='Sortie longue'; blocks=[{type:'continu',value:`${fk(km)} km facile`}];
      const mins=estimateSessionMinutes({exercises:exs});
      why=`Sortie longue : ${fk(km)} km${km<longKm?` (raccourcie à ton format ${dur} min)`:''}. Elle augmente seulement après des semaines validées (${validTxt})${race?` ; ${req.label} : ${phase}${phase==='phase de base'?` jusqu'à ${req.max} km de sortie longue avant le travail spécifique`:''}`:''}${b.target>15&&!race?' ; préparation longue distance : phase de base plafonnée à 15 km':''}.${mins>90?' Au-delà de 1 h 30 : emporte de l\'eau et teste ta stratégie de ravitaillement (gels, boisson) à l\'entraînement.':''}`; }
    else if(isQuality&&quality){ let reps=quality.reps; const mk=r=>[ex(easyName,1,`${wu} min`,'Échauffement : footing très facile + 3 accélérations',0,'run'), quality.kind==='int'?ex(easyName,r,quality.dist,'Intervalles, récupération en trottinant',quality.rest,'run'):ex(easyName,r,`${quality.mins} min`,'Seuil, récupération en trottinant',quality.rest,'run'), ex(easyName,1,`${cd} min`,'Retour au calme très facile',0,'run')];
      exs=mk(reps); while(reps>2&&estimateSessionMinutes({exercises:exs.concat([cool])})>dur+5){ reps--; exs=mk(reps); }
      title=quality.kind==='int'?'Intervalles':'Seuil'; blocks=[{type:'échauffement',value:`${wu} min`},{type:quality.kind==='int'?'intervalles':'seuil',reps,work:quality.kind==='int'?quality.dist:`${quality.mins} min`,recovery:`${quality.rest} s trot`},{type:'retour au calme',value:`${cd} min`}];
      why=`Séance de qualité : ${reps} × ${quality.kind==='int'?quality.dist:quality.mins+' min'}${reps<quality.reps?` (adaptée à ton format ${dur} min)`:''}. La dose de qualité et la sortie longue n'augmentent jamais la même semaine.`; }
    else { const km=kmFitting(easyKm,dur); const strides=(type!=='courir5'&&L>=1&&slot.strides);
      exs=[ex(easyName,1,`${fk(km)} km`,'Footing facile, conversation possible',0,'run')].concat(strides?[ex(easyName,4,'100 m','Accélérations progressives et relâchées, retour en marchant',60,'run')]:[]);
      title=strides?'Footing + accélérations':'Footing facile'; blocks=[{type:'continu',value:`${fk(km)} km facile`}].concat(strides?[{type:'accélérations',reps:4,work:'100 m'}]:[]);
      why=`Footing facile de ${fk(km)} km${km<easyKm?` (format ${dur} min)`:''} : la base de la progression, à allure de conversation.`;
      if(race&&!quality&&slot.role==='quality') why+=` Pas encore de séance de seuil : elle arrive quand la sortie longue atteint ${req.max} km.`; }
    if(consolid) why+=' Semaine de consolidation : volume réduit d\'environ 15 %.';
    why+=taperTxt+feasTxt;
  }
  exs.push(cool);
  if(b.derived) why+=` Capacité estimée d'après ${b.derived} : renseigne-la dans Objectifs pour un plan plus précis.`;
  why+=adaptTxt;
  return {name:'',title,objective:`${RUN_PLAN_LABEL[type]} · ${why}`,exercises:exs,runEngine:true,workout:{plan:type,level:L,blocks}};
}
/* Course + musculation : les jours de musculation reprennent les séances du programme hybride (avec toute leur
   intelligence : calibration, progression, omoplates, tests…), mais SANS course dedans — le moteur course s'en charge. */
function strengthDayPlan(wk,key,block){
  if(key===1||key===4) return wk.days[key];
  const d=wk.days[3]||{exercises:[]};
  return Object.assign({},d,{title:`Jambes · ${BLOCK_LABEL[block]}`,objective:'Force des jambes, placée loin de ta sortie longue et de ta séance de qualité.',exercises:(d.exercises||[]).filter(e=>e.kind!=='run')});
}
function runEngineDay(iso,wk,week,block,deload){
  const slot=weekAllocation()[dayKeyFor(iso)];
  if(slot&&slot.kind==='strength'){
    let plan=hybridPipeline(iso,strengthDayPlan(wk,slot.key,block),week,block,deload);
    const sqF=GRADE_FAMILIES_DEF.find(f=>f.key==='squats');
    if(slot.addSquats&&plan&&!plan.exercises.some(e=>sqF.match(e.name))){ const sq=scaleExerciseToLevel(Object.assign(ex('Squats poids du corps',2,'15-20',"Pilier squats : endurance, sans aller à l'échec",60),{pillar:true}),block); const ci=plan.exercises.findIndex(e=>/finisher tronc/i.test(e.target||'')); const exs=plan.exercises.slice(); exs.splice(ci<0?exs.length:ci,0,sq); plan=Object.assign({},plan,{exercises:exs}); }
    return Object.assign({},plan,{objective:(plan.objective||'')+' Semaine course + musculation : pas de séance jambes la veille de ta sortie longue ni de ta séance de qualité.',hybridStrength:true});
  }
  let rp=runEnginePlanFor(iso); rp=applyResumeCardio(applyCardioTargets(rp,week,false,iso),iso); return rp;
}
function ftpValue(){ return toNum(state.profile&&state.profile.ftp); }
/* RPE de la dernière séance de qualité comparable (14 jours), lue dans les séances figées : jamais recalculée */
function lastQualityRpe(iso,re){ let best=null;
  Object.entries(state.sessions||{}).forEach(([d,s])=>{ if(!s||!s.completed||d>=iso||daysBetween(d,iso)>14||!Array.isArray(s.planSnapshot)) return;
    if(s.planSnapshot.some(e=>(e.kind==='run'||e.kind==='bike')&&re.test(e.target||''))&&(!best||d>best.d)) best={d,rpe:toNum(s.rpe)}; });
  return best; }
function cardioStep(iso,wib,deload,re){ if(deload) return {step:1,why:'semaine allégée : on revient à l\'étape 1'}; let step=Math.min(3,wib); const q=lastQualityRpe(iso,re);
  if(q&&q.rpe>=9&&step>1){ step-=1; return {step,why:`RPE ${q.rpe}/10 la dernière fois : on reconduit l'étape précédente`}; }
  return {step,why:''}; }
function applyCardioTargets(plan, week, deload, iso){
  if(!plan||!Array.isArray(plan.exercises)) return plan;
  const wib=weekInBlock(week); const pc=runPaces(); const ftp=ftpValue();
  const P=fmtPace, rng=(a,b)=>`${P(a)}-${P(b)}/km`, W=(lo,hi)=>`${Math.round(ftp*lo)}-${Math.round(ftp*hi)} W`;
  let title=plan.title, changed=false, progNote=''; const exs=[];
  plan.exercises.forEach(e=>{
    const t=String(e.target||'');
    if(e.kind==='run'){
      if(/bloc tempo/i.test(t)&&(wib===1||deload)){ changed=true; return; } // sortie longue simplement facile en début de bloc
      const base=t.replace(/\s*\d:\d\d(\s*(puis|-|–|à)\s*\d:\d\d)*\s*\/\s*km/ig,'').replace(/[\s·,]+$/,'').trim();
      let zone='';
      if(/intervalle/i.test(t)&&/\d+\s*m\b/.test(String(e.reps||''))&&iso&&!plan.runEngine){ const cs=cardioStep(iso,wib,deload,/intervalle/i); e=Object.assign({},e,{sets:[8,9,10][cs.step-1]}); progNote=` Progression intervalles : ${[8,9,10][cs.step-1]} répétitions (étape ${cs.step}/3), allure inchangée${cs.why?' — '+cs.why:''}.`; }
      if(/seuil/i.test(t)&&/min/.test(String(e.reps||''))&&Number(e.sets)>=2&&iso&&!plan.runEngine){ const cs=cardioStep(iso,wib,deload,/seuil/i); e=Object.assign({},e,{sets:3,reps:['8 min','9 min','10 min'][cs.step-1]}); progNote=` Progression seuil : 3 × ${[8,9,10][cs.step-1]} min (étape ${cs.step}/3), allure inchangée${cs.why?' — '+cs.why:''}.`; }
      if(/intervalle/i.test(t)) zone=pc?`allure ${rng(pc.I[0],pc.I[1])}`:'effort 8-9/10 (allure 3-5 km)';
      else if(/seuil/i.test(t)) zone=pc?`allure ${rng(pc.T[0],pc.T[1])}`:'effort 7-8/10 (tenable environ 1 h)';
      else if(/tempo/i.test(t)) zone=pc?`allure ${P(pc.M)} puis ${P(pc.T[1])}/km`:'effort 6-7/10';
      else if(/allure marathon/i.test(t)) zone=pc?`allure ${P(pc.M)}/km`:'effort 6/10, soutenu mais contrôlé';
      else if(/footing|facile|longue|endurance|allure libre|retour au calme|échauffement/i.test(t)) zone=pc?`allure ${rng(pc.E[0],pc.E[1])}`:'effort 3-4/10, conversation possible';
      if(zone){ changed=true; e=Object.assign({},e,{target:(base?base+' · ':'')+zone}); }
    } else if(e.kind==='bike'){
      if(/blocs rapides|allure soutenue/i.test(t)&&(wib===1||deload)){ changed=true; return; }
      if(/sweet spot ou vo2/i.test(t)){
        changed=true;
        if(wib===3&&!deload){ e=Object.assign({},e,{sets:5,reps:'3 min',restSec:180,target:ftp?`VO2max : 106-120 % FTP (${W(1.06,1.2)})`:'VO2max : effort 9/10'}); title=title.replace(/sweet spot \/ VO2/i,'VO2max'); }
        else { const cs=iso?cardioStep(iso,Math.min(2,wib),deload,/sweet spot/i):{step:1,why:''}; const mins=[10,12,15][cs.step-1]; e=Object.assign({},e,{sets:3,reps:`${mins} min`,restSec:300,target:ftp?`Sweet spot : 88-94 % FTP (${W(0.88,0.94)})`:'Sweet spot : effort 7/10'}); title=title.replace(/sweet spot \/ VO2/i,'sweet spot'); progNote=` Progression sweet spot : 3 × ${mins} min (étape ${cs.step}), watts inchangés${cs.why?' — '+cs.why:''}.`; }
      } else {
        let zone='';
        if(/force basse cadence/i.test(t)) zone=ftp?`76-87 % FTP (${W(0.76,0.87)}) à 55-65 rpm`:'effort 6-7/10 à 55-65 rpm';
        else if(/blocs rapides|allure soutenue|tempo/i.test(t)) zone=ftp?`tempo 76-87 % FTP (${W(0.76,0.87)})`:'effort 6/10';
        else if(/longue|endurance|allure libre|complément/i.test(t)) zone=ftp?`Z2 56-75 % FTP (${W(0.56,0.75)})`:'effort 3-4/10';
        else if(/échauffement|retour au calme/i.test(t)&&ftp) zone=`Z1-Z2 (< ${Math.round(ftp*0.65)} W)`;
        if(zone){ changed=true; e=Object.assign({},e,{target:t.replace(/[\s·,]+$/,'')+' · '+zone}); }
      }
    }
    exs.push(e);
  });
  if(!changed) return plan;
  const note=(plan.exercises.some(x=>x.kind==='run')&&!pc)?' Ajoute une course de référence dans Objectifs pour des allures chiffrées.':'';
  return Object.assign({},plan,{exercises:exs,title,objective:(plan.objective||'')+note+(progNote?progNote+' On ne change qu\'une variable à la fois.':'')});
}
/* --- Omoplates : gêne déclenchée par les tirages => exposition maîtrisée (pas un traitement) --- */
function scapCareActive(){ const s=state.profile&&state.profile.scap; return !!(s&&s.pullTrigger&&toNum(s.pain)>=3); }
function applyScapulaCare(plan){
  if(!scapCareActive()||!plan||!Array.isArray(plan.exercises)) return plan;
  const eq=equipment(); let touched=false;
  const exs=plan.exercises.map(e=>{
    const n=String(e.srcName||e.name);
    if(e.kind!=='strength'&&e.kind!=='mobility') return e;
    if(/dead hang|suspension/i.test(n)){ touched=true; return ex('Y-T-W au sol',e.sets||2,'8','Remplace la suspension (gêne omoplates)',30,'mobility'); }
    if(/shrugs/i.test(n)){ touched=true; return eq.bands?ex('Tirage vers visage élastique',e.sets||3,'15','Remplace les shrugs (gêne omoplates)',45):ex('Y-T-W au sol',e.sets||3,'8','Remplace les shrugs (gêne omoplates)',30,'mobility'); }
    if(/high pull|snatch|arraché/i.test(n)){ touched=true; return ex('Swing 16 kg',e.sets||3,'12-15','Remplace '+canonicalExerciseName(n)+' (gêne omoplates)',90); }
    if(/tractions? lestées?/i.test(canonicalExerciseName(n))&&!e.maxTest){ touched=true; const lv=toNum(profileLevel().pullups); const lo=lv?Math.max(1,Math.round(lv*0.5)):3, hi=lv?Math.max(lo,Math.round(lv*0.6)):5;
      return Object.assign({},e,{name:'Tractions',id:undefined,srcName:undefined,bodyweight:true,defaultLoad:0,sets:Math.min(3,Number(e.sets||3)),reps:lo===hi?String(lo):`${lo}-${hi}`,target:"Sans lest tant que la gêne omoplates dépasse 3/10 · arrête-toi 2-3 reps avant l'échec",scapCare:true,swappedFrom:undefined}); }
    if(/traction|rowing|tirage|pull-over|renegade/i.test(n)&&!/visage/i.test(n)&&!e.maxTest){ touched=true; return Object.assign({},e,{sets:Math.min(3,Number(e.sets||3)),target:(e.target||'')+" · arrête-toi 2-3 reps avant l'échec, gêne ≤ 4/10 pendant et le lendemain",scapCare:true}); }
    return e;
  });
  return touched?Object.assign({},plan,{exercises:exs,objective:(plan.objective||'')+' Gêne omoplates prise en compte : tirages plafonnés.'}):plan;
}
/* ==========================================================================================
   Moteur de progression v1 — déterministe, explicable, exercice par exercice.
   Architecture prête pour la v18.38 : un moteur par TYPE DE MÉTRIQUE (reps, temps, cardio, corde…).
   ========================================================================================== */
function metricType(e){ if(!e) return null; if(e.kind==='run'||e.kind==='bike') return 'cardio'; if(e.kind==='activity') return 'activity'; if(isTimedExercise(e)) return 'time'; return 'reps'; }
const RECO_ENGINES={ reps:(e,iso)=>recoRepsChecked(e,iso), time:(e,iso)=>recoTime(e,iso), cardio:null, activity:null }; // time / cardio / corde : v18.38
function recommendFor(e,iso){ const mt=metricType(e); const fn=mt&&RECO_ENGINES[mt]; try{ return fn?fn(e,iso):null; }catch(err){ return null; } }
function exerciseIntent(e){
  const f=GRADE_FAMILIES_DEF.find(x=>x.match(e.name));
  if(f) return {pillar:true,key:f.key,label:f.label,type:{pullups:'multiset',pushups:'endurance',dips:'reps_then_load',squats:'endurance'}[f.key]};
  if(!e.bodyweight&&toNum(e.defaultLoad)>0) return {pillar:false,type:'double'};
  return {pillar:false,type:'reps'};
}
function repRange(reps){ const n=(String(reps||'').match(/\d+/g)||[]).map(Number); if(!n.length||/max|min|\d\s*s\b/i.test(String(reps))) return null; return [Math.min(...n),Math.max(...n)]; }
/* Séances comparables : même variante (nom canonique : « Tractions » ≠ « Tractions lestées »), séries réellement validées */
function comparableHistory(e,iso,n=6){
  const name=canonicalExerciseName(e.name); const out=[];
  const list=allCompletedSessions().filter(x=>x.iso<iso).sort((a,b)=>b.iso.localeCompare(a.iso));
  for(const {iso:d,s} of list){
    const exs=s.freeMode?(s.extraExercises||[]):plannedExercisesFor(d,s);
    const x=exs.find(y=>!y.unknown&&!y.maxTest&&canonicalExerciseName(y.name)===name); if(!x) continue;
    const log=s.exercises&&s.exercises[x.id||makeId(x.name+'-'+(x.kind||''))]; if(!log) continue;
    let sets=(log.sets||[]).filter(z=>z.done).map(z=>({reps:setRepsPerSide(z,parseReps(z.actual)||0),load:setLoadOf(x,z),rir:(z.rir===undefined||z.rir===null||z.rir==='')?null:toNum(z.rir),side:z.side||null}));
    if(sets.some(z=>z.side)){ const merged=[]; for(let i=0;i<sets.length;i+=2){ const a=sets[i],b=sets[i+1]||sets[i]; merged.push({reps:Math.min(a.reps,b.reps),load:Math.max(a.load,b.load),rir:b.rir!=null?b.rir:a.rir}); } sets=merged; }
    sets=sets.filter(z=>z.reps>0); if(!sets.length) continue;
    out.push({iso:d,sets,load:Math.max(...sets.map(z=>z.load)),total:sets.reduce((a,z)=>a+z.reps,0),lastRir:sets[sets.length-1].rir});
    if(out.length>=n) break;
  }
  return out;
}
/* progression / consolidation / stagnation probable / régression — une seule baisse n'est pas une régression */
function analyzeTrend(h){
  if(h.length<2) return 'nouveau';
  const same=(x,y)=>Math.abs(x.load-y.load)<0.6;
  const [a,b,c]=h;
  if(a.load>b.load+0.5&&a.total>=b.total*0.8) return 'progression';
  if(!same(a,b)) return 'consolidation';
  if(a.total-b.total>=1) return 'progression';
  const drop=(x,y)=>same(x,y)&&(y.total-x.total)>=Math.max(2,y.total*0.1);
  if(drop(a,b)) return (c&&drop(b,c))?'régression':'consolidation';
  if(c&&same(b,c)&&Math.abs(a.total-c.total)<=1&&Math.abs(a.total-b.total)<=1) return 'stagnation';
  return 'consolidation';
}
const TREND_LABEL={'repère':'Premier repère',nouveau:'Nouveau',progression:'Progression',consolidation:'Consolidation',stagnation:'Stagnation probable','régression':'Régression'};
function nextFeasibleLoad(e,load){
  const kbs=((equipment().kettlebells)||[]).slice().sort((a,b)=>a-b);
  if(/\bKB\b/.test(e.name)&&kbs.length) return kbs.find(k=>k>load+0.1)||null;
  if((equipment().dumbbells||[]).length&&/haltère/i.test(e.name)) return (equipment().dumbbells||[]).slice().sort((a,b)=>a-b).find(k=>k>load+0.1)||null;
  return Math.round((load+2)*2)/2;
}
function addOneRepCatch(t,hi){ return addOneRep(t,Math.max(hi,...t)); } // la série faible peut rejoindre la meilleure
function addOneRep(t,cap){ let k=-1,mn=Infinity; t.forEach((r,i)=>{ if(r<cap&&r<mn){ mn=r; k=i; } }); if(k<0) return t.slice(); const n=t.slice(); n[k]++; return n; }
function recoReps(e,iso){
  if(!e||e.kind!=='strength'||e.maxTest||e.unknown) return null;
  const rg=repRange(e.reps); if(!rg) return null;
  const [lo,hi]=rg; const nSets=Math.max(1,Number(e.sets||1));
  const it=exerciseIntent(e); const h=comparableHistory(e,iso,6);
  const key=e.id||makeId(e.name+'-'+(e.kind||''));
  const conf=h.length<2?'faible':((h[0].lastRir!=null&&h.length>=3&&h.slice(0,3).every(x=>Math.abs(x.load-h[0].load)<0.6))?'élevée':'moyenne');
  const base={key,confidence:conf,goalLabel:it.label||null};
  if(!h.length) return Object.assign(base,{status:'nouveau',action:'start',target:Array(nSets).fill(lo),load:e.bodyweight?0:toNum(e.defaultLoad),why:`Pas encore de séance comparable sur cet exercice : on démarre prudemment au bas de la fourchette (${lo}).`});
  const last=h[0]; const lastLoad=last.load;
  let t=Array.from({length:nSets},(_,i)=>last.sets[i]?last.sets[i].reps:(last.sets[last.sets.length-1]||{reps:lo}).reps);
  const trend=analyzeTrend(h);
  const R=(action,target,load,why)=>Object.assign(base,{status:h.length===1?'repère':trend,action,target,load,why});
  const adj=adjustmentFor(iso);
  if(adj&&adj.level!=='ok'&&toNum(adj.setsDelta)<0) return R('hold',t.map(r=>Math.max(1,r-1)),lastLoad,"Check matinal défavorable : on reconduit un cran en dessous de la dernière séance, sans chercher à progresser aujourd'hui.");
  if(scapCareActive()&&/traction|rowing|tirage/i.test(e.name)) return R('hold',t.map(r=>Math.min(r,hi)),lastLoad,"Gêne omoplates : on maintient le niveau de la dernière séance, arrêt 2-3 reps avant l'échec.");
  if(trend==='régression') return R('reduce',t,lastLoad,"Deux séances de suite en baisse : on reconduit le niveau de la dernière séance, sans en rajouter. Sommeil et récupération d'abord ; si ça continue, avance la semaine allégée.");
  if(last.lastRir===0) return R('hold',t,lastLoad,"Ta dernière série était à l'échec (réserve 0) : on consolide à l'identique avant d'ajouter.");
  // Performance AU-DESSUS de la fourchette sur un pilier : la calibration est trop basse, on le dit (et on n'empile pas)
  if(it.pillar){ const done=last.sets.slice(0,Math.min(nSets,last.sets.length)); if(done.length&&done.every(z=>z.reps>hi)){
    const reps=last.sets.map(z=>z.reps); const est=Math.max(...last.sets.map(z=>z.reps+(z.rir!=null?z.rir:1)), last.sets.length>=3?Math.round(Math.min(...reps)/0.75):0); const lvl=toNum(profileLevel()[it.key]);
    if(est>lvl) return Object.assign(R('level',t,lastLoad,`Tu as fait ${last.sets.map(z=>z.reps).join('/')} alors que la fourchette prévue est ${lo}-${hi} : ton niveau enregistré (${lvl||'non renseigné'}) semble sous-estimé : tenir ${last.sets.length} séries de ${Math.min(...last.sets.map(z=>z.reps))} suppose un max d'environ ${est} (une série de travail ≈ 75 % du max${last.sets.some(z=>z.rir!=null)?', ta réserve saisie confirme':''}). Mets-le à jour : la fourchette se recalera. D'ici là, garde ce niveau de séries.`),{levelSuggest:{key:it.key,val:est,label:it.label}});
    return R('hold',t,lastLoad,`Tu dépasses la fourchette (${lo}-${hi}) mais ton niveau (${lvl}) est cohérent : garde ces séries avec 2 reps en réserve.`); } }
  const top=x=>x&&x.sets.length>=nSets&&x.sets.slice(0,nSets).every(z=>z.reps>=hi)&&(x.lastRir==null||x.lastRir>=1);
  const twiceTop=top(h[0])&&top(h[1])&&Math.abs(h[0].load-h[1].load)<0.6;
  if(it.type==='double'){
    if(twiceTop){ const nl=nextFeasibleLoad(e,lastLoad); if(nl&&lastLoad>0&&nl/lastLoad<=1.2) return R('load',Array(nSets).fill(lo),nl,`Haut de fourchette (${hi}) atteint deux fois à ${lastLoad} kg avec de la réserve : on passe à ${nl} kg en repartant à ${lo} répétitions.`);
      return R('reps',t.map(r=>Math.min(r+1,hi+3)),lastLoad,nl?`La charge suivante (${nl} kg) serait un saut de +${Math.round((nl/lastLoad-1)*100)} % : on continue en répétitions (jusqu'à ${hi+3}) ou en ralentissant la descente, plutôt que d'imposer ce saut.`:"Pas de charge supérieure disponible : on progresse en répétitions et en tempo."); }
    if(trend==='stagnation') return R('hold',t,lastLoad,"Trois séances au même niveau : c'est une phase de consolidation, pas un échec. On garde la charge ; un repos un peu plus long (+30 s) peut débloquer.");
    return R('reps',addOneRepCatch(t,hi),lastLoad,`Double progression : on ajoute une répétition sur la série la plus faible, jusqu'à ${hi} partout, avant de toucher à la charge.`);
  }
  if(trend==='stagnation') return R('hold',t,lastLoad,"Trois séances comparables au même niveau : consolidation. On ne change rien d'autorité ; garde la technique stricte et la réserve.");
  if(it.type==='endurance'){
    const add=(last.lastRir!=null&&last.lastRir>=3)?2:1; let n=t.slice(); for(let k=0;k<add;k++) n=addOneRep(n,hi+5);
    const goal=toNum(profileGoals()[it.key]);
    return R('reps',n,lastLoad,`Objectif ${goal?goal+' ':''}${it.key==='squats'?'squats':'pompes'} continus : on augmente doucement le volume de travail (+${add} répétition${add>1?'s':''}), toujours en sous-maximal. Le max continu se mesure aux tests.`);
  }
  if(it.type==='multiset'||it.type==='reps_then_load'){
    if(twiceTop) return R('hold',t,lastLoad,it.type==='reps_then_load'?`Fourchette maîtrisée (${hi}) deux fois : la prochaine étape sera les dips lestés (suivis à part) ; ta calibration montera aussi au prochain test.`:`Fourchette maîtrisée (${hi}) deux fois : le prochain test de max relèvera ta calibration ; d'ici là on consolide.`);
    const goal=toNum(profileGoals()[it.key]);
    return R('reps',addOneRepCatch(t,hi),lastLoad,it.type==='multiset'?`Vers ${nSets>=4?'4 × ':''}${goal||10} : une répétition de plus sur la série la plus faible, en gardant de la réserve.`:`Vers ${goal||20} dips propres : une répétition de plus sur la série la plus faible.`);
  }
  return R('reps',addOneRepCatch(t,hi),lastLoad,`Une répétition de plus sur la série la plus faible (fourchette ${lo}-${hi}).`);
}
/* Garde-fou d'explication : une proposition « +1 répétition » qui ne change rien devient une consolidation honnête */
function recoRepsChecked(e,iso){ const r=recoReps(e,iso); if(!r||r.action!=='reps') return r;
  const h=comparableHistory(e,iso,1); if(!h.length) return r; const n=Math.max(1,Number(e.sets||1));
  const t=Array.from({length:n},(_,i)=>h[0].sets[i]?h[0].sets[i].reps:(h[0].sets[h[0].sets.length-1]||{reps:0}).reps);
  if(r.target.join('/')===t.join('/')) return Object.assign({},r,{action:'hold',why:"Tu es déjà au haut de la fourchette sur toutes les séries : on consolide à l'identique ; le prochain test de max relèvera la calibration."});
  return r; }
/* Exercices au temps (planche, corde, hollow…) : on progresse en secondes, une variable à la fois */
function recoTime(e,iso){
  if(!e||e.kind!=='strength'||e.maxTest) return null;
  const n=(String(e.reps||'').match(/\d+/g)||[]).map(Number); if(!n.length) return null;
  const hi=Math.max(...n), nSets=Math.max(1,Number(e.sets||1)); const key=e.id||makeId(e.name+'-'+(e.kind||''));
  const h=comparableHistory(e,iso,4); const conf=h.length<2?'faible':'moyenne';
  if(!h.length) return {key,confidence:'faible',status:'nouveau',action:'start',target:Array(nSets).fill(Math.min(...n)),load:0,why:'Pas encore de séance comparable : on démarre au bas de la plage.',unit:'s'};
  const t=Array.from({length:nSets},(_,i)=>h[0].sets[i]?h[0].sets[i].reps:(h[0].sets[h[0].sets.length-1]||{reps:hi}).reps);
  const trend=analyzeTrend(h);
  if(trend==='régression') return {key,confidence:conf,status:trend,action:'reduce',target:t,load:0,why:'Deux séances en baisse : on reconduit sans allonger.',unit:'s'};
  const allTop=t.every(x=>x>=hi);
  const nt=allTop?t.map(x=>x+5):(()=>{ const k=t.indexOf(Math.min(...t)); const c=t.slice(); c[k]=Math.min(Math.max(...t),c[k]+5); return c; })();
  return {key,confidence:conf,status:trend,action:'reps',target:nt,load:0,unit:'s',why:allTop?`Toutes les séries tenues ${hi} s : +5 s par série (on n'augmente ni le nombre de séries ni la difficulté en même temps).`:'+5 s sur la série la plus courte, pour égaliser avant d\'allonger.'};
}
function recoState(key){ const s=getSession(selectedDate); return (s.recos||{})[key]||null; }
function setLevelFromReco(k,v){ if(!k||!(v>0)) return; state.profile=state.profile||{}; state.profile.level=Object.assign({},state.profile.level,{[k]:v}); saveState({sync:false}); prToast('Niveau mis à jour : '+v+' (la fourchette est recalculée)'); }
function setReco(key,act,exOpt){ const s=getSession(selectedDate); s.recos=s.recos||{};
  if(act==='reset'){ delete s.recos[key]; }
  else { const e=exOpt||allExercisesForSession(selectedDate).find(x=>(x.id||makeId(x.name+'-'+(x.kind||'')))===key); const r=e&&recommendFor(e,selectedDate); if(!r) return; s.recos[key]={status:act==='accept'?'accepted':'refused',target:r.target,load:r.load,action:r.action,at:new Date().toISOString()}; }
  saveState({sync:false});
}
function recoHtml(e,key){
  const st=recoState(key); const r=recommendFor(e,selectedDate); if(!r) return '';
  const fmt=x=>`${x.target.join(' / ')}${x.unit==='s'||(r&&r.unit==='s')?' s':''}${toNum(x.load)?' · '+x.load+' kg':''}`;
  if(st&&st.status==='refused') return `<div class="reco reco-min"><span class="muted">Proposition ignorée</span><button class="ghost small" type="button" data-reco="reset" data-key="${esc(key)}">Réafficher</button></div>`;
  if(st&&st.status==='accepted') return `<div class="reco reco-ok"><span>✓ Proposition appliquée : <strong>${esc(fmt(st))}</strong> <small class="muted">(modifiable série par série)</small></span><button class="ghost small" type="button" data-reco="reset" data-key="${esc(key)}">Annuler</button></div>`;
  return `<div class="reco"><div class="reco-head"><span class="eyebrow" style="margin:0">Proposition</span><span class="reco-chip reco-st-${esc(r.status)}">${esc(TREND_LABEL[r.status]||r.status)}</span><span class="reco-chip">Confiance ${esc(r.confidence)}</span></div><p class="reco-target">${esc(fmt(r))}</p><details><summary>Pourquoi ?</summary><p class="muted">${esc(r.why)}</p><p class="muted" style="font-size:12px">La confiance décrit la quantité et la cohérence de tes données, pas une probabilité de réussite.</p></details><div class="reco-actions">${r.levelSuggest?`<button class="primary small" type="button" data-reco="level" data-key="${esc(key)}" data-lvlkey="${esc(r.levelSuggest.key)}" data-val="${r.levelSuggest.val}">Mettre mon niveau ${esc(r.levelSuggest.label||'')} à ${r.levelSuggest.val}</button>`:''}<button class="${r.levelSuggest?'ghost':'primary'} small" type="button" data-reco="accept" data-key="${esc(key)}">Appliquer</button><button class="ghost small" type="button" data-reco="refuse" data-key="${esc(key)}">Ignorer</button></div></div>`;
}
/* ---- Records : par variante, uniquement sur des séries réellement validées ---- */
function variantBests(name,excludeIso,excludeFreeId){
  const cn=canonicalExerciseName(name); const b={maxLoad:0,repsAtLoad:{},bestE1:0,maxReps:0,found:false};
  allCompletedSessions().forEach(({iso,s})=>{
    if(iso===excludeIso&&(!s.freeMode||!excludeFreeId||state.freeSessions[excludeFreeId]===s)) return;
    const exs=s.freeMode?(s.extraExercises||[]):plannedExercisesFor(iso,s);
    exs.filter(x=>!x.unknown&&canonicalExerciseName(x.name)===cn).forEach(x=>{ const log=s.exercises&&s.exercises[x.id||makeId(x.name+'-'+(x.kind||''))]; if(!log) return;
      (log.sets||[]).filter(z=>z.done).forEach(z=>{ const reps=setRepsPerSide(z,parseReps(z.actual)||0); if(!reps) return; const ld=setLoadOf(x,z); const eff=x.bodyweight?currentBodyWeight(iso)+ld:ld;
        b.found=true; b.maxLoad=Math.max(b.maxLoad,ld); const k=String(Math.round(ld*2)/2); b.repsAtLoad[k]=Math.max(b.repsAtLoad[k]||0,reps); b.maxReps=Math.max(b.maxReps,reps); if(!isTimedExercise(x)) b.bestE1=Math.max(b.bestE1,eff*(1+reps/30)); }); });
  });
  return b;
}
function setRecordLabel(e,set){
  if(!e||e.kind!=='strength'||!set||!set.done) return '';
  const reps=setRepsPerSide(set,parseReps(set.actual)||0); if(!reps) return '';
  const b=variantBests(e.name,selectedDate,selectedFreeId); if(!b.found) return ''; // première fois : pas de faux record
  const ld=setLoadOf(e,set); const k=String(Math.round(ld*2)/2); const unit=isTimedExercise(e)?' s':' reps';
  if(ld>0&&ld>b.maxLoad+0.1&&!e.bodyweight) return `Record de charge : ${ld} kg`;
  if(e.bodyweight&&ld>0&&ld>b.maxLoad+0.1) return `Record de lest : +${ld} kg`;
  if(b.repsAtLoad[k]!=null&&reps>b.repsAtLoad[k]) return ld>0?`Record : ${reps}${unit} à ${ld} kg`:`Record de répétitions : ${reps}${unit}`;
  if(b.repsAtLoad[k]==null&&reps>b.maxReps&&ld===0) return `Record de répétitions : ${reps}${unit}`;
  const eff=e.bodyweight?currentBodyWeight(selectedDate)+ld:ld;
  if(!isTimedExercise(e)&&eff>0&&eff*(1+reps/30)>b.bestE1+0.5) return 'Meilleure série (1RM estimé)';
  return '';
}
function prToast(label){ if(!label) return; const t=document.createElement('div'); t.className='toast pr-toast'; t.textContent='🏆 '+label; document.body.appendChild(t); setTimeout(()=>t.remove(),2600); }
/* ---- RIR en un tap, sur la dernière série des piliers ---- */
function isPillarEx(e){ return !!(e&&e.kind==='strength'&&!isTimedExercise(e)&&GRADE_FAMILIES_DEF.find(f=>f.match(e.name))); }
function rirChipsHtml(key,i,cur){ return `<div class="rir-row"><span class="muted">Il t'en restait combien ?</span>${[0,1,2,3].map(v=>`<button type="button" class="rir-chip${cur!=null&&cur!==''&&toNum(cur)===v?' active':''}" data-rir="${v}" data-key="${esc(key)}" data-set="${i}">${v===3?'3+':v}</button>`).join('')}</div>`; }
function setRir(key,i,v){ const s=getSession(selectedDate); const log=s.exercises&&s.exercises[key]; if(log&&log.sets[i]){ log.sets[i].rir=v; if(s.focusRirAsk&&s.focusRirAsk.key===key) delete s.focusRirAsk; saveState(); } }
function addMaxTests(plan, week){
  if(!plan||!Array.isArray(plan.exercises)||!maxTestsEnabled()||!strengthEnabled()) return plan;
  const t=String(plan.title||'');
  let picks=[];
  // Fin de semaine allégée : le jeudi (Haut du corps 2). Tractions à chaque cycle, pompes et dips en alternance.
  if(/haut du corps 2/i.test(t)) picks=[['Tractions','pullups'], (Math.floor((Math.max(1,week||1)-1)/4)%2===0)?['Pompes','pushups']:['Dips','dips']];
  else if(/jambes/i.test(t)) picks=[['Squats poids du corps','squats']];
  if(!picks.length) return plan;
  const lvl=profileLevel();
  const fams=GRADE_FAMILIES_DEF.filter(f=>picks.some(([,k])=>k===f.key));
  const tests=picks.map(([n,k])=>{ const cur=toNum(lvl[k]);
    if(k==='pullups'&&scapCareActive()) return Object.assign(ex(n,1,'RIR 2',"Pas de max tant que la gêne omoplates dépasse 3/10 : une série en t'arrêtant 2 reps avant l'échec",180),{id:'test-max-'+progId(n),maxTest:true,submax:true,testKey:k,testLevel:cur});
    return Object.assign(ex(n,1,'max',`Test de max : 1 série facile d'échauffement, puis UNE série au maximum, technique stricte, sans lest${cur?` · ton niveau : ${cur}, vise ${cur+1}+`:''}`,180),{id:'test-max-'+progId(n),maxTest:true,testKey:k,testLevel:cur}); });
  const rest=plan.exercises.filter(x=>!(x.kind!=='mobility'&&fams.some(f=>f.match(x.name))));
  let at=0; while(at<rest.length&&rest[at].kind==='mobility') at++;
  rest.splice(at,0,...tests);
  return Object.assign({},plan,{exercises:rest,maxTestDay:true,title:t+' · 🎯 Test de max',
    objective:`Fin de semaine allégée, tu es frais : échauffe-toi, puis ${tests.map(x=>x.name.toLowerCase()).join(' puis ')}, 3 min de récupération complète entre chaque. Le résultat met ton niveau à jour ; la suite de la séance reste allégée.`});
}
/* --- Remplacer un exercice : pour cette séance, ou à partir de ce jour --- */
function exKey(e){ return e.id || makeId(e.name + '-' + (e.kind || '')); }
function buildSwap(e,name,key){
  const lib=availableLibrary().find(x=>x.name===name) || (typeof EXERCISE_LIBRARY!=='undefined'?EXERCISE_LIBRARY.find(x=>canonicalExerciseName(x.name)===name):null) || {};
  const r=Object.assign({},e,{name,id:undefined,srcName:undefined,subbedFrom:undefined,loadSnapped:false,swappedFrom:e.swappedFrom||e.name,swapKey:key,
    kind:lib.kind||e.kind, muscles:lib.muscles||e.muscles, bodyweight:lib.bodyweight!==undefined?!!lib.bodyweight:!!e.bodyweight,
    defaultLoad:lib.defaultLoad||0, reps:lib.defaultReps||e.reps, restSec:lib.restSec!=null?lib.restSec:e.restSec, timed:!!lib.timed});
  return substituteForEquipment(r);
}
function swapTargetFor(e,iso,sess){
  const key=exKey(e);
  const s1=sess&&sess.swaps&&sess.swaps[key]; if(s1) return {name:s1,key};
  const p=state.exerciseSwaps&&state.exerciseSwaps[canonicalExerciseName(e.name)];
  if(p&&p.to&&(!p.from||iso>=p.from)) return {name:p.to,key};
  return null;
}
function applySwap(e,iso,sess){ if(!e||e.maxTest) return e; const t=swapTargetFor(e,iso,sess); return (t&&t.name!==e.name)?buildSwap(e,t.name,t.key):e; }
function swapCandidates(e){
  const zE=exerciseZoneWeights(e); const m0=(e.muscles||[])[0];
  const primary=z=>{ let best='Autres',bw=0; Object.entries(z).forEach(([k,v])=>{ if(v>bw){bw=v;best=k;} }); return best; };
  return availableLibrary().filter(x=>x.kind!=='run'&&x.kind!=='bike'&&x.kind!=='activity'&&x.name!==e.name).map(x=>{
    const zX=exerciseZoneWeights(x); let score=0; Object.keys(zE).forEach(k=>{ score+=Math.min(zE[k]||0,zX[k]||0); });
    if(m0&&(x.muscles||[])[0]===m0) score+=0.5;
    if(e.kind===x.kind) score+=0.05;
    return {x,score,zone:primary(zX)};
  }).sort((a,b)=>b.score-a.score||a.x.name.localeCompare(b.x.name,'fr'));
}
function openSwapPicker(exid){
  const e=exerciseById(exid); if(!e) return;
  const iso=selectedDate; const sess=getSession(iso);
  const extra=(sess.extraExercises||[]).find(x=>x.id===exid);
  const cands=swapCandidates(e);
  const similar=cands.filter(c=>c.score>=0.6).slice(0,12);
  const simNames=new Set(similar.map(c=>c.x.name));
  const groups={}; cands.filter(c=>!simNames.has(c.x.name)).forEach(c=>{ (groups[c.zone]=groups[c.zone]||[]).push(c); });
  const item=c=>`<button type="button" class="swap-item" data-swapname="${esc(c.x.name)}"><strong>${esc(c.x.name)}</strong><small class="muted">${esc((c.x.muscles||[]).join(' · '))}${c.x.defaultReps?' · '+esc(c.x.defaultReps):''}</small></button>`;
  const section=(title,list)=>list.length?`<p class="eyebrow" style="margin:14px 0 6px">${esc(title)}</p>${list.map(item).join('')}`:'';
  const o=document.createElement('div'); o.className='sheet-overlay';
  o.innerHTML=`<div class="sheet"><div class="between"><div><h3 style="margin:0">⇄ Remplacer « ${esc(e.name)} »</h3><p class="muted" style="margin:2px 0 0">Les séries prévues sont conservées, reps et repos s'adaptent au nouvel exercice.</p></div><button class="ghost small" type="button" data-close>✕</button></div>${extra?'':`<label style="display:flex;align-items:center;gap:10px;margin-top:10px"><input type="checkbox" id="swapAlways" style="width:auto;transform:scale(1.2)"><span>Remplacer aussi dans les prochaines séances</span></label>`}${e.swappedFrom&&!extra?`<button type="button" class="ghost" id="swapRevert" style="margin-top:10px">↩ Revenir à « ${esc(e.swappedFrom)} »</button>`:''}<input id="swapSearch" type="text" placeholder="Rechercher un exercice…" style="margin-top:10px"><div id="swapList">${section('Exercices similaires',similar)}${Object.keys(groups).sort((a,b)=>a.localeCompare(b,'fr')).map(z=>section(z,groups[z])).join('')}</div></div>`;
  document.body.appendChild(o);
  const close=()=>o.remove();
  pushOverlay(close);
  o.querySelector('[data-close]').onclick=requestCloseOverlay;
  o.addEventListener('click',ev=>{ if(ev.target===o) requestCloseOverlay(); });
  const srch=o.querySelector('#swapSearch'); if(srch) srch.oninput=()=>{ const q=srch.value.trim().toLowerCase(); o.querySelectorAll('.swap-item').forEach(b=>{ b.style.display=(!q||b.dataset.swapname.toLowerCase().includes(q))?'':'none'; }); };
  const done=msg=>{ saveState(); renderSession(); requestCloseOverlay(); const t=document.createElement('div'); t.className='toast'; t.textContent=msg; document.body.appendChild(t); setTimeout(()=>t.remove(),2400); };
  const rv=o.querySelector('#swapRevert'); if(rv) rv.onclick=()=>{ const k=e.swapKey; if(sess.swaps&&k) delete sess.swaps[k]; const orig=canonicalExerciseName(e.swappedFrom); if(state.exerciseSwaps&&state.exerciseSwaps[orig]) state.exerciseSwaps[orig]={to:orig,from:iso}; done('Exercice d\'origine rétabli ✔'); };
  o.querySelectorAll('[data-swapname]').forEach(b=>b.onclick=()=>{
    const name=b.dataset.swapname;
    if(extra){ const lib=availableLibrary().find(x=>x.name===name)||{}; Object.assign(extra,{name,kind:lib.kind||extra.kind,muscles:lib.muscles||extra.muscles,bodyweight:!!lib.bodyweight,defaultLoad:lib.defaultLoad||0,reps:lib.defaultReps||extra.reps,restSec:lib.restSec!=null?lib.restSec:extra.restSec}); return done('Exercice remplacé ✔'); }
    const key=e.swapKey||exKey(e);
    const always=o.querySelector('#swapAlways')&&o.querySelector('#swapAlways').checked;
    if(always){ state.exerciseSwaps=state.exerciseSwaps||{}; state.exerciseSwaps[canonicalExerciseName(e.swappedFrom||e.name)]={to:name,from:iso}; if(sess.swaps) delete sess.swaps[key]; }
    else { sess.swaps=sess.swaps||{}; sess.swaps[key]=name; }
    done(always?'Remplacé dans cette séance et les suivantes ✔':'Remplacé pour cette séance ✔');
  });
}
function substituteForEquipment(e){
  if(!e||e.kind==='run'||e.kind==='bike'||e.kind==='activity') return e;
  const eq=equipment(); const n=String(e.name||'');
  const UNI=/\s*\/\s*(bras|c[oô]t[eé]|jambe|sens)(?![a-zà-ÿ])/i;
  // Remplaçant calibré : séries conservées, reps/repos/muscles de la fiche du remplaçant
  const sub=(name)=>{
    const lib=(typeof EXERCISE_LIBRARY!=='undefined'?EXERCISE_LIBRARY.find(x=>x.name===name):null)||{};
    const reps=lib.defaultReps || (UNI.test(String(e.reps||''))&&!UNI.test(name)?String(e.reps).replace(UNI,''):e.reps);
    return Object.assign({},e,{name,subbedFrom:e.name,id:undefined,srcName:undefined,defaultLoad:0,bodyweight:lib.bodyweight!==undefined?!!lib.bodyweight:true,reps,restSec:lib.restSec!=null?lib.restSec:e.restSec,muscles:lib.muscles||e.muscles,kind:lib.kind||e.kind,loadSnapped:false});
  };
  const pullAlt=()=>eq.dipStation?sub('Traction australienne'):(eq.bands?sub('Rowing élastique'):sub('Rowing inversé sous table'));
  if(/traction/i.test(n) && !/australienne/i.test(n) && !eq.pullupBar) return pullAlt();
  if(/relevés de jambes suspendu/i.test(n) && !eq.pullupBar) return sub('Dead bug');
  if(/^dips/i.test(n) && !eq.dipStation) return eq.bench?sub('Dips sur banc'):sub('Pompes déclinées');
  if(/gilet|\blesté/i.test(n) && !eq.vest){ const base=n.replace(/\s*\(?gilet[^)]*\)?/i,'').replace(/\s+lesté(e)?s?\b/i,'').trim(); return Object.assign(sub(base||n),{reps:e.reps}); }
  if(/roulette/i.test(n) && !eq.abWheel) return sub('Planche');
  if(/leg curl glissé/i.test(n) && !eq.sliders) return sub('Pont fessier une jambe');
  if(/corde à sauter/i.test(n) && !eq.jumpRope) return sub('Mountain climbers lents');
  if(/TRX|anneaux/i.test(n) && !eq.trx) return pullAlt();
  if(/élastique|pull-apart/i.test(n) && !eq.bands){
    if(/rowing|tirage/i.test(n)) return sub('Rowing inversé sous table');
    if(/curl/i.test(n)) return sub('Rowing inversé sous table prise supination');
    if(/pallof/i.test(n)) return sub('Planche latérale');
    return sub(n.replace(/élastique/i,'serviette').trim());
  }
  const isKb=/\bKB\b|kettlebell|goblet|swing|farmer|suitcase|high pull|arraché|windmill|\bRDL\b/i.test(n) || (toNum(e.defaultLoad)>0 && /\d+\s*kg/i.test(n) && !/haltère|gilet/i.test(n));
  if(isKb){
    const kbs=eq.kettlebells||[];
    if(!kbs.length){
      if((eq.dumbbells||[]).length){ const dl=nearestDb(toNum(e.defaultLoad)); return Object.assign({},e,{name:n.replace(/\bKB\b/g,'haltère').replace(/kettlebell/ig,'haltère').replace(/\s*\d+(?:[.,]\d+)?\s*kg/ig,''),subbedFrom:e.name,id:undefined,srcName:undefined,defaultLoad:dl}); }
      if(/halo|around the world/i.test(n)) return sub('Cercles de bras');
      if(/élévations latérales/i.test(n)) return eq.bands?sub('Élévations latérales élastique'):sub('Y-T-W au sol');
      if(/shrugs/i.test(n)) return eq.bands?sub('Shrugs élastique'):sub('Y-T-W au sol');
      if(/carry|windmill|get-up/i.test(n)) return sub('Planche latérale');
      if(/renegade/i.test(n)) return sub('Planche toucher d\'épaule');
      if(/extension triceps/i.test(n)) return sub('Pompes prise serrée');
      if(/pull-over/i.test(n)) return pullAlt();
      if(/presse au sol/i.test(n)) return sub('Pompes');
      if(/rdl|good morning/i.test(n)) return eq.bands?sub('Good morning élastique'):sub('Pont fessier une jambe');
      if(/snatch|clean|high pull|arraché/i.test(n)) return sub('Squats sautés');
      if(/goblet|squat/i.test(n)) return sub('Squats poids du corps');
      if(/swing/i.test(n)) return eq.bands?sub('Good morning élastique'):sub('Pont fessier');
      if(/développé|press/i.test(n)) return sub('Pompes piquées');
      if(/curl/i.test(n)) return eq.bands?sub('Curl élastique'):sub('Rowing inversé sous table prise supination');
      if(/rowing|tirage/i.test(n)) return pullAlt();
      return sub((n.replace(/\bKB\b/g,'').replace(/kettlebell/ig,'').replace(/\s*\d+(?:[.,]\d+)?\s*kg/ig,'').replace(/\s{2,}/g,' ').trim()||n)+' (poids du corps)');
    }
    // Un seul exercice par mouvement : on ne renomme plus, on suggère la KB possédée la plus proche
    const snapped=nearestKb(e.defaultLoad);
    if(snapped && snapped!==toNum(e.defaultLoad)) return Object.assign({},e,{defaultLoad:snapped,loadSnapped:true,origLoad:toNum(e.defaultLoad)});
  }
  return e;
}
function nearestDb(load){
  const ds=(equipment().dumbbells||[]).slice().sort((a,b)=>a-b);
  if(!ds.length||!toNum(load)) return toNum(load)||0;
  const lower=ds.filter(k=>k<=toNum(load));
  return lower.length?lower[lower.length-1]:ds[0];
}
function availableLibrary(){
  const eq=equipment(); const extra=[];
  if(eq.abWheel) extra.push({name:'Roulette abdominale',kind:'strength',muscles:['gainage'],bodyweight:true,defaultLoad:0,restSec:90,defaultReps:'8-12'});
  if(eq.trx){ extra.push({name:'Rowing TRX',kind:'strength',muscles:['dos','biceps'],bodyweight:true,defaultLoad:0,restSec:90,defaultReps:'10-12'}); extra.push({name:'Pompes TRX',kind:'strength',muscles:['pectoraux','gainage'],bodyweight:true,defaultLoad:0,restSec:90,defaultReps:'8-12'}); }
  if((eq.dumbbells||[]).length){ extra.push({name:'Développé haltère unilatéral',kind:'strength',muscles:['epaules','triceps'],bodyweight:false,defaultLoad:nearestDb(12),restSec:120,defaultReps:'8-10'}); extra.push({name:'Rowing haltère unilatéral',kind:'strength',muscles:['dos','biceps'],bodyweight:false,defaultLoad:nearestDb(16),restSec:90,defaultReps:'10-12'}); extra.push({name:'Curl haltères',kind:'strength',muscles:['biceps'],bodyweight:false,defaultLoad:nearestDb(10),restSec:90,defaultReps:'10-12'}); }
  if(eq.parallettes) extra.push({name:'L-sit parallettes',kind:'strength',muscles:['gainage','triceps'],bodyweight:true,defaultLoad:0,restSec:90,defaultReps:'15-30s'});
  const base=EXERCISE_LIBRARY.filter(x=>{
    const n=x.name;
    if(/traction/i.test(n)&&!/australienne/i.test(n)&&!eq.pullupBar) return false;
    if(/^dips/i.test(n)&&!eq.dipStation) return false;
    if(/gilet/i.test(n)&&!eq.vest) return false;
    if(/roulette/i.test(n)&&!eq.abWheel) return false;
    if(/élastique|pallof/i.test(n)&&!eq.bands) return false;
    if(/australienne/i.test(n)&&!eq.dipStation&&!eq.pullupBar) return false;
    if(/corde à sauter/i.test(n)&&!eq.jumpRope) return false;
    if(/leg curl glissé/i.test(n)&&!eq.sliders) return false;
    if(/step-up/i.test(n)&&!eq.step&&!eq.bench) return false;
    if(/suspendu/i.test(n)&&!eq.pullupBar) return false;
    if((/\bKB\b|kettlebell|goblet|swing/i.test(n))&&!(eq.kettlebells||[]).length) return false;
    return true;
  });
  const seen=new Set();
  const snapLib=x=>{
    const name=canonicalExerciseName(x.name);
    let dl=x.defaultLoad;
    if(!x.bodyweight&&(eq.kettlebells||[]).length&&toNum(dl)&&/\bKB\b/.test(name)) dl=nearestKb(dl);
    return Object.assign({},x,{name,srcName:x.name,defaultLoad:dl});
  };
  return base.concat(extra).map(snapLib).filter(x=>{ if(seen.has(x.name)) return false; seen.add(x.name); return true; });
}
/* --- Lot 7 : finisher tronc rotatif + créneaux d'accessoires anti-monotonie --- */
const CORE_POOL=[
  {n:'Planche',reps:'45-60 s',rest:45},
  {n:'Planche latérale',reps:'30-40 s/côté',rest:45},
  {n:'Hollow hold',reps:'20-30 s',rest:45},
  {n:'Dead bug',reps:'10/côté',rest:45},
  {n:'Mountain climbers lents',reps:'12/côté',rest:45},
  {n:'Pallof press élastique',reps:'10/côté',rest:45},
  {n:'Windmill kettlebell 8 kg',reps:'6/côté',rest:60},
  {n:'Relevés de jambes suspendu',reps:'8-12',rest:60},
  {n:'Roulette abdominale',reps:'6-10',rest:60},
  {n:'Bird dog',reps:'8/côté',rest:30}
];
function corePoolAvailable(){
  const eq=equipment();
  return CORE_POOL.filter(c=>{
    if(/roulette/i.test(c.n)) return !!eq.abWheel;
    if(/élastique|pallof/i.test(c.n)) return !!eq.bands;
    if(/suspendu/i.test(c.n)) return !!eq.pullupBar;
    if(/kettlebell/i.test(c.n)) return (eq.kettlebells||[]).length>0;
    return true;
  });
}
function coreFinisher(week,slot){
  const pool=corePoolAvailable(); if(!pool.length) return [];
  const i=((week*3+slot*2)%pool.length+pool.length)%pool.length;
  const j=(i+Math.max(1,Math.floor(pool.length/2)))%pool.length;
  const mk=c=>ex(c.n,3,c.reps,'Finisher tronc',c.rest);
  return i===j?[mk(pool[i])]:[mk(pool[i]),mk(pool[j])];
}
const REF_LEVEL={pushups:15,pullups:7,dips:13,squats:25}; // calibration d'origine du programme
const LEVEL_PREFIX={pushups:/^pompes/i,pullups:/^tractions/i,dips:/^dips/i,squats:/^squats/i};
function levelFactorFor(name){
  const key=Object.keys(LEVEL_PREFIX).find(k=>LEVEL_PREFIX[k].test(String(name||'').trim())); if(!key) return 1;
  const lvl=toNum(profileLevel()[key]); if(!lvl) return 1;
  return Math.min(2,Math.max(0.4,lvl/REF_LEVEL[key]));
}
function scaleRepsStr(reps,factor){ return String(reps).replace(/\d+/g,n=>String(Math.max(1,Math.round(Number(n)*factor)))); }
const PCT_OF_MAX={force:[0.5,0.6],volume:[0.6,0.75],puissance:[0.4,0.5],emom:[0.35,0.4]};
/* Mouvements de référence (pompes, tractions, dips, squats PDC) : reps = % de TON max selon l'intention du bloc */
function scaleExerciseToLevel(e, block){
  if(!e||e.kind!=='strength'||!e.reps) return e;
  if(/max|min|\d\s*s\b/i.test(String(e.reps))) return e;
  const fam=GRADE_FAMILIES_DEF.find(f=>f.match(e.name));
  const lvl=fam?toNum(profileLevel()[fam.key]):0;
  if(fam && lvl>0 && /^\s*\d+(\s*-\s*\d+)?\s*$/.test(String(e.reps))){
    const intent=/emom/i.test(e.target||'')?'emom':(PCT_OF_MAX[block]?block:'volume');
    let [a,b]=PCT_OF_MAX[intent];
    if(fam.key==='pullups'&&scapCareActive()) b=Math.min(b,0.6);
    const lo=Math.max(1,Math.round(lvl*a)), hi=Math.max(lo,Math.round(lvl*b));
    const reps=lo===hi?String(lo):`${lo}-${hi}`;
    return reps===String(e.reps)?e:Object.assign({},e,{reps,repsScaled:true,origReps:e.reps,pctNote:`calibré sur ton max (${lvl}) : ${Math.round(a*100)}-${Math.round(b*100)} %`});
  }
  const factor=levelFactorFor(e.name);
  if(Math.abs(factor-1)<=0.15) return e;
  const nice=v=>v>12?Math.round(v/5)*5:v; return Object.assign({},e,{reps:String(scaleRepsStr(e.reps,factor)).replace(/\d+/g,x=>String(nice(Number(x)))),repsScaled:true,origReps:e.reps});
}
function scalePlanToLevel(plan, block){ if(!plan||!Array.isArray(plan.exercises)) return plan; return Object.assign({},plan,{exercises:plan.exercises.map(e=>scaleExerciseToLevel(e, block))}); }
/* --- Lot 6c : rythme hebdo, durée de séance, date cible, mode de départ --- */
/* --- Disciplines travaillées + objectif de programmation --- */
/* --- Sports maison (intégrés au programme) + activités sportives (dépense énergétique) --- */
const HOME_SPORTS={
  pilates:{label:'Pilates',seq:()=>[mob('The hundred (Pilates)',3,'30-45 s','Gainage profond, respiration',45),mob('Roll-up (Pilates)',3,'6-8','Déroulé vertèbre par vertèbre',30),mob('Swimming au sol (Pilates)',3,'10/côté','Chaîne postérieure',30),mob('Pont fessier',3,'12','Fessiers, contrôle',30),mob('Dead bug',3,'10/côté','Coordination, tronc',30)]},
  yoga:{label:'Yoga',seq:()=>[mob('Chien tête en bas (yoga)',3,'45 s','Chaîne postérieure',20),mob('Posture du guerrier (yoga)',3,'30 s/côté','Jambes, équilibre',20),mob('Posture du pigeon (yoga)',2,'45 s/côté','Ouverture hanches',20),mob('Bird dog',3,'8/côté','Stabilité tronc',30)]},
  stretch:{label:'Stretching',seq:()=>[mob('Étirement ischos au sol'.replace('ischos','ischios'),2,'40 s/côté','Ischios',15),mob('Étirement hanches fente basse',2,'40 s/côté','Fléchisseurs de hanche',15),mob('Chien tête en bas (yoga)',2,'45 s','Dos et mollets',20),mob('Y-T-W au sol',2,'8','Épaules et omoplates',30)]}
};
function extraSports(){ const s=state.profile&&state.profile.extraSports; return Array.isArray(s)?s.filter(k=>HOME_SPORTS[k]):[]; }
function applyExtraSports(plan,week){
  const sports=extraSports();
  if(!sports.length||!plan||!isRestDay(plan)) return plan;
  const key=sports[((week%sports.length)+sports.length)%sports.length];
  const sp=HOME_SPORTS[key];
  return Object.assign({},plan,{title:`Repos actif · ${sp.label}`,objective:`Séance ${sp.label} douce à la maison (~20-25 min) : récupération active sans entamer la semaine.`,exercises:plan.exercises.concat(sp.seq())});
}
const SPORT_ACTIVITIES=[
  {key:'foot',label:'Football',met:8,muscles:['jambes','gainage']},
  {key:'jjb',label:'JJB / grappling',met:10,muscles:['dos','gainage','jambes']},
  {key:'boxe',label:'Boxe / sports de frappe',met:9,muscles:['epaules','gainage','jambes']},
  {key:'badminton',label:'Badminton',met:5.5,muscles:['jambes','epaules']},
  {key:'tennis',label:'Tennis',met:7.5,muscles:['jambes','epaules']},
  {key:'padel',label:'Padel / squash',met:7,muscles:['jambes','epaules']},
  {key:'basket',label:'Basketball',met:6.5,muscles:['jambes','gainage']},
  {key:'volley',label:'Volleyball',met:4,muscles:['jambes','epaules']},
  {key:'natation',label:'Natation',met:7,muscles:['dos','epaules','gainage']},
  {key:'escalade',label:'Escalade',met:8,muscles:['dos','biceps','gainage']},
  {key:'rando',label:'Randonnée',met:6,muscles:['jambes']},
  {key:'ski',label:'Ski / snowboard',met:7,muscles:['jambes','gainage']},
  {key:'danse',label:'Danse',met:5,muscles:['jambes','gainage']},
  {key:'foot5',label:'Futsal / five',met:9,muscles:['jambes','gainage']}
];
function sportKcal(met,minutes){ return Math.round(met*currentBodyWeight()*(Math.max(0,minutes)/60)); }
const GOAL_SEQUENCES={perf:['force','volume','puissance'],muscle:['volume','force','volume'],perte:['volume','puissance','volume']};
const GOAL_CARDIO_FACTOR={perf:1,muscle:0.85,perte:1.25};
function disciplines(){ return Object.assign(isNewInstall()?{run:false,bike:false,strength:false}:{run:true,bike:true,strength:true},(state.profile&&state.profile.disciplines)||{}); }
function programGoal(){ const g=state.profile&&state.profile.programGoal; return GOAL_SEQUENCES[g]?g:'perf'; }
function bikeEnabled(){ const eq=equipment(); return disciplines().bike!==false && (eq.trainer||eq.bike); }
function runEnabled(){ return disciplines().run!==false; }
function strengthEnabled(){ return disciplines().strength!==false; }
function applyDisciplines(plan){
  if(!plan||!Array.isArray(plan.exercises)) return plan;
  let exs=plan.exercises.slice(); let title=plan.title, objective=plan.objective, changed=false;
  const hasBike=exs.some(e=>e.kind==='bike'), hasRun=exs.some(e=>e.kind==='run');
  const longSession=/longue/i.test(title||'');
  if(hasBike&&bikeEnabled()){
    const eq=equipment();
    if(!eq.bike&&eq.trainer&&/sortie vélo longue/i.test(title||'')){
      changed=true;
      exs=exs.map(e=>{ if(e.kind!=='bike') return e;
        if(/h/i.test(String(e.reps||''))&&!/min/i.test(String(e.reps||''))) return Object.assign({},e,{reps:'60-90 min',target:'Sortie longue en intérieur'});
        return Object.assign({},e,{target:(e.target||'')+' (home trainer)'}); });
      title='Sortie longue home trainer';
      objective='Version home trainer : 60-90 min continues valent une sortie route plus longue. Ventilateur et hydratation.';
    }
  }
  if(hasBike&&!bikeEnabled()){
    changed=true;
    const totalMins=exs.filter(e=>e.kind==='bike').reduce((a,e)=>a+cardioMinutesOf(e),0);
    const others=exs.filter(e=>e.kind!=='bike');
    if(runEnabled()){
      // Réorganisation : la sortie longue vélo devient LA sortie longue course de la semaine (même prescription que la semaine A),
      // les autres séances vélo deviennent un footing facile. Aucune équivalence « 2 h de vélo = 2 h de course ».
      exs=longSession
        ? [ex('Course libre',1,'9-15 km','Sortie longue facile, allure régulière',0,'run'),...others]
        : [ex('Course libre',1,'30-45 min','Footing facile, allure libre',0,'run'),...others];
      title=longSession?'Sortie longue course':'Course à allure libre';
      objective=longSession?'Sortie longue de la semaine en course, facile et régulière (le vélo est désactivé).':'Footing facile à allure libre, à la place de la séance vélo.';
    } else {
      const mins=Math.max(30,Math.round(totalMins*0.6/5)*5);
      exs=[mob('Marche rapide',1,`${mins}-${mins+15} min`,'Marche soutenue, bras actifs',0),...others];
      title='Marche + mobilité';
      objective='Marche rapide soutenue puis mobilité douce.';
    }
  }
  if(hasRun&&!runEnabled()){
    changed=true;
    const totalMins=exs.filter(e=>e.kind==='run').reduce((a,e)=>a+cardioMinutesOf(e),0);
    const others=exs.filter(e=>e.kind!=='run');
    if(bikeEnabled()){
      const mins=Math.max(25,Math.round(totalMins*1.4/5)*5);
      exs=[ex(longSession?'Sortie longue vélo':'Vélo à allure libre',1,`${mins}-${mins+15} min`,longSession?'Endurance fondamentale':'Intensité modérée régulière',0,'bike'),...others];
      title=longSession?'Sortie longue vélo':'Vélo à allure libre';
      objective='Endurance vélo : intensité modérée, durée équivalente à la course prévue.';
    } else {
      const mins=Math.max(30,Math.round(totalMins*0.9/5)*5);
      exs=[mob('Marche rapide',1,`${mins}-${mins+15} min`,'Marche soutenue, bras actifs',0),...others];
      title='Marche + mobilité';
      objective='Marche rapide soutenue puis mobilité douce.';
    }
  }
  if(!strengthEnabled()&&exs.filter(e=>e.kind==='strength').length>=3){
    changed=true;
    const mobs=exs.filter(e=>e.kind==='mobility');
    const cardio=runEnabled()?ex('Course à allure libre',1,'30-40 min','Allure libre et régulière',0,'run'):(bikeEnabled()?ex('Vélo à allure libre',1,'40-60 min','Intensité modérée',0,'bike'):mob('Marche rapide',1,'40-60 min','Marche soutenue',0));
    exs=[cardio,...mobs]; title='Cardio + mobilité'; objective='Cardio doux et mobilité.';
  }
  const gf=GOAL_CARDIO_FACTOR[programGoal()];
  if(gf!==1){ exs=exs.map(e=>((e.kind==='run'||e.kind==='bike')&&/min/i.test(String(e.reps||'')))?Object.assign({},e,{reps:scaleRepsStr(e.reps,gf)}):e); }
  return changed||gf!==1?Object.assign({},plan,{exercises:exs,title,objective}):plan;
}

const DAY_PRIORITY=[1,2,6,3,4,5,0]; // Haut1, course qualité, sortie longue, jambes, Haut2, vélo, repos actif
function scheduleDays(){ const p=state.profile&&state.profile.schedule; const d=p&&Array.isArray(p.days)?p.days.filter(x=>x>=0&&x<=6):null; return (d&&d.length>=2&&d.length<7)?d:null; }
function sessionDuration(){ const p=state.profile&&state.profile.schedule; const v=p?Number(p.duration):60; return [20,40,60].includes(v)?v:60; }
function remapPlanFor(iso,wk){
  const sel=scheduleDays();
  if(!sel) return wk.days[dayKeyFor(iso)];
  const ordered=[1,2,3,4,5,6,0].filter(d=>sel.includes(d));
  const pos=ordered.indexOf(dayKeyFor(iso));
  if(pos===-1) return wk.days[0]; // jour non choisi -> repos
  const keys=DAY_PRIORITY.slice(0,ordered.length).filter(k=>k!==0).sort((a,b)=>((a+6)%7)-((b+6)%7));
  const key=keys[pos]; let plan=wk.days[key]||wk.days[dayKeyFor(iso)];
  if(key===4&&plan&&bikeEnabled()){
    const chosen=keys; const hasBike=k=>((wk.days[k]&&wk.days[k].exercises)||[]).some(e=>e.kind==='bike');
    if(!chosen.some(hasBike)&&DAY_PRIORITY.slice(ordered.length).some(k=>k!==0&&hasBike(k)))
      plan=Object.assign({},plan,{exercises:plan.exercises.concat([Object.assign(ex('Vélo libre',1,'30-45 min','Complément optionnel : vélo endurance (ta séance vélo ne tient pas dans tes jours)',0,'bike'),{optional:true})])});
  }
  return plan;
}
function durationMode(){ if(!strengthEnabled()) return 'total'; const s=state.profile&&state.profile.schedule; return (s&&s.durationMode==='total')?'total':'muscu'; }
function estimateParts(plan){ if(!plan||!Array.isArray(plan.exercises)) return {strength:0,cardio:0}; const isC=e=>e.kind==='run'||e.kind==='bike'; return {strength:estimateSessionMinutes(Object.assign({},plan,{exercises:plan.exercises.filter(e=>!isC(e))})), cardio:estimateSessionMinutes(Object.assign({},plan,{exercises:plan.exercises.filter(isC)}))}; }
function coreMinutes(plan){
  if(!plan||!Array.isArray(plan.exercises)) return 0;
  const core=plan.exercises.filter(e=>/finisher tronc/i.test(e.target||''));
  return core.length?estimateSessionMinutes({exercises:core}):0;
}
function applyDurationPreference(plan){
  const dur=sessionDuration();
  if(!plan||!Array.isArray(plan.exercises)) return plan;
  let exs=plan.exercises.slice();
  const isCore=e=>/finisher tronc/i.test(e.target||'');
  // Module abdos/tronc désactivable (Objectifs > Ton planning)
  if(state.profile&&state.profile.coreFinisher===false) exs=exs.filter(e=>!(e.kind==='strength'&&isCore(e)));
  if(dur>=60) return exs.length===plan.exercises.length?plan:Object.assign({},plan,{exercises:exs});
  const factor=dur/60;
  const muscuOnly=durationMode()==='muscu';
  const budgetEst=list=>estimateSessionMinutes({exercises:muscuOnly?list.filter(e=>e.kind!=='run'&&e.kind!=='bike'):list});
  // Cardio : minutes, heures ET kilomètres réduits proportionnellement (mode « toute la séance » uniquement)
  if(!muscuOnly) exs=exs.map(e=>{
    if(e.kind!=='run'&&e.kind!=='bike') return e;
    const r=String(e.reps||'');
    if(/\d+\s*m\b/i.test(r)&&!/km|min|\dh/i.test(r)) return Object.assign({},e,{sets:Math.max(3,Math.round(Number(e.sets||1)*factor))}); // 8 × 400 m -> 5 × 400 m (jamais 8 × 133 m)
    if(/min|km|h/i.test(r)) return Object.assign({},e,{reps:scaleCardioReps(r,factor),restSec:Number(e.restSec)>0?Math.max(60,Math.round(Number(e.restSec)*factor/15)*15):e.restSec});
    return e;
  });
  // Muscu : coupes par priorité jusqu'à tenir le budget réel
  exs=exs.filter(e=>!(e.kind==='strength'&&(/rotation de la semaine/i.test(e.target||'')||(/curl|triceps/i.test(e.name||'')&&/isolation|poids du corps|deux mains|cornes|tempo/i.test(e.target||'')))));
  let coreSeen=0; exs=exs.filter(e=>{ if(e.kind==='strength'&&isCore(e)){ coreSeen++; return coreSeen<=1; } return true; });
  exs=exs.map(e=>(e.kind==='strength'&&Number(e.sets)>3)?Object.assign({},e,{sets:3}):e);
  const target=dur+5; let guard=14;
  while(guard-->0 && budgetEst(exs)>target){
    const sIdx=exs.map((e,i)=>(e.kind==='strength'&&!isCore(e)&&!e.pillar)?i:-1).filter(i=>i>=0);
    if(sIdx.length>3){ exs.splice(sIdx[sIdx.length-1],1); continue; }
    let cut=false;
    exs=exs.map(e=>{ if(!cut&&e.kind==='strength'&&!isCore(e)&&Number(e.sets)>2){ cut=true; return Object.assign({},e,{sets:Number(e.sets)-1}); } return e; });
    if(!cut) break;
  }
  if(dur<=20){
    const core=exs.filter(e=>e.kind==='strength'&&isCore(e)).slice(0,1);
    const main=exs.filter(e=>e.kind==='strength'&&!isCore(e)).slice(0,3).map(e=>Object.assign({},e,{sets:Math.min(3,Number(e.sets||3))}));
    exs=exs.filter(e=>e.kind!=='strength').concat(main,core);
  }
  let g2=8;
  while(dur<=20 && g2-->0 && budgetEst(exs)>target){
    let cut=false;
    exs=exs.map(e=>{ if(!cut&&e.kind==='strength'&&Number(e.sets)>2){ cut=true; return Object.assign({},e,{sets:Number(e.sets)-1}); } return e; });
    if(!cut){ const sIdx=exs.map((e,i)=>(e.kind==='strength'&&!isCore(e))?i:-1).filter(i=>i>=0); if(sIdx.length>2) exs.splice(sIdx[sIdx.length-1],1); else break; }
  }
  let g3=14;
  while(g3-->0 && budgetEst(exs)>target){
    const mobs=exs.map((e,i)=>e.kind==='mobility'?i:-1).filter(i=>i>=0);
    if(mobs.length>1){ exs.splice(mobs[mobs.length-1],1); continue; }            // 1) mobilité secondaire (on garde l'échauffement)
    const ci=exs.findIndex(e=>(e.kind==='run'||e.kind==='bike')&&Number(e.sets)>2);
    if(!muscuOnly&&ci>=0){ exs[ci]=Object.assign({},exs[ci],{sets:Number(exs[ci].sets)-1}); continue; } // 2) un intervalle de moins
    const core=exs.map((e,i)=>(e.kind==='strength'&&isCore(e))?i:-1).filter(i=>i>=0);
    if(dur<=20&&core.length){ exs.splice(core[0],1); continue; }                    // 3) en 20 min, le finisher saute en dernier
    break;
  }
  const estNow=estimateSessionMinutes({exercises:exs});
  if(!muscuOnly && estNow>target){
    const f2=Math.max(0.4,target/estNow);
    exs=exs.map(e=>((e.kind==='run'||e.kind==='bike')&&/min|km|h/i.test(String(e.reps||''))&&!(/\d+\s*m\b/i.test(String(e.reps||''))&&!/km|min/i.test(String(e.reps||''))))?Object.assign({},e,{reps:scaleCardioReps(e.reps,f2)}):e);
  }
  return Object.assign({},plan,{exercises:exs,durationPref:dur,objective:(plan.objective||'')+` Format ${dur} min${muscuOnly&&plan.exercises.some(e=>e.kind==='run'||e.kind==='bike')?' (musculation ; cardio en plus)':''}.`});
}
function hourNormalize(s){ return String(s||'').replace(/(\d+)\s*h\s*(\d+)?/gi,(m,h,mn)=>String(Number(h)*60+Number(mn||0))); }
function cardioMinutesOf(e){
  const r=hourNormalize(e.reps);
  const nums=(r.match(/\d+(?:[.,]\d+)?/g)||[]).map(x=>parseFloat(String(x).replace(',','.')));
  const avg=nums.length?nums.reduce((a,b)=>a+b,0)/nums.length:0;
  const sets=Math.max(1,Number(e.sets||1));
  if(/min/i.test(r)||/h/i.test(String(e.reps||''))) return sets*avg;
  if(/km/i.test(r)) return sets*avg*(e.kind==='run'?6:2);
  if(/\bm\b/i.test(r)) return sets*(avg/1000)*(e.kind==='run'?6:2)+sets*0.75;
  return e.kind==='run'?40:60;
}
/* Mise à l'échelle d'une prescription cardio en gardant TOUJOURS l'unité (« 1h30-2h30 » -> « 60-100 min ») */
function scaleCardioReps(r,f){
  const s=String(r||''); const hadHour=/\d\s*h/i.test(s)&&!/min/i.test(s);
  let n=scaleRepsStr(hourNormalize(s),f);
  if(hadHour&&!/min/i.test(n)) n=n.trim()+' min';
  if(/min/i.test(n)) n=n.replace(/\d+/g,x=>{ const v=Number(x); return String(v>15?Math.round(v/5)*5:Math.max(1,v)); });
  return n;
}
function estimateSessionMinutes(plan){
  if(!plan||!Array.isArray(plan.exercises)) return 0;
  let sec=0;
  plan.exercises.forEach(e=>{
    if(e.optional) return;
    const sets=Math.max(1,Number(e.sets||1));
    const reps=String(e.reps||'');
    if(e.kind==='run'||e.kind==='bike'){
      // Blocs rapides / tempo d'une sortie longue : ils font PARTIE de la sortie, on ne les compte pas deux fois
      if(/blocs? (rapides|tempo)|allure soutenue|allure marathon/i.test(e.target||'') && plan.exercises.some(x=>x!==e&&x.kind===e.kind&&(/longue/i.test(x.target||'')||cardioMinutesOf(x)>=60))) return;
      const nr=hourNormalize(reps);
      const nums=(nr.match(/\d+(?:[.,]\d+)?/g)||[]).map(x=>parseFloat(String(x).replace(',','.')));
      const avg=nums.length?nums.reduce((a,b)=>a+b,0)/nums.length:0;
      const recov=sets>1?(sets-1)*Number(e.restSec||0):0; // récupérations entre intervalles
      if(/min/i.test(nr)||/h/i.test(reps)) sec+=sets*avg*60+recov;
      else if(/km/i.test(reps)) sec+=sets*avg*(e.kind==='run'?6:2)*60+recov; // ~6 min/km course, ~30 km/h vélo
      else if(/\bm\b/i.test(nr)) sec+=sets*(avg/1000)*(e.kind==='run'?6:2)*60+recov;
      else if(nums.length && !/[a-zà-ÿ]/i.test(nr)) sec+=sets*avg*60+recov; // chiffres seuls = minutes
      else sec+=(e.kind==='run'?40:60)*60;
      return;
    }
    if(/emom/i.test(e.target||'')){ sec+=sets*60; return; } // 1 min par tour, repos inclus
    if(/min/i.test(reps)){ sec+=sets*(parseReps(reps)||5)*60; return; } // routines en minutes
    const work=isTimedExercise(e)?Math.max(20,parseReps(reps)||30):40; // ~40 s par série de reps
    sec+=sets*(work+Number(e.restSec||60));
  });
  const min=sec/60;
  return min>=10?Math.round(min/5)*5:Math.round(min);
}
function targetInfo(){
  const p=state.profile||{}; if(!p.targetDate) return null;
  const left=daysBetween(isoToday(),p.targetDate);
  return left<0?{passed:true,date:p.targetDate}:{date:p.targetDate,daysLeft:left,weeksLeft:Math.max(1,Math.ceil(left/7))};
}
function applyStartMode(mode){
  state.profile=state.profile||{}; state.profile.startMode=mode;
  if(mode==='fond') state.resume={startIso:isoToday(),gapDays:0,weeks:1,dismissed:true};
  else if(mode==='reprise') state.resume={startIso:isoToday(),gapDays:0,weeks:2,dismissed:false};
  else if(mode==='doux') state.resume={startIso:isoToday(),gapDays:0,weeks:3,dismissed:false};
  saveState({sync:false});
}
const TRICEPS_ROTATION=[
  ()=>ex('Extension triceps kettlebell 8 kg',3,'12/bras','Isolation, coude fixe pointé au plafond',60),
  ()=>ex('Pompes prise serrée',3,'10-15','Triceps au poids du corps',75),
  ()=>ex('Extension triceps kettlebell 16 kg',3,'8','À deux mains derrière la tête, coudes serrés',75)
];
const BICEPS_ROTATION=[
  ()=>ex('Curl kettlebell 8 kg',3,'12/bras','Isolation biceps, coude collé au corps',60),
  ()=>ex('Curl élastique',3,'15','Tension continue, tempo lent',45),
  ()=>ex('Curl kettlebell 16 kg',3,'8','Par les cornes, à deux mains',75)
];
const SHOULDER_ROTATION=['Élévations latérales kettlebell 8 kg','Around the world kettlebell 8 kg','Tirage vers visage élastique'];
/* Les 4 mouvements des objectifs (pompes, tractions, dips, squats au PDC) restent présents chaque semaine :
   s'ils manquent dans la semaine du programme, un petit bloc « pilier » est ajouté au jour adapté. */
/* v18.38 : mollets genoux fléchis (soléaire) en alternance, tibialis, leg curl glissé, rotations externes, wall slides, corde */
function applyNewAccessories(exs, plan, week){
  const t=String(plan.title||''); const eq=equipment(); const wib=weekInBlock(week); const deload=Math.max(1,week)%4===0;
  let out=exs.slice();
  const firstNonMob=()=>{ let k=0; while(k<out.length&&out[k].kind==='mobility') k++; return k; };
  if(/jambes/i.test(t)){
    if(Math.floor((Math.max(1,week)-1)/2)%2===1) out=out.map(e=>e.name==='Mollets debout'?ex('Mollets genoux fléchis',e.sets||3,'15-20','Soléaire (course et vélo), genoux pliés',45):e);
    if(/jambes courtes/i.test(t)&&!out.some(e=>/^mollets/i.test(e.name))) out.push(ex('Mollets genoux fléchis',2,'15-20','Soléaire (course et vélo), genoux pliés',45));
    out.push(ex('Tibialis raises',2,'15-20','Releveurs du pied : prévention course et sauts',30));
    if(eq.sliders&&!out.some(e=>/leg curl/i.test(e.name))) out.push(ex('Leg curl glissé',2,'8-12','Ischios en flexion du genou (complète RDL et swing)',60));
  }
  if(/haut du corps 1/i.test(t)){
    if(eq.bands) out.push(ex('Rotation externe élastique',2,'12-15','Contrôle de l\'épaule, sans douleur',30));
    if(eq.jumpRope){ const f=deload?[3,'30 s','Corde : technique, rebond léger']:wib===1?[4,'30 s','Corde : technique, rebond léger']:wib===2?[5,'40 s','Corde : cardio court']:[6,'45 s','Corde : cardio court'];
      out.splice(firstNonMob(),0,ex('Corde à sauter',f[0],f[1],f[2],60)); }
  }
  if(/haut du corps 2/i.test(t)) out.splice(firstNonMob(),0,ex('Wall slides',2,'10','Échauffement épaules et omoplates',20,'mobility'));
  return out;
}
function ensurePillars(exs, plan, week){
  const t=String(plan.title||''); const type=typeForWeek(week); const wk=PROGRAMME[type]&&PROGRAMME[type][blockForWeek(week)];
  const fam=k=>GRADE_FAMILIES_DEF.find(f=>f.key===k);
  const inWeek=k=>!!wk&&Object.values(wk.days).some(d=>(d.exercises||[]).some(e=>fam(k).match(e.name)));
  const inDay=k=>exs.some(e=>fam(k).match(e.name));
  const add=[];
  const mk=(n,sets,reps,why,rest)=>Object.assign(ex(n,sets,reps,why,rest),{pillar:true});
  if(/haut du corps 2/i.test(t)){
    if(!inDay('pushups')&&!inWeek('pushups')) add.push(mk('Pompes',2,'10-15','Pilier pompes : séries sous-maximales, technique stricte',90));
    if(!inDay('dips')&&!inWeek('dips')) add.push(mk('Dips',2,'8-12','Pilier dips : contrôlé, amplitude confortable',90));
    if(!inDay('pullups')&&!inWeek('pullups')) add.push(mk('Tractions',2,'4-6','Pilier tractions strictes au poids du corps',120));
  }
  if(/jambes/i.test(t)&&!inDay('squats')) add.push(mk('Squats poids du corps',2,'15-20',"Pilier squats : endurance, sans aller à l'échec",60));
  return add.length?exs.concat(add):exs;
}
function enrichPlan(plan,week){
  if(!plan||!Array.isArray(plan.exercises)) return plan;
  const strengthCount=plan.exercises.filter(e=>e&&e.kind==='strength').length;
  if(strengthCount<3) return plan; // jours cardio, mobilité, repos : inchangés
  let exs=plan.exercises.slice();
  // rotation hebdo du créneau épaules légères
  exs=exs.map(e=>{
    if(e&&(e.srcName||e.name)==='Élévations latérales kettlebell 8 kg'){
      const alt=SHOULDER_ROTATION[((week%3)+3)%3];
      if(alt!==e.name) return ex(alt,e.sets||3,alt==='Tirage vers visage élastique'?'15':'10/sens','Épaules · rotation de la semaine',45);
    }
    return e;
  });
  // créneau triceps (Haut du corps 2) et biceps (Haut du corps 1)
  if(/haut du corps 2/i.test(plan.title||'')) exs.push(TRICEPS_ROTATION[((week%3)+3)%3]());
  if(/haut du corps 1/i.test(plan.title||'')) exs.push(BICEPS_ROTATION[((week%3)+3)%3]());
  // finisher tronc : l'ancien gainage fixe est remplacé par la paire de la semaine
  exs=exs.filter(e=>!(e&&(e.name==='Planche'||e.name==='Planche latérale')&&/gainage/i.test(e.target||'')));
  const slot=/haut du corps 2/i.test(plan.title||'')?1:(/jambes/i.test(plan.title||'')?2:0);
  exs=applyNewAccessories(exs, plan, week);
  exs=ensurePillars(exs, plan, week);
  return Object.assign({},plan,{exercises:exs.concat(coreFinisher(week,slot))});
}


function gradesCardHtml(){
  const {recs}=computeRecords();
  const lvl=profileLevel();
  const rows=gradeFamilies().map(f=>{
    let best=toNum(lvl[f.key])||0; Object.keys(recs).forEach(n=>{ if(f.match(n)) best=Math.max(best, toNum(recs[n].maxReps)); });
    const gi=gradeFor(best,f.steps); const grade=GRADE_NAMES[gi];
    const next=gi<f.steps.length?f.steps[gi]:null;
    const pct=Math.min(100,Math.round((best/Math.max(1,f.goalReps))*100));
    const badgeCls=gi>=4?'done':(gi>=2?'warn':'');
    return `<div style="padding:10px 0;border-top:1px solid var(--line)"><div class="between"><div><strong>${esc(f.label)}</strong><p class="muted">${best?`Record : ${best} reps`:'Pas encore de record'} · ${esc(f.goal)}</p></div><span class="badge ${badgeCls}">${esc(grade)}</span></div><div class="progressbar"><span style="width:${best?Math.max(pct,3):0}%"></span></div><p class="muted">${best?`${pct} % de l'objectif (${best}/${f.goalReps}). `:''}${next?`Prochain palier : ${next} reps (${GRADE_NAMES[Math.min(gi+1,GRADE_NAMES.length-1)]}).`:'Palier maximal atteint, bravo !'} Échelle : ${esc(f.ladder)}.</p></div>`;
  }).join('');
  return `<section class="card"><div class="between"><div><p class="eyebrow">Niveaux</p><h3>Tes grades par exercice clé</h3></div></div><p class="muted">Record de reps en une série. Palier atteint sans douleur → variante suivante de l'échelle. Niveau et objectifs modifiables dans Réglages.</p>${rows}<p class="muted" style="margin-top:10px">Objectifs cardio : 10 km en ${profileGoals().run10kMin} min · vélo ${profileGoals().bikeKmh} km/h.</p></section>`;
}
'use strict';

const LS_KEY = 'sportTrackerAB.v13';
const OLD_LS_KEYS = ['sportTrackerAB.v12','sportTrackerAB.v11','sportTrackerAB.v10','sportTrackerAB.v9','sportTrackerAB.v8','sportTrackerAB.v7','sportTrackerAB.v6','sportTrackerAB.v5','sportTrackerAB.v4','sportTrackerAB.v3','sportTrackerAB.v2'];
const DAY_MS = 86400000;
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

let state = loadState();
if(state&&state.settings&&!state.settings.uniMigrated){ state.settings.unilateralMode='split'; state.settings.uniMigrated=true; }
let selectedDate = isoToday();
let selectedFreeId = null;
let currentView = 'today';
let timer = { remaining: 0, interval: null, paused: false, label: 'Repos' };
let emom = { active: false, interval: null, totalRounds: 0, currentRound: 0, remaining: 0, label: 'EMOM' };
let workoutTicker = null;
let deferredInstallPrompt = null;
let syncTimer = null;
let authUser = null;
let cloudBusy = false;

function defaultState() {
  return {
    startDate: localISO(mondayOf(new Date())),
    sessions: {},
    freeSessions: {},
    tests: [],
    routine: {},
    bodyWeights: [],
    settings: { vibration: true, sound: true, bodyWeightKg: null, cloudAutoSync: true },
    cloud: { lastSync: null, lastRestore: null, status: 'Non connecté' }
  };
}
function loadState() {
  const base = defaultState();
  try {
    const raw = localStorage.getItem(LS_KEY) || OLD_LS_KEYS.map(k => localStorage.getItem(k)).find(Boolean);
    const loaded = raw ? JSON.parse(raw) : {};
    const merged = { ...base, ...loaded };
    if (!raw) merged.newInstall = true; // seulement si AUCUNE sauvegarde : un état existant n'hérite jamais de ce marqueur
    merged.settings = { ...base.settings, ...(loaded.settings || {}) };
    merged.freeSessions = loaded.freeSessions || {};
    merged.cloud = { ...base.cloud, ...(loaded.cloud || {}) };
    merged.bodyWeights = Array.isArray(loaded.bodyWeights) && loaded.bodyWeights.length ? loaded.bodyWeights : (merged.newInstall ? [] : [{ date: isoToday(), kg: Number(loaded.settings?.bodyWeightKg || 78) }]); // nouvelle installation : aucun poids inventé
    return merged;
  } catch (e) { return base; }
}
function saveState(options = {}) { localStorage.setItem(LS_KEY, JSON.stringify(state)); if (options.sync !== false) scheduleAutoSync(); }
function localISO(date) { const d = new Date(date); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function parseISO(iso) { const [y,m,d] = String(iso).split('-').map(Number); return new Date(y, m - 1, d); }
function isoToday() { return localISO(new Date()); }
function mondayOf(date) { const d = new Date(date); const off = (d.getDay()+6)%7; d.setDate(d.getDate()-off); d.setHours(0,0,0,0); return d; }
function addDays(date, n) { const d = new Date(date); d.setDate(d.getDate()+n); return d; }
function fmtDate(iso) { return parseISO(iso).toLocaleDateString('fr-FR',{weekday:'short',day:'2-digit',month:'short'}); }
function fmtLongDate(iso) { return parseISO(iso).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'}); }
function dayNum(iso) { const [y,m,d]=String(iso).slice(0,10).split('-').map(Number); return Math.round(Date.UTC(y,m-1,d)/DAY_MS); }
function weekIndexFor(iso) { return Math.max(1, Math.floor((dayNum(localISO(mondayOf(parseISO(iso))))-dayNum(state.startDate))/7)+1); }
function typeForWeek(w) { return w % 2 ? 'A' : 'B'; }
function dayKeyFor(iso) { return parseISO(iso).getDay(); }
function blockForWeek(w) { const seq=GOAL_SEQUENCES[programGoal()]||BLOCK_KEYS; return seq[Math.floor((Math.max(1,w)-1)/4) % seq.length]; }
function weekInBlock(w) { return ((Math.max(1,w)-1)%4)+1; }
const DELOAD_SWAP = { 'Pompes claquées':'Pompes', 'Squats sautés':'Squats poids du corps', 'Clean kettlebell 16 kg':'Rowing kettlebell 16 kg', 'Push press kettlebell 24 kg':'Développé militaire kettlebell 16 kg', 'Snatch kettlebell 16 kg':'Swing 16 kg' };
function deloadPlan(plan){
  const exercises = plan.exercises.map(e=>{
    let name=e.name, kind=e.kind, muscles=e.muscles, bodyweight=e.bodyweight, defaultLoad=e.defaultLoad;
    const swap=DELOAD_SWAP[e.srcName||e.name];
    let swapId;
    if(swap){ const b=EXERCISE_LIBRARY.find(x=>x.name===swap)||{}; name=canonicalExerciseName(swap); swapId=progId(swap+'-'+(b.kind||'strength')); kind=b.kind||'strength'; muscles=b.muscles||muscles; bodyweight=!!b.bodyweight; defaultLoad=b.defaultLoad||0; }
    let sets=e.sets;
    if(kind==='strength') sets=Math.max(1, Math.round(e.sets*0.6));            // ~ -40 % de volume, on garde reps/charge
    else if((kind==='run'||kind==='bike') && e.sets>1) sets=Math.max(1, Math.round(e.sets*0.6)); // moins de répétitions dures
    const soft=(kind==='strength'||kind==='run'||kind==='bike');
    return Object.assign({}, e, { name, sets, reps:e.reps, target: soft ? (e.target+' · allégée, sans échec') : e.target, restSec:e.restSec, kind, muscles, bodyweight, defaultLoad }, swap ? { id: swapId, srcName: swap } : {});
  });
  return { name:plan.name, title:plan.title+' · allégée', objective:"Semaine allégée : ~40 % de volume en moins, on garde l'intensité, pas d'explosif ni de série à l'échec. Garde une seule séance cardio dure, le reste facile. "+plan.objective, exercises };
}
function hybridPipeline(iso, plan, week, block, deload){ if(plan) plan = applyDisciplines(plan); if(plan) plan = applyExtraSports(plan, week); if(plan) plan = applyDurationPreference(applyResumeCardio(applyCardioTargets(applyRunCapacity(scalePlanToLevel(enrichPlan(plan, week), block)), week, deload, iso), iso)); if(deload && plan) plan = deloadPlan(plan); if(plan) plan = applyScapulaCare(plan); if(deload && plan) plan = addMaxTests(plan, week); return plan; }
/* ================== Calendrier flexible (v18.48) ==================
   state.moves = { dateAffichée: { from: dateDuProgramme } }. Le programme brut (cycle A/B, bloc, semaine allégée,
   adaptations) est toujours calculé pour SA date d'origine ; on ne fait que l'afficher ailleurs. */
function moveTargetOf(src0){ const m=state.moves||{}; return Object.keys(m).find(t=>m[t]&&m[t].from===src0&&t!==src0)||null; }
function isMovedAway(iso){ const m=state.moves||{}; return !(m[iso]&&m[iso].from)&&!!moveTargetOf(iso); }
function planContentAt(iso){ const m=state.moves||{}; if(m[iso]&&m[iso].from) return m[iso].from; return isMovedAway(iso)?null:iso; }
function planForDate(iso){
  const m=state.moves&&state.moves[iso];
  if(m&&m.from&&m.from!==iso){ eqSessionIso=iso; let r; try{ r=planForDateRaw(m.from); } finally{ eqSessionIso=null; }
    return Object.assign({},r,{movedFrom:m.from,plan:Object.assign({},r.plan,{movedFrom:m.from,objective:(r.plan.objective||'')+` · Séance du ${fmtDate(m.from)}, déplacée ici.`})}); }
  const r=planForDateRaw(iso); const to=isMovedAway(iso)?moveTargetOf(iso):null;
  if(to) return Object.assign({},r,{movedTo:to,plan:Object.assign(REST(),{title:'Séance déplacée',objective:`La séance de ce jour a été déplacée au ${fmtDate(to)}.`,movedTo:to})});
  return r;
}
function planForDateRaw(iso) { eqCtxIso=iso; const week = weekIndexFor(iso); const type = typeForWeek(week); const block = blockForWeek(week); const wk = PROGRAMME[type][block]; const deload = week % 4 === 0;
  if(runEngineActive()){ const rp=runEngineDay(iso, wk, week, block, deload); eqCtxIso=null; return { week, type: strengthEnabled()?'Course + muscu':'Course', block, blockLabel: RUN_PLAN_LABEL[runPlanType(runBaseline())], label: 'Plan course', deload: strengthEnabled()?deload:false, weekInBlock: weekInBlock(week), plan: rp }; }
  let plan = remapPlanFor(iso, wk); plan = hybridPipeline(iso, plan, week, block, deload); eqCtxIso=null; return { week, type, block, blockLabel: BLOCK_LABEL[block], label: wk.label, deload, weekInBlock: weekInBlock(week), plan }; }
function esc(v='') { return String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])); }
function toNum(v) { const n = Number(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : 0; }
function mmss(sec) { sec = Math.max(0, Math.round(sec)); return `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`; }
function hms(sec) { sec = Math.max(0, Math.round(sec)); const h=Math.floor(sec/3600), m=Math.floor((sec%3600)/60), s=sec%60; return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`; }
function formatDecimal(n, d=2) { return toNum(n) ? toNum(n).toFixed(d).replace('.', ',') : '-'; }
function durationInputs(prefix) { return toNum($(`#${prefix}H`)?.value)*3600 + toNum($(`#${prefix}M`)?.value)*60 + toNum($(`#${prefix}S`)?.value); }
function setDurationInputs(prefix, sec) { const h=$(`#${prefix}H`), m=$(`#${prefix}M`), s=$(`#${prefix}S`); if(!h||!m||!s) return; h.value = Math.floor(sec/3600) || ''; m.value = Math.floor((sec%3600)/60) || ''; s.value = Math.floor(sec%60) || ''; }
function avgSpeed(km, sec) { km=toNum(km); sec=toNum(sec); return km>0 && sec>0 ? km/(sec/3600) : 0; }
function pace(km, sec) { km=toNum(km); sec=toNum(sec); return km>0 && sec>0 ? `${mmss(sec/km)}/km` : '-'; }
function makeId(name) { return String(name).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,''); }
function currentBodyWeight(iso=selectedDate) {
  const rows = [...(state.bodyWeights||[])].filter(r => r.date && toNum(r.kg)).sort((a,b)=>a.date.localeCompare(b.date));
  const fallback = isNewInstall() ? 0 : (toNum(state.settings&&state.settings.bodyWeightKg) || 78); // nouvelle installation : poids inconnu = 0, jamais inventé
  let chosen = rows[0] || { kg: fallback };
  rows.forEach(r => { if (r.date <= iso) chosen = r; });
  return toNum(chosen.kg) || fallback;
}
function knownBodyWeight(iso=isoToday()){ const rows=[...(state.bodyWeights||[])].filter(r=>r.date&&toNum(r.kg)&&!r.unconfirmed&&r.date<=iso).sort((a,b)=>a.date.localeCompare(b.date)); return rows.length?toNum(rows[rows.length-1].kg):null; }
function getSession(iso) {
  if (isFreeSessionActive() && iso === selectedDate) return getFreeSession(selectedFreeId);
  if (!state.sessions[iso]) state.sessions[iso] = newSession();
  const s = state.sessions[iso];
  s.metrics = s.metrics || {};
  s.exercises = s.exercises || {};
  s.extraExercises = s.extraExercises || [];
  s.hiddenExercises = s.hiddenExercises || [];
  s.stopwatch = s.stopwatch || { elapsedSec: 0, running: false, startedAt: null };
  return s;
}
function newSession() { return { completed:false, freeMode:false, rpe:'', backPain:'', notes:'', metrics:{}, exercises:{}, extraExercises:[], hiddenExercises:[], stopwatch:{elapsedSec:0,running:false,startedAt:null} }; }
function freeDefaultDate(){ return (currentView==='session' && selectedDate && selectedDate<=isoToday()) ? selectedDate : isoToday(); }
function newFreeSession(title='Séance libre', date) { return { ...newSession(), freeMode:true, title, date:date||isoToday(), createdAt:new Date().toISOString() }; }
function isFreeSessionActive(){ return Boolean(selectedFreeId && state.freeSessions && state.freeSessions[selectedFreeId] && currentView==='session'); }
function activeSessionId(){ return isFreeSessionActive() ? selectedFreeId : selectedDate; }
function getFreeSession(id){ state.freeSessions = state.freeSessions || {}; if(!state.freeSessions[id]) state.freeSessions[id]=newFreeSession(); return state.freeSessions[id]; }
function elapsedWorkout(sess) { const sw=sess.stopwatch||{}; return Math.round((sw.elapsedSec||0) + (sw.running && sw.startedAt ? (Date.now()-sw.startedAt)/1000 : 0)); }
function allExercisesLive(iso, sess) { const { plan } = planForDate(iso); const hidden = new Set(sess.hiddenExercises || []); eqCtxIso=iso; const planned = plan.exercises.filter(e => !hidden.has(e.id || makeId(e.name + '-' + (e.kind || '')))).map(substituteForEquipment).map(e => applySwap(e, iso, sess)).map(e => applyAutoreg(e, sess)); eqCtxIso=null; return [...planned, ...(sess.extraExercises||[])]; }
/* Séance terminée = photographie figée de ce qui était prévu et fait : un changement de profil,
   de matériel ou de programme ne modifie plus jamais l'historique ni les records. */
function snapshotList(sess){ const hidden=new Set(sess.hiddenExercises||[]); const ids=new Set(sess.planSnapshot.map(e=>e.id)); return [...sess.planSnapshot.filter(e=>!hidden.has(e.id)), ...(sess.extraExercises||[]).filter(e=>!ids.has(e.id||makeId(e.name+'-'+(e.kind||''))))]; }
function hasSnapshot(sess){ return !!(sess && sess.completed && !sess.freeMode && Array.isArray(sess.planSnapshot)); }
function allExercisesForSession(iso) { const sess = getSession(iso); if (hasSnapshot(sess)) return snapshotList(sess); return allExercisesLive(iso, sess); }
const SNAP_KEYS=['id','name','kind','sets','reps','target','restSec','muscles','bodyweight','defaultLoad','timed','maxTest','testLevel','subbedFrom','swappedFrom','srcName','autoregApplied','unknown'];
function snapshotExercise(e){ const o={}; SNAP_KEYS.forEach(k=>{ if(e[k]!==undefined) o[k]=Array.isArray(e[k])?e[k].slice():e[k]; }); o.id=e.id||makeId(e.name+'-'+(e.kind||'')); return o; }
function buildSessionSnapshot(iso, sess){
  const out=[], seen=new Set();
  const logged=e=>{ const k=e.id||makeId(e.name+'-'+(e.kind||'')); const l=sess.exercises&&sess.exercises[k]; return !!(l&&(l.sets||[]).some(x=>x.done||String(x.actual||'').trim())); };
  const push=e=>{ const s=snapshotExercise(e); if(seen.has(s.id)) return; seen.add(s.id); out.push(s); };
  let adapted=[], raw=[];
  try{ adapted=allExercisesLive(iso, sess); }catch(err){}
  try{ raw=plannedExercisesForLive(iso, sess); }catch(err){}
  adapted.forEach(push);                 // ce qui était affiché (matériel, remplacements, ajustements)
  raw.filter(logged).forEach(push);      // + toute version d'origine qui a des séries enregistrées
  (sess.extraExercises||[]).forEach(e=>seen.add(e.id||makeId(e.name+'-'+(e.kind||''))));
  orphanExercises(sess, seen).forEach(push); // + séries sans exercice identifiable, gardées en l'état
  return out;
}
const BACKUP_KEY='sportTrackerAB.backup.preMigration';
/* Copie intégrale des données AVANT toute migration (une seule fois : la plus ancienne est la plus précieuse) */
function backupBeforeMigration(tag){
  state.migrations=state.migrations||{};
  try{
    if(!localStorage.getItem(BACKUP_KEY)){
      const raw=localStorage.getItem(LS_KEY)||JSON.stringify(state);
      localStorage.setItem(BACKUP_KEY, raw);
      state.migrations.backup={at:new Date().toISOString(), tag, ok:true, kb:Math.round(raw.length/1024)};
    }
    return true;
  }catch(e){ state.migrations.backup={at:new Date().toISOString(), tag, ok:false, error:String(e&&e.message||e)}; return false; }
}
function downloadPreMigrationBackup(){ const raw=localStorage.getItem(BACKUP_KEY); if(!raw) return false; download(`jb-sport-tracker-sauvegarde-avant-migration-${(state.migrations&&state.migrations.backup&&state.migrations.backup.at||'').slice(0,10)||isoToday()}.json`, raw, 'application/json'); return true; }
/* Séries enregistrées dont l'exercice d'origine est introuvable : conservées telles quelles, jamais inventées */
var ORPHAN_INDEX=null;
function orphanIndex(){
  if(ORPHAN_INDEX) return ORPHAN_INDEX; const idx={};
  const add=(name,obj,kinds)=>{ (kinds||['strength','mobility']).forEach(k=>{ const key=makeId(name+'-'+k); if(!idx[key]) idx[key]=Object.assign({kind:k},obj,{name:obj.display||name}); }); };
  (typeof EXERCISE_LIBRARY!=='undefined'?EXERCISE_LIBRARY:[]).forEach(e=>{ let cn=e.name; try{ cn=canonicalExerciseName(e.name); }catch(_){} const o={display:cn,kind:e.kind,muscles:e.muscles||[],bodyweight:!!e.bodyweight,defaultLoad:toNum(e.defaultLoad),restSec:e.restSec||75,reps:e.defaultReps||''}; add(e.name,o,[e.kind]); add(cn,o,[e.kind]); });
  (typeof FREE_TEMPLATES!=='undefined'?FREE_TEMPLATES:[]).concat(state.userTemplates||[]).forEach(t=>(t.exercises||[]).forEach(e=>add(e.name,{display:e.name,kind:e.kind||'strength',muscles:e.muscles||[],bodyweight:!!e.bodyweight,restSec:e.restSec||75,reps:''},[e.kind||'strength'])));
  (typeof REPDB!=='undefined'?REPDB:[]).forEach(x=>add(x.n,{display:x.n,kind:x.c==='stretching'?'mobility':'strength',muscles:repdbZones(x),bodyweight:!!x.bw,restSec:75,reps:'',repdbId:x.id}));
  return (ORPHAN_INDEX=idx);
}
function resolveOrphan(k,nSets){ const r=orphanIndex()[k]; if(!r) return null; return {id:k,name:r.name,kind:r.kind,muscles:r.muscles||[],bodyweight:!!r.bodyweight,defaultLoad:r.defaultLoad||0,restSec:r.restSec||75,sets:nSets,reps:r.reps||'',target:'Retrouvé d\'après tes anciennes séries',repdbId:r.repdbId,recovered:true}; }
function migrateSnapshots3(){
  state.migrations=state.migrations||{}; if(state.migrations.snapshots3) return 0;
  backupBeforeMigration('snapshots3'); ORPHAN_INDEX=null; let n=0;
  Object.values(state.sessions||{}).forEach(s=>{ if(!s||!Array.isArray(s.planSnapshot)) return;
    s.planSnapshot=s.planSnapshot.map(e=>{ if(!e||!e.unknown) return e; const log=s.exercises&&s.exercises[e.id]; const r=resolveOrphan(e.id,(log&&log.sets||[]).length||Number(e.sets)||1); if(!r) return e; n++; return r; }); });
  state.migrations.snapshots3=new Date().toISOString(); saveState({sync:false}); return n;
}
function orphanExercises(sess, knownIds){
  const out=[];
  Object.entries(sess.exercises||{}).forEach(([k,log])=>{
    if(knownIds.has(k)) return;
    const sets=(log&&log.sets)||[]; if(!sets.some(x=>x.done||String(x.actual||'').trim())) return;
    const found=resolveOrphan(k,sets.length); if(found){ out.push(found); return; }
    const m=k.match(/-(strength|mobility|run|bike|activity)$/); const kind=m?m[1]:'strength';
    const label=k.replace(/-(strength|mobility|run|bike|activity)$/,'').replace(/^(free|act)-/,'').replace(/-/g,' ').trim();
    out.push({id:k,name:'Exercice non identifié · '+label,kind,sets:sets.length,reps:'',target:'Séries conservées telles quelles : exercice d\'origine introuvable',restSec:0,muscles:[],bodyweight:false,defaultLoad:0,unknown:true});
  });
  return out;
}
function migrateDefaults41(){
  state.migrations=state.migrations||{};
  if(state.migrations.defaults41||isNewInstall()) return 0;
  backupBeforeMigration('defaults41');
  let n=0; const rows=[...(state.bodyWeights||[])].filter(r=>r&&r.date).sort((a,b)=>a.date.localeCompare(b.date));
  // La toute première pesée à 78 kg est celle que l'ancienne version créait d'office : on la signale, sans la supprimer
  // (elle reste utilisée pour l'historique, qui ne change donc pas) tant que l'utilisateur ne l'a pas confirmée ou retirée.
  if(rows.length&&toNum(rows[0].kg)===78&&!rows[0].confirmed){ rows[0].unconfirmed=true; n++; }
  state.migrations.defaults41=new Date().toISOString(); saveState({sync:false});
  return n;
}
function migrateSnapshots2(){
  state.migrations=state.migrations||{};
  if(state.migrations.snapshots2) return 0;
  backupBeforeMigration('snapshots2');
  let n=0;
  Object.values(state.sessions||{}).forEach(s=>{ if(s&&s.completed&&!s.freeMode&&Array.isArray(s.planSnapshot)){ const ids=new Set(s.planSnapshot.map(e=>e.id)); (s.extraExercises||[]).forEach(e=>ids.add(e.id||makeId(e.name+'-'+(e.kind||'')))); const orph=orphanExercises(s,ids); if(orph.length){ s.planSnapshot=s.planSnapshot.concat(orph); n+=orph.length; } } });
  state.migrations.snapshots2=new Date().toISOString();
  saveState({sync:false});
  return n;
}
function migrateSnapshots(){
  state.migrations=state.migrations||{};
  if(state.migrations.snapshots1) return 0;
  backupBeforeMigration('snapshots1');
  let n=0;
  Object.entries(state.sessions||{}).forEach(([iso,s])=>{ if(s&&s.completed&&!s.freeMode&&!Array.isArray(s.planSnapshot)){ s.planSnapshot=buildSessionSnapshot(iso,s); s.snapshotBackfilled=true; n++; } });
  state.migrations.snapshots1=new Date().toISOString();
  saveState({sync:false});
  return n;
}
function activeExercisesForSession(iso){ return isFreeSessionActive() && iso === selectedDate ? (getFreeSession(selectedFreeId).extraExercises || []) : allExercisesForSession(iso); }
function hasKind(exercises, kind) { return exercises.some(e => e.kind === kind); }
function getExerciseLog(iso, exercise) {
  const s = getSession(iso); const id = exercise.id || makeId(exercise.name + '-' + (exercise.kind || ''));
  if (!s.exercises[id]) s.exercises[id] = { collapsed:false, sets:[] };
  const log = s.exercises[id];
  if (uniSplit(exercise) && log.sets.length && log.sets.every(st => !st.side)) log.sets = toSplitSets(log.sets);
  const wanted = Math.max(1, Number(exercise.sets || 1)) * (uniSplit(exercise) ? 2 : 1);
  if (!log.customSets) {
    const untouched = log.sets.every(st => !st.done && !String(st.actual||'').trim());
    if (untouched && log.sets.length !== wanted) {
      log.sets = Array.from({length: wanted}, (_,i) => newSetFor(exercise,i));
    }
    while (log.sets.length < wanted) log.sets.push(newSetFor(exercise, log.sets.length));
  }
  return log;
}
function setStats(sets){
  sets=sets||[];
  if(!sets.some(s=>s.side)){ return {done:sets.filter(s=>s.done).length,total:sets.length,partial:0,split:false}; }
  let done=0,partial=0,total=0;
  for(let i=0;i<sets.length;i+=2){ total++; const a=sets[i]&&sets[i].done, b=sets[i+1]&&sets[i+1].done; if(a&&b) done++; else if(a||b) partial++; }
  return {done,total,partial,split:true};
}
function cardioSkipped(kind, iso=selectedDate){ const s=state.sessions&&state.sessions[iso]; const f=isFreeSessionActive()&&iso===selectedDate?getSession(iso):s; return !!(f&&f.cardioStatus&&f.cardioStatus[kind]==='skipped'); }
function plannedSets(exs, iso=selectedDate) { return exs.reduce((n,e)=> n + (((e.kind==='run'||e.kind==='bike')&&cardioSkipped(e.kind,iso))?0:Math.max(1, Number(e.sets||1))),0); }
function doneSets(iso, exs) { return exs.reduce((n,e)=> n + (((e.kind==='run'||e.kind==='bike')&&cardioSkipped(e.kind,iso))?0:setStats(getExerciseLog(iso,e).sets).done),0); }
function pct(iso, exs) { const total=plannedSets(exs, iso); return total ? Math.round(doneSets(iso, exs)/total*100) : 0; }
/* ===== Navigation v2 : pile de vues + API History (bouton retour Android/geste) ===== */
const VIEW_TITLES={today:"Aujourd'hui",planning:'Planning',session:'Séance',charts:'Stats',goals:'Objectifs',gear:'Matériel',routine:'Routine',history:'Historique',settings:'Réglages'};
let navStack=['today'];
let overlayStack=[];
const viewScroll={};
function pushOverlay(closeFn){ overlayStack.push(closeFn); try{ history.pushState({o:overlayStack.length},''); }catch(e){} updateHeaderNav(); }
function requestCloseOverlay(){ if(!overlayStack.length) return; try{ history.back(); }catch(e){ const f=overlayStack.pop(); if(f) f(); updateHeaderNav(); } }
function handleBack(){
  const ms=$('#moreSheet');
  if(ms && !ms.classList.contains('hidden')){ ms.classList.add('hidden'); if(navStack.length>1||overlayStack.length){ try{ history.pushState({v:currentView},''); }catch(e){} } updateHeaderNav(); return; }
  const f=overlayStack.pop();
  if(f){ try{ f(); }catch(e){} updateHeaderNav(); return; }
  if(navStack.length>1){ navStack.pop(); setView(navStack[navStack.length-1],{fromPop:true}); }
}
window.addEventListener('popstate', handleBack);
try{ history.replaceState({v:'today'},''); }catch(e){}
function goBack(){ if(overlayStack.length||navStack.length>1){ try{ history.back(); return; }catch(e){} } handleBack(); }
function updateHeaderNav(){
  const b=$('#backBtn'); if(b) b.classList.toggle('hidden', navStack.length<=1 && !overlayStack.length);
  const t=$('#viewTitle'); if(t) t.textContent = navStack.length>1 ? (VIEW_TITLES[currentView]||'Programme annuel') : 'Programme annuel';
}
function setView(view, opts={}) {
  const sc=document.scrollingElement||document.documentElement;
  if(currentView && sc) viewScroll[currentView]=sc.scrollTop||0;
  if(view !== 'session') selectedFreeId = null;
  if(!opts.fromPop && view!==currentView){ navStack.push(view); try{ history.pushState({v:view},''); }catch(e){} }
  currentView = view;
  const moreViews=['goals','gear','routine','history','settings'];
  $$('.bottomnav button').forEach(b => { if(b.id==='moreBtn') b.classList.toggle('active', moreViews.includes(view)); else b.classList.toggle('active', b.dataset.view === view); });
  const ms=$('#moreSheet'); if(ms) ms.classList.add('hidden');
  $$('.view').forEach(v => v.classList.toggle('active', v.id === view));
  render();
  updateHeaderNav();
  if(sc) sc.scrollTop=viewScroll[view]||0;
}
function render() { if(!levelSyncedOnce){ levelSyncedOnce=true; try{ migrateSnapshots(); migrateSnapshots2(); migrateDefaults41(); migrateSnapshots3(); }catch(e){} try{ checkTrophies(false); }catch(e){} syncLevelFromRecords(); } renderToday(); renderPlanning(); renderSession(); renderCharts(); renderRoutine(); renderHistory(); renderSettings(); renderGoals(); renderGear(); }

function isRestDay(plan){ return /repos/i.test(plan?.title || ''); }
function renderToday() {
  const root = $('#today'); const iso=isoToday(); const {week,type,deload,plan,blockLabel}=planForDate(iso); const exs=allExercisesForSession(iso); const stats=weeklyStats(mondayOf(parseISO(iso))); const todaySession=state.sessions?.[iso]; const isDone=Boolean(todaySession?.completed);
  if(isRestDay(plan) && !isDone){
    root.innerHTML = `<section class="card"><div class="between"><div><p class="eyebrow">Aujourd'hui</p><h2>${esc(fmtLongDate(iso))}</h2></div><span class="badge">Semaine ${week} · ${type} · Repos</span></div><h3>Repos</h3><p class="muted">${esc(plan.objective)}</p><p class="muted">Jour de repos — récupère. Séance libre possible.</p><div class="row"><button class="primary" id="newFreeToday">+ Séance libre</button><button class="ghost" id="goRoutineToday">Routine</button><button class="ghost" id="goSessionToday">Voir le jour</button></div></section><section class="grid grid-3"><div class="stat"><small>Séances faites cette semaine</small><strong>${stats.doneSessions}</strong></div><div class="stat"><small>Volume total semaine</small><strong>${formatDecimal(stats.volumeKg,0)}</strong><span class="muted"> kg</span></div><div class="stat"><small>Douleur moyenne</small><strong>${stats.avgPain || '-'}</strong><span class="muted"> /10</span></div></section>`;
    $('#newFreeToday').onclick = createFreeSession;
    $('#goRoutineToday').onclick = () => setView('routine');
    $('#goSessionToday').onclick = () => { selectedFreeId=null; selectedDate=isoToday(); setView('session'); };
    renderTodayExtras();
    return;
  }
  root.innerHTML = `<section class="card ${isDone?'done-card':''}"><div class="between"><div><p class="eyebrow">Aujourd'hui</p><h2>${esc(fmtLongDate(iso))}</h2></div><span class="badge ${isDone?'done':(deload?'warn':'')}">${isDone?'<i class="dot done"></i>Terminée':`Semaine ${week} · ${type} · ${esc(blockLabel)}${deload?' · allégée':''}`}</span></div><h3>${esc(plan.title)}</h3><p class="muted">${esc(plan.objective)}${(()=>{const m=estimateSessionMinutes(plan);return m?` ⏱ ≈ ${m} min.`:'';})()}</p><div class="progressbar"><span style="width:${pct(iso,exs)}%"></span></div><p class="muted">${doneSets(iso,exs)}/${plannedSets(exs)} séries cochées${isDone?' · séance terminée':''}</p><div class="row"><button class="primary" id="goSessionToday">${isDone?'Voir séance terminée':'Démarrer / continuer'}</button><button class="ghost" id="goPlanningToday">Planning</button><button class="ghost" id="goRoutineToday">Routine</button><button class="ghost" id="newFreeToday">+ Séance libre</button></div></section><section class="grid grid-3"><div class="stat"><small>Séances faites cette semaine</small><strong>${stats.doneSessions}</strong></div><div class="stat"><small>Volume total semaine</small><strong>${formatDecimal(stats.volumeKg,0)}</strong><span class="muted"> kg</span></div><div class="stat"><small>Douleur moyenne</small><strong>${stats.avgPain || '-'}</strong><span class="muted"> /10</span></div></section>`;
  $('#goSessionToday').onclick = () => { selectedFreeId=null; selectedDate=isoToday(); setView('session'); };
  $('#goPlanningToday').onclick = () => setView('planning');
  $('#goRoutineToday').onclick = () => setView('routine');
  $('#newFreeToday').onclick = createFreeSession;
  renderTodayExtras();
}
function createFreeSession(){
  const title = prompt('Nom de la séance libre ?', 'Séance libre') || 'Séance libre';
  const id = `free-${Date.now()}`;
  state.freeSessions = state.freeSessions || {};
  state.freeSessions[id] = newFreeSession(title, freeDefaultDate());
  selectedFreeId = id;
  selectedDate = state.freeSessions[id].date;
  saveState();
  setView('session');
}
function allTemplates(){ return [...(state.userTemplates||[]).map(t=>Object.assign({},t,{user:true})), ...(typeof FREE_TEMPLATES!=='undefined'?FREE_TEMPLATES:[]).map(t=>Object.assign({},t,{builtin:true}))]; }
function findTemplate(id){ return allTemplates().find(t=>t.id===id)||null; }
function cloneTpl(t){ return JSON.parse(JSON.stringify({name:t.name,exercises:t.exercises||[]})); }
function saveUserTemplate(t){ state.userTemplates=state.userTemplates||[]; const now=new Date().toISOString(); const c=cloneTpl(t); const i=t.id?state.userTemplates.findIndex(u=>u.id===t.id):-1;
  if(i>=0) state.userTemplates[i]=Object.assign({},state.userTemplates[i],c,{updatedAt:now}); else state.userTemplates.push(Object.assign({id:'utpl-'+Date.now()+'-'+Math.random().toString(36).slice(2,6),createdAt:now,updatedAt:now},c));
  saveState(); return i>=0?state.userTemplates[i]:state.userTemplates[state.userTemplates.length-1]; }
function duplicateTemplate(id){ const t=findTemplate(id); if(!t) return null; return saveUserTemplate(Object.assign(cloneTpl(t),{name:t.name+' (copie)'})); }
function deleteUserTemplate(id){ state.userTemplates=(state.userTemplates||[]).filter(t=>t.id!==id); saveState(); }
/* Séance existante → modèle : exercices, ordre, séries, reps et charges réellement utilisées (ou prescrites) */
function templateFromSession(name){
  const exs=activeExercisesForSession(selectedDate).filter(e=>e.kind==='strength'||e.kind==='mobility');
  return {name,exercises:exs.map(e=>{ const lg=getExerciseLog(selectedDate,e); const n=Math.max(1,Number(e.sets||1)); const rows=(lg.sets&&lg.sets.length?lg.sets:Array.from({length:n},()=>({}))).filter(x=>!x.side||x.side==='G');
    return {name:e.name,kind:e.kind,muscles:e.muscles||[],bodyweight:!!e.bodyweight,restSec:Number(e.restSec||75),sets:rows.map((x,i)=>({reps:String(x.actual||'').trim()?(parseReps(x.actual)||repsForSet(e,i)):repsForSet(e,i),load:toNum(x.load)||(e.bodyweight?0:toNum(e.defaultLoad))}))}; })};
}
function applyFreeTemplate(tplId, dateIso, open){
  if(open===undefined) open=true;
  const tpl=findTemplate(tplId); if(!tpl) return null;
  const sid='free-'+Date.now();
  state.freeSessions=state.freeSessions||{};
  const fs=newFreeSession(tpl.name, dateIso||freeDefaultDate()); fs.freeMode=true; fs.exercises=fs.exercises||{}; fs.extraExercises=[]; fs.templateId=tpl.id;
  tpl.exercises.forEach((te,idx)=>{
    const eid='free-'+Date.now()+'-'+idx;
    const reps=te.sets.map(s=>s.reps); const same=reps.every(r=>String(r)===String(reps[0])); const repsStr=same?String(reps[0]):reps.join('/');
    fs.extraExercises.push({ id:eid, name:te.name, sets:te.sets.length, reps:repsStr, target:'Modèle : '+tpl.name, restSec:te.restSec||75, kind:te.kind||'strength', muscles:te.muscles||[], bodyweight:!!te.bodyweight, defaultLoad:Number(te.sets[0].load)||0, repdbId:te.repdbId });
    fs.exercises[eid]={ collapsed:false, customSets:true, sets: te.sets.map(s=>({ done:false, actual:'', load:(Number(s.load)>0?s.load:''), note:'' })) };
  });
  state.freeSessions[sid]=fs; if(open){ selectedFreeId=sid; selectedDate=fs.date; saveState(); setView('session'); } else saveState();
  return sid;
}

function renderPlanning() {
  const root=$('#planning'); const base=mondayOf(parseISO(selectedDate)); const week=weekIndexFor(localISO(base)); const type=typeForWeek(week); const wkLabel=planForDate(localISO(base)).label; const days=Array.from({length:7},(_,i)=>localISO(addDays(base,i)));
  root.innerHTML = `<section class="card"><div class="week-nav"><button class="ghost" id="prevWeek">← Semaine</button><div><p class="eyebrow">Planning</p><h2>Semaine ${week} · ${esc(wkLabel)}</h2><p class="muted">${fmtDate(days[0])} au ${fmtDate(days[6])}</p></div><button class="ghost" id="nextWeek">Semaine →</button></div><div class="row"><button class="ghost" id="todayWeek">Aujourd'hui</button><button class="ghost" id="jumpA">Semaine A suivante</button><button class="ghost" id="jumpB">Semaine B suivante</button></div></section><section class="day-grid">${days.map(dayCard).join('')}</section>`;
  $('#prevWeek').onclick = () => { selectedDate=localISO(addDays(base,-7)); renderPlanning(); };
  $('#nextWeek').onclick = () => { selectedDate=localISO(addDays(base,7)); renderPlanning(); };
  $('#todayWeek').onclick = () => { selectedDate=isoToday(); renderPlanning(); };
  $('#jumpA').onclick = () => jumpWeek('A'); $('#jumpB').onclick = () => jumpWeek('B');
  $$('.day-card').forEach(btn => btn.onclick = () => { selectedDate=btn.dataset.iso; setView('session'); });
}
function jumpWeek(t) { let d=mondayOf(parseISO(selectedDate)); for(let i=0;i<12;i++){ d=addDays(d,7); if(typeForWeek(weekIndexFor(localISO(d)))===t) break; } selectedDate=localISO(d); renderPlanning(); }
function movedTagFor(iso){ const m=state.moves&&state.moves[iso]; if(m&&m.from&&m.from!==iso) return `<small class="moved-tag">↪ séance du ${fmtDate(m.from)}</small>`; const t=isMovedAway(iso)?moveTargetOf(iso):null; return t?`<small class="moved-tag">→ déplacée au ${fmtDate(t)}</small>`:''; }
function dayCard(iso) { const {week,type,deload,plan}=planForDate(iso); const exs=allExercisesForSession(iso); const s=getSession(iso); const rest=isRestDay(plan); const p=pct(iso,exs); const isToday=iso===isoToday(); const freeDone=Object.values(state.freeSessions||{}).filter(f=>f && f.completed && f.date===iso).length; const freeTag=freeDone?`<small class="free-tag">＋ ${freeDone} séance${freeDone>1?'s':''} libre${freeDone>1?'s':''}</small>`:''; let dot='todo',label='À faire'; if(s.completed){dot='done';label='Terminée';} else if(rest){dot='rest';label='Repos';} else if(p>0){dot='part';label=`${p} %`;} else if(isToday){dot='today';label="Aujourd'hui";} return `<div class="day-wrap"><button class="day-card ${iso===selectedDate?'active':''} ${s.completed?'done':''} ${isToday?'today':''}" data-iso="${iso}"><strong>${fmtDate(iso)}</strong><small>${type} · S${week}${deload?' · allégée':''}</small><span class="badge ${s.completed?'done':(dot==='part'?'warn':'')}"><i class="dot ${dot}"></i>${label}</span><small>${esc(plan.title)}</small>${(()=>{const m=rest?0:estimateSessionMinutes(plan);return m?`<small class="muted">⏱ ≈ ${m} min</small>`:'';})()}${freeTag}${movedTagFor(iso)}</button><button class="day-more" type="button" data-moveday="${iso}" aria-label="Déplacer ou reporter la séance du ${fmtDate(iso)}">⋯</button></div>`; }

function freeSessionsForDate(iso){ return Object.entries(state.freeSessions||{}).filter(([,s])=>s && s.date===iso); }
function freeSessionsCardHtml(){
  const list=freeSessionsForDate(selectedDate);
  if(!list.length) return '';
  return `<section class="card"><p class="eyebrow">Séances libres de ce jour</p>${list.map(([id,s])=>{ const n=(s.extraExercises||[]).length; const active=(id===selectedFreeId); return `<div class="between" style="padding:10px 0;border-top:1px solid var(--line)"><div><strong>${esc(s.title||'Séance libre')}</strong><p class="muted">${n} exercice(s) · <i class="dot ${s.completed?'done':'part'}"></i>${s.completed?'terminée':'en cours'}${active?' · affichée ci-dessous':''}</p></div>${active?'<span class="badge">affichée</span>':`<button class="ghost" data-openfree="${esc(id)}" type="button">Ouvrir</button>`}</div>`; }).join('')}${isFreeSessionActive()?`<div class="footer-actions"><button class="ghost" id="backToPlanned" type="button">Voir la séance planifiée du jour</button></div>`:''}</section>`;
}
function renderSession() {
  detectResume();
  const root=$('#session'); const freeActive=isFreeSessionActive(); const sess=getSession(selectedDate);
  const basePlan=planForDate(selectedDate); const week=basePlan.week, type=basePlan.type, blockLabel=basePlan.blockLabel, deload=freeActive ? false : basePlan.deload;
  const plan=freeActive ? { name:'Libre', title:sess.title || 'Séance libre', objective:'Séance libre — ajoute tes exercices.', exercises:[] } : basePlan.plan;
  const exs=activeExercisesForSession(selectedDate); const runPlanned=hasKind(exs,'run'); const bikePlanned=hasKind(exs,'bike'); const strengthSec=elapsedWorkout(sess); const runSec=toNum(sess.metrics.runDurationSec); const bikeSec=toNum(sess.metrics.bikeDurationSec);
  const stickyHtml = `<div class="rest-quote hidden" id="restQuote" aria-live="polite"></div><section class="unified-bar" id="unifiedBar" aria-live="polite"><button class="ub-chrono" id="ubToggle" type="button" title="Chrono séance : démarrer / mettre en pause"><span id="ubIcon">${sess.stopwatch.running?'⏸':'▶'}</span><strong id="workoutElapsedSticky">${hms(strengthSec)}</strong></button><div class="ub-mid" id="ubMid"><div><strong id="stickyProgressText">${doneSets(selectedDate,exs)}/${plannedSets(exs)} séries</strong><span class="muted" id="stickyVolText"> · ${formatDecimal(sessionVolumeKg(selectedDate),0)} kg</span></div><div class="progressbar mini"><span id="stickyBar" style="width:${pct(selectedDate,exs)}%"></span></div></div><div class="ub-rest hidden" id="ubRest"><strong id="ubRestTime">00:00</strong><span class="muted">repos</span><button class="small ghost" id="ubRestSkip" type="button">Passer</button></div><button class="primary" id="finishSticky">${sess.completed?'✓':'Terminer'}</button></section>`;
  root.innerHTML = `<section class="card ${sess.completed?'done-card':''}"><div class="between"><div><p class="eyebrow">Séance</p><h2>${freeActive?'Séance libre':esc(plan.name)} · ${esc(fmtLongDate(selectedDate))}</h2></div><span class="badge ${sess.completed?'done':(deload?'warn':'')}">${sess.completed?'Terminée':(freeActive?'Libre':`Semaine ${week} · ${type} · ${esc(blockLabel)}${deload?' · allégée':''}`)}</span></div><h3>${esc(plan.title)}</h3><p class="muted">${esc(plan.objective)}</p>${(!freeActive&&plan.workout)?workoutBarHtml(plan.workout):''}${(()=>{const m=freeActive?0:estimateSessionMinutes(plan);const pp=estimateParts(plan); return m?`<p class="muted">⏱ Durée estimée : ≈ ${m} min${pp.strength&&pp.cardio?` (musculation ≈ ${pp.strength} · cardio ≈ ${pp.cardio})`:''}${(c=>c?` · dont tronc ≈ ${c} min`:'')(coreMinutes(plan))}</p>`:'';})()}${freeActive?`<div class="grid grid-2"><label><span>Nom de la séance libre</span><input id="freeSessionTitle" type="text" value="${esc(sess.title||'Séance libre')}"></label><label><span>Date de la séance</span><input id="freeSessionDate" type="date" value="${esc(sess.date||selectedDate)}" max="${isoToday()}"></label></div>`:''}<div class="progressbar"><span style="width:${pct(selectedDate,exs)}%"></span></div><p class="muted">${doneSets(selectedDate,exs)}/${plannedSets(exs)} séries cochées · volume estimé : ${formatDecimal(sessionVolumeKg(selectedDate),0)} kg${sess.completed?' · séance terminée':''}</p>${(!sess.completed&&focusExercises().length)?`<button class="primary focus-entry" id="openFocus" type="button">${(sess.focus&&doneSets(selectedDate,activeExercisesForSession(selectedDate)))?'▶ Reprendre en mode focus':'▶ Démarrer en mode focus'}</button>`:''}<div class="row"><button class="ghost" id="prevDay">← Jour</button>${activeExercisesForSession(selectedDate).some(e=>e.kind==='strength'||e.kind==='mobility')?'<button class="ghost" type="button" id="saveAsTplBtn">💾 Modèle</button>':''}${(!freeActive&&!sess.completed&&!isRestDay(plan))?`<button class="ghost" type="button" data-moveday="${selectedDate}">📅 Déplacer</button>`:''}<button class="ghost" id="nextDay">Jour →</button><button class="ghost" id="backPlanning">Voir planning</button><button class="ghost" id="gearToday">${getSession(selectedDate).equipmentOverride?'🧳 Matériel du jour ✓':'🧳 Pas mon matériel'}</button><button class="ghost" id="newFreeFromSession">+ Séance libre</button><button class="danger" id="resetSession">Réinitialiser séance</button></div></section>${freeSessionsCardHtml()}${cardioDupCardHtml(selectedDate)}${autoregBannerHtml(selectedDate)}
  ${!sess.completed ? `<section class="card"><div class="between"><div><p class="eyebrow">Chronomètre hors cardio</p><h3>Muscu & poids du corps</h3></div><strong class="big-time" id="workoutElapsed">${hms(strengthSec)}</strong></div><p class="muted">Pour tout sauf le cardio (course/vélo saisis après la sortie).</p><div class="row"><button class="primary" id="startWorkout">${sess.stopwatch.running?'En cours': strengthSec ? 'Reprendre' : 'Lancer séance'}</button><button class="ghost" id="pauseWorkout">Pause</button><button class="ghost" id="stopWorkout">Arrêter</button><button class="danger" id="resetWorkout">Reset chrono</button></div></section>`:''}
  ${!freeActive ? `<section class="card instruction-card"><p class="eyebrow">Prévu aujourd'hui</p><ul class="instruction-list">${exs.filter(e=>e.kind!=='activity').map(e=>`<li><strong>${esc(e.name)}</strong> <span class="muted">${esc(e.target)} · ${esc(e.sets)} x ${isUnilateralEx(e)?(uniSplit(e)?esc(repsSeq(e.reps)?e.reps:repsForSet(e,0))+' par côté (G/D)':esc(doubleRepsStr(e.reps))+' au total'):esc(e.reps)} · repos ${esc(e.restSec||0)}s</span></li>`).join('')}</ul></section>` : ''}
  ${runPlanned ? cardioBlock('run', sess) : ''}${bikePlanned ? cardioBlock('bike', sess) : ''}
  <section class="card"><div class="between"><div><p class="eyebrow">Exercices</p><h3>Séries, reps, charge et repos</h3></div><span class="badge">Poids actuel : ${formatDecimal(currentBodyWeight(selectedDate),1)} kg</span></div><div id="exerciseList">${exs.filter(e=>e.kind!=='run' && e.kind!=='bike').map(e=>exerciseCard(e)).join('') || '<p class="muted">Aucun exercice pour le moment. Ajoute un exercice ci-dessous.</p>'}</div>${freeBuilder()}</section>
  <section class="card"><h3>Bilan global</h3><div class="grid grid-3"><label><span>Durée hors cardio (auto / modifiable)</span><input id="strengthDurationDisplay" type="text" inputmode="numeric" enterkeyhint="done" autocomplete="off" value="${hms(strengthSec)}" placeholder="hh:mm:ss"></label><label><span>RPE</span><input id="rpe" type="text" inputmode="numeric" enterkeyhint="done" autocomplete="off" min="1" max="10" value="${esc(sess.rpe)}" placeholder="/10"></label><label><span>Douleur dos/omoplates</span><input id="backPain" type="text" inputmode="numeric" enterkeyhint="done" autocomplete="off" min="0" max="10" value="${esc(sess.backPain)}" placeholder="/10"></label></div><label><span>Notes</span><textarea id="notes" placeholder="Sensations, douleur, modifications...">${esc(sess.notes)}</textarea></label><div class="footer-actions"><button class="primary" id="saveSession">${sess.completed?'Mettre à jour':'Enregistrer'}</button><button class="ghost" id="toggleComplete">${sess.completed?'Marquer non terminée':'Marquer terminée'}</button></div></section>
  ${stickyHtml}`;
  setDurationInputs('run', runSec); setDurationInputs('bike', bikeSec); bindSessionEvents(); bindWorkoutTimer(sess); updateCardioComputed();
}

function isEmomExercise(e){ return /emom/i.test(String(e.target||'')) || /emom/i.test(String(e.name||'')); }
function plannedRunText(){ const r=activeExercisesForSession(selectedDate).find(e=>e.kind==='run'&&/km|min/.test(String(e.reps||''))&&!/échauffement|retour au calme/i.test(e.target||'')); return r?{txt:`${r.sets>1?r.sets+' × ':''}${r.reps}`,km:/km/.test(r.reps)?Math.max(...String(r.reps).match(/\d+(?:[.,]\d+)?/g).map(x=>parseFloat(x.replace(',','.'))))*Math.max(1,Number(r.sets||1)):0}:null; }
function workoutBarHtml(w){
  const blocks=(w&&w.blocks)||[]; if(!blocks.length) return '';
  const color={'échauffement':'#38bdf8','retour au calme':'#38bdf8','continu':'#22c55e','fractionné':'#f59e0b','intervalles':'#ef4444','seuil':'#f97316','accélérations':'#a78bfa','course':'#eab308'};
  const segs=[]; blocks.forEach(b=>{ if(b.reps&&b.reps>1&&(b.type==='intervalles'||b.type==='seuil'||b.type==='fractionné')){ for(let i=0;i<Math.min(b.reps,12);i++){ segs.push({c:color[b.type]||'#64748b',f:2,t:b.work}); if(b.recovery&&i<b.reps-1) segs.push({c:'#334155',f:1,t:b.recovery}); } } else segs.push({c:color[b.type]||'#64748b',f:b.type==='continu'||b.type==='course'?8:3,t:b.value||b.work}); });
  return `<div class="wbar" role="img" aria-label="Structure : ${esc(blocks.map(b=>b.type+(b.reps>1?' '+b.reps+' × '+b.work:'')).join(', '))}">${segs.map(s=>`<span style="flex:${s.f};background:${s.c}" title="${esc(s.t||'')}"></span>`).join('')}</div><div class="wbar-legend">${blocks.map(b=>`<span><i style="background:${color[b.type]||'#64748b'}"></i>${esc(b.type)}${b.reps>1?' '+b.reps+' × '+esc(b.work):''}</span>`).join('')}</div>`;
}
function runPreviewData(weeks){
  const st=runEngineStatus(); if(!st) return null; const out=[]; const mon=mondayOf(parseISO(isoToday())); const race=st.b.raceDate;
  const n=race?Math.max(1,Math.min(16,(weeksToRace(isoToday(),race)||0)+1)):(weeks||4);
  try{ for(let k=0;k<n;k++){ runPreviewL=st.L+k; const m=localISO(addDays(mon,7*k)); let long=0, runs=0, title='';
      for(let i=0;i<7;i++){ const iso=localISO(addDays(parseISO(m),i)); const pl=runEnginePlanFor(iso); const r=pl.exercises.filter(e=>e.kind==='run'); if(r.length){ runs++; if(/longue|Jour de course/i.test(pl.title)){ long=Math.max(long,...r.map(e=>{ const x=(String(e.reps).match(/\d+(?:[.,]\d+)?/g)||['0']).map(v=>parseFloat(v.replace(',','.'))); return /km/.test(e.reps)?Math.max(...x):0; })); title=pl.title; } } }
      out.push({mon:m,runs,long,race:/Jour de course/.test(title)}); } } finally { runPreviewL=null; }
  return {st,weeks:out};
}
function runPreviewHtml(){
  const d=runPreviewData(4); if(!d) return '';
  return `<section class="card"><p class="eyebrow">Plan course</p><h3>${d.st.b.raceDate?'Ton chemin jusqu\'au jour J':'Les prochaines semaines'}</h3><p class="muted">Si chaque semaine est validée. Sinon le plan reste au même niveau, ou recule d'un cran après une semaine manquée : il ne force jamais.</p><div class="preview-list">${d.weeks.map((w,k)=>`<div class="between" style="padding:6px 0;border-top:1px solid var(--line)"><span>${k===0?'Cette semaine':'Semaine du '+fmtDate(w.mon)}</span><strong>${w.race?'🎉 Jour de course':`${w.runs} sortie${w.runs>1?'s':''}${w.long?' · longue '+String(w.long).replace('.',',')+' km':''}`}</strong></div>`).join('')}</div></section>`;
}
function runFeedbackHtml(sess){
  const pl=plannedRunText(); const done=toNum(sess.metrics&&sess.metrics.runDistanceKm);
  const cmp=pl?`<p class="muted" style="margin:10px 0 4px">Prévu : <strong>${esc(pl.txt)}</strong>${done&&pl.km?` · fait : <strong>${formatDecimal(done,1)} km</strong> (${Math.round(done/pl.km*100)} %)`:''}</p>`:'';
  return `${cmp}<div class="runfeel"><span class="muted">Ressenti :</span>${RUN_FEEL.map(([v,l])=>`<button type="button" class="ck ${toNum(sess.rpe)===v?'active':''}" style="width:auto;padding:0 10px" data-runfeel="${v}">${l}</button>`).join('')}</div><p class="muted" style="font-size:12px;margin:4px 0 0">Le plan s'en sert : après une sortie très dure, la séance difficile suivante est allégée.</p>`;
}
function cardioBlock(kind, sess) { const isRun=kind==='run'; const title=isRun?'Course à pied':'Vélo'; const dist=sess.metrics[`${kind}DistanceKm`]||''; const sec=toNum(sess.metrics[`${kind}DurationSec`]); const speed=avgSpeed(dist,sec); return `<section class="card"><h3>${title} — bilan</h3><div class="metric-block"><div class="between"><div><strong>${title}</strong><p class="muted">Distance + temps → vitesse${isRun?'/allure':''} auto.</p></div><span class="badge" id="${kind}Badge">${formatDecimal(speed,2)} km/h${isRun?' · '+pace(dist,sec):''}</span></div>${sess.freeMode?'':cardioPlanHtml(kind)}<div class="grid grid-4"><label><span>Distance ${title.toLowerCase()}, km</span><input id="${kind}DistanceKm" type="number" inputmode="decimal" step="0.01" value="${esc(dist)}" placeholder="ex : ${isRun?'7.01':'50.36'}"></label><label><span>Heures</span><input id="${kind}H" type="number" inputmode="numeric" min="0"></label><label><span>Minutes</span><input id="${kind}M" type="number" inputmode="numeric" min="0" max="59"></label><label><span>Secondes</span><input id="${kind}S" type="number" inputmode="numeric" min="0" max="59"></label></div><div class="computed"><span>Vitesse : <strong id="${kind}SpeedOut">${formatDecimal(speed,2)} km/h</strong></span>${isRun?`<span>Allure : <strong id="${kind}PaceOut">${pace(dist,sec)}</strong></span>`:''}</div><div class="row" style="margin-top:12px"><label style="display:flex;align-items:center;gap:10px;font-weight:700"><input type="checkbox" id="${kind}Done" ${cardioDone(kind)?'checked':''} style="width:auto;transform:scale(1.3)"> <span>Réalisé · compte dans le suivi</span></label>${(sess.cardioStatus&&sess.cardioStatus[kind]==='skipped')?`<span class="badge warn" style="margin-left:8px">⏸ Non réalisé</span><button class="ghost small" type="button" data-cardiostatus="clear" data-kind="${kind}">Annuler</button>`:(cardioDone(kind)?'':`<button class="ghost small" type="button" data-cardiostatus="skipped" data-kind="${kind}">Non réalisé</button>`)}${kind==='run'?runFeedbackHtml(sess):''}${kind==='run'?`<label style="display:flex;align-items:center;gap:10px;margin-top:8px"><input type="checkbox" id="runReference" ${sess.metrics&&sess.metrics.runReference?'checked':''} style="width:auto;transform:scale(1.2)"> <span>Course de référence (test ou compétition) : sert à calculer tes allures</span></label>`:''}</div></div></section>`; }
function exerciseCard(e) { const log=getExerciseLog(selectedDate,e); const id=e.id || makeId(e.name + '-' + e.kind); const bw=e.bodyweight; const tags=(e.muscles||[]).map(m=>`<span>${esc(m)}</span>`).join(''); let prevSets=[]; try{ const h=exerciseHistoryById(id, selectedDate); if(h && h.length) prevSets=(h[0].log.sets||[]).filter(s=>s.done); }catch(_){} const emomBtn=isEmomExercise(e)?`<button class="small primary" type="button" data-action="emom" data-rounds="${esc(e.sets||10)}" data-rest="${esc(e.restSec||60)}">Lancer EMOM ${esc(e.sets||10)} min</button>`:''; return `<article class="exercise-card" data-exid="${esc(id)}"><div class="exercise-head-row"><button type="button" class="exercise-head" data-action="toggleExercise"><div><strong>${esc(e.name)}</strong><small class="muted">${esc(e.target)} · prévu ${esc(e.sets)} x ${isUnilateralEx(e)?(uniSplit(e)?esc(repsSeq(e.reps)?e.reps:repsForSet(e,0))+' par côté · séries gauche/droite':esc(doubleRepsStr(e.reps))+' au total ('+esc(e.reps)+')'):esc(e.reps)} · repos ${esc(e.restSec||0)}s</small>${(()=>{const a=adjustmentFor(selectedDate);const h=(a&&a.level!=='ok')?'':progressionHint(e);return h?`<small class="muted" style="display:block;margin-top:4px;color:#86efac">↗ ${esc(h)}</small>`:'';})()}${adjustedLineHtml(e)}${e.subbedFrom?`<small class="muted" style="display:block;margin-top:4px;color:#93c5fd">↔ Remplace « ${esc(e.subbedFrom)} » (matériel indisponible)</small>`:''}${e.maxTest?`<small style="display:block;margin-top:4px;color:#fbbf24;font-weight:700">${e.submax?'🛡️ Test sous-maximal (gêne omoplates) — arrête-toi 2 reps avant l\'échec':`🎯 Test de max — une seule série au maximum${e.testLevel?` · objectif : battre ${e.testLevel}`:''}`}</small>`:''}${e.swappedFrom?`<small class="muted" style="display:block;margin-top:4px;color:#93c5fd">⇄ Remplace « ${esc(e.swappedFrom)} »</small>`:''}${e.loadSnapped?`<small class="muted" style="display:block;margin-top:4px;color:#93c5fd">⚖ Charge suggérée : ${e.defaultLoad} kg (ta KB la plus proche de ${e.origLoad} kg)</small>`:''}${e.repsScaled?`<small class="muted" style="display:block;margin-top:4px;color:#93c5fd">🎯 ${e.pctNote?esc(e.pctNote.charAt(0).toUpperCase()+e.pctNote.slice(1)):'Reps adaptées à ton niveau'} (programme d'origine : ${esc(e.origReps)})</small>`:''}<div class="muscle-tags">${tags}</div></div>${(()=>{const st=setStats(log.sets),d=st.done,t=st.total;return `<span class="badge ${t&&d===t?'done':((d||st.partial)?'warn':'')}">${d}/${t}</span>`;})()}</button><div class="exercise-actions"><button class="small ghost info-btn" type="button" data-action="info" title="Fiche exercice : historique, record, grade">ⓘ</button>${emomBtn}${(e.kind==='strength'||e.kind==='mobility')&&!isEmomExercise(e)&&!isTimedExercise(e)?`<button class="small ghost uni-btn${isUnilateralEx(e)?' active':''}" type="button" data-action="toggleUni" title="Séries gauche / droite">↔ G/D</button>`:''}${(e.kind==='strength'||e.kind==='mobility')&&!e.maxTest?`<button class="small ghost" type="button" data-action="swapExercise" title="Remplacer par un autre exercice">⇄ Remplacer</button>`:''}<button class="small danger" type="button" data-action="deleteExercise" title="Supprimer cet exercice">Supprimer</button></div></div>${!getSession(selectedDate).completed?recoHtml(e,id):''}<div class="exercise-body ${(log.collapsed && !(typeof emom!=='undefined' && emom.active && emom.exid===id))?'hidden':''}">${setHead(e,bw)}${log.sets.map((s,i)=>setRow(e,id,s,i,bw,prevSets[i])).join('')}${isEmomExercise(e)?'':`<div class="set-controls"><button class="small ghost" type="button" data-action="removeSet"${log.sets.length<=(setStats(log.sets).split?2:1)?' disabled':''}>− série</button><span class="muted set-count">${(st=>`${st.total} série${st.total>1?'s':''}${st.split?' · G/D':''}`)(setStats(log.sets))}</span><button class="small ghost" type="button" data-action="addSet">+ série</button></div>`}</div></article>`; }
function setHead(e,bw){ const noLoad=noLoadExercise(e); return `<div class="set-head${noLoad?' noload':''}${uniSplit(e)?' side':''}"><span></span><span>#</span><span>Reps / temps</span>${noLoad?'':`<span>${bw?'Lest kg':'Charge kg'}</span>`}</div>`; }
function setRow(e,id,s,i,bw,prev) {
  const noLoad = noLoadExercise(e);
  const emomEx = isEmomExercise(e);
  const no = emomEx ? `M${i+1}` : (s.side ? `${Math.floor(i/2)+1}<small>${s.side==='G'?'gauche':'droite'}</small>` : String(i+1));
  const title = emomEx ? `Minute ${i+1}` : (s.side ? `Série ${Math.floor(i/2)+1} ${s.side==='G'?'gauche':'droite'}` : `Série ${i+1}`);
  const prevActual = prev && prev.actual ? String(prev.actual) : '';
  const prevLoad = (prev && prev.load!=='' && prev.load!=null) ? String(prev.load) : '';
  const totalUni = isUnilateralEx(e) && !s.side;
  const setIdx = s.side ? Math.floor(i/2) : i;
  const rcA = (getSession(selectedDate).recos||{})[id]; const rcOn = rcA && rcA.status==='accepted' && Array.isArray(rcA.target);
  const repsPh = e.maxTest ? (e.submax ? 'RIR 2 (pas de max)' : (e.testLevel ? `max (à battre : ${e.testLevel})` : 'max')) : (rcOn && rcA.target[setIdx]!=null) ? `${rcA.target[setIdx]} (proposé)` : prevActual ? `${prevActual} (préc.)` : (totalUni && s.uni==='total' ? `${doubleRepsStr(repsForSet(e,setIdx))} (G+D)` : repsForSet(e,setIdx));
  const loadPh = (rcOn && toNum(rcA.load)) ? `${rcA.load} (proposé)` : prevLoad ? `${prevLoad} (préc.)` : (bw ? (toNum(e.defaultLoad)?`${e.defaultLoad} (suggéré)`:'PDC') : (toNum(e.defaultLoad)?`${e.defaultLoad} (suggéré)`:'kg'));
  const loadCell = noLoad ? '' : `<input data-field="load" type="text" inputmode="decimal" enterkeyhint="done" autocomplete="off" value="${esc(s.load==null?'':s.load)}" placeholder="${esc(loadPh)}">`;
  return `<div class="set-row compact${noLoad?' noload':''}${s.side?' side side-'+s.side:''} ${s.done?'done':''}" data-exid="${esc(id)}" data-set="${i}" data-rest="${e.restSec||0}"><input type="checkbox" data-field="done" ${s.done?'checked':''} aria-label="${title} faite"><span class="set-no" title="${title}">${no}</span><input data-field="actual" type="text" inputmode="decimal" enterkeyhint="done" autocomplete="off" pattern="[0-9.,:/ -]*" value="${esc(s.actual)}" placeholder="${esc(repsPh)}">${loadCell}</div>`;
}
function freeBuilder() { return `<div class="free-builder"><div class="between"><div><h3>Séance libre / exercice ajouté</h3><p class="muted">Ajoute un exercice ou charge un modèle.</p></div><label style="max-width:210px"><span>Mode séance libre</span><select id="freeMode"><option value="false">Non</option><option value="true" ${getSession(selectedDate).freeMode?'selected':''}>Oui</option></select></label></div><label><span>Exercice</span><select id="addExerciseName">${availableLibrary().map(e=>`<option value="${esc(e.name)}" data-kind="${esc(e.kind||'strength')}">${esc(e.name)} · ${esc(e.muscles.join('/'))}</option>`).join('')}</select></label><p id="addCardioHint" class="muted hidden">Activité cardio : clique sur « Ajouter exercice », puis renseigne distance et temps dans le bloc cardio qui apparaît.</p><div id="strengthAddFields" class="grid grid-3"><label><span>Séries</span><input id="addExerciseSets" type="text" inputmode="numeric" enterkeyhint="done" autocomplete="off" value="3" min="1"></label><label><span id="addRepsLabel">Répétitions prévues</span><input id="addExerciseReps" type="text" inputmode="decimal" enterkeyhint="done" autocomplete="off" pattern="[0-9.,:/ -]*" value="10"></label><label><span>Repos s</span><input id="addExerciseRest" type="text" inputmode="numeric" enterkeyhint="done" autocomplete="off" value="90"></label></div><div class="footer-actions"><button class="primary" id="addExerciseBtn" type="button">Ajouter exercice</button></div><p class="eyebrow" style="margin-top:14px">Activité sportive (dépense estimée)</p><div class="grid grid-3"><label><span>Sport</span><select id="addSportKey">${SPORT_ACTIVITIES.map(s=>`<option value="${s.key}">${esc(s.label)}</option>`).join('')}</select></label><label><span>Durée (min)</span><input id="addSportMin" type="text" inputmode="numeric" enterkeyhint="done" value="60"></label><div style="align-self:end"><button class="primary" id="addSportBtn" type="button">Ajouter l'activité</button></div></div><p class="muted" id="sportKcalHint"></p><label><span>Charger une séance pré-enregistrée</span><select id="freeTemplate"><option value="">— Modèles —</option>${allTemplates().map(t=>`<option value="${esc(t.id)}">${esc(t.name)}${t.user?' · perso':''}</option>`).join('')}</select></label><div class="footer-actions"><button class="ghost" id="loadTemplateBtn" type="button">Charger le modèle</button></div>${duplicateControlHtml()}</div>`; }
function bindSessionEvents() {
  $('#prevDay').onclick=()=>{ selectedFreeId=null; selectedDate=localISO(addDays(parseISO(selectedDate),-1)); renderSession(); };
  $('#nextDay').onclick=()=>{ selectedFreeId=null; selectedDate=localISO(addDays(parseISO(selectedDate),1)); renderSession(); };
  $('#backPlanning').onclick=()=>setView('planning'); { const gt=$('#gearToday'); if(gt) gt.onclick=()=>openGearOverride(selectedDate); }
  $('#newFreeFromSession').onclick=createFreeSession; $('#resetSession').onclick=resetCurrentSession; $('#saveSession').onclick=completeCurrentSession;
  { const fs=$('#finishSticky'); if(fs) fs.onclick=()=>{ if(!getSession(selectedDate).completed) completeCurrentSession(); }; }
  { const sk=$('#ubRestSkip'); if(sk) sk.onclick=()=>finishTimer(); }
  if(typeof timer!=='undefined' && timer && timer.interval && timer.remaining>0 && timer.label==='Repos série'){ const t=$('#ubRestTime'); if(t) t.textContent=mmss(timer.remaining); restBarShow(true); }
  const titleInput=$('#freeSessionTitle'); if(titleInput) titleInput.oninput=e=>{ getSession(selectedDate).title=e.target.value; saveState(); };
  const ofb=$('#openFocus'); if(ofb) ofb.onclick=openFocus;
  const stb=$('#saveAsTplBtn'); if(stb) stb.onclick=()=>{ const n=prompt('Nom de la séance type ?', planForDate(selectedDate).plan.title||'Ma séance'); if(!n) return; saveUserTemplate(templateFromSession(n.trim())); prToast('Enregistrée dans « Mes séances » ✔'); };
  $$('#session [data-runfeel]').forEach(b=>b.onclick=()=>{ const s=getSession(selectedDate); s.rpe=String(b.dataset.runfeel); saveState(); renderSession(); });
  $$('#session [data-cardiostatus]').forEach(b=>b.onclick=()=>{ const s=getSession(selectedDate); s.cardioStatus=Object.assign({},s.cardioStatus); if(b.dataset.cardiostatus==='clear') delete s.cardioStatus[b.dataset.kind]; else s.cardioStatus[b.dataset.kind]='skipped'; saveState(); renderSession(); });
  const rrf=$('#runReference'); if(rrf) rrf.onchange=e=>{ const s=getSession(selectedDate); s.metrics=s.metrics||{}; s.metrics.runReference=e.target.checked; saveState(); };
  const dateInput=$('#freeSessionDate'); if(dateInput) dateInput.onchange=e=>{ const v=e.target.value; if(!/^\d{4}-\d{2}-\d{2}$/.test(v)) return; const fsx=state.freeSessions&&state.freeSessions[selectedFreeId]; if(!fsx) return; fsx.date = v>isoToday()?isoToday():v; selectedDate=fsx.date; saveState(); renderSession(); const t=document.createElement('div'); t.className='toast'; t.textContent='Séance déplacée au '+fmtDate(fsx.date)+' ✔'; document.body.appendChild(t); setTimeout(()=>t.remove(),2200); };
  $('#toggleComplete').onclick=()=>{ const s=getSession(selectedDate); if(s.completed){ saveSessionForm(false); s.completed=false; delete s.planSnapshot; saveState(); render(); } else { completeCurrentSession(); } };
  $('#freeMode').onchange=e=>{ getSession(selectedDate).freeMode=e.target.value==='true'; saveState(); renderSession(); };
  const skSel=$('#addSportKey'), skMin=$('#addSportMin'), skHint=$('#sportKcalHint');
  const updKcal=()=>{ if(!skSel||!skHint) return; const sp=SPORT_ACTIVITIES.find(s=>s.key===skSel.value)||SPORT_ACTIVITIES[0]; const mins=toNum(skMin&&skMin.value)||60; skHint.textContent=`≈ ${sportKcal(sp.met,mins)} kcal pour ${mins} min de ${sp.label.toLowerCase()} (MET ${sp.met} × ton poids).`; };
  if(skSel){ skSel.onchange=updKcal; if(skMin) skMin.oninput=updKcal; updKcal(); }
  const sBtn=$('#addSportBtn'); if(sBtn) sBtn.onclick=()=>{
    const sp=SPORT_ACTIVITIES.find(s=>s.key===skSel.value)||SPORT_ACTIVITIES[0];
    const mins=Math.max(5,toNum(skMin&&skMin.value)||60);
    const kcal=sportKcal(sp.met,mins);
    const sess=getSession(selectedDate);
    sess.extraExercises=sess.extraExercises||[];
    const id='act-'+makeId(sp.key+'-'+Date.now());
    sess.extraExercises.push({id,name:sp.label,kind:'activity',bodyweight:true,defaultLoad:0,sets:1,reps:`${mins} min`,restSec:0,target:`Activité sportive · ≈ ${kcal} kcal`,muscles:sp.muscles,met:sp.met});
    sess.exercises=sess.exercises||{}; sess.exercises[id]={sets:[{done:false,actual:String(mins),load:''}]};
    saveState({sync:false}); renderSession();
  };
  $('#addExerciseBtn').onclick=addFreeExercise;
  { const lt=$('#loadTemplateBtn'); if(lt) lt.onclick=()=>{ const v=$('#freeTemplate')?.value; if(v) applyFreeTemplate(v); }; }
  $$('#session [data-openfree]').forEach(b=>b.onclick=()=>{ const id=b.dataset.openfree; const s=state.freeSessions&&state.freeSessions[id]; if(!s) return; selectedFreeId=id; selectedDate=s.date||selectedDate; renderSession(); });
  { const bp=$('#backToPlanned'); if(bp) bp.onclick=()=>{ selectedFreeId=null; renderSession(); }; }
  const addName=$('#addExerciseName'); if(addName){ addName.onchange=updateAddFields; updateAddFields(); }
  const dupBtn=$('#dupBtn'); if(dupBtn) dupBtn.onclick=()=>duplicateSession($('#dupSelect')?.value);
  ['run','bike'].forEach(kind=>['DistanceKm','H','M','S'].forEach(part=>{ const el=$(`#${kind}${part}`); if(el) el.oninput=()=>{ updateCardioComputed(); saveSessionForm(false); }; }));
  ['run','bike'].forEach(kind=>{ const c=$(`#${kind}Done`); if(c) c.onchange=e=>setCardioDone(kind, e.target.checked); });
  const sdField=$('#strengthDurationDisplay'); if(sdField) sdField.onchange=()=>{ const sec=parseDurationToSec(sdField.value); const s=getSession(selectedDate); s.stopwatch.elapsedSec=sec; s.stopwatch.running=false; s.stopwatch.startedAt=null; s.metrics.strengthDurationSec=sec; saveState(); sdField.value=hms(sec); };
  ['rpe','backPain','notes'].forEach(id=>{ const el=$(`#${id}`); if(el) el.oninput=()=>saveSessionForm(false); });
  $('#session').onclick = e => { const action=e.target.dataset.action; if(action==='info'){ openExerciseSheet(e.target.closest('.exercise-card')?.dataset.exid); } if(action==='toggleExercise'){ const card=e.target.closest('.exercise-card'); const body=card.querySelector('.exercise-body'); body.classList.toggle('hidden'); const log=findExerciseLogById(card.dataset.exid); if(log){ log.collapsed=body.classList.contains('hidden'); saveState(); } } if(action==='rest'){ const sec=Number(e.target.dataset.rest||0); if(sec) startTimer(sec,'Repos série'); } if(action==='emom'){ const card=e.target.closest('.exercise-card'); const rounds=Number(e.target.dataset.rounds||10); const rest=Number(e.target.dataset.rest||60); const title=card?.querySelector('strong')?.textContent || 'EMOM'; startEmom(rounds, rest, title, card?.dataset.exid); } if(action==='swapExercise'){ openSwapPicker(e.target.closest('.exercise-card')?.dataset.exid); }
    if(action==='deleteExercise'){ deleteExerciseFromSession(e.target.closest('.exercise-card')?.dataset.exid); } if(action==='addSet'){ const card=e.target.closest('.exercise-card'); const log=findExerciseLogById(card?.dataset.exid); if(log){ const ex=exerciseById(card.dataset.exid); const n=(ex&&uniSplit(ex))?2:1; for(let k=0;k<n;k++) log.sets.push(ex?newSetFor(ex,log.sets.length):{done:false,actual:'',load:'',note:''}); log.customSets=true; log.collapsed=false; saveState(); renderSession(); } } if(action==='toggleUni'){ const card=e.target.closest('.exercise-card'); const exu=exerciseById(card?.dataset.exid); const log=findExerciseLogById(card?.dataset.exid); if(exu){ state.uniOverrides=state.uniOverrides||{}; const next=!isUnilateralEx(exu); state.uniOverrides[canonicalExerciseName(exu.name)]=next; if(log){ log.sets = next ? toSplitSets(log.sets) : fromSplitSets(log.sets); log.customSets=true; log.collapsed=false; } saveState(); renderSession(); } }
    if(action==='removeSet'){ const card=e.target.closest('.exercise-card'); const log=findExerciseLogById(card?.dataset.exid); const exr=exerciseById(card?.dataset.exid); const n=(exr&&uniSplit(exr))?2:1; if(log && log.sets.length>n){ for(let k=0;k<n;k++) log.sets.pop(); log.customSets=true; log.collapsed=false; saveState(); renderSession(); } } };
  $$('#session .set-row input[type="checkbox"]').forEach(input => input.onchange = e => { updateSetFromRow(e.target.closest('.set-row'), true); });
  $$('#session .set-row input:not([type="checkbox"])').forEach(input => { input.oninput = e => updateSetFromRow(e.target.closest('.set-row'), false); input.onchange = e => updateSetFromRow(e.target.closest('.set-row'), false); });
}
/* --- Mode séance « focus » : un exercice à la fois, saisie en 1 geste, repos fixe, annulation --- */
var focusDraft=null, focusTicker=null;
function focusExercises(){ return activeExercisesForSession(selectedDate).filter(e=>e.kind==='strength'||e.kind==='mobility'); }
function focusKey(e){ return e.id||makeId(e.name+'-'+(e.kind||'')); }
function firstOpenSet(log){ return (log.sets||[]).findIndex(x=>!x.done); }
function focusPos(){ const s=getSession(selectedDate); const exs=focusExercises(); const idx=Math.min(Math.max(0,toNum(s.focus&&s.focus.idx)),Math.max(0,exs.length-1)); return {s,exs,idx}; }
function focusPrev(e){
  try{ let h=exerciseHistoryById(focusKey(e), selectedDate);
    if((!h||!h.length)&&typeof exerciseHistoryByName==='function'){ const hn=exerciseHistoryByName(e.name).filter(r=>r.iso<selectedDate); if(hn.length) return {iso:hn[0].iso, sets:hn[0].sets.map(x=>({actual:String(x.reps),load:String(x.load||'')}))}; }
    return h&&h.length?{iso:h[0].iso,sets:(h[0].log.sets||[]).filter(x=>x.done)}:null; }catch(_){ return null; }
}
function focusSuggest(e,log,i){
  const s=log.sets[i]||{}; const prev=focusPrev(e); const ps=prev&&prev.sets[i]; const setIdx=s.side?Math.floor(i/2):i;
  let reps;
  if(String(s.actual||'').trim()) reps=parseReps(s.actual);
  else if(e.maxTest) reps=e.submax?Math.max(1,Math.round(toNum(e.testLevel)*0.75)):(toNum(e.testLevel)||0);
  else if((getSession(selectedDate).recos||{})[focusKey(e)]&&getSession(selectedDate).recos[focusKey(e)].status==='accepted'&&getSession(selectedDate).recos[focusKey(e)].target[setIdx]!=null) reps=toNum(getSession(selectedDate).recos[focusKey(e)].target[setIdx]);
  else if(ps&&parseReps(ps.actual)) reps=parseReps(ps.actual);
  else reps=parseReps(s.uni==='total'?doubleRepsStr(repsForSet(e,setIdx)):repsForSet(e,setIdx))||0;
  let load;
  if(String(s.load==null?'':s.load).trim()!=='') load=toNum(s.load);
  else if((getSession(selectedDate).recos||{})[focusKey(e)]&&getSession(selectedDate).recos[focusKey(e)].status==='accepted'&&toNum(getSession(selectedDate).recos[focusKey(e)].load)) load=toNum(getSession(selectedDate).recos[focusKey(e)].load);
  else if(ps&&String(ps.load==null?'':ps.load).trim()!=='') load=toNum(ps.load);
  else load=e.bodyweight?0:toNum(e.defaultLoad);
  return {reps,load};
}
function focusLoadStep(e,load,dir){
  const kbs=((equipment().kettlebells)||[]).slice().sort((a,b)=>a-b);
  if(/\bKB\b/.test(e.name)&&!e.bodyweight&&kbs.length){ if(dir>0){ const n=kbs.find(k=>k>load); return n!=null?n:load; } const lo=kbs.filter(k=>k<load); return lo.length?lo[lo.length-1]:load; }
  return Math.max(0,Math.round((load+dir*(e.bodyweight?1:2))*2)/2);
}
function nextOpenExerciseIdx(exs,from){ for(let k=1;k<=exs.length;k++){ const j=(from+k)%exs.length; if(firstOpenSet(getExerciseLog(selectedDate,exs[j]))>=0) return j; } return from; }
function focusValidate(reps,load){
  const {s,exs,idx}=focusPos(); const e=exs[idx]; if(!e) return null;
  const log=getExerciseLog(selectedDate,e); const i=firstOpenSet(log); if(i<0) return null;
  const set=log.sets[i]; const before=JSON.stringify(set);
  set.actual=String(Math.max(0,Math.round(toNum(reps))));
  if(!noLoadExercise(e)) set.load=(e.bodyweight&&!toNum(load))?'':String(toNum(load));
  set.done=true;
  if(isUnilateralEx(e)&&!set.side&&!set.uni&&uniMode()==='total') set.uni='total';
  s.focusUndo=(s.focusUndo||[]).concat([{key:focusKey(e),i,before}]).slice(-30);
  const doneEx=firstOpenSet(log)<0;
  const prLabel=setRecordLabel(e,set);
  if(isPillarEx(e)&&doneEx) s.focusRirAsk={key:focusKey(e),i,name:e.name}; 
  s.focus=Object.assign({},s.focus,{idx:doneEx?nextOpenExerciseIdx(exs,idx):idx});
  focusDraft=null;
  saveSessionForm(false);
  return {e,set,i,doneEx,rest:Number(e.restSec||0),pr:prLabel};
}
function focusUndo(){
  const s=getSession(selectedDate); const u=(s.focusUndo||[]).pop(); if(!u) return false;
  const log=s.exercises&&s.exercises[u.key]; if(log&&log.sets[u.i]) log.sets[u.i]=JSON.parse(u.before);
  const j=focusExercises().findIndex(e=>focusKey(e)===u.key); if(j>=0) s.focus=Object.assign({},s.focus,{idx:j});
  if(timer.interval){ clearInterval(timer.interval); timer.interval=null; timer.remaining=0; restBarShow(false); }
  focusDraft=null; saveState(); return true;
}
function focusHtml(){
  const {s,exs,idx}=focusPos();
  const top=`<div class="focus-top"><button type="button" class="focus-icon" data-focus="exit" aria-label="Quitter le mode focus">✕</button><div class="focus-meta"><p class="eyebrow" style="margin:0">Séance en cours</p><strong id="focusElapsed">${hms(elapsedWorkout(s))}</strong></div><button type="button" class="focus-icon" data-focus="list" aria-label="Liste des exercices">☰</button></div>`;
  if(!exs.length) return top+`<div class="focus-card"><p class="muted">Pas d'exercice de musculation dans cette séance : le bilan cardio se remplit dans la vue complète.</p><button class="primary" type="button" data-focus="exit">Revenir à la séance</button></div>`;
  const doneCount=exs.filter(x=>firstOpenSet(getExerciseLog(selectedDate,x))<0).length;
  const list=s.focusList?`<div class="focus-list">${exs.map((x,j)=>{ const st=setStats(getExerciseLog(selectedDate,x).sets); return `<button type="button" class="focus-li${j===idx?' current':''}" data-focus="jump" data-idx="${j}"><span>${st.done===st.total&&st.total?'✓':(j+1)}</span><strong>${esc(x.name)}</strong><small class="muted">${st.done}/${st.total}</small></button>`; }).join('')}</div>`:'';
  if(doneCount===exs.length) return top+list+`<div class="focus-card focus-done"><h2>Toutes les séries sont faites 🎉</h2><p class="muted">${exs.length} exercice${exs.length>1?'s':''} · ${formatDecimal(sessionVolumeKg(selectedDate),0)} kg · ${hms(elapsedWorkout(s))}</p><button class="primary focus-big" type="button" data-focus="finish">Terminer la séance</button><button class="ghost" type="button" data-focus="exit">Revoir la séance complète</button>${(s.focusUndo||[]).length?'<button class="ghost small" type="button" data-focus="undo">↶ Annuler la dernière série</button>':''}</div>`;
  const e=exs[idx]; const log=getExerciseLog(selectedDate,e); const st=setStats(log.sets); const i=firstOpenSet(log);
  const prev=focusPrev(e);
  const prevTxt=prev&&prev.sets.length?`${prev.sets.map(x=>esc(x.actual||'-')).join(' / ')}${prev.sets.some(x=>toNum(x.load))?' · '+[...new Set(prev.sets.map(x=>toNum(x.load)).filter(Boolean))].join('/')+' kg':''} <small class="muted">(${fmtDate(prev.iso)})</small>`:'<span class="muted">Première fois</span>';
  const presc=isUnilateralEx(e)?(uniSplit(e)?`${e.sets} séries · ${esc(repsSeq(e.reps)?e.reps:repsForSet(e,0))} par côté`:`${e.sets} séries · ${esc(doubleRepsStr(e.reps))} au total`):`${e.sets} séries · ${esc(e.reps)}`;
  const notes=[e.maxTest?(e.submax?'🛡️ Test sous-maximal : arrête-toi 2 reps avant l\'échec':`🎯 Test de max${e.testLevel?' · à battre : '+e.testLevel:''}`):'', e.pctNote?'🎯 '+esc(e.pctNote):'', e.scapCare?'🛡️ Gêne omoplates : arrête-toi 2-3 reps avant l\'échec':'', e.autoregApplied?'✓ Ajustement appliqué':''].filter(Boolean);
  const resting=timer.interval&&timer.label==='Repos série'&&timer.remaining>0;
  const rest=resting?`<div class="focus-rest"><span class="muted">Repos</span><strong id="focusRestTime">${mmss(timer.remaining)}</strong><div class="focus-row"><button class="ghost small" type="button" data-focus="restAdd">+30 s</button><button class="ghost small" type="button" data-focus="restSkip">Passer</button></div></div>`:'';
  let body;
  if(i<0){ body=`<div class="focus-card"><p class="focus-ok">✓ Exercice terminé</p><button class="primary focus-big" type="button" data-focus="next">Exercice suivant →</button></div>`; }
  else {
    if(!focusDraft||focusDraft.key!==focusKey(e)||focusDraft.i!==i){ const sg=focusSuggest(e,log,i); focusDraft={key:focusKey(e),i,reps:sg.reps,load:sg.load}; }
    const set=log.sets[i]; const n=set.side?Math.floor(i/2)+1:i+1;
    const timed=isTimedExercise(e); const showLoad=!noLoadExercise(e);
    body=`<p class="focus-setno">Série ${n} sur ${st.total}${set.side?` · <strong class="side-${set.side}">${set.side==='G'?'gauche':'droite'}</strong>`:''}</p>
      <div class="focus-steppers${showLoad?'':' single'}"><div class="focus-stepper"><span class="muted">${timed?'Secondes':'Répétitions'}</span><div class="focus-row"><button type="button" class="focus-pm" data-focus="repsMinus" aria-label="Moins">−</button><input id="focusReps" type="text" inputmode="numeric" value="${esc(focusDraft.reps)}"><button type="button" class="focus-pm" data-focus="repsPlus" aria-label="Plus">+</button></div></div>${showLoad?`<div class="focus-stepper"><span class="muted">${e.bodyweight?'Lest · kg':'Charge · kg'}</span><div class="focus-row"><button type="button" class="focus-pm" data-focus="loadMinus" aria-label="Moins">−</button><input id="focusLoad" type="text" inputmode="decimal" value="${esc(focusDraft.load||(e.bodyweight?'0':''))}"><button type="button" class="focus-pm" data-focus="loadPlus" aria-label="Plus">+</button></div></div>`:''}</div>
      <button class="primary focus-big" type="button" data-focus="validate">✓ Valider la série</button>`;
  }
  const ask=s.focusRirAsk; const askHtml=ask?`<div class="focus-card focus-ask"><p style="margin:0"><strong>${esc(ask.name)}</strong> — dernière série : il t'en restait combien ?</p><div class="focus-row">${[0,1,2,3].map(v=>`<button type="button" class="rir-chip" data-focus="rir" data-key="${esc(ask.key)}" data-set="${ask.i}" data-rir="${v}">${v===3?'3+':v}</button>`).join('')}</div></div>`:'';
  const rcE=i>=0?recommendFor(e,selectedDate):null; const rcS=(s.recos||{})[focusKey(e)];
  const recoBox=(rcE&&!rcS)?`<div class="focus-reco"><span class="muted">Proposition</span><strong>${esc(rcE.target.join(' / '))}${toNum(rcE.load)?' · '+rcE.load+' kg':''}</strong><small class="muted">${esc(TREND_LABEL[rcE.status]||'')} · confiance ${esc(rcE.confidence)}</small><div class="focus-row"><button class="primary small" type="button" data-focus="recoAccept" data-key="${esc(focusKey(e))}">Appliquer</button><button class="ghost small" type="button" data-focus="recoRefuse" data-key="${esc(focusKey(e))}">Ignorer</button></div></div>`:'';
  return top+list+askHtml+`<div class="focus-progress"><span style="width:${Math.round(doneCount/exs.length*100)}%"></span></div><p class="muted focus-count">Exercice ${idx+1} sur ${exs.length} · ${doneCount} terminé${doneCount>1?'s':''}</p>
    <div class="focus-card"><h2 class="focus-name">${esc(e.name)}</h2>${(rx=>rx&&rx.img.length?`<img class="focus-illus" src="${repdbImg(rx,rx.img[rx.img.length-1])}" alt="${esc(rx.n)}" loading="lazy">`:'')(repdbFor(e))}<p class="muted">${presc} · repos ${esc(e.restSec||0)} s</p>${e.target?`<p class="muted focus-target">${esc(e.target)}</p>`:''}${notes.map(x=>`<p class="focus-note">${x}</p>`).join('')}<div class="focus-last"><span class="muted">Dernière séance</span><span>${prevTxt}</span></div>${recoBox}${body}</div>${rest}
    <div class="focus-nav"><button class="ghost" type="button" data-focus="prev"${idx===0?' disabled':''}>← Précédent</button>${(s.focusUndo||[]).length?'<button class="ghost" type="button" data-focus="undo">↶ Annuler</button>':''}<button class="ghost" type="button" data-focus="next"${idx>=exs.length-1?' disabled':''}>Suivant →</button></div>`;
}
function focusIsOpen(){ return !!document.getElementById('focusOverlay')&&typeof document.getElementById('focusOverlay').innerHTML==='string'; }
function renderFocus(){ const o=document.getElementById('focusOverlay'); if(!o) return; o.innerHTML=`<div class="focus-wrap">${focusHtml()}</div>`; const r=o.querySelector('#focusReps'); if(r) r.onchange=ev=>{ if(focusDraft) focusDraft.reps=toNum(ev.target.value); }; const l=o.querySelector('#focusLoad'); if(l) l.onchange=ev=>{ if(focusDraft) focusDraft.load=toNum(ev.target.value); }; }
function focusAction(act,el){
  const {s,exs,idx}=focusPos(); const e=exs[idx];
  const syncInputs=()=>{ const o=document.getElementById('focusOverlay'); if(!o||!focusDraft) return; const r=o.querySelector('#focusReps'), l=o.querySelector('#focusLoad'); if(r&&String(r.value).trim()!=='') focusDraft.reps=toNum(r.value); if(l&&String(l.value).trim()!=='') focusDraft.load=toNum(l.value); };
  if(act==='exit'){ requestCloseOverlay(); return; }
  if(act==='list'){ s.focusList=!s.focusList; saveState({sync:false}); }
  if(act==='jump'){ s.focus=Object.assign({},s.focus,{idx:toNum(el&&el.dataset.idx)}); s.focusList=false; focusDraft=null; saveState({sync:false}); }
  if(act==='prev'&&idx>0){ s.focus=Object.assign({},s.focus,{idx:idx-1}); focusDraft=null; saveState({sync:false}); }
  if(act==='next'&&idx<exs.length-1){ s.focus=Object.assign({},s.focus,{idx:idx+1}); focusDraft=null; saveState({sync:false}); }
  if(focusDraft&&e){ syncInputs();
    if(act==='repsMinus') focusDraft.reps=Math.max(0,toNum(focusDraft.reps)-1);
    if(act==='repsPlus') focusDraft.reps=toNum(focusDraft.reps)+1;
    if(act==='loadMinus') focusDraft.load=focusLoadStep(e,toNum(focusDraft.load),-1);
    if(act==='loadPlus') focusDraft.load=focusLoadStep(e,toNum(focusDraft.load),1);
    if(act==='validate'){ const r=focusValidate(focusDraft.reps,focusDraft.load); if(r){ prToast(r.pr); if(state.settings.vibration&&navigator.vibrate) navigator.vibrate(40); const allDone=focusExercises().every(x=>firstOpenSet(getExerciseLog(selectedDate,x))<0); if(r.rest&&!allDone) startTimer(r.rest,'Repos série'); } }
  }
  if(act==='undo') focusUndo();
  if(act==='rir'&&el){ setRir(el.dataset.key,toNum(el.dataset.set),toNum(el.dataset.rir)); }
  if(act==='recoAccept'||act==='recoRefuse'){ setReco(el.dataset.key,act==='recoAccept'?'accept':'refuse'); focusDraft=null; }
  if(act==='restAdd') timerAdd(30);
  if(act==='restSkip'&&timer.interval){ timer.endAt=Date.now(); timerTick(); }
  if(act==='finish'){ requestCloseOverlay(); completeCurrentSession(); return; }
  renderFocus();
}
function openFocus(){
  if(document.getElementById('focusOverlay')) return;
  const s=getSession(selectedDate);
  if(!s.completed&&(!s.stopwatch||!s.stopwatch.running)){ s.stopwatch=Object.assign({elapsedSec:0},s.stopwatch,{running:true,startedAt:Date.now()}); }
  const exs=focusExercises(); if(!(s.focus&&s.focus.idx!=null)&&exs.length){ const first=exs.findIndex(x=>firstOpenSet(getExerciseLog(selectedDate,x))>=0); s.focus={idx:first<0?0:first}; }
  saveState({sync:false});
  const o=document.createElement('div'); o.id='focusOverlay'; o.className='focus-overlay';
  o.addEventListener('click',ev=>{ const b=ev.target&&ev.target.closest?ev.target.closest('[data-focus]'):null; if(b&&!b.disabled) focusAction(b.dataset.focus,b); });
  document.body.appendChild(o); document.body.classList.add('focus-on');
  renderFocus();
  clearInterval(focusTicker); focusTicker=setInterval(()=>{ const el=document.getElementById('focusElapsed'); if(el) el.textContent=hms(elapsedWorkout(getSession(selectedDate))); },1000);
  pushOverlay(()=>{ clearInterval(focusTicker); focusTicker=null; focusDraft=null; o.remove(); document.body.classList.remove('focus-on'); renderSession(); });
}
function findExerciseLogById(id){ return getSession(selectedDate).exercises[id]; }
function exerciseById(id){ return allExercisesForSession(selectedDate).find(e => (e.id || makeId(e.name + '-' + (e.kind || ''))) === id); }
function refreshStickyProgress(){
  const exs=activeExercisesForSession(selectedDate);
  const progress=$('#session .progressbar span'); if(progress) progress.style.width=`${pct(selectedDate,exs)}%`;
  const sTxt=$('#stickyProgressText'); if(sTxt) sTxt.textContent=`${doneSets(selectedDate,exs)}/${plannedSets(exs)} séries`;
  const sBar=$('#stickyBar'); if(sBar) sBar.style.width=`${pct(selectedDate,exs)}%`;
  const sVol=$('#stickyVolText'); if(sVol) sVol.textContent=` · ${formatDecimal(sessionVolumeKg(selectedDate),0)} kg`;
}
function collapseCardDone(card,log){
  if(!card||!log||!log.sets||!log.sets.length||!log.sets.every(s=>s.done)) return false;
  log.collapsed=true; const body=card.querySelector('.exercise-body'); if(body) body.classList.add('hidden'); saveState(); expandNextUnfinished(card);
  return true;
}
function updateSetFromRow(row, maybeRest=true){
  if(!row) return;
  const log=findExerciseLogById(row.dataset.exid); if(!log) return;
  const set=log.sets[Number(row.dataset.set)]; if(!set) return;
  const wasDone=!!set.done;
  row.querySelectorAll('input').forEach(inp=>{ const f=inp.dataset.field; if(!f) return; set[f] = f==='done' ? inp.checked : inp.value; });
  // Coché sans rien saisir → on enregistre la valeur du placeholder (dernière perf ou prescription)
  if(set.done && !String(set.actual||'').trim()){
    const ai=row.querySelector('input[data-field="actual"]');
    const guess=ai?parseReps(ai.placeholder):0;
    if(guess){ set.actual=String(guess); if(ai) ai.value=set.actual; }
  }
  { const exu=exerciseById(row.dataset.exid);
    if(set.done && exu && isUnilateralEx(exu) && !set.side && !set.uni && uniMode()==='total') set.uni='total';
    if(set.done && exu && !exu.bodyweight && !noLoadExercise(exu) && !String(set.load||'').trim()){
      const li=row.querySelector('input[data-field="load"]'); const g=li?parseFloat(String(li.placeholder).replace(',','.')):0;
      if(g>0){ set.load=String(g); if(li) li.value=set.load; }
    } }
  saveSessionForm(false);
  const card=row.closest('.exercise-card');
  const ex=exerciseById(row.dataset.exid);
  const vol=row.querySelector('input[data-volume="true"]'); if(vol && ex && !noLoadExercise(ex)) vol.value=`${formatDecimal(setVolume(ex,set),0)} kg`; else if(vol && ex && noLoadExercise(ex)) vol.value='-';
  if(set.done && !wasDone){
    const exP=exerciseById(row.dataset.exid);
    prToast(setRecordLabel(exP,set));
    const idxS=Number(row.dataset.set);
    if(isPillarEx(exP) && idxS===log.sets.length-1 && row.parentNode && !row.parentNode.querySelector('.rir-row')) row.insertAdjacentHTML('afterend', rirChipsHtml(row.dataset.exid, idxS, set.rir));
  }
  if(set.done && !wasDone && maybeRest){
    if(ex && isEmomExercise(ex)){ if(!emom.active) startEmom(Number(ex.sets||10), Number(ex.restSec||60), ex.name, row.dataset.exid); }
    else { const sec=Number(row.dataset.rest||0); if(sec) startTimer(sec,'Repos série'); }
  }
  if(maybeRest){
    if(card){ const badge=card.querySelector('.badge'); if(badge){ const d=log.sets.filter(s=>s.done).length,t=log.sets.length; badge.textContent=`${d}/${t}`; badge.classList.toggle('done',!!t&&d===t); badge.classList.toggle('warn',d>0&&d<t); } row.classList.toggle('done', !!set.done); }
    refreshStickyProgress();
    if(card && ex && !isEmomExercise(ex)) collapseCardDone(card,log);
  }
}
function expandNextUnfinished(currentCard){
  const cards=[...document.querySelectorAll('#session .exercise-card')];
  const idx=cards.indexOf(currentCard);
  for(let i=idx+1;i<cards.length;i++){
    const c=cards[i]; const lg=findExerciseLogById(c.dataset.exid);
    if(lg && lg.sets && lg.sets.length && !lg.sets.every(s=>s.done)){
      const b=c.querySelector('.exercise-body'); if(b) b.classList.remove('hidden'); lg.collapsed=false; saveState();
      try{ c.scrollIntoView({behavior:'smooth', block:'center'}); }catch(e){}
      break;
    }
  }
}
function updateAddFields(){ const sel=$('#addExerciseName'); if(!sel) return; const opt=sel.options[sel.selectedIndex]; const kind=(opt&&opt.dataset.kind)||'strength'; const cardio=(kind==='run'||kind==='bike'); const block=$('#strengthAddFields'); if(block) block.classList.toggle('hidden',cardio); const hint=$('#addCardioHint'); if(hint) hint.classList.toggle('hidden',!cardio);
  const base=availableLibrary().find(x=>x.name===sel.value)||((typeof EXERCISE_LIBRARY!=='undefined')?EXERCISE_LIBRARY.find(x=>x.name===sel.value):null)||{};
  const reps=$('#addExerciseReps'); if(reps&&base.defaultReps) reps.value=base.defaultReps;
  const rest=$('#addExerciseRest'); if(rest&&base.restSec!=null) rest.value=base.restSec;
  const lbl=$('#addRepsLabel'); if(lbl) lbl.textContent=isTimedExercise(base)?'Durée (ex : 30 s)':'Répétitions prévues'; }
function addFreeExercise(){ const name=$('#addExerciseName').value; const base=availableLibrary().find(e=>e.name===name) || EXERCISE_LIBRARY.find(e=>e.name===name) || {}; const cardio=(base.kind==='run'||base.kind==='bike'); if(cardio && activeExercisesForSession(selectedDate).some(x=>x.kind===base.kind)){ const t=document.createElement('div'); t.className='toast'; t.textContent=(base.kind==='run'?'La course':'Le vélo')+' est déjà dans la séance : saisis distance et temps dans son bilan.'; document.body.appendChild(t); setTimeout(()=>t.remove(),2600); return; } const custom={...base, id:'free-'+Date.now(), name, sets: cardio?1:Number($('#addExerciseSets').value||1), reps: cardio?(base.defaultReps||'distance + temps'):($('#addExerciseReps').value||base.defaultReps||''), target: cardio?'Sortie libre':'Ajout libre', restSec: cardio?0:Number($('#addExerciseRest').value||base.restSec||0), kind:base.kind||'strength', muscles:base.muscles||[], bodyweight:!!base.bodyweight, defaultLoad:base.defaultLoad||0}; getSession(selectedDate).extraExercises.push(custom); saveState(); renderSession(); }
function resetCurrentSession(){ if(!confirm('Réinitialiser toute la séance ? Les séries, notes, cardio et chrono seront supprimés.')) return; if(isFreeSessionActive()){ const id=selectedFreeId; delete state.freeSessions[id]; selectedFreeId=null; saveState(); setView('today'); return; } delete state.sessions[selectedDate]; saveState(); renderSession(); }
function completeCurrentSession(){
  const s=getSession(selectedDate);
  const monday=mondayOf(parseISO(selectedDate));
  const wasValidated=weekValidated(monday);
  saveSessionForm(false);
  if(s.stopwatch?.running){
    s.stopwatch.elapsedSec=elapsedWorkout(s);
    s.stopwatch.running=false;
    s.stopwatch.startedAt=null;
  }
  s.metrics=s.metrics||{};
  s.metrics.strengthDurationSec=elapsedWorkout(s);
  s.metrics.volumeKg=sessionVolumeKg(selectedDate);
  if(!s.freeMode && !isFreeSessionActive()) s.planSnapshot=buildSessionSnapshot(selectedDate, s);
  s.completed=true;
  s.completedAt=new Date().toISOString();
  const lvlUp=syncLevelFromRecords();
  setTimeout(()=>{ try{ checkTrophies(true); }catch(e){} },1300);
  { const vol=toNum(sessionVolumeKg(selectedDate)); let best=0; allCompletedSessions().forEach(({iso,s:x})=>{ if(x!==s) best=Math.max(best,toNum(x.metrics&&x.metrics.volumeKg)); }); if(vol>0&&best>0&&vol>best) setTimeout(()=>prToast(`Record de volume sur une séance : ${formatDecimal(vol,0)} kg`),900); }
  saveState();
  render();
  if(lvlUp.length){ const t=document.createElement('div'); t.className='toast'; t.textContent='🎯 Niveau mis à jour : '+lvlUp.map(u=>u.label+' '+u.reps).join(' · '); document.body.appendChild(t); setTimeout(()=>t.remove(),3200); }
  const prs=newPRList(selectedDate);
  const justValidated=!wasValidated && weekValidated(monday);
  if(prs.length || justValidated){
    const lines=[`${formatDecimal(s.metrics.volumeKg,0)} kg · ${hms(s.metrics.strengthDurationSec)}`];
    prs.forEach(p=>lines.push('🏆 Record : '+esc(p)));
    if(justValidated) lines.push(`✅ Semaine ${weekIndexFor(selectedDate)} validée · 🔥 ${fullWeekStreak()} d'affilée`);
    celebrate({ emoji: prs.length?'🏆':'✅', title: prs.length?'Nouveau record !':'Semaine validée !', lines });
  } else {
    const msg=document.createElement('div');
    msg.className='toast';
    msg.textContent='Séance terminée ✔';
    document.body.appendChild(msg);
    setTimeout(()=>msg.remove(),2200);
  }
}
function celebrate(opts){
  const colors=['#38bdf8','#22c55e','#f59e0b','#ef4444','#a78bfa','#f472b6'];
  let conf='';
  for(let i=0;i<36;i++){ conf+=`<i style="left:${Math.round(Math.random()*100)}%;background:${colors[i%colors.length]};animation-delay:${(Math.random()*0.6).toFixed(2)}s;animation-duration:${(1.4+Math.random()*1.2).toFixed(2)}s;transform:rotate(${Math.round(Math.random()*180)}deg)"></i>`; }
  const o=document.createElement('div');
  o.className='celebrate-overlay';
  o.innerHTML=`<div class="celebrate-box"><div class="confetti" aria-hidden="true">${conf}</div><div class="celebrate-emoji">${opts.emoji||'💪'}</div><h2>${esc(opts.title||'Bravo !')}</h2>${(opts.lines||[]).map(l=>`<p>${l}</p>`).join('')}<button class="primary" type="button">Continuer</button></div>`;
  document.body.appendChild(o);
  const close=()=>o.remove();
  pushOverlay(close);
  o.querySelector('button').onclick=requestCloseOverlay;
  o.addEventListener('click',e=>{ if(e.target===o) requestCloseOverlay(); });
  beep();
  if(state.settings.vibration && navigator.vibrate) navigator.vibrate([120,60,120,60,220]);
}
function deleteExerciseFromSession(id){ if(!id) return; if(!confirm('Supprimer cet exercice de la séance du jour ?')) return; const s=getSession(selectedDate); s.extraExercises=(s.extraExercises||[]).filter(e => (e.id || makeId(e.name + '-' + (e.kind || ''))) !== id); s.hiddenExercises=s.hiddenExercises||[]; if(!s.hiddenExercises.includes(id)) s.hiddenExercises.push(id); delete s.exercises[id]; saveState(); renderSession(); }
function bindWorkoutTimer(sess){
  clearInterval(workoutTicker);
  const update=()=>{
    const sec=elapsedWorkout(sess);
    ['#workoutElapsed','#workoutElapsedSticky'].forEach(sel=>{ const out=$(sel); if(out) out.textContent=hms(sec); });
    const disp=$('#strengthDurationDisplay'); if(disp && sess.stopwatch.running) disp.value=hms(sec);
    ['#startWorkout','#startWorkoutSticky'].forEach(sel=>{ const btn=$(sel); if(btn) btn.textContent=sess.stopwatch.running?'En cours': sec?(sel.includes('Sticky')?'Reprendre':'Reprendre'):(sel.includes('Sticky')?'Lancer':'Lancer séance'); });
    const ic=$('#ubIcon'); if(ic) ic.textContent=sess.stopwatch.running?'⏸':'▶';
  };
  const start=()=>{ if(!sess.stopwatch.running){ sess.stopwatch.running=true; sess.stopwatch.startedAt=Date.now(); saveState(); update(); } };
  const pause=()=>{ if(sess.stopwatch.running){ sess.stopwatch.elapsedSec=elapsedWorkout(sess); sess.stopwatch.running=false; sess.stopwatch.startedAt=null; saveSessionForm(false); saveState(); update(); } };
  const stop=()=>{ sess.stopwatch.elapsedSec=elapsedWorkout(sess); sess.stopwatch.running=false; sess.stopwatch.startedAt=null; saveSessionForm(false); saveState(); update(); };
  const reset=()=>{ if(confirm('Remettre le chrono hors cardio à zéro ?')){ sess.stopwatch={elapsedSec:0,running:false,startedAt:null}; saveSessionForm(false); saveState(); update(); } };
  update(); workoutTicker=setInterval(update,1000);
  const bStart=$('#startWorkout'); if(bStart) bStart.onclick=start;
  const bPause=$('#pauseWorkout'); if(bPause) bPause.onclick=pause;
  const bStop=$('#stopWorkout'); if(bStop) bStop.onclick=stop;
  const bReset=$('#resetWorkout'); if(bReset) bReset.onclick=reset;
  const bs=$('#startWorkoutSticky'); if(bs) bs.onclick=start;
  const bp=$('#pauseWorkoutSticky'); if(bp) bp.onclick=pause;
  const bst=$('#stopWorkoutSticky'); if(bst) bst.onclick=stop;
  const tg=$('#ubToggle'); if(tg) tg.onclick=()=>{ sess.stopwatch.running ? pause() : start(); const ic=$('#ubIcon'); if(ic) ic.textContent=sess.stopwatch.running?'⏸':'▶'; };
}
function updateCardioComputed(){ ['run','bike'].forEach(kind=>{ const km=$(`#${kind}DistanceKm`)?.value||''; const sec=durationInputs(kind); const sp=avgSpeed(km,sec); const speedOut=$(`#${kind}SpeedOut`); if(speedOut) speedOut.textContent=`${formatDecimal(sp,2)} km/h`; const paceOut=$(`#${kind}PaceOut`); if(paceOut) paceOut.textContent=pace(km,sec); const badge=$(`#${kind}Badge`); if(badge) badge.textContent=`${formatDecimal(sp,2)} km/h${kind==='run'?' · '+pace(km,sec):''}`; }); }
function saveSessionForm(repaint=true){ const s=getSession(selectedDate); ['run','bike'].forEach(kind=>{ const dist=$(`#${kind}DistanceKm`)?.value; if(dist!==undefined){ const sec=durationInputs(kind); s.metrics[`${kind}DistanceKm`]=dist; s.metrics[`${kind}DurationSec`]=sec; s.metrics[`${kind}AvgSpeed`]=avgSpeed(dist,sec).toFixed(2); if(kind==='run') s.metrics.runPace=pace(dist,sec); if(toNum(dist)>0 && sec>0 && !cardioDone(kind)) cardioExercises(kind).forEach(e=>{ getExerciseLog(selectedDate,e).sets.forEach(x=>{ x.done=true; }); }); } }); s.metrics.strengthDurationSec=elapsedWorkout(s); s.rpe=$('#rpe')?.value||s.rpe||''; s.backPain=$('#backPain')?.value||s.backPain||''; s.notes=$('#notes')?.value||s.notes||''; s.metrics.volumeKg=sessionVolumeKg(selectedDate); saveState(); if(repaint) renderSession(); }

function parseReps(v){ const m=String(v||'').replace(',', '.').match(/[0-9]+(\.[0-9]+)?/); return m ? Number(m[0]) : 0; }
function isTimedExercise(ex){
  if(!ex) return false;
  if(ex.timed) return true;
  const lib=(typeof EXERCISE_LIBRARY!=='undefined')?EXERCISE_LIBRARY.find(x=>x.name===ex.name):null;
  if(lib&&lib.timed) return true;
  const nm=String(ex.name||'').toLowerCase();
  if(/dead hang|suspension|planche|plank|hollow|l-sit|corde à sauter/.test(nm)) return true;
  return /\d\s*(s|sec|min)\b/i.test(String(ex.reps||ex.defaultReps||''));
}
function noLoadExercise(ex){
  if(ex&&ex.kind==='activity') return true;
  if(/\bKB\b|kettlebell|haltère|lesté/i.test(String(ex.name||'')) || (!ex.bodyweight && toNum(ex.defaultLoad)>0)) return false;
  const txt=[ex.name, ex.target].join(' ').toLowerCase();
  return /gainage|abdos|tronc|planche|plank|dead bug|relev[ée] de jambes|rotation russe|crunch|hollow/.test(txt) || (isTimedExercise(ex) && !toNum(ex.defaultLoad));
}
function setDurationLikeValue(v){
  const str=String(v||'').toLowerCase();
  const n=parseReps(str);
  if(!n) return 0;
  if(/min/.test(str)) return n * 60;
  if(/s|sec/.test(str)) return n;
  return n;
}
function setVolume(ex,set,iso=selectedDate){
  if(!set.done || noLoadExercise(ex)) return 0;
  const reps=parseReps(set.actual) || parseReps(ex.reps);
  if(!reps) return 0;
  const load=setLoadOf(ex,set);
  const effective = ex.bodyweight ? currentBodyWeight(iso) + load : load;
  const uni = (set.side || set.uni==='total') ? 1 : (/\/(bras|c[oô]t[eé]|jambe|sens)/i.test(String(ex.reps||'')) ? 2 : 1);
  return Math.max(0,effective) * reps * uni;
}
function setStimulus(ex,set,iso=selectedDate){
  if(!set.done) return 0;
  const reps=parseReps(set.actual) || parseReps(ex.reps);
  const seconds=setDurationLikeValue(set.actual) || setDurationLikeValue(ex.reps);
  const volume=setVolume(ex,set,iso);
  if(noLoadExercise(ex)) return Math.max(1, seconds ? seconds/10 : reps || 1);
  if(volume>0) return Math.max(1, volume/100);
  return Math.max(1, reps || seconds/10 || 1);
}
function sessionVolumeKg(iso){ return activeExercisesForSession(iso).filter(e=>e.kind!=='run'&&e.kind!=='bike'&&!noLoadExercise(e)&&(e.kind!=='mobility'||toNum(e.defaultLoad)>0)).reduce((sum,e)=>{ const log=getExerciseLog(iso,e); return sum + log.sets.reduce((n,s)=>n+setVolume(e,s,iso),0); },0); }
function cardioExercises(kind, iso=selectedDate){ return activeExercisesForSession(iso).filter(e=>e.kind===kind); }
function cardioDone(kind, iso=selectedDate){ const exs=cardioExercises(kind,iso); if(!exs.length) return false; return exs.every(e=>{ const log=getExerciseLog(iso,e); return log.sets.length && log.sets.every(s=>s.done); }); }
function setCardioDone(kind, done){ cardioExercises(kind).forEach(e=>{ const log=getExerciseLog(selectedDate,e); log.sets.forEach(s=>{ s.done=done; }); }); saveSessionForm(false); renderSession(); }
function parseDurationToSec(str){ const parts=String(str||'').trim().split(':').map(p=>toNum(p)); if(parts.length>=3) return parts[0]*3600+parts[1]*60+parts[2]; if(parts.length===2) return parts[0]*60+parts[1]; return parts[0]*60; }
function freeSessionVolume(fs){ const exs=fs.extraExercises||[]; return exs.filter(e=>e.kind!=='run'&&e.kind!=='bike'&&!noLoadExercise(e)&&(e.kind!=='mobility'||toNum(e.defaultLoad)>0)).reduce((sum,e)=>{ const log=fs.exercises&&fs.exercises[e.id]; if(!log||!log.sets) return sum; return sum + log.sets.reduce((n,s)=>n+setVolume(e,s,fs.date),0); },0); }
function weeklyStats(baseMonday){ const days=Array.from({length:7},(_,i)=>localISO(addDays(baseMonday,i))); const daySet=new Set(days); let done=0,totalSets=0,doneSet=0,pains=[],vol=0; days.forEach(iso=>{ const s=getSession(iso); const exs=hasSnapshot(s)?snapshotList(s):allExercisesForSession(iso); if(s.completed) done++; totalSets+=plannedSets(exs); doneSet+=doneSets(iso,exs); if(toNum(s.backPain)) pains.push(toNum(s.backPain)); vol+=sessionVolumeKg(iso); }); Object.values(state.freeSessions||{}).forEach(fs=>{ if(fs && fs.completed && daySet.has(fs.date)){ done++; vol+=freeSessionVolume(fs); if(toNum(fs.backPain)) pains.push(toNum(fs.backPain)); } }); return {doneSessions:done,totalSets,doneSets:doneSet,avgPain:pains.length?formatDecimal(pains.reduce((a,b)=>a+b,0)/pains.length,1):'', volumeKg:vol}; }

function renderRoutine(){ const root=$('#routine'); const iso=isoToday(); state.routine[iso]=state.routine[iso]||{}; const done=DAILY_ROUTINE.filter((_,i)=>state.routine[iso][i]).length; root.innerHTML=`<section class="card"><div class="between"><div><p class="eyebrow">Routine quotidienne</p><h2>Haut du dos / omoplates</h2></div><span class="badge">${done}/${DAILY_ROUTINE.length}</span></div><p class="muted">Routine courte pour renforcer la zone douloureuse à vélo.</p><div class="progressbar"><span style="width:${Math.round(done/DAILY_ROUTINE.length*100)}%"></span></div></section><section class="card">${DAILY_ROUTINE.map((it,i)=>`<div class="routine-item" data-i="${i}"><input type="checkbox" ${state.routine[iso][i]?'checked':''}><div><strong>${esc(it.name)}</strong><div class="muted">${esc(it.target)} · ${esc(it.sets)} x ${esc(it.reps)}</div></div><span class="badge">${it.restSec||0}s</span></div>`).join('')}<div class="footer-actions"><button class="ghost" id="resetRoutine">Réinitialiser aujourd'hui</button></div></section>`; $$('.routine-item input').forEach(inp=>inp.onchange=e=>{ const i=Number(e.target.closest('.routine-item').dataset.i); state.routine[iso][i]=e.target.checked; saveState(); if(e.target.checked && DAILY_ROUTINE[i].restSec) startTimer(DAILY_ROUTINE[i].restSec,`Routine · ${DAILY_ROUTINE[i].name}`); renderRoutine(); }); $('#resetRoutine').onclick=()=>{ state.routine[iso]={}; saveState(); renderRoutine(); }; }
/* Même sortie saisie dans la séance planifiée ET dans une séance libre du même jour */
function cardioMetricsOf(s,kind){ const m=(s&&s.metrics)||{}; return {km:toNum(m[kind+'DistanceKm']), sec:Math.round(toNum(m[kind+'DurationSec']))}; }
function cardioDistinctKey(iso,kind,freeId){ return iso+'|'+kind+'|'+freeId; }
function isCardioDistinct(iso,kind,freeId){ return !!(state.cardioDistinct&&state.cardioDistinct[cardioDistinctKey(iso,kind,freeId)]); }
function cardioDuplicatesFor(iso){
  const ps=state.sessions&&state.sessions[iso]; if(!ps) return [];
  const out=[];
  ['run','bike'].forEach(kind=>{ const a=cardioMetricsOf(ps,kind); if(!(a.km>0)) return;
    freeSessionsForDate(iso).forEach(([id,fs])=>{ const b=cardioMetricsOf(fs,kind); if(!(b.km>0)||isCardioDistinct(iso,kind,id)) return;
      out.push({iso,kind,freeId:id,freeTitle:fs.title||'Séance libre',a,b,same:Math.abs(a.km-b.km)<0.05&&Math.abs(a.sec-b.sec)<=60}); });
  });
  return out;
}
function allCardioDuplicates(){ const days=new Set(Object.values(state.freeSessions||{}).filter(f=>f&&f.date).map(f=>f.date)); let out=[]; days.forEach(d=>{ out=out.concat(cardioDuplicatesFor(d)); }); return out.sort((x,y)=>x.iso.localeCompare(y.iso)); }
function resolveCardioDup(iso,kind,freeId,action){
  const ps=state.sessions&&state.sessions[iso], fs=state.freeSessions&&state.freeSessions[freeId];
  if(!ps||!fs) return;
  if(action==='distinct'){ state.cardioDistinct=state.cardioDistinct||{}; state.cardioDistinct[cardioDistinctKey(iso,kind,freeId)]=true; }
  else {
    const target=action==='keepPlanned'?fs:ps; const keys=[kind+'DistanceKm',kind+'DurationSec',kind+'AvgSpeed'].concat(kind==='run'?['runPace']:[]);
    const data={}; keys.forEach(k=>{ data[k]=target.metrics&&target.metrics[k]; });
    target.metricsArchive=(target.metricsArchive||[]).concat([{kind,at:new Date().toISOString(),reason:'doublon',data}]); // archivé, pas effacé
    keys.forEach(k=>{ if(target.metrics) target.metrics[k]=''; });
    target.cardioCleared=Object.assign({},target.cardioCleared,{[kind]:true});
  }
  saveState(); render();
  const t=document.createElement('div'); t.className='toast'; t.textContent=action==='distinct'?'Noté : deux sorties différentes, les deux comptent.':'Doublon fusionné ✔ (la saisie retirée reste archivée)'; document.body.appendChild(t); setTimeout(()=>t.remove(),2600);
}
function cardioDupCardHtml(iso){
  const dups=cardioDuplicatesFor(iso); if(!dups.length) return '';
  const fmt=m=>`${formatDecimal(m.km,1)} km${m.sec?' · '+hms(m.sec):''}`;
  return dups.map(d=>`<section class="card autoreg warn"><p class="eyebrow">Doublon possible</p><h3>${d.kind==='run'?'🏃 Course saisie':'🚴 Vélo saisi'} deux fois ?</h3><p class="muted">Séance planifiée : <strong>${fmt(d.a)}</strong><br>« ${esc(d.freeTitle)} » : <strong>${fmt(d.b)}</strong>${d.same?'<br>Valeurs identiques : très probablement la même sortie.':''}</p><div class="footer-actions"><button class="primary small" type="button" data-dup="keepPlanned" data-iso="${d.iso}" data-kind="${d.kind}" data-free="${esc(d.freeId)}">Garder dans la séance planifiée</button><button class="ghost small" type="button" data-dup="keepFree" data-iso="${d.iso}" data-kind="${d.kind}" data-free="${esc(d.freeId)}">Garder dans « ${esc(d.freeTitle)} »</button><button class="ghost small" type="button" data-dup="distinct" data-iso="${d.iso}" data-kind="${d.kind}" data-free="${esc(d.freeId)}">Deux sorties différentes</button></div></section>`).join('');
}
function cardioOutings(){
  const out=[];
  allCompletedSessions().forEach(({iso,s})=>{
    const m=s.metrics||{};
    if(toNum(m.runDistanceKm)>0) out.push({iso,type:'run',km:toNum(m.runDistanceKm),sec:Math.round(toNum(m.runDurationSec))});
    if(toNum(m.bikeDistanceKm)>0) out.push({iso,type:'bike',km:toNum(m.bikeDistanceKm),sec:Math.round(toNum(m.bikeDurationSec))});
    if(s.freeMode&&s.date){ const fid=Object.keys(state.freeSessions||{}).find(k=>state.freeSessions[k]===s); out.forEach(o=>{ if(o.iso===iso&&o.fromFree===undefined&&o.tagged===undefined){ o.fromFree=true; o.fid=fid; } }); }
    out.forEach(o=>{ o.tagged=true; });
  });
  const uniq=[]; out.forEach(o=>{ if(!uniq.some(u=>u.iso===o.iso&&u.type===o.type&&Math.abs(u.km-o.km)<0.05&&Math.abs(u.sec-o.sec)<=60&&!((u.fid&&isCardioDistinct(u.iso,u.type,u.fid))||(o.fid&&isCardioDistinct(o.iso,o.type,o.fid))))) uniq.push(o); });
  return uniq.sort((a,b)=>a.iso.localeCompare(b.iso));
}
function paceStr(km,sec){ if(!km||!sec) return '—'; const spk=sec/km; const m=Math.floor(spk/60), s=Math.round(spk%60); return `${m}:${String(s).padStart(2,'0')}/km`; }
function speedStr(km,sec){ return (km&&sec)?formatDecimal(km/(sec/3600),1)+' km/h':'—'; }
function cardioStatsCardHtml(){
  const f=state.settings.cardioFilter||'all';
  const inRange=cardioOutings().filter(o=>inChartRange(o.iso));
  const list=inRange.filter(o=>f==='all'||o.type===f);
  const tot=t=>inRange.filter(o=>o.type===t).reduce((a,o)=>a+o.km,0);
  const cnt=t=>inRange.filter(o=>o.type===t).length;
  const rows=list.slice(-15).reverse().map(o=>`<tr><td>${o.type==='run'?'🏃':'🚴'} ${fmtDate(o.iso)}</td><td>${formatDecimal(o.km,1)} km</td><td>${o.sec?hms(o.sec):'—'}</td><td>${o.type==='run'?paceStr(o.km,o.sec):speedStr(o.km,o.sec)}</td></tr>`).join('');
  return `<section class="card" id="cardioStats"><div class="between"><div><p class="eyebrow">Cardio</p><h3>Tes sorties course & vélo</h3></div><label style="max-width:160px"><span>Filtrer</span><select id="cardioFilter"><option value="all" ${f==='all'?'selected':''}>Tout</option><option value="run" ${f==='run'?'selected':''}>Course</option><option value="bike" ${f==='bike'?'selected':''}>Vélo</option></select></label></div><p class="muted">Sur la plage choisie : 🏃 ${formatDecimal(tot('run'),0)} km (${cnt('run')} sorties) · 🚴 ${formatDecimal(tot('bike'),0)} km (${cnt('bike')} sorties). Basé sur tes bilans de séance.</p><div class="grid grid-2"><div><h4 class="muted" style="margin:4px 0">Distance cumulée</h4><canvas class="chart" id="chartCardioCumul"></canvas></div><div><h4 class="muted" style="margin:4px 0">${f==='run'?'Allure par sortie':'Vitesse par sortie'}</h4><canvas class="chart" id="chartCardioSpeed"></canvas></div></div>${list.length?`<div style="overflow:auto;margin-top:10px"><table class="table"><thead><tr><th>Sortie</th><th>Distance</th><th>Temps</th><th>${f==='run'?'Allure':'Vitesse'}</th></tr></thead><tbody>${rows}</tbody></table></div>`:'<p class="muted">Aucune sortie sur la plage : coche tes bilans course/vélo en fin de séance pour alimenter ces graphiques.</p>'}</section>`;
}
function drawCardioStats(){
  const f=state.settings.cardioFilter||'all';
  const outs=cardioOutings().filter(o=>inChartRange(o.iso)).filter(o=>f==='all'||o.type===f);
  let cum=0; drawLine('chartCardioCumul',outs.map(o=>o.iso.slice(5)),outs.map(o=>{cum+=o.km;return Math.round(cum*10)/10;}),'km');
  const spd=outs.filter(o=>o.sec>0&&o.km>0);
  drawLine('chartCardioSpeed',spd.map(o=>o.iso.slice(5)),spd.map(o=>f==='run'?Math.round((o.sec/o.km/60)*100)/100:Math.round((o.km/(o.sec/3600))*10)/10),f==='run'?'min/km':'km/h');
}
function goalsCardHtml(){
  const g=profileGoals(), rp=(state.profile&&state.profile.runProfile)||{};
  const strength=strengthEnabled()?`<p class="muted">Le niveau se met à jour tout seul avec tes meilleures séries ; tu peux aussi le saisir. Laisse vide ce que tu ne sais pas.</p><div class="grid grid-2">${[['pushups','Pompes'],['pullups','Tractions'],['dips','Dips'],['squats','Squats (PDC)']].map(([k,lbl])=>`<label><span>${lbl} — niveau (max reps)</span><input id="lvl_${k}" type="number" inputmode="numeric" min="0" value="${toNum(profileLevel()[k])||''}" placeholder="—">${levelAutoNote(k)}</label><label><span>${lbl} — objectif</span><input id="goal_${k}" type="number" inputmode="numeric" min="1" value="${g[k]??''}" placeholder="—">${!goalIsStored(k)&&g[k]!=null?'<small class="muted" style="display:block">valeur d\'origine de l\'app</small>':''}</label>`).join('')}</div>`:'';
  const legacyRun=!isNewInstall()&&!toNum(rp.targetKm);
  const run=runEnabled()?`<p class="eyebrow" style="margin-top:12px">Course</p><div class="grid grid-2">${legacyRun?`<label><span>10 km — objectif (minutes)</span><input id="goal_run10kMin" type="number" inputmode="numeric" min="1" value="${g.run10kMin??''}" placeholder="—"></label>`:''}<label><span>Distance visée (km)</span><input id="rp_targetKm" type="text" inputmode="decimal" list="rpKmList" value="${esc(rp.targetKm||'')}" placeholder="${legacyRun?'10 (actuel)':'ex : 5'}"><datalist id="rpKmList"><option value="3"><option value="5"><option value="10"><option value="21.1"><option value="42.2"></datalist></label><label><span>Temps visé (optionnel, min:s)</span><input id="rp_targetTime" type="text" inputmode="numeric" value="${rp.targetTimeSec?esc(mmss(rp.targetTimeSec)):''}" placeholder="finir suffit"></label><label><span>Date de la course (optionnel)</span><input id="rp_raceDate" type="date" value="${esc(rp.raceDate||'')}" min="${isoToday()}"></label></div>`:'';
  const bike=disciplines().bike!==false?`<p class="eyebrow" style="margin-top:12px">Vélo</p><label><span>Vitesse visée (km/h, optionnel)</span><input id="goal_bikeKmh" type="number" inputmode="decimal" min="1" step="0.5" value="${g.bikeKmh??''}" placeholder="—"></label>`:'';
  return `<section class="card">${strength}${run}${bike}${(!strength&&!run&&!bike)?'<p class="muted">Choisis d\'abord tes sports.</p>':''}</section>`;
}
function bindProfileFields(){
  ['pushups','pullups','dips','squats'].forEach(k=>{
    const l=$('#lvl_'+k); if(l) l.onchange=e=>{ state.profile=state.profile||{}; state.profile.level=state.profile.level||{}; state.profile.level[k]=Math.max(0,toNum(e.target.value)); saveState({sync:false}); };
    const g=$('#goal_'+k); if(g) g.onchange=e=>{ state.profile=state.profile||{}; state.profile.goals=state.profile.goals||{}; state.profile.goals[k]=toNum(e.target.value)>0?toNum(e.target.value):(isNewInstall()?null:DEFAULT_GOALS[k]); saveState({sync:false}); };
  });
  ['run10kMin','bikeKmh'].forEach(k=>{
    const g=$('#goal_'+k); if(g) g.onchange=e=>{ state.profile=state.profile||{}; state.profile.goals=state.profile.goals||{}; state.profile.goals[k]=toNum(e.target.value)>0?toNum(e.target.value):(isNewInstall()?null:DEFAULT_GOALS[k]); saveState({sync:false}); };
  });
}
const STRENGTH_GEAR=[['pullupBar','Barre de traction'],['dipStation','Station de dips'],['vest','Gilet lesté'],['bands','Élastiques'],['bench','Banc'],['abWheel','Roulette abdo'],['trx','TRX / anneaux'],['jumpRope','Corde à sauter'],['parallettes','Parallettes'],['sliders','Sliders / serviette (sol lisse)'],['step','Marche ou step solide']];
function gearCardHtml(){
  const eq=equipment(); const strength=strengthEnabled(), bike=disciplines().bike!==false;
  const chk=(k,l)=>`<label class="gear-check"><input type="checkbox" data-eq="${k}" ${eq[k]?'checked':''}><span>${l}</span></label>`;
  const kbs=(eq.kettlebells||[]).slice().sort((a,b)=>a-b);
  const sHtml=strength?`<p class="eyebrow">Musculation</p><p class="muted">Rien du tout ? Pas de souci : le programme s'adapte au poids du corps.</p><p style="margin:8px 0 4px"><strong>Kettlebells</strong></p><div class="kb-chips" id="eq_kettlebells">${kbs.length?kbs.map(k=>`<span class="chip">${formatDecimal(k,k%1?1:0)} kg<button type="button" data-kbdel="${k}" aria-label="Retirer ${k} kg">×</button></span>`).join(''):'<span class="muted">Aucune</span>'}</div><div class="row" style="gap:8px;margin:6px 0 12px"><input id="kbAdd" type="text" inputmode="decimal" placeholder="Ajouter un poids (kg)" style="max-width:200px"><button class="ghost small" type="button" id="kbAddBtn">Ajouter</button></div><div class="gear-grid">${STRENGTH_GEAR.map(([k,l])=>chk(k,l)).join('')}</div>${eq.vest?`<label style="margin-top:8px"><span>Poids du gilet (kg)</span><input id="eq_vestKg" type="number" inputmode="decimal" min="1" step="0.5" value="${eq.vestKg}"></label>`:''}<label style="margin-top:8px"><span>Haltères (kg, séparés par des virgules — vide si aucun)</span><input id="eq_dumbbells" type="text" inputmode="decimal" value="${(eq.dumbbells||[]).join(', ')}" placeholder="ex : 5, 10"></label>`:'';
  const bHtml=bike?`<p class="eyebrow" style="margin-top:14px">Vélo</p><div class="gear-grid">${chk('bike','Vélo (extérieur)')}${chk('trainer','Home trainer')}</div><p class="muted" style="margin-top:8px">🚴 ${eq.bike&&eq.trainer?'Vélo extérieur + home trainer : séances vélo inchangées.':(eq.trainer?'Home trainer seul : les sorties longues extérieures passent en version home trainer raccourcie.':(eq.bike?'Vélo extérieur seul : les séances home trainer se font dehors.':'Aucun vélo : les séances vélo sont remplacées par de la course ou de la marche.'))}</p>`:'';
  const placeHtml=`<p class="eyebrow">Où t'entraînes-tu le plus souvent ?</p><div class="start-grid">${[['maison','🏠 Maison','Ton matériel ci-dessous.'],['salle','🏋️ Salle de sport','Barres, haltères, poulies, machines, en plus de ton matériel.']].map(([v,l,dd])=>`<button type="button" class="startmode ${(state.trainingPlace||'maison')===v?'active':''}" data-place="${v}"><strong>${l}</strong><small class="muted" style="display:block">${dd}</small></button>`).join('')}</div><p class="muted" style="font-size:12px">En déplacement ou exceptionnellement à la salle : « 🧳 Pas mon matériel » dans la séance du jour.</p>`;
  return `<section class="card">${placeHtml}</section><section class="card"><p class="eyebrow">Matériel disponible</p><h3>Ton équipement</h3><p class="muted">Ton matériel en temps normal. En déplacement, utilise plutôt « 🧳 Pas mon matériel » dans la séance du jour.</p>${sHtml}${bHtml}${(!strength&&!bike)?'<p class="muted">👟 Course à pied : aucun matériel nécessaire.</p>':''}</section>`;
}
function bindGearFields(){
  const parseKgList=v=>String(v||'').split(/[,;]+/).map(x=>parseFloat(String(x).trim().replace(',','.'))).filter(x=>x>0).sort((a,b)=>a-b);
  const setEq=patch=>{ state.equipment=Object.assign({},equipment(),patch); saveState({sync:false}); };
  $$('#gear [data-place]').forEach(b=>b.onclick=()=>{ state.trainingPlace=b.dataset.place==='maison'?undefined:b.dataset.place; if(!state.trainingPlace) delete state.trainingPlace; saveState({sync:false}); renderGear(); });
  $$('#gear [data-eq]').forEach(el=>el.onchange=e=>{ setEq({[el.dataset.eq]:e.target.checked}); renderGear(); });
  $$('#gear [data-kbdel]').forEach(b=>b.onclick=()=>{ const v=toNum(b.dataset.kbdel); setEq({kettlebells:(equipment().kettlebells||[]).filter(k=>Math.abs(k-v)>0.01)}); renderGear(); });
  const add=()=>{ const i=$('#kbAdd'); const v=parseFloat(String(i&&i.value||'').replace(',','.')); if(!(v>0)) return; const cur=equipment().kettlebells||[]; if(!cur.some(k=>Math.abs(k-v)<0.01)) setEq({kettlebells:cur.concat(v).sort((a,b)=>a-b)}); renderGear(); };
  const ab=$('#kbAddBtn'); if(ab) ab.onclick=add; const ai=$('#kbAdd'); if(ai) ai.onkeydown=e=>{ if(e.key==='Enter') add(); };
  const ed=$('#eq_dumbbells'); if(ed) ed.onchange=e=>setEq({dumbbells:parseKgList(e.target.value)});
  const ev=$('#eq_vestKg'); if(ev) ev.onchange=e=>setEq({vestKg:Math.max(1,toNum(e.target.value)||10)});
}
function scheduleCardHtml(){
  const sel=scheduleDays(); const dur=sessionDuration();
  const isOn=d=>!sel||sel.includes(d);
  const dayBtn=(d,l)=>`<button type="button" class="ck ${isOn(d)?'active':''}" data-schedday="${d}">${l}</button>`;
  const n=sel?sel.length:7;
  return `<section class="card"><p class="eyebrow">Ton planning</p><h3>Quel rythme ?</h3><p class="muted">Choisis les jours où tu es libre : les séances les plus importantes y sont réparties automatiquement (muscu, qualité course, sortie longue…), les autres jours passent en repos. Actuellement : <strong>${n} jour${n>1?'s':''}/semaine</strong>${sel?'':' (programme complet)'} · minimum 2.</p><div class="ck-btns" style="justify-content:space-between;width:100%">${[[1,'L'],[2,'M'],[3,'M'],[4,'J'],[5,'V'],[6,'S'],[0,'D']].map(([d,l])=>dayBtn(d,l)).join('')}</div><p class="eyebrow" style="margin-top:14px">Durée de séance préférée</p><div class="ck-btns">${[20,40,60].map(v=>`<button type="button" class="ck ${dur===v?'active':''}" style="width:auto;padding:0 14px" data-scheddur="${v}">${v} min</button>`).join('')}</div><p class="muted" style="margin-top:8px">20 min : l'essentiel (3 exercices clés + tronc, cardio raccourci). 40 min : accessoires retirés puis coupes jusqu'à tenir le budget. 60 min : programme complet.</p>${strengthEnabled()?'':'<p class="muted" style="margin-top:8px">Sans musculation, la durée choisie s\'applique à toute la séance de course ou de vélo.</p><!--'}<p class="eyebrow" style="margin-top:14px">Module abdos / tronc</p><div class="ck-btns">${[[true,'Activé'],[false,'Désactivé']].map(([v,l])=>`<button type="button" class="ck ${(state.profile&&state.profile.coreFinisher===false)===!v?'active':''}" style="width:auto;padding:0 14px" data-corefin="${v}">${l}</button>`).join('')}</div><p class="eyebrow" style="margin-top:14px">Test de max en semaine allégée</p><div class="ck-btns">${[[true,'Activé'],[false,'Désactivé']].map(([v,l])=>`<button type="button" class="ck ${maxTestsEnabled()===v?'active':''}" style="width:auto;padding:0 14px" data-maxtests="${v}">${l}</button>`).join('')}</div><p class="muted" style="margin-top:8px">Toutes les 4 semaines : une série au max sur pompes, tractions, dips et squats. Le résultat met ton niveau à jour.</p><p class="muted" style="margin-top:8px">Le finisher tronc ajoute ≈ 8-10 min en fin de séance muscu (compté dans la durée estimée). Désactivé, les séances raccourcissent d'autant.</p><p class="eyebrow" style="margin-top:14px">La durée choisie s'applique à</p><div class="start-grid">${[['muscu','La musculation','Le cardio de la séance s\'ajoute en plus, sans être raccourci.'],['total','Toute la séance','Cardio compris : tout est raccourci pour tenir la durée.']].map(([v,l,d])=>`<button type="button" class="startmode ${durationMode()===v?'active':''}" data-durmode="${v}"><strong>${l}</strong><small class="muted" style="display:block">${d}</small></button>`).join('')}</div>${strengthEnabled()?'':'-->'}</section>`;
}
function startCardHtml(){
  const p=state.profile||{}; const mode=p.startMode||'';
  const opt=(v,t,d)=>`<button type="button" class="startmode ${mode===v?'active':''}" data-startmode="${v}"><strong>${t}</strong><small class="muted" style="display:block">${d}</small></button>`;
  return `<section class="card"><p class="eyebrow">Ton départ</p><h3>Quand et comment ?</h3><label><span>🎯 Date cible pour tes objectifs (optionnel)</span><input id="targetDate" type="date" value="${esc(p.targetDate||'')}"></label><p class="eyebrow" style="margin-top:12px">Es-tu en forme ?</p><div class="start-grid">${opt('fond','À fond, à fond !','Intensité à 100 % dès le début.')}${opt('reprise','C\'est la reprise','Mon corps doit se réhabituer : crescendo sur 2 semaines.')}${opt('doux','Allons-y doucement','Tranquillement pendant 3 semaines.')}</div></section>`;
}
function bindScheduleFields(){
  $$('#goals [data-schedday]').forEach(b=>b.onclick=()=>{
    const d=Number(b.dataset.schedday);
    let cur=scheduleDays(); cur=cur?cur.slice():[0,1,2,3,4,5,6];
    cur=cur.includes(d)?cur.filter(x=>x!==d):cur.concat(d);
    state.profile=state.profile||{}; state.profile.schedule=state.profile.schedule||{};
    state.profile.schedule.days=(cur.length>=7||cur.length<2)?null:cur.sort();
    saveState({sync:false}); renderGoals();
  });
  $$('#goals [data-scheddur]').forEach(b=>b.onclick=()=>{ state.profile=state.profile||{}; state.profile.schedule=state.profile.schedule||{}; state.profile.schedule.duration=Number(b.dataset.scheddur); saveState({sync:false}); renderGoals(); });
  $$('#goals [data-durmode]').forEach(b=>b.onclick=()=>{ state.profile=state.profile||{}; state.profile.schedule=Object.assign({},state.profile.schedule,{durationMode:b.dataset.durmode}); saveState({sync:false}); renderGoals(); });
  $$('#goals [data-maxtests]').forEach(b=>b.onclick=()=>{ state.profile=state.profile||{}; state.profile.maxTests=(b.dataset.maxtests==='true'); saveState({sync:false}); renderGoals(); });
  $$('#goals [data-corefin]').forEach(b=>b.onclick=()=>{ state.profile=state.profile||{}; state.profile.coreFinisher=(b.dataset.corefin==='true'); saveState({sync:false}); renderGoals(); });
  const td=$('#targetDate'); if(td) td.onchange=e=>{ state.profile=state.profile||{}; state.profile.targetDate=e.target.value||''; saveState({sync:false}); };
  $$('#goals [data-startmode]').forEach(b=>b.onclick=()=>{ applyStartMode(b.dataset.startmode); renderGoals(); });
}
function disciplinesCardHtml(){
  const d=disciplines(); const eq=equipment();
  const btn=(k,label,on)=>`<button type="button" class="startmode ${on?'active':''}" data-disc="${k}"><strong>${label}</strong><small class="muted" style="display:block">${k==='bike'&&!(eq.trainer||eq.bike)?'⚠ Aucun vélo dans ton matériel : les séances vélo sont converties.':(on?'Inclus dans ton planning.':'Séances converties automatiquement.')}</small></button>`;
  return `<section class="card"><p class="eyebrow">Tes disciplines</p><h3>Qu'est-ce que tu veux travailler ?</h3><p class="muted">Décoche une discipline : ses séances sont converties intelligemment (vélo ↔ course selon le matériel et tes choix, muscu → cardio + mobilité) au lieu de disparaître.</p><div class="start-grid">${btn('run','🏃 Course à pied',runEnabled())}${btn('bike','🚴 Vélo',disciplines().bike!==false)}${btn('strength','💪 Musculation / callisthénie',strengthEnabled())}</div><p class="eyebrow" style="margin-top:14px">Sports maison en plus (jours de repos)</p><p class="muted">Coche pour transformer tes jours de repos en récupération active : la séance s'ajoute automatiquement au programme, en rotation si plusieurs.</p><div class="ck-btns">${Object.keys(HOME_SPORTS).map(k=>`<button type="button" class="ck ${extraSports().includes(k)?'active':''}" style="width:auto;padding:0 14px" data-homesport="${k}">${HOME_SPORTS[k].label}</button>`).join('')}</div></section>`;
}
function programGoalCardHtml(){
  const g=programGoal();
  const opt=(v,t,d)=>`<button type="button" class="startmode ${g===v?'active':''}" data-pgoal="${v}"><strong>${t}</strong><small class="muted" style="display:block">${d}</small></button>`;
  return `<section class="card"><p class="eyebrow">Objectif principal</p><h3>Pourquoi tu t'entraînes ?</h3><p class="muted">Change l'enchaînement des blocs de 3 semaines et le dosage cardio. Se combine avec ton niveau et tes objectifs chiffrés ci-dessous.</p><div class="start-grid">${opt('perf','🎯 Performance / équilibré','Force → Volume → Puissance. Le cycle complet historique.')}${opt('muscle','💪 Prendre du muscle','Volume → Force → Volume : priorité hypertrophie, cardio réduit (−15 %).')}${opt('perte','🔥 Perdre du poids','Volume → Puissance → Volume : densité et dépense, cardio augmenté (+25 %).')}</div></section>`;
}
/* --- Bilan de bloc : 4 semaines, 2-3 recommandations utiles, jamais de régénération du programme --- */
function blockIndexFor(iso){ return Math.floor((weekIndexFor(iso)-1)/4); }
function blockRange(k){ const s0=localISO(mondayOf(parseISO(state.startDate))); const from=localISO(addDays(parseISO(s0),k*28)); return {from,to:localISO(addDays(parseISO(from),27))}; }
function pillarBestsInRange(from,to){ const best={}; allCompletedSessions().filter(x=>x.iso>=from&&x.iso<=to).forEach(({iso,s})=>{ const exs=s.freeMode?(s.extraExercises||[]):plannedExercisesFor(iso,s);
  exs.forEach(x=>{ const f=GRADE_FAMILIES_DEF.find(g=>g.match(x.name)); if(!f) return; const log=s.exercises&&s.exercises[x.id||makeId(x.name+'-'+(x.kind||''))]; if(!log) return; (log.sets||[]).filter(z=>z.done).forEach(z=>{ const r=setRepsPerSide(z,parseReps(z.actual)||0); best[f.key]=Math.max(best[f.key]||0,r); }); }); }); return best; }
function blockReport(k){
  if(k<0) return null; const {from,to}=blockRange(k); const prev=k>0?blockRange(k-1):null;
  const done=allCompletedSessions().filter(x=>x.iso>=from&&x.iso<=to).length;
  let planned=0, low=0; for(let i=0;i<28;i++){ const d=localISO(addDays(parseISO(from),i)); if(d>isoToday()) break; if(!isRestDay(planForDate(d).plan)) planned++; const a=state.checkins&&state.checkins[d]?adjustmentFor(d):null; if(a&&a.level!=='ok') low++; }
  const b=pillarBestsInRange(from,to), pb=prev?pillarBestsInRange(prev.from,prev.to):{};
  const outs=cardioOutings(); const km=(f,t,ty)=>outs.filter(o=>o.iso>=f&&o.iso<=t&&o.type===ty).reduce((a,o)=>a+o.km,0);
  const run=km(from,to,'run'), bike=km(from,to,'bike'), prun=prev?km(prev.from,prev.to,'run'):0, pbike=prev?km(prev.from,prev.to,'bike'):0;
  const pillars=GRADE_FAMILIES_DEF.map(f=>({key:f.key,label:f.label,best:b[f.key]||0,prev:pb[f.key]||0}));
  const sug=[];
  if(planned&&done/planned<0.7) sug.push(`Tu as fait ${done} séance${done>1?'s':''} sur ${planned} prévues : pour tenir la régularité, enlève un jour ou passe au format 40 min.`);
  const stuck=pillars.find(p=>p.best&&p.prev&&p.best<=p.prev); if(stuck) sug.push(`${stuck.label} sans progrès sur ce bloc (${stuck.best} contre ${stuck.prev}) : garde l'exercice, et accepte une série de plus ou un repos un peu plus long.`);
  const cv=(run+bike), pcv=(prun+pbike); if(pcv>0&&cv>pcv*1.25) sug.push(`Volume cardio en forte hausse (+${Math.round((cv/pcv-1)*100)} %) : consolide ce volume avant de l'augmenter encore.`);
  if(low>=6) sug.push(`${low} matins difficiles sur le bloc : priorité au sommeil, et accepte les ajustements proposés.`);
  if(!sug.length) sug.push('Bloc solide : on garde la même base pour le suivant.');
  return {k,from,to,done,planned,low,pillars,run,bike,prun,pbike,suggestions:sug.slice(0,3)};
}
function blockReportHtml(rep,dismissable){
  if(!rep) return ''; const d=(a,b)=>b?` <small class="${a>b?'up':(a<b?'down':'muted')}">${a>b?'+':''}${a-b}</small>`:'';
  return `<section class="card block-report"><div class="between"><div><p class="eyebrow">Bilan du bloc</p><h3>Bloc ${rep.k+1} · ${fmtDate(rep.from)} → ${fmtDate(rep.to)}</h3></div>${dismissable?`<button class="ghost small" type="button" id="dismissBlockReport">OK</button>`:''}</div>
  <p class="muted">${rep.done} séance${rep.done>1?'s':''} faite${rep.done>1?'s':''} sur ${rep.planned} prévue${rep.planned>1?'s':''} · course ${formatDecimal(rep.run,0)} km · vélo ${formatDecimal(rep.bike,0)} km${rep.low?` · ${rep.low} matin${rep.low>1?'s':''} difficile${rep.low>1?'s':''}`:''}</p>
  <div class="grid grid-4">${rep.pillars.map(p=>`<div class="stat"><span class="muted">${esc(p.label)}</span><strong>${p.best||'—'}</strong>${p.best?d(p.best,p.prev):''}</div>`).join('')}</div>
  <p class="eyebrow" style="margin-top:10px">Pour le bloc suivant</p><ul class="instruction-list">${rep.suggestions.map(s=>`<li>${esc(s)}</li>`).join('')}</ul></section>`;
}
function referencesCardHtml(){
  const p=state.profile||{}; const rr=p.runRef||{}; const pc=runPaces(); const ftp=ftpValue(); const sc=p.scap||{}; const rp=p.runProfile||{}; const P=fmtPace;
  const run=runEnabled(), bike=disciplines().bike!==false, strength=strengthEnabled();
  const runHtml=run?`<p class="eyebrow">Course</p><div class="grid grid-3"><label><span>Plus longue distance courue ces dernières semaines (km)</span><input id="rp_maxKm" type="text" inputmode="decimal" value="${esc(rp.maxRecentKm||'')}" placeholder="je ne sais pas"></label><label><span>Distance que tu cours confortablement (km)</span><input id="rp_comfKm" type="text" inputmode="decimal" value="${esc(rp.comfortableKm||'')}" placeholder="je ne sais pas"></label><label><span>Sorties par semaine en ce moment</span><input id="rp_runs" type="number" inputmode="numeric" min="0" max="14" value="${esc(rp.runsPerWeek||'')}" placeholder="0"></label></div>
    <p class="muted" style="margin:6px 0 12px">Ces repères fixent le volume : aucune sortie au-delà de ta distance max récente, et pas de fractionné tant que la base est fragile.</p>
    <div class="grid grid-3"><label><span>Course de référence : distance (km)</span><input id="ref_runKm" type="text" inputmode="decimal" value="${esc(rr.km||'')}" placeholder="10"></label><label><span>Temps (min:s)</span><input id="ref_runTime" type="text" inputmode="numeric" value="${rr.sec?esc(mmss(rr.sec)):''}" placeholder="44:00"></label><label><span>Date</span><input id="ref_runDate" type="date" value="${esc(rr.date||'')}" max="${isoToday()}"></label><label><span>C'était…</span><select id="ref_runEffort"><option value="max" ${rr.effort!=='facile'?'selected':''}>un effort maximal (test, course)</option><option value="facile" ${rr.effort==='facile'?'selected':''}>une sortie facile</option></select></label><label><span>Difficulté ressentie (1-10)</span><input id="ref_runRpe" type="number" inputmode="numeric" min="1" max="10" value="${esc(rr.rpe||'')}" placeholder="—"></label></div>
    ${rr.effort==='facile'?'<p class="muted">Sortie facile : elle renseigne ta capacité mais ne sert pas à calculer des allures de seuil — les séances restent guidées à l\'effort ressenti.</p>':(pc?`<p class="muted">Référence utilisée : ${formatDecimal(pc.ref.km,1)} km en ${esc(fmtDur(pc.ref.sec))}${pc.ref.source==='séance'?' (séance du '+fmtDate(pc.ref.date)+', marquée référence)':''} → indice de forme (VDOT) ${formatDecimal(pc.vdot,1)}.<br>Tes allures d'entraînement : facile <strong>${P(pc.E[0])}-${P(pc.E[1])}</strong> · seuil <strong>${P(pc.T[0])}-${P(pc.T[1])}</strong> · intervalles <strong>${P(pc.I[0])}-${P(pc.I[1])}</strong> /km.</p>`:'<p class="muted">Sans référence, les séances course sont guidées à l\'effort ressenti. Coche aussi « Course de référence » dans le bilan d\'une course test ou d\'une compétition.</p>')}`:'';
  const bikeHtml=bike?`<p class="eyebrow" style="margin-top:14px">Vélo</p><label><span>FTP vélo (W)</span><input id="ref_ftp" type="number" inputmode="numeric" min="50" max="600" value="${ftp||''}" placeholder="je ne sais pas"></label>${ftp?`<p class="muted">Zones : endurance Z2 <strong>${Math.round(ftp*0.56)}-${Math.round(ftp*0.75)} W</strong> · tempo ${Math.round(ftp*0.76)}-${Math.round(ftp*0.87)} W · sweet spot <strong>${Math.round(ftp*0.88)}-${Math.round(ftp*0.94)} W</strong> · VO2max ${Math.round(ftp*1.06)}-${Math.round(ftp*1.2)} W.</p>`:'<p class="muted">Sans FTP, les séances vélo sont guidées à l\'effort ressenti.</p>'}`:'';
  const strHtml=strength?`<p class="eyebrow" style="margin-top:14px">Omoplates</p><div class="grid grid-2"><label><span>Gêne actuelle (/10)</span><input id="ref_scapPain" type="number" inputmode="numeric" min="0" max="10" value="${sc.pain!=null&&sc.pain!==''?esc(sc.pain):''}" placeholder="0"></label><label><span>Les tirages l'augmentent ?</span><select id="ref_scapPull"><option value="false" ${!sc.pullTrigger?'selected':''}>Non</option><option value="true" ${sc.pullTrigger?'selected':''}>Oui</option></select></label></div>${scapCareActive()?'<p class="muted">✓ Pris en compte : tirages plafonnés à 3 séries avec arrêt 2-3 reps avant l\'échec, high pull / shrugs / suspensions remplacés, pas de max en tractions.</p>':''}<p class="muted" style="font-size:12px">L'app adapte l'exposition, elle ne soigne pas : si la gêne persiste ou augmente, un bilan chez un kiné ou un médecin du sport est recommandé.</p>`:'';
  if(!run&&!bike&&!strength) return '<section class="card"><p class="muted">Choisis d\'abord tes sports.</p></section>';
  return `<section class="card"><p class="muted">Ce que tu sais faire aujourd'hui : tes allures, tes zones et ton volume en dépendent, jamais tes objectifs.</p>${runHtml}${bikeHtml}${strHtml}</section>`;
}
function bindReferenceFields(){
  const P=()=>{ state.profile=state.profile||{}; return state.profile; };
  const val=id=>{ const x=$('#'+id); return x?x.value:''; };
  const saveRef=()=>{ const p=P(); p.runRef=Object.assign({},p.runRef,{km:toNum(val('ref_runKm'))||'',sec:parseTimeToSec(val('ref_runTime'))||'',date:val('ref_runDate')||'',effort:val('ref_runEffort')||'max',rpe:toNum(val('ref_runRpe'))||''}); saveState({sync:false}); renderGoals(); };
  ['ref_runKm','ref_runTime','ref_runDate','ref_runEffort','ref_runRpe'].forEach(id=>{ const x=$('#'+id); if(x) x.onchange=saveRef; });
  const saveRp=()=>{ const p=P(); p.runProfile=Object.assign({},p.runProfile,{planStart:localISO(mondayOf(new Date())),maxRecentKm:toNum(val('rp_maxKm'))||'',comfortableKm:toNum(val('rp_comfKm'))||'',runsPerWeek:toNum(val('rp_runs'))||''}); saveState({sync:false}); renderGoals(); };
  ['rp_maxKm','rp_comfKm','rp_runs'].forEach(id=>{ const x=$('#'+id); if(x) x.onchange=saveRp; });
  const saveGoal=()=>{ const p=P(); p.runProfile=Object.assign({},p.runProfile,{targetKm:toNum(val('rp_targetKm'))||'',targetTimeSec:parseTimeToSec(val('rp_targetTime'))||'',raceDate:val('rp_raceDate')||''}); saveState({sync:false}); renderGoals(); };
  ['rp_targetKm','rp_targetTime','rp_raceDate'].forEach(id=>{ const x=$('#'+id); if(x) x.onchange=saveGoal; });
  const f=$('#ref_ftp'); if(f) f.onchange=e=>{ P().ftp=toNum(e.target.value)||''; saveState({sync:false}); renderGoals(); };
  const sp=$('#ref_scapPain'); if(sp) sp.onchange=e=>{ const p=P(); p.scap=Object.assign({},p.scap,{pain:e.target.value===''?'':Math.max(0,Math.min(10,toNum(e.target.value)))}); saveState({sync:false}); renderGoals(); };
  const sq=$('#ref_scapPull'); if(sq) sq.onchange=e=>{ const p=P(); p.scap=Object.assign({},p.scap,{pullTrigger:e.target.value==='true'}); saveState({sync:false}); renderGoals(); };
}
/* ==========================================================================================
   Parcours guidé (nouvelle installation, ou « Reconfigurer ») : sports → objectif → niveau → planning
   → matériel (seulement si utile) → résumé. Rien n'est présélectionné, rien n'est inventé,
   l'historique n'est jamais touché.
   ========================================================================================== */
var onb=null, onbAutoShown=false;
function onbDraftFromState(){
  const p=state.profile||{}, rp=p.runProfile||{}, rr=p.runRef||{}, d=(p.disciplines||null);
  return { step:0, sports:{run:!!(d&&d.run),bike:!!(d&&d.bike),strength:!!(d&&d.strength)},
    run:{raceDate:rp.raceDate||'',goalType:rp.goalType||'',targetKm:rp.targetKm||'',targetTime:rp.targetTimeSec?mmss(rp.targetTimeSec):'',maxKm:rp.maxRecentKm||'',comfKm:rp.comfortableKm||'',runs:rp.runsPerWeek||'',refKm:rr.km||'',refTime:rr.sec?mmss(rr.sec):'',refEffort:rr.effort||'max',refRpe:rr.rpe||''},
    strength:{goals:Object.assign({},p.goals||{}),levels:Object.assign({},p.level||{})}, bike:{ftp:p.ftp||'',kmh:(p.goals&&p.goals.bikeKmh)||''},
    days:scheduleDays()?scheduleDays().slice():[], duration:sessionDuration(), equipment:Object.assign({},state.equipment||{}) };
}
function onbSteps(d){ const s=['sports','goal','level','plan']; if(d.sports.strength||d.sports.bike) s.push('gear'); s.push('review'); return s; }
function onbHtml(){
  const d=onb; const steps=onbSteps(d); const cur=steps[d.step]; const opt=(v,l,sel)=>`<option value="${v}" ${String(sel)===String(v)?'selected':''}>${l}</option>`;
  const inp=(id,val,ph,mode)=>`<input id="${id}" type="text" inputmode="${mode||'decimal'}" value="${esc(val==null?'':val)}" placeholder="${esc(ph||'')}">`;
  let body='';
  if(cur==='sports') body=`<h2>Quels sports veux-tu pratiquer ?</h2><p class="muted">Choisis-en un ou plusieurs. Tu pourras changer plus tard.</p><div class="start-grid">${[['run','🏃 Course à pied'],['bike','🚴 Vélo'],['strength','💪 Musculation / poids du corps']].map(([k,l])=>`<button type="button" class="startmode ${d.sports[k]?'active':''}" data-onbsport="${k}"><strong>${l}</strong></button>`).join('')}</div>`;
  if(cur==='goal') body=`<h2>Quel est ton objectif ?</h2>${d.sports.run?`<p class="eyebrow">Course</p><label><span>Ce que tu veux réussir</span><select id="onb_runGoal">${opt('','— choisir —',d.run.goalType)}${opt('decouvrir','Débuter ou reprendre la course',d.run.goalType)}${opt('courir5','Courir 5 km sans m\'arrêter',d.run.goalType)}${opt('plusloin','Courir plus loin',d.run.goalType)}${opt('plusvite','Courir plus vite sur une distance',d.run.goalType)}${opt('course','Préparer une course (semi, marathon…)',d.run.goalType)}${opt('entretien','Entretenir ma forme',d.run.goalType)}</select></label><div class="grid grid-2"><label><span>Distance visée (km)</span>${inp('onb_targetKm',d.run.targetKm,'ex : 5')}</label><label><span>Temps visé (optionnel)</span>${inp('onb_targetTime',d.run.targetTime,'finir suffit','numeric')}</label><label><span>Date de la course (optionnel)</span><input id="onb_raceDate" type="date" value="${esc(d.run.raceDate||'')}" min="${isoToday()}"></label></div>`:''}${d.sports.strength?`<p class="eyebrow" style="margin-top:12px">Musculation (optionnel)</p><div class="grid grid-2">${[['pushups','Pompes'],['pullups','Tractions'],['dips','Dips'],['squats','Squats']].map(([k,l])=>`<label><span>${l} — objectif (reps)</span>${inp('onb_g_'+k,d.strength.goals[k],'—','numeric')}</label>`).join('')}</div>`:''}${d.sports.bike?`<p class="eyebrow" style="margin-top:12px">Vélo (optionnel)</p><label><span>Vitesse visée (km/h)</span>${inp('onb_bikeKmh',d.bike.kmh,'—')}</label>`:''}`;
  if(cur==='level') body=`<h2>Que sais-tu faire aujourd'hui ?</h2><p class="muted">« Je ne sais pas » est une réponse valable : laisse vide, le programme démarrera prudemment.</p>${d.sports.run?`<p class="eyebrow">Course</p><div class="grid grid-2"><label><span>Plus longue distance courue récemment (km)</span>${inp('onb_maxKm',d.run.maxKm,'je ne sais pas')}</label><label><span>Distance courue confortablement (km)</span>${inp('onb_comfKm',d.run.comfKm,'je ne sais pas')}</label><label><span>Sorties par semaine en ce moment</span>${inp('onb_runs',d.run.runs,'0','numeric')}</label></div><p class="muted" style="margin-top:8px">Une course de référence ? (optionnel)</p><div class="grid grid-2"><label><span>Distance (km)</span>${inp('onb_refKm',d.run.refKm,'ex : 5')}</label><label><span>Temps (min:s)</span>${inp('onb_refTime',d.run.refTime,'ex : 31:00','numeric')}</label><label><span>C'était…</span><select id="onb_refEffort">${opt('max','un effort maximal',d.run.refEffort)}${opt('facile','une sortie facile',d.run.refEffort)}</select></label><label><span>Difficulté (1-10)</span>${inp('onb_refRpe',d.run.refRpe,'—','numeric')}</label></div>`:''}${d.sports.strength?`<p class="eyebrow" style="margin-top:12px">Musculation : ton max en une série (optionnel)</p><div class="grid grid-2">${[['pushups','Pompes'],['pullups','Tractions'],['dips','Dips'],['squats','Squats']].map(([k,l])=>`<label><span>${l}</span>${inp('onb_l_'+k,d.strength.levels[k],'—','numeric')}</label>`).join('')}</div>`:''}${d.sports.bike?`<p class="eyebrow" style="margin-top:12px">Vélo (optionnel)</p><label><span>FTP (W)</span>${inp('onb_ftp',d.bike.ftp,'je ne sais pas','numeric')}</label>`:''}`;
  if(cur==='plan') body=`<h2>Quand peux-tu t'entraîner ?</h2><p class="muted">Touche tes jours disponibles.</p><div class="ck-btns" style="justify-content:space-between;width:100%">${[[1,'L'],[2,'M'],[3,'M'],[4,'J'],[5,'V'],[6,'S'],[0,'D']].map(([k,l])=>`<button type="button" class="ck ${d.days.includes(k)?'active':''}" data-onbday="${k}">${l}</button>`).join('')}</div><p class="eyebrow" style="margin-top:14px">Durée habituelle d'une séance</p><div class="ck-btns">${[20,40,60].map(v=>`<button type="button" class="ck ${d.duration===v?'active':''}" style="width:auto;padding:0 14px" data-onbdur="${v}">${v} min</button>`).join('')}</div>`;
  if(cur==='gear'){ const eq=Object.assign({},EMPTY_EQUIPMENT,isNewInstall()?{}:equipment(),d.equipment); const chk=(k,l)=>`<label class="gear-check"><input type="checkbox" data-onbeq="${k}" ${eq[k]?'checked':''}><span>${l}</span></label>`;
    body=`<h2>Quel matériel as-tu ?</h2><p class="muted">Rien du tout ? Ne coche rien : le programme s'adapte.</p>${d.sports.strength?`<p class="eyebrow">Musculation</p><div class="gear-grid">${STRENGTH_GEAR.map(([k,l])=>chk(k,l)).join('')}</div><label style="margin-top:8px"><span>Kettlebells (kg, séparés par des virgules)</span>${inp('onb_kbs',(eq.kettlebells||[]).join(', '),'ex : 8, 12, 16')}</label>`:''}${d.sports.bike?`<p class="eyebrow" style="margin-top:12px">Vélo</p><div class="gear-grid">${chk('bike','Vélo (extérieur)')}${chk('trainer','Home trainer')}</div>`:''}`; }
  if(cur==='review'){ const sp=[d.sports.run&&'course',d.sports.bike&&'vélo',d.sports.strength&&'musculation'].filter(Boolean).join(' + ');
    const lines=[`Sports : ${sp}`, `${d.days.length||7} séance${(d.days.length||7)>1?'s':''} par semaine · ${d.duration} min`];
    if(d.sports.run) lines.push(`Course : ${d.run.comfKm?d.run.comfKm+' km confortables':'capacité non renseignée (démarrage prudent)'}${d.run.targetKm?' · objectif '+d.run.targetKm+' km'+(d.run.targetTime?' en '+d.run.targetTime:''):''}`);
    if(d.sports.strength&&Object.values(d.strength.levels).some(Boolean)) lines.push('Musculation : '+Object.entries(d.strength.levels).filter(([,v])=>v).map(([k,v])=>({pushups:'pompes',pullups:'tractions',dips:'dips',squats:'squats'}[k]+' '+v)).join(', '));
    body=`<h2>Ton programme est prêt</h2><ul class="instruction-list">${lines.map(l=>`<li>${esc(l)}</li>`).join('')}</ul><p class="muted">Tout reste modifiable dans Objectifs. Ton historique n'est jamais modifié.</p>`; }
  const last=d.step===steps.length-1, canNext=cur!=='sports'||Object.values(d.sports).some(Boolean);
  return `<div class="focus-wrap"><div class="between"><span class="muted">Étape ${d.step+1} sur ${steps.length}</span><button type="button" class="focus-icon" data-onb="close" aria-label="Fermer">✕</button></div><div class="focus-progress"><span style="width:${Math.round((d.step+1)/steps.length*100)}%"></span></div><div class="focus-card">${body}</div><div class="focus-nav">${d.step>0?'<button class="ghost" type="button" data-onb="back">← Retour</button>':'<span></span>'}<button class="primary" type="button" data-onb="${last?'finish':'next'}" ${canNext?'':'disabled'}>${last?'Créer mon programme':'Suivant →'}</button></div></div>`;
}
function onbCollect(){
  const v=id=>{ const x=document.getElementById(id); return x&&typeof x.value==='string'?x.value.trim():null; }; const d=onb;
  const set=(obj,key,id)=>{ const x=v(id); if(x!==null) obj[key]=x; };
  set(d.run,'goalType','onb_runGoal'); set(d.run,'targetKm','onb_targetKm'); set(d.run,'targetTime','onb_targetTime'); set(d.run,'maxKm','onb_maxKm'); set(d.run,'comfKm','onb_comfKm'); set(d.run,'runs','onb_runs'); set(d.run,'refKm','onb_refKm'); set(d.run,'refTime','onb_refTime'); set(d.run,'refEffort','onb_refEffort'); set(d.run,'refRpe','onb_refRpe'); set(d.run,'raceDate','onb_raceDate');
  ['pushups','pullups','dips','squats'].forEach(k=>{ set(d.strength.goals,k,'onb_g_'+k); set(d.strength.levels,k,'onb_l_'+k); });
  set(d.bike,'ftp','onb_ftp'); set(d.bike,'kmh','onb_bikeKmh');
  const kb=v('onb_kbs'); if(kb!==null) d.equipment.kettlebells=String(kb).split(/[,;]+/).map(x=>parseFloat(x.replace(',','.'))).filter(x=>x>0).sort((a,b)=>a-b);
  document.querySelectorAll('[data-onbeq]').forEach(c=>{ d.equipment[c.dataset.onbeq]=!!c.checked; });
}
function onbFinish(d){
  const p=state.profile=Object.assign({},state.profile);
  p.disciplines={run:!!d.sports.run,bike:!!d.sports.bike,strength:!!d.sports.strength};
  if(d.sports.run){ p.runProfile=Object.assign({},p.runProfile,{planStart:localISO(mondayOf(new Date())),goalType:d.run.goalType||'',targetKm:toNum(d.run.targetKm)||'',targetTimeSec:parseTimeToSec(d.run.targetTime)||'',raceDate:d.run.raceDate||'',maxRecentKm:toNum(d.run.maxKm)||'',comfortableKm:toNum(d.run.comfKm)||'',runsPerWeek:toNum(d.run.runs)||''});
    if(toNum(d.run.refKm)&&parseTimeToSec(d.run.refTime)) p.runRef={km:toNum(d.run.refKm),sec:parseTimeToSec(d.run.refTime),date:isoToday(),effort:d.run.refEffort==='facile'?'facile':'max',rpe:toNum(d.run.refRpe)||''}; }
  if(d.sports.strength){ p.goals=Object.assign({},p.goals); p.level=Object.assign({},p.level); ['pushups','pullups','dips','squats'].forEach(k=>{ if(toNum(d.strength.goals[k])>0) p.goals[k]=toNum(d.strength.goals[k]); if(toNum(d.strength.levels[k])>0) p.level[k]=toNum(d.strength.levels[k]); }); }
  if(d.sports.bike){ if(toNum(d.bike.ftp)>0) p.ftp=toNum(d.bike.ftp); if(toNum(d.bike.kmh)>0){ p.goals=Object.assign({},p.goals,{bikeKmh:toNum(d.bike.kmh)}); } }
  p.schedule=Object.assign({},p.schedule,{days:(d.days.length>=2&&d.days.length<7)?d.days.slice().sort():null,duration:d.duration});
  if(d.sports.strength||d.sports.bike) state.equipment=Object.assign({},isNewInstall()?EMPTY_EQUIPMENT:equipment(),d.equipment);
  state.onboarded=true; saveState();
}
function onbAction(act,el){
  if(!onb) return;
  if(act==='close'){ requestCloseOverlay(); return; }
  onbCollect();
  const steps=onbSteps(onb);
  if(act==='sport'){ const k=el.dataset.onbsport; onb.sports[k]=!onb.sports[k]; }
  if(act==='day'){ const k=toNum(el.dataset.onbday); onb.days=onb.days.includes(k)?onb.days.filter(x=>x!==k):onb.days.concat(k); }
  if(act==='dur') onb.duration=toNum(el.dataset.onbdur);
  if(act==='back'&&onb.step>0) onb.step--;
  if(act==='next'&&onb.step<steps.length-1&&(steps[onb.step]!=='sports'||Object.values(onb.sports).some(Boolean))) onb.step++;
  if(act==='finish'){ onbFinish(onb); requestCloseOverlay(); render(); prToast('Programme créé ✔'); return; }
  const o=document.getElementById('onbOverlay'); if(o) o.innerHTML=onbHtml();
}
function openOnboarding(){
  if(document.getElementById('onbOverlay')&&typeof document.getElementById('onbOverlay').innerHTML==='string') return;
  onb=onbDraftFromState();
  const o=document.createElement('div'); o.id='onbOverlay'; o.className='focus-overlay onb-overlay'; o.innerHTML=onbHtml();
  o.addEventListener('click',ev=>{ const b=ev.target&&ev.target.closest?ev.target.closest('[data-onb],[data-onbsport],[data-onbday],[data-onbdur]'):null; if(!b||b.disabled) return;
    if(b.dataset.onbsport) onbAction('sport',b); else if(b.dataset.onbday!==undefined) onbAction('day',b); else if(b.dataset.onbdur) onbAction('dur',b); else onbAction(b.dataset.onb,b); });
  document.body.appendChild(o); document.body.classList.add('focus-on');
  pushOverlay(()=>{ o.remove(); document.body.classList.remove('focus-on'); onb=null; });
}
var goalsOpen=null;
function accSection(key,title,summary,inner){ goalsOpen=goalsOpen||{disc:true}; return `<details class="acc" data-acc="${key}" ${goalsOpen[key]?'open':''}><summary><span class="acc-title">${title}</span><small class="muted acc-sum">${esc(summary||'')}</small></summary><div class="acc-body">${inner}</div></details>`; }
function goalsSummaries(){
  const d=disciplines(); const sports=[d.run&&'course',d.bike!==false&&d.bike&&'vélo',d.strength&&'musculation'].filter(Boolean);
  const g=profileGoals(), rp=(state.profile&&state.profile.runProfile)||{}; const sel=scheduleDays();
  const goal=[strengthEnabled()&&g.pushups?`pompes ${g.pushups}`:'', runEnabled()&&(toNum(rp.targetKm)?`${rp.targetKm} km${rp.targetTimeSec?' en '+mmss(rp.targetTimeSec):''}`:(g.run10kMin&&!isNewInstall()?`10 km en ${g.run10kMin} min`:''))].filter(Boolean).join(' · ');
  const r=state.profile&&state.profile.runRef; const lvl=[runEnabled()&&toNum(rp.comfortableKm)?`${rp.comfortableKm} km confortables`:'', runEnabled()&&r&&r.sec?`${r.km} km en ${mmss(r.sec)}`:'', disciplines().bike!==false&&ftpValue()?`FTP ${ftpValue()} W`:''].filter(Boolean).join(' · ');
  return {disc:sports.length?sports.join(' + '):'aucun sport choisi',goal:goal||'à définir',level:lvl||'à renseigner',plan:`${sel?sel.length:7} jour${(sel?sel.length:7)>1?'s':''} · ${sessionDuration()} min`};
}
function renderGoals(){ const root=$('#goals'); if(!root) return; const S=goalsSummaries();
  root.innerHTML=`<section class="card"><div class="between"><div><p class="eyebrow">Objectifs</p><h2>Ton profil sportif</h2></div><button class="ghost small" type="button" id="reconfigureBtn">Reconfigurer</button></div><p class="muted">Ouvre une section pour la modifier : tout se recalcule immédiatement, sans toucher à ton historique.</p></section>`
    +accSection('disc','1 · Tes sports',S.disc,disciplinesCardHtml())
    +accSection('goal','2 · Ton objectif',S.goal,(strengthEnabled()?programGoalCardHtml():'')+goalsCardHtml())
    +accSection('level','3 · Ton niveau actuel',S.level,referencesCardHtml())
    +accSection('plan','4 · Ton planning',S.plan,scheduleCardHtml()+startCardHtml());
  $$('#goals details.acc').forEach(dt=>dt.addEventListener('toggle',()=>{ goalsOpen=goalsOpen||{}; goalsOpen[dt.dataset.acc]=dt.open; }));
  const rb=$('#reconfigureBtn'); if(rb) rb.onclick=()=>openOnboarding();
  bindProfileFields(); bindScheduleFields(); bindReferenceFields();
  $$('#goals [data-homesport]').forEach(b=>b.onclick=()=>{ const k=b.dataset.homesport; state.profile=state.profile||{}; let cur=extraSports(); cur=cur.includes(k)?cur.filter(x=>x!==k):cur.concat(k); state.profile.extraSports=cur; saveState({sync:false}); renderGoals(); });
  $$('#goals [data-disc]').forEach(b=>b.onclick=()=>{ const k=b.dataset.disc; state.profile=state.profile||{}; state.profile.disciplines=Object.assign({},disciplines()); const next=!state.profile.disciplines[k]; state.profile.disciplines[k]=next; if(!state.profile.disciplines.run&&!state.profile.disciplines.bike&&!state.profile.disciplines.strength){ state.profile.disciplines[k]=true; } saveState({sync:false}); renderGoals(); });
  $$('#goals [data-pgoal]').forEach(b=>b.onclick=()=>{ state.profile=state.profile||{}; state.profile.programGoal=b.dataset.pgoal; saveState({sync:false}); renderGoals(); }); }
function renderGear(){ const root=$('#gear'); if(!root) return; root.innerHTML=`<section class="card"><p class="eyebrow">Matériel</p><h2>Ton équipement</h2><p class="muted">Coche ce que tu possèdes : les exercices du programme sont remplacés par une variante réalisable et les charges s'alignent sur tes poids, dès l'affichage suivant.</p></section>`+gearCardHtml(); bindGearFields(); }
function renderCharts(){ const root=$('#charts'); const range=state.settings.chartRangeDays || 30; root.innerHTML=capacitiesHtml()+trophySummaryHtml()+runStatsCardHtml()+`<section class="card"><div class="between"><div><p class="eyebrow">Graphiques</p><h2>Progression visuelle</h2></div><label style="max-width:220px"><span>Plage de temps</span><select id="chartRange"><option value="7" ${range==7?'selected':''}>7 jours</option><option value="30" ${range==30?'selected':''}>30 jours</option><option value="90" ${range==90?'selected':''}>90 jours</option><option value="365" ${range==365?'selected':''}>1 an</option><option value="9999" ${range==9999?'selected':''}>Tout</option></select></label></div></section><section class="grid grid-2"><div class="card"><h3>Zones du corps travaillées</h3><canvas class="chart polar" id="chartMuscles"></canvas><p class="muted">Séries par zone (principal + secondaires). Le cardio compte surtout dans les jambes.</p></div>${chartCard('chartVolume','Volume muscu hebdomadaire')}${chartCard('chartCardio','Distance course/vélo')}${chartCard('chartPain','Douleur haut du dos')}${chartCard('chartWeight','Évolution du poids')}</section><section class="card"><h3>Ajouter un test</h3><div class="grid grid-3"><label><span>Type</span><select id="testType">${TESTS.map(t=>`<option value="${t.key}">${t.label}</option>`).join('')}</select></label><label><span>Valeur</span><input id="testValue" type="text" inputmode="decimal" placeholder="ex : 42:30 ou 35.2"></label><label><span>Date</span><input id="testDate" type="date" value="${isoToday()}"></label></div><div class="footer-actions"><button class="primary" id="addTest">Ajouter le test</button></div></section>`; setTimeout(drawCharts,0); $('#chartRange').onchange=e=>{ state.settings.chartRangeDays=Number(e.target.value); saveState({sync:false}); drawCharts(); }; $('#addTest').onclick=()=>{ state.tests.push({date:$('#testDate').value,type:$('#testType').value,value:$('#testValue').value}); saveState(); renderCharts(); }; $('#charts').insertAdjacentHTML('beforeend', (blockIndexFor(isoToday())>0?blockReportHtml(blockReport(blockIndexFor(isoToday())-1),false):'')+cardioStatsCardHtml()+recordsCardHtml()+gradesCardHtml()); const cf=$('#cardioFilter'); if(cf) cf.onchange=e=>{ state.settings.cardioFilter=e.target.value; saveState({sync:false}); renderCharts(); }; }
function chartCard(id,title){ return `<div class="card"><h3>${esc(title)}</h3><canvas class="chart" id="${id}"></canvas></div>`; }
function lastWeeks(n=8){ const cur=mondayOf(parseISO(selectedDate)); return Array.from({length:n},(_,i)=>mondayOf(addDays(cur,-7*(n-1-i)))); }
function chartRangeStart(){ const days=Number(state.settings.chartRangeDays||30); if(days>=9999) return '0000-01-01'; return localISO(addDays(parseISO(isoToday()), -days + 1)); }
function inChartRange(iso){ return iso >= chartRangeStart() && iso <= isoToday(); }
function drawCharts(){ const rangeDays=Number(state.settings.chartRangeDays||30); const weekCount=rangeDays>=365?52:rangeDays>=90?13:rangeDays>=30?8:4; const weeks=lastWeeks(weekCount); const labels=weeks.map(w=>`S${weekIndexFor(localISO(w))}`); const volumes=weeks.map(w=>Math.round(weeklyStats(w).volumeKg)); const run=weeks.map(w=>sumWeekMetric(w,'runDistanceKm')); const bike=weeks.map(w=>sumWeekMetric(w,'bikeDistanceKm')); const pain=weeks.map(w=>toNum(weeklyStats(w).avgPain)); drawPolar('chartMuscles', muscleZoneTotals()); drawBar('chartVolume',labels,volumes,'kg'); drawGrouped('chartCardio',labels,run,bike,'course km','vélo km'); drawLine('chartPain',labels,pain,'/10'); const weights=(state.bodyWeights||[]).filter(r=>inChartRange(r.date)).slice(-12); drawLine('chartWeight',weights.map(r=>r.date.slice(5)),weights.map(r=>toNum(r.kg)),'kg'); drawCardioStats(); }
function sumWeekMetric(w,key){ return Array.from({length:7},(_,i)=>localISO(addDays(w,i))).reduce((n,iso)=>n+toNum(getSession(iso).metrics?.[key]),0); }
function muscleZone(m){ m=String(m||'').toLowerCase(); if(['dos','haut du dos'].includes(m)) return 'Dos'; if(['jambes','fessiers','ischios','mollets'].includes(m)) return 'Jambes'; if(['pectoraux'].includes(m)) return 'Torse'; if(['epaules','épaules'].includes(m)) return 'Épaules'; if(['biceps','triceps'].includes(m)) return 'Bras'; if(['gainage','abdos','tronc'].includes(m)) return 'Tronc'; return null; }
function exerciseZoneWeights(ex){
  if(ex&&ex.kind==='activity'){ const w={}; (ex.muscles||[]).forEach((m,i)=>{ const z=muscleZone(m); if(z) w[z]=Math.max(w[z]||0, i===0?1:0.45); }); return w; }
  const n=String(ex.name||'').toLowerCase();
  const t=String(ex.target||'').toLowerCase();
  const has=(word)=>n.includes(word)||t.includes(word);
  let w={};
  if(has('traction')) w={Dos:1, Bras:0.45, 'Épaules':0.15, Tronc:0.10};
  else if(has('rowing')) w={Dos:1, Bras:0.35, 'Épaules':0.25, Tronc:0.10};
  else if(has('dips')) w={Torse:1, Bras:0.75, 'Épaules':0.35, Tronc:0.10};
  else if(has('pompes')) w={Torse:1, Bras:0.65, 'Épaules':0.30, Tronc:0.25};
  else if(has('goblet') || has('squat')) w={Jambes:1, Tronc:0.35, Dos:0.15};
  else if(has('swing')) w={Jambes:1, Dos:0.45, Tronc:0.35, 'Épaules':0.10};
  else if(has('rdl') || has('soulevé')) w={Jambes:1, Dos:0.35, Tronc:0.30};
  else if(has('fentes') || has('step-up') || has('mollets')) w={Jambes:1, Tronc:0.20};
  else if(has('presse épaules') || has('pike')) w={'Épaules':1, Bras:0.55, Tronc:0.20};
  else if(has('halo')) w={'Épaules':1, Dos:0.45, Tronc:0.25};
  else if(has('y-t-w') || has('snow angels') || has('scapular')) w={Dos:1, 'Épaules':0.55, Tronc:0.15};
  else if(has('dead hang')) w={Dos:0.65, 'Épaules':0.65, Bras:0.25};
  else if(has('développé') || has('push press') || has('arnold') || has('z-press')) w={'Épaules':1, Bras:0.55, Tronc:0.20};
  else if(has('shrug') || has('high pull') || has('upright') || has('élévations')) w={'Épaules':1, Dos:0.55, Tronc:0.10};
  else if(has('clean')) w={Jambes:1, Dos:0.50, 'Épaules':0.35, Tronc:0.25};
  else if(has('good morning')) w={Jambes:1, Dos:0.40, Tronc:0.30};
  else if(has('renegade')) w={Dos:1, Bras:0.35, Tronc:0.40};
  else if(has('carry') || has('porté') || has('farmer') || has('suitcase')) w={Tronc:1, Dos:0.45, Bras:0.35};
  else if(has('windmill')) w={Tronc:1, 'Épaules':0.40, Jambes:0.20};
  else if(has('around the world')) w={'Épaules':1, Tronc:0.45, Bras:0.25};
  else if(has('get-up')) w={Tronc:1, 'Épaules':0.55, Jambes:0.35};
  else if(has('curl')) w={Bras:1};
  else if(has('presse au sol') || has('pull-over') || has('écarté')) w={Torse:1, Bras:0.40};
  else if(has('snatch')) w={Jambes:1, 'Épaules':0.70, Dos:0.40};
  else if(has('tirage')) w={Dos:1, 'Épaules':0.35, Bras:0.30};
  else if(has('pont')) w={Jambes:1, Tronc:0.25};
  else if(noLoadExercise(ex)) w={Tronc:1};
  else {
    (ex.muscles||[]).forEach((m,i)=>{ const z=muscleZone(m); if(z) w[z]=Math.max(w[z]||0, i===0?1:0.45); });
  }
  return w;
}
function cardioEffort(sess, iso){
  const m=sess.metrics||{};
  const cleared=Object.assign({},sess.cardioCleared); if(sess.cardioStatus){ ['run','bike'].forEach(k=>{ if(sess.cardioStatus[k]==='skipped') cleared[k]=true; }); }
  const rk=toNum(m.runDistanceKm), rm=toNum(m.runDurationSec)/60;
  const bk=toNum(m.bikeDistanceKm), bm=toNum(m.bikeDurationSec)/60;
  // Barème aligné sur la muscu (1 point ≈ 1 série ≈ 3 min d'effort) : le cardio pèse enfin dans les jambes
  let run=Math.max(rk*1.5, rm/3);
  let bike=Math.max(bk/3, bm/4);
  if(run===0 && iso && !cleared.run && cardioDone('run', iso)) run=12;    // coché "réalisé" sans distance saisie (~35 min)
  if(bike===0 && iso && !cleared.bike && cardioDone('bike', iso)) bike=15;
  if(sess.cardioStatus&&sess.cardioStatus.run==='skipped') run=0;
  if(sess.cardioStatus&&sess.cardioStatus.bike==='skipped') bike=0;
  return {run, bike};
}
function muscleZoneTotals(){
  const totals={Dos:0,Jambes:0,Torse:0,'Épaules':0,Bras:0,Tronc:0};
  Object.keys(state.sessions||{}).filter(inChartRange).forEach(iso=>{
    // Force / mobilité : 1 point par série réalisée, réparti selon l'implication musculaire
    allExercisesForSession(iso).filter(e=>e.kind!=='run'&&e.kind!=='bike').forEach(e=>{
      const log=getExerciseLog(iso,e);
      let done=(log.sets||[]).filter(s=>s.done).length;
      if(!done) return;
      if(e.kind==='activity') done=(log.sets||[]).filter(s=>s.done).reduce((a,s)=>a+(toNum(s.actual)||parseReps(e.reps)||60)/3,0);
      const weights=exerciseZoneWeights(e);
      Object.entries(weights).forEach(([z,w])=>{ if(totals[z]!==undefined) totals[z]+=done*w; });
    });
    // Cardio : surtout les jambes, un peu le tronc (et le dos à vélo pour la posture)
    const c=cardioEffort(getSession(iso), iso);
    totals.Jambes += c.run + c.bike;
    totals.Tronc  += c.run*0.15 + c.bike*0.10;
    totals.Dos    += c.bike*0.10;
  });
  // Séances libres : exercices, activités sportives (au temps) et cardio saisi
  Object.values(state.freeSessions||{}).forEach(fs=>{
    if(!fs||!fs.completed||!inChartRange(fs.date)) return;
    (fs.extraExercises||[]).forEach(e=>{
      const log=fs.exercises&&fs.exercises[e.id]; if(!log) return;
      const doneSets=(log.sets||[]).filter(s=>s.done);
      if(!doneSets.length||e.kind==='run'||e.kind==='bike') return;
      const pts=e.kind==='activity' ? doneSets.reduce((a,s)=>a+(toNum(s.actual)||parseReps(e.reps)||60)/3,0) : doneSets.length;
      Object.entries(exerciseZoneWeights(e)).forEach(([z,w])=>{ if(totals[z]!==undefined) totals[z]+=pts*w; });
    });
    const ps=state.sessions&&state.sessions[fs.date]; const pm=(ps&&ps.completed&&ps.metrics)||{}, fm=fs.metrics||{};
    const fid=Object.keys(state.freeSessions||{}).find(k=>state.freeSessions[k]===fs);
    const same=k=>toNum(fm[k+'DistanceKm'])>0 && Math.abs(toNum(fm[k+'DistanceKm'])-toNum(pm[k+'DistanceKm']))<0.05 && !isCardioDistinct(fs.date,k,fid);
    const c=cardioEffort({metrics:{runDistanceKm:same('run')?0:fm.runDistanceKm,runDurationSec:same('run')?0:fm.runDurationSec,bikeDistanceKm:same('bike')?0:fm.bikeDistanceKm,bikeDurationSec:same('bike')?0:fm.bikeDurationSec}}, null);
    totals.Jambes += c.run + c.bike; totals.Tronc += c.run*0.15 + c.bike*0.10; totals.Dos += c.bike*0.10;
  });
  return totals;
}
function setupCanvas(id){ const c=document.getElementById(id); if(!c) return null; const r=c.getBoundingClientRect(); const pw=(c.parentElement&&c.parentElement.clientWidth)||0; const w=Math.round(r.width||pw||360), h=Math.round(r.height>40?r.height:220); const dpr=Math.max(1,window.devicePixelRatio||1); c.style.width=w+'px'; c.style.height=h+'px'; c.width=Math.round(w*dpr); c.height=Math.round(h*dpr); const ctx=c.getContext('2d'); ctx.setTransform(dpr,0,0,dpr,0,0); ctx.font='12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif'; ctx.textBaseline='alphabetic'; return {c,ctx,w,h}; }
function niceAxis(min,max,ticks=4){
  if(!isFinite(min)||!isFinite(max)) return {lo:0,hi:1,step:1};
  if(max-min<1e-9){ const pad=Math.max(0.5,Math.abs(max)*0.02); min-=pad; max+=pad; }
  const raw=(max-min)/ticks; const mag=Math.pow(10,Math.floor(Math.log10(raw))); const norm=raw/mag;
  const step=(norm<=1?1:norm<=2?2:norm<=2.5?2.5:norm<=5?5:10)*mag;
  return {lo:Math.floor(min/step)*step, hi:Math.ceil(max/step)*step, step};
}
function fmtTick(v,step){ const d=step<1?(step<0.1?2:1):0; return v.toFixed(d).replace('.',','); }
function axes(ctx,w,h){ ctx.strokeStyle='rgba(148,163,184,.25)'; ctx.beginPath(); ctx.moveTo(35,15); ctx.lineTo(35,h-30); ctx.lineTo(w-10,h-30); ctx.stroke(); }
function drawBar(id,labels,vals,suf){ const s=setupCanvas(id); if(!s) return; const {ctx,w,h}=s; ctx.clearRect(0,0,w,h); axes(ctx,w,h); const max=Math.max(...vals,1); const gap=8,bw=(w-55)/vals.length-gap; vals.forEach((v,i)=>{ const bh=(h-55)*v/max, x=42+i*(bw+gap), y=h-30-bh; ctx.fillStyle='#38bdf8'; round(ctx,x,y,bw,bh,7); ctx.fill(); ctx.fillStyle='#9fb7d8'; ctx.fillText(labels[i],x,h-10); if(v){ ctx.fillStyle='#f8fafc'; ctx.fillText(String(v),x,y-5); } }); ctx.fillStyle='#9fb7d8'; ctx.fillText(suf,38,12); }
function drawGrouped(id,labels,a,b,al,bl){ const s=setupCanvas(id); if(!s) return; const {ctx,w,h}=s; ctx.clearRect(0,0,w,h); axes(ctx,w,h); const max=Math.max(...a,...b,1); const gap=8,gw=(w-55)/labels.length-gap,bw=gw/2.4; labels.forEach((lab,i)=>{ [a[i],b[i]].forEach((v,j)=>{ const bh=(h-55)*v/max,x=42+i*(gw+gap)+j*(bw+3); ctx.fillStyle=j?'#22c55e':'#38bdf8'; round(ctx,x,h-30-bh,bw,bh,6); ctx.fill(); }); ctx.fillStyle='#9fb7d8'; ctx.fillText(lab,42+i*(gw+gap),h-10); }); ctx.fillStyle='#38bdf8'; ctx.fillText(al,38,12); ctx.fillStyle='#22c55e'; ctx.fillText(bl,120,12); }
function drawLine(id,labels,vals,suf){ const s=setupCanvas(id); if(!s) return; const {ctx,w,h}=s; ctx.clearRect(0,0,w,h);
  const L=46,R=12,T=18,B=30; const pw=w-L-R, ph=h-T-B;
  const data=vals.map(Number).filter(v=>isFinite(v));
  if(!data.length){ axes(ctx,w,h); ctx.fillStyle='#9fb7d8'; ctx.fillText('Pas encore de données',L,h/2); return; }
  // Axe Y resserré sur les données (marge 15 %) : les petites variations deviennent lisibles
  const dmin=Math.min(...data), dmax=Math.max(...data); const pad=Math.max((dmax-dmin)*0.15,Math.abs(dmax)*0.005,0.2);
  const ax=niceAxis(dmin-pad,dmax+pad,4); const span=ax.hi-ax.lo||1;
  const yOf=v=>T+ph-ph*((v-ax.lo)/span);
  ctx.lineWidth=1;
  for(let v=ax.lo; v<=ax.hi+ax.step/2; v+=ax.step){ const y=Math.round(yOf(v))+0.5; ctx.strokeStyle='rgba(148,163,184,.16)'; ctx.beginPath(); ctx.moveTo(L,y); ctx.lineTo(w-R,y); ctx.stroke(); ctx.fillStyle='#9fb7d8'; ctx.textAlign='right'; ctx.fillText(fmtTick(v,ax.step),L-6,y+4); }
  ctx.textAlign='left';
  const n=vals.length; const xOf=i=>L+(n<=1?pw/2:i*(pw/(n-1)));
  const pts=vals.map((v,i)=>[xOf(i),yOf(Number(v))]);
  const g=ctx.createLinearGradient(0,T,0,T+ph); g.addColorStop(0,'rgba(56,189,248,.28)'); g.addColorStop(1,'rgba(56,189,248,0)');
  if(n>1){ ctx.beginPath(); pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y)); ctx.lineTo(pts[n-1][0],T+ph); ctx.lineTo(pts[0][0],T+ph); ctx.closePath(); ctx.fillStyle=g; ctx.fill(); }
  ctx.strokeStyle='#38bdf8'; ctx.lineWidth=2.5; ctx.lineJoin='round'; ctx.beginPath(); pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y)); ctx.stroke();
  const every=Math.max(1,Math.ceil(n/6));
  pts.forEach(([x,y],i)=>{ ctx.fillStyle='#22c55e'; ctx.beginPath(); ctx.arc(x,y,3.5,0,Math.PI*2); ctx.fill(); if(i%every===0||i===n-1){ ctx.fillStyle='#9fb7d8'; ctx.textAlign='center'; ctx.fillText(labels[i]||'',x,h-10); ctx.textAlign='left'; } });
  const last=Number(vals[n-1]); ctx.fillStyle='#f8fafc'; ctx.textAlign='right'; ctx.fillText(fmtTick(last,ax.step<1?0.1:1)+' '+suf,w-R,12); ctx.textAlign='left';
  ctx.fillStyle='#9fb7d8'; ctx.fillText(suf,6,12); }
function drawPolar(id, data){ const s=setupCanvas(id); if(!s) return; const {ctx,w,h}=s; ctx.clearRect(0,0,w,h); const labels=Object.keys(data); const vals=Object.values(data); const max=Math.max(...vals,1); const cx=w/2, cy=h/2+8, r=Math.min(w,h)*0.30; ctx.strokeStyle='rgba(148,163,184,.18)'; ctx.fillStyle='#9fb7d8'; ctx.font='12px system-ui'; for(let ring=1;ring<=4;ring++){ ctx.beginPath(); ctx.arc(cx,cy,r*ring/4,0,Math.PI*2); ctx.stroke(); } labels.forEach((lab,i)=>{ const a=-Math.PI/2 + i*2*Math.PI/labels.length; ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r); ctx.stroke(); ctx.fillText(lab,cx+Math.cos(a)*(r+22)-18,cy+Math.sin(a)*(r+22)); }); ctx.beginPath(); labels.forEach((lab,i)=>{ const a=-Math.PI/2+i*2*Math.PI/labels.length; const rr=r*(data[lab]/max); const x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr; i?ctx.lineTo(x,y):ctx.moveTo(x,y); }); ctx.closePath(); ctx.fillStyle='rgba(56,189,248,.28)'; ctx.strokeStyle='#38bdf8'; ctx.lineWidth=3; ctx.fill(); ctx.stroke(); labels.forEach((lab,i)=>{ const a=-Math.PI/2+i*2*Math.PI/labels.length; const rr=r*(data[lab]/max); ctx.fillStyle='#38bdf8'; ctx.beginPath(); ctx.arc(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr,3,0,Math.PI*2); ctx.fill(); }); }
function round(ctx,x,y,w,h,r){ const rr=Math.min(r,w/2,Math.abs(h)/2); ctx.beginPath(); ctx.moveTo(x+rr,y); ctx.arcTo(x+w,y,x+w,y+h,rr); ctx.arcTo(x+w,y+h,x,y+h,rr); ctx.arcTo(x,y+h,x,y,rr); ctx.arcTo(x,y,x+w,y,rr); ctx.closePath(); }

function historyRows(){
  const today=isoToday();
  const planned=Object.entries(state.sessions||{}).filter(([iso,s])=>iso<=today && s && s.completed).map(([iso,s])=>({kind:'planned', id:iso, iso, s, title:planForDate(iso).plan.title, prefix:planForDate(iso).type}));
  const free=Object.entries(state.freeSessions||{}).filter(([,s])=>s && s.completed && (s.date||today)<=today).map(([id,s])=>({kind:'free', id, iso:s.date||today, s, title:s.title||'Séance libre', prefix:'Libre'}));
  return [...planned, ...free].sort((a,b)=>(b.s.completedAt||b.iso).localeCompare(a.s.completedAt||a.iso)).slice(0,160);
}
function renderHistory(){ const root=$('#history'); const rows=historyRows(); root.innerHTML=`<section class="card"><div class="between"><div><p class="eyebrow">Historique</p><h2>Séances réalisées</h2><p class="muted">Séances terminées, libres incluses.</p></div><span class="badge done">${rows.length} terminées</span></div><div class="footer-actions"><button class="primary" id="exportJson">Exporter JSON</button><button class="ghost" id="exportCsv">Exporter CSV</button><label class="ghost">Importer JSON<input id="importJson" type="file" accept="application/json" class="hidden"></label></div></section><section class="card"><div style="overflow:auto"><table class="table"><thead><tr><th>Date</th><th>Séance</th><th>Statut</th><th>Course</th><th>Vélo</th><th>Hors cardio</th><th>Volume</th><th>RPE</th><th>Douleur</th><th>Notes</th></tr></thead><tbody>${rows.length?rows.map(({iso,s,title,prefix})=>`<tr><td>${fmtDate(iso)}</td><td>${esc(prefix)} · ${esc(title)}</td><td><i class="dot done"></i>Terminée</td><td>${esc(s.metrics?.runDistanceKm||'')} ${s.metrics?.runDistanceKm?'km':''} ${s.metrics?.runAvgSpeed?'· '+esc(s.metrics.runAvgSpeed)+' km/h':''}</td><td>${esc(s.metrics?.bikeDistanceKm||'')} ${s.metrics?.bikeDistanceKm?'km':''} ${s.metrics?.bikeAvgSpeed?'· '+esc(s.metrics.bikeAvgSpeed)+' km/h':''}</td><td>${hms(s.metrics?.strengthDurationSec||s.stopwatch?.elapsedSec||0)}</td><td>${formatDecimal(s.metrics?.volumeKg||0,0)} kg</td><td>${esc(s.rpe||'')}</td><td>${esc(s.backPain||'')}</td><td>${esc((s.notes||'').slice(0,80))}</td></tr>`).join(''):`<tr><td colspan="10" class="muted">Aucune séance terminée pour le moment.</td></tr>`}</tbody></table></div></section>`; $('#exportJson').onclick=exportJSON; $('#exportCsv').onclick=exportCSV; $('#importJson').onchange=importJSON; }

function renderSettings(){
  const root=$('#settings');
  root.innerHTML=`${authCardHtml()}<section class="card"><p class="eyebrow">Réglages</p><h2>Programme, poids et alertes</h2><div class="grid grid-3"><label><span>Date de début du programme</span><input id="startDate" type="date" value="${state.startDate}"></label><label><span>Son fin de repos</span><select id="sound"><option value="true" ${state.settings.sound!==false?'selected':''}>Oui</option><option value="false" ${state.settings.sound===false?'selected':''}>Non</option></select></label><label><span>Vibration fin de repos</span><select id="vibration"><option value="true" ${state.settings.vibration?'selected':''}>Oui</option><option value="false" ${!state.settings.vibration?'selected':''}>Non</option></select></label><p class="muted" style="margin:0 0 6px;font-size:12px">Crédits : Exercise data by <a href="https://repdb.co" target="_blank" rel="noopener">RepDB (repdb.co)</a> — bibliothèque de 637 exercices et leurs illustrations (noms et descriptions traduits en français). Allures de course : méthode VDOT de Jack Daniels.</p><p class="muted" style="margin:0 0 10px">Version de l’app : <strong>${APP_VERSION}</strong>${(b=>b?(b.ok?` · Sauvegarde automatique avant migration du ${fmtDate(String(b.at).slice(0,10))} (${b.kb} Ko) <button class="ghost small" type="button" id="dlPreMigration">Télécharger</button>`:` · ⚠ Sauvegarde avant migration impossible (${esc(b.error||'stockage plein')}) : fais un export JSON.`):'')(state.migrations&&state.migrations.backup)}</p><label><span>Exercices unilatéraux (un bras / une jambe)</span><select id="uniMode"><option value="split" ${uniMode()==='split'?'selected':''}>Séries gauche / droite séparées</option><option value="total" ${uniMode()==='total'?'selected':''}>Total G+D dans une série (reps ×2)</option></select></label><label><span>Citations pendant le repos</span><select id="restQuotes"><option value="true" ${state.settings.restQuotes!==false?'selected':''}>Oui</option><option value="false" ${state.settings.restQuotes===false?'selected':''}>Non</option></select></label></div></section><section class="card"><p class="muted">🎯 Niveau & objectifs et 🧰 Matériel ont désormais leurs propres onglets (menu Plus). Ils restent modifiables à tout moment : le programme s'adapte immédiatement.</p></section>${(u=>u?`<section class="card autoreg warn"><p class="eyebrow">Poids à vérifier</p><p class="muted">La pesée du ${fmtDate(u.date)} (78 kg) a été créée automatiquement par une ancienne version de l'app. Elle sert encore aux calculs passés pour ne pas modifier ton historique.</p><div class="footer-actions"><button class="primary small" type="button" id="bwConfirm">C'est bien mon poids</button><button class="ghost small" type="button" id="bwRemove">Ce n'était pas mon poids : la retirer</button></div></section>`:'')((state.bodyWeights||[]).find(r=>r.unconfirmed))}${isNewInstall()&&!(state.bodyWeights||[]).length?'<section class="card autoreg"><p class="muted">⚖️ Ton poids n\'est pas encore renseigné : le volume des exercices au poids du corps, les kcal et les W/kg seront affichés dès que tu l\'auras ajouté.</p></section>':''}<section class="card"><h3>Suivi du poids corporel</h3><p class="muted">Le dernier poids connu à la date de la séance est utilisé pour calculer le volume des exercices au poids du corps : tractions, dips, pompes et exercices lestés au poids du corps. Le gainage/abdos n'est pas compté comme charge soulevée.</p><div class="grid grid-3"><label><span>Date</span><input id="weightDate" type="date" value="${isoToday()}"></label><label><span>Poids, kg</span><input id="weightKg" type="number" inputmode="decimal" step="0.1" value="${currentBodyWeight()?formatDecimal(currentBodyWeight(),1).replace(',','.'):''}" placeholder="kg"></label><div style="align-self:end"><button class="primary" id="addWeight">Ajouter poids</button></div></div><div style="overflow:auto;margin-top:14px"><table class="table"><thead><tr><th>Date</th><th>Poids</th></tr></thead><tbody>${[...(state.bodyWeights||[])].sort((a,b)=>b.date.localeCompare(a.date)).map(r=>`<tr><td>${esc(r.date)}</td><td>${formatDecimal(r.kg,1)} kg</td></tr>`).join('')}</tbody></table></div><div class="footer-actions"><button class="danger" id="resetAll">Réinitialiser toutes les données locales</button></div></section>`;
  bindAuthControls();
  $('#startDate').onchange=e=>{ state.startDate=e.target.value; saveState(); render(); };
  $('#sound').onchange=e=>{ state.settings.sound=e.target.value==='true'; saveState(); };
  const dlb=$('#dlPreMigration'); if(dlb) dlb.onclick=()=>{ if(!downloadPreMigrationBackup()) alert('Sauvegarde introuvable.'); };
  const bwc=$('#bwConfirm'); if(bwc) bwc.onclick=()=>{ (state.bodyWeights||[]).forEach(r=>{ if(r.unconfirmed){ delete r.unconfirmed; r.confirmed=true; } }); saveState(); renderSettings(); };
  const bwr=$('#bwRemove'); if(bwr) bwr.onclick=()=>{ if(!confirm('Retirer cette pesée de 78 kg ? Les volumes passés au poids du corps seront recalculés avec ta pesée suivante.')) return; state.bodyWeights=(state.bodyWeights||[]).filter(r=>!r.unconfirmed); saveState(); renderSettings(); };
  const um=$('#uniMode'); if(um) um.onchange=e=>{ state.settings.unilateralMode=e.target.value; saveState({sync:false}); };
  const rq=$('#restQuotes'); if(rq) rq.onchange=e=>{ state.settings.restQuotes=e.target.value==='true'; saveState({sync:false}); };

  $('#vibration').onchange=e=>{ state.settings.vibration=e.target.value==='true'; saveState(); };
  $('#addWeight').onclick=()=>{ const date=$('#weightDate').value, kg=toNum($('#weightKg').value); if(date&&kg){ state.bodyWeights.push({date,kg}); state.settings.bodyWeightKg=kg; saveState(); render(); } };
  $('#resetAll').onclick=()=>{ if(confirm('Supprimer toutes les données locales ?')){ localStorage.removeItem(LS_KEY); location.reload(); } };
}

function supabaseReady(){ return Boolean(window.supabaseClient && window.supabaseClient.auth); }
function cloudStatusText(){
  if(!supabaseReady()) return cloudUnavailableMsg();
  if(authUser) return `Connecté : ${authUser.email || authUser.id}`;
  return state.cloud?.status || 'Non connecté';
}
function authCardHtml(){
  const connected = Boolean(authUser);
  const lastSync = state.cloud?.lastSync ? new Date(state.cloud.lastSync).toLocaleString('fr-FR') : '-';
  const lastRestore = state.cloud?.lastRestore ? new Date(state.cloud.lastRestore).toLocaleString('fr-FR') : '-';
  return `<section class="card"><div class="between"><div><p class="eyebrow">Compte & Sync</p><h2>Supabase</h2><p class="muted">Sauvegarde cloud de tes séances terminées (avec toutes leurs séries), poids, routines, et — si la table app_state existe — profil, objectifs, matériel et réglages. Tes données restent aussi en local.</p></div><span class="badge ${connected?'done':'warn'}" id="cloudBadge">${esc(cloudStatusText())}</span></div><div class="grid grid-3"><label><span>Email</span><input id="authEmail" type="email" autocomplete="email" placeholder="ton@email.com"></label><label><span>Mot de passe</span><input id="authPassword" type="password" autocomplete="current-password" placeholder="••••••••"></label><label><span>Synchronisation auto</span><select id="cloudAutoSync"><option value="true" ${state.settings.cloudAutoSync!==false?'selected':''}>Oui</option><option value="false" ${state.settings.cloudAutoSync===false?'selected':''}>Non</option></select></label></div><p class="muted" id="authStatus">${esc(cloudStatusText())}</p><div class="footer-actions"><button class="primary" id="signInBtn">Se connecter</button><button class="ghost" id="signUpBtn">Créer un compte</button><button class="ghost" id="signOutBtn">Se déconnecter</button><button class="primary" id="syncCloudBtn">Synchroniser vers Supabase</button><button class="ghost" id="restoreCloudBtn">Restaurer (fusion)</button><button class="ghost" id="syncDiagBtn">Diagnostic de synchronisation</button>${authUser?'<button class="danger" id="deleteAccountBtn">Supprimer mon compte cloud</button>':''}</div><p class="muted" style="font-size:12px"><a href="politique-confidentialite.html" target="_blank" rel="noopener">Politique de confidentialité</a></p>${authUser?`<p class="muted" style="font-size:13px">Compte connecté : ${esc(authUser.email||'')}<br>UUID : <code class="uuid">${esc(authUser.id)}</code></p>`:''}<div id="syncDiagOut">${syncDiagnosticHtml(state.cloud&&state.cloud.lastDiagnostic)}</div><div class="grid grid-3">${(inv=>`<div class="stat"><small>Séances avec données</small><strong>${inv.withData+inv.freeAll}</strong><small>${inv.eligible.length} terminées à sauvegarder</small></div>`)(localSyncInventory())}<div class="stat"><small>Dernière sync</small><strong style="font-size:1rem">${esc(lastSync)}</strong></div><div class="stat"><small>Dernière restauration</small><strong style="font-size:1rem">${esc(lastRestore)}</strong></div></div></section>`;
}
function bindAuthControls(){
  const email=$('#authEmail'), pass=$('#authPassword');
  const setStatus=t=>{ const el=$('#authStatus'); if(el) el.textContent=t; const badge=$('#cloudBadge'); if(badge) badge.textContent=t; };
  const auto=$('#cloudAutoSync'); if(auto) auto.onchange=e=>{ state.settings.cloudAutoSync=e.target.value==='true'; saveState({sync:false}); };
  const signIn=$('#signInBtn'); if(signIn) signIn.onclick=async()=>{ await signInCloud(email?.value||'', pass?.value||'', setStatus); };
  const signUp=$('#signUpBtn'); if(signUp) signUp.onclick=async()=>{ await signUpCloud(email?.value||'', pass?.value||'', setStatus); };
  const signOut=$('#signOutBtn'); if(signOut) signOut.onclick=async()=>{ await signOutCloud(setStatus); };
  const sync=$('#syncCloudBtn'); if(sync) sync.onclick=async()=>{ await syncLocalToCloud(setStatus); };
  const restore=$('#restoreCloudBtn'); if(restore) restore.onclick=async()=>{ await restoreFromCloud(setStatus); };
  const del=$('#deleteAccountBtn'); if(del) del.onclick=async()=>{ await deleteCloudAccount(setStatus); };
  const diag=$('#syncDiagBtn'); if(diag) diag.onclick=async()=>{ setStatus('Diagnostic en cours (lecture seule)...'); try{ const d=await runSyncDiagnostic(); const out=$('#syncDiagOut'); if(out) out.innerHTML=syncDiagnosticHtml(d); setStatus(d.error||(d.ok?'Diagnostic : tout est confirmé côté serveur.':'Diagnostic : des écarts sont listés ci-dessous.')); }catch(e){ setStatus('Erreur diagnostic : '+(e.message||e)); } };
}
async function getCloudUser(){
  if(!supabaseReady()) return null;
  const { data, error } = await window.supabaseClient.auth.getUser();
  authUser = error ? null : data.user;
  return authUser;
}
let cloudInited=false;
window.addEventListener('supabase-ready', ()=>{ initCloud(); });
function cloudUnavailableMsg(){
  if(typeof navigator!=='undefined' && navigator.onLine===false) return 'Hors-ligne : Supabase indisponible. Tes données restent en local, la sync reprendra avec le réseau.';
  if(!(window.supabase && window.supabase.createClient)) return 'Lib Supabase pas encore chargée (réseau requis une fois). Réessaie connecté à internet.';
  return 'Supabase non configuré. Vérifie supabase-config.js.';
}
async function initCloud(){
  if(!supabaseReady()) { state.cloud.status=cloudUnavailableMsg(); saveState({sync:false}); if(currentView==='settings') renderSettings(); return; }
  if(cloudInited) return; cloudInited=true;
  const { data } = await window.supabaseClient.auth.getSession();
  authUser = data?.session?.user || null;
  window.supabaseClient.auth.onAuthStateChange((_event, session)=>{ authUser=session?.user || null; state.cloud.status=authUser?`Connecté : ${authUser.email||authUser.id}`:'Non connecté'; saveState({sync:false}); if(currentView==='settings') renderSettings(); });
  state.cloud.status=authUser?`Connecté : ${authUser.email||authUser.id}`:'Non connecté'; saveState({sync:false});
  if(currentView==='settings') renderSettings();
}
async function signUpCloud(email,password,setStatus=()=>{}){
  if(!supabaseReady()) return setStatus(cloudUnavailableMsg());
  if(!email || !password) return setStatus('Email et mot de passe requis.');
  setStatus('Création du compte...');
  const { data, error } = await window.supabaseClient.auth.signUp({ email, password });
  if(error) return setStatus(error.message);
  authUser = data?.user || authUser;
  setStatus('Compte créé. Vérifie tes emails si la confirmation est activée.');
}
async function signInCloud(email,password,setStatus=()=>{}){
  if(!supabaseReady()) return setStatus(cloudUnavailableMsg());
  if(!email || !password) return setStatus('Email et mot de passe requis.');
  setStatus('Connexion...');
  const { data, error } = await window.supabaseClient.auth.signInWithPassword({ email, password });
  if(error) return setStatus(error.message);
  authUser = data.user;
  state.cloud.status=`Connecté : ${authUser.email||authUser.id}`;
  saveState({sync:false});
  setStatus('Connecté. Tu peux synchroniser ou restaurer.');
  renderSettings();
}
async function signOutCloud(setStatus=()=>{}){
  if(!supabaseReady()) return setStatus(cloudUnavailableMsg());
  await window.supabaseClient.auth.signOut();
  authUser=null; state.cloud.status='Non connecté'; saveState({sync:false}); setStatus('Déconnecté.'); renderSettings();
}
function scheduleAutoSync(){
  if(!state?.settings?.cloudAutoSync || cloudBusy || !supabaseReady()) return;
  clearTimeout(syncTimer);
  syncTimer=setTimeout(()=>syncLocalToCloud(()=>{}, true), 2500);
}
function meaningfulSession(s){
  if(!s) return false;
  if(s.completed || s.rpe || s.backPain || s.notes) return true;
  const m=s.metrics||{};
  if(Object.values(m).some(v=>v!=='' && v!==null && v!==undefined && Number(v)!==0)) return true;
  if((s.extraExercises||[]).length) return true;
  if(toNum(s.stopwatch?.elapsedSec)) return true;
  return Object.values(s.exercises||{}).some(log=>(log.sets||[]).some(set=>set.done || set.actual || set.load || set.note));
}
function cloudSessionPayload(iso,s,user){
  const p=planForDate(iso), m=s.metrics||{};
  return {
    user_id:user.id, local_id:iso, session_date:iso, week_number:p.week, week_type:p.type,
    day_label:p.plan.name, title:s.freeMode?'Séance libre':p.plan.title, session_type:p.plan.title,
    completed:Boolean(s.completed), non_cardio_duration_seconds:Math.round(toNum(m.strengthDurationSec || s.stopwatch?.elapsedSec)),
    rpe:s.rpe?Number(s.rpe):null, back_pain:s.backPain?Number(s.backPain):null, notes:s.notes||null,
    run_distance_km:m.runDistanceKm?toNum(m.runDistanceKm):null, run_duration_seconds:m.runDurationSec?Math.round(toNum(m.runDurationSec)):null,
    run_avg_speed_kmh:m.runAvgSpeed?toNum(m.runAvgSpeed):null, run_pace_seconds_per_km:m.runDurationSec&&m.runDistanceKm?Math.round(toNum(m.runDurationSec)/toNum(m.runDistanceKm)):null,
    bike_distance_km:m.bikeDistanceKm?toNum(m.bikeDistanceKm):null, bike_duration_seconds:m.bikeDurationSec?Math.round(toNum(m.bikeDurationSec)):null,
    bike_avg_speed_kmh:m.bikeAvgSpeed?toNum(m.bikeAvgSpeed):null,
    total_volume_kg:toNum(m.volumeKg || sessionVolumeKg(iso)), raw_data:s, updated_at:new Date().toISOString()
  };
}
function parseActualReps(actual){
  const m=String(actual||'').match(/\d+/);
  return m ? Number(m[0]) : null;
}
/* ================================================================================
   Synchronisation v18.40 : chaque écriture est confirmée par le serveur, une erreur sur
   une séance n'arrête plus les autres, et « synchronisé » n'est affiché que si tout est confirmé.
   ================================================================================ */
function sb(){ return window.supabaseClient; }
function stableStringify(v){ if(v===null||typeof v!=='object') return JSON.stringify(v===undefined?null:v); if(Array.isArray(v)) return '['+v.map(x=>x===undefined?'null':stableStringify(x)).join(',')+']'; return '{'+Object.keys(v).filter(k=>v[k]!==undefined).sort().map(k=>JSON.stringify(k)+':'+stableStringify(v[k])).join(',')+'}'; }
function hashStr(s){ let h=5381; for(let i=0;i<s.length;i++) h=((h<<5)+h+s.charCodeAt(i))|0; return (h>>>0).toString(16); }
function contentHash(obj){ return hashStr(stableStringify(JSON.parse(JSON.stringify(obj==null?{}:obj)))); }
/* Inventaire local : distingue les entrées vides (créées par la simple consultation d'un jour) des vraies séances */
function localSyncInventory(){
  const S=state.sessions||{}, F=state.freeSessions||{};
  const planned=Object.entries(S), free=Object.entries(F);
  const eligible=[...planned.filter(([,s])=>s&&s.completed).map(([iso,s])=>({localId:iso,kind:'planned',iso,s})), ...free.filter(([,s])=>s&&s.completed).map(([id,s])=>({localId:id,kind:'free',iso:s.date||isoToday(),s}))];
  return { entries:planned.length, empty:planned.filter(([,s])=>!meaningfulSession(s)).length, withData:planned.filter(([,s])=>meaningfulSession(s)).length,
    completedPlanned:planned.filter(([,s])=>s&&s.completed).length, inProgress:planned.filter(([,s])=>s&&!s.completed&&meaningfulSession(s)).length+free.filter(([,s])=>s&&!s.completed&&meaningfulSession(s)).length,
    freeAll:free.length, freeDone:free.filter(([,s])=>s&&s.completed).length, eligible };
}
/* Exercices d'une séance SANS toucher à l'écran affiché (séance figée, séance libre ou programme) */
function exercisesForItem(item){ const s=item.s||{}; if(item.kind==='free'||s.freeMode) return s.extraExercises||[]; return hasSnapshot(s)?snapshotList(s):allExercisesLive(item.iso,s); }
function setRowsForItem(item,sessionId,user){
  const s=item.s||{}; const rows=[];
  exercisesForItem(item).filter(e=>e.kind!=='run'&&e.kind!=='bike').forEach(e=>{
    const id=e.id||makeId(e.name+'-'+(e.kind||'')); const log=s.exercises&&s.exercises[id]; if(!log) return;
    const noLoad=noLoadExercise(e), timed=isTimedExercise(e);
    (log.sets||[]).forEach((set,i)=>{
      const reps=parseActualReps(set.actual||e.reps); const load=setLoadOf(e,set);
      rows.push({ user_id:user?user.id:null, session_id:sessionId, exercise_name:e.name+(set.side?` (${set.side==='G'?'gauche':'droite'})`:''), muscle_group:Object.entries(exerciseZoneWeights(e)).map(([z,w])=>`${z}:${w}`).join(', '), set_index:i+1, planned:`${e.sets} x ${e.reps}`, completed:Boolean(set.done), reps:timed?null:reps, duration_seconds:timed?reps:null, distance_km:null, load_kg:noLoad?null:(load||null), bodyweight_kg:(!noLoad&&e.bodyweight)?currentBodyWeight(item.iso):null, volume_kg:setVolume(e,set,item.iso)||null });
    });
  });
  return rows;
}
function parseActualReps(actual){ const m=String(actual||'').match(/\d+/); return m?Number(m[0]):null; }
function payloadForItem(item,user){
  const base=cloudSessionPayload(item.iso,item.s,user);
  if(item.kind!=='free') return base;
  return Object.assign(base,{local_id:item.localId,week_number:null,week_type:'Libre',day_label:'Libre',title:item.s.title||'Séance libre',session_type:'Séance libre',total_volume_kg:toNum(item.s.metrics&&item.s.metrics.volumeKg)||null,raw_data:item.s});
}
async function pushItem(item,user){
  const {data,error}=await sb().from('sessions').upsert(payloadForItem(item,user),{onConflict:'user_id,local_id'}).select('id').single();
  if(error) throw error; if(!data||!data.id) throw new Error('écriture de la séance non confirmée par le serveur');
  const rows=setRowsForItem(item,data.id,user);
  const del=await sb().from('exercise_sets').delete().eq('user_id',user.id).eq('session_id',data.id); if(del&&del.error) throw del.error;
  let inserted=0; if(rows.length){ const {data:ins,error:ie}=await sb().from('exercise_sets').insert(rows).select('id'); if(ie) throw ie; inserted=(ins||[]).length; }
  return {serverId:data.id,expected:rows.length,inserted};
}
/* Profil, objectifs, matériel, date de début du cycle, réglages… (table app_state, optionnelle) */
function appStatePayload(){ const o={}; Object.keys(state).forEach(k=>{ if(!['sessions','freeSessions','routine','bodyWeights','cloud'].includes(k)) o[k]=state[k]; }); return o; }
function isMissingTable(err){ const t=String((err&&(err.message||err.details||err.hint))||'')+' '+String(err&&err.code||''); return /42P01|PGRST205|does not exist|Could not find the table/i.test(t); }
async function syncAppStateToCloud(user){
  const {data,error}=await sb().from('app_state').upsert({user_id:user.id,data:appStatePayload(),updated_at:new Date().toISOString()},{onConflict:'user_id'}).select('user_id').single();
  if(error){ if(isMissingTable(error)){ state.cloud.appStateMissing=true; return 'missing'; } throw error; }
  state.cloud.appStateMissing=false; return data&&data.user_id?'ok':'unconfirmed';
}
async function syncLocalToCloud(setStatus=()=>{}, silent=false){
  if(!supabaseReady()) { if(!silent) setStatus(cloudUnavailableMsg()); return null; }
  const user = authUser || await getCloudUser();
  if(!user) { if(!silent) setStatus('Connecte-toi avant de synchroniser.'); return null; }
  cloudBusy=true; if(!silent) setStatus('Synchronisation en cours...');
  const inv=localSyncInventory();
  const rep={at:new Date().toISOString(),userId:user.id,eligible:inv.eligible.length,sessionsConfirmed:0,setsExpected:0,setsConfirmed:0,errors:[],appState:null};
  try{
    for(const item of inv.eligible){
      try{ const r=await pushItem(item,user); rep.sessionsConfirmed++; rep.setsExpected+=r.expected; rep.setsConfirmed+=r.inserted; if(r.inserted!==r.expected) rep.errors.push({id:item.localId,msg:`séries confirmées ${r.inserted}/${r.expected}`}); }
      catch(e){ rep.errors.push({id:item.localId,msg:String(e&&e.message||e)}); }
    }
    try{ await syncWeightsToCloud(user); }catch(e){ rep.errors.push({id:'poids',msg:String(e&&e.message||e)}); }
    try{ await syncRoutinesToCloud(user); }catch(e){ rep.errors.push({id:'routines',msg:String(e&&e.message||e)}); }
    try{ rep.appState=await syncAppStateToCloud(user); }catch(e){ rep.errors.push({id:'profil',msg:String(e&&e.message||e)}); }
    rep.ok=rep.errors.length===0&&rep.sessionsConfirmed===rep.eligible;
    state.cloud.lastReport=rep;
    state.cloud.status=rep.ok?`Synchronisé · ${rep.sessionsConfirmed}/${rep.eligible} séances et ${rep.setsConfirmed} séries confirmées par le serveur`:`Synchronisation incomplète : ${rep.errors.length} écart(s) — voir le diagnostic`;
    if(rep.ok) state.cloud.lastSync=rep.at;
    saveState({sync:false});
    if(!silent) setStatus(state.cloud.status+(rep.appState==='missing'?' · profil non sauvegardé (table app_state absente)':''));
    if(currentView==='settings') renderSettings();
    return rep;
  }finally{ cloudBusy=false; }
}
async function syncWeightsToCloud(user){
  const byDate={};
  (state.bodyWeights||[]).forEach(r=>{ if(r.date&&toNum(r.kg)) byDate[r.date]={user_id:user.id, measured_at:r.date, weight_kg:toNum(r.kg)}; });
  const rows=Object.values(byDate);
  if(rows.length){ const {error}=await window.supabaseClient.from('body_weights').upsert(rows,{onConflict:'user_id,measured_at'}); if(error) throw error; }
}
async function syncRoutinesToCloud(user){
  const entries=Object.entries(state.routine||{}).filter(([,v])=>Object.values(v||{}).some(Boolean));
  if(!entries.length) return;
  const rows=entries.map(([date,raw])=>({user_id:user.id,routine_date:date,completed:true,raw_data:raw}));
  // upsert d'abord (aucune suppression) ; repli sur l'ancien mode seulement si la contrainte unique n'existe pas
  const up=await sb().from('daily_routines').upsert(rows,{onConflict:'user_id,routine_date'});
  if(!up||!up.error) return;
  if(!/42P10|no unique|ON CONFLICT/i.test(String(up.error.message||'')+String(up.error.code||''))) throw up.error;
  const {error:de}=await sb().from('daily_routines').delete().eq('user_id',user.id); if(de) throw de;
  const {error}=await sb().from('daily_routines').insert(rows); if(error) throw error;
}
/* Suppression du compte cloud (exigence Google Play) : efface le compte Supabase et toutes ses données serveur.
   Les données du téléphone ne sont pas touchées. Nécessite ADD_SUPABASE_DELETE_ACCOUNT.sql (fonction serveur). */
async function deleteCloudAccount(setStatus=()=>{}, ask=true){
  if(!supabaseReady()) { setStatus(cloudUnavailableMsg()); return {ok:false}; }
  const user=authUser||await getCloudUser(); if(!user){ setStatus('Connecte-toi d\'abord au compte à supprimer.'); return {ok:false}; }
  if(ask){ if(!confirm(`Supprimer définitivement le compte ${user.email||''} et TOUTES ses données sur le serveur (séances, poids, routines, profil) ?\n\nTes données restent sur ce téléphone.`)) return {ok:false,cancelled:true};
    const t=prompt('Pour confirmer, écris SUPPRIMER'); if(String(t||'').trim().toUpperCase()!=='SUPPRIMER'){ setStatus('Suppression annulée.'); return {ok:false,cancelled:true}; } }
  setStatus('Suppression du compte…');
  const {error}=await sb().rpc('delete_my_account');
  if(error){ const missing=/PGRST202|Could not find the function|does not exist/i.test(String(error.message||'')+String(error.code||''));
    setStatus(missing?'La fonction de suppression n\'est pas encore installée côté serveur : exécute ADD_SUPABASE_DELETE_ACCOUNT.sql dans Supabase.':`Erreur : ${error.message||error}`); return {ok:false,missing}; }
  try{ await sb().auth.signOut(); }catch(e){}
  authUser=null; state.cloud=Object.assign({},state.cloud,{status:'Compte cloud supprimé',lastSync:null,lastReport:null,lastDiagnostic:null}); saveState({sync:false});
  setStatus('Compte cloud et données serveur supprimés. Tes données restent sur ce téléphone.'); if(currentView==='settings') renderSettings();
  return {ok:true};
}
async function fetchAllRows(table,cols,uid){ const out=[]; for(let from=0;;from+=1000){ const {data,error}=await sb().from(table).select(cols).eq('user_id',uid).range(from,from+999); if(error) throw error; out.push(...(data||[])); if(!data||data.length<1000) break; } return out; }
/* Diagnostic LECTURE SEULE : compare chaque séance éligible avec ce que le serveur contient réellement */
async function runSyncDiagnostic(){
  if(!supabaseReady()) return {error:cloudUnavailableMsg()};
  const user=authUser||await getCloudUser(); if(!user) return {error:'Connecte-toi pour lancer le diagnostic.'};
  const inv=localSyncInventory();
  const rows=await fetchAllRows('sessions','id,local_id,completed,updated_at,session_date,raw_data',user.id);
  const sets=await fetchAllRows('exercise_sets','session_id',user.id);
  const setCount={}; sets.forEach(r=>{ setCount[r.session_id]=(setCount[r.session_id]||0)+1; });
  const byLocal={}; rows.forEach(r=>{ byLocal[r.local_id]=r; });
  const out={at:new Date().toISOString(),user:{id:user.id,email:user.email||'',createdAt:user.created_at||'',provider:(user.app_metadata&&user.app_metadata.provider)||''},project:(typeof SUPABASE_URL!=='undefined'?String(SUPABASE_URL):'').replace(/^https?:\/\//,'').split('.')[0],
    local:{entries:inv.entries,empty:inv.empty,withData:inv.withData,completedPlanned:inv.completedPlanned,freeAll:inv.freeAll,freeDone:inv.freeDone,inProgress:inv.inProgress,eligible:inv.eligible.length},
    server:{rows:rows.length,completed:rows.filter(r=>r.completed).length,notCompleted:rows.filter(r=>!r.completed).length,sets:sets.length},
    confirmed:0,setsExpected:0,setsOnServer:0,missing:[],different:[],setsMismatch:[],legacy:[],orphans:[]};
  inv.eligible.forEach(item=>{
    const row=byLocal[item.localId]; const exp=setRowsForItem(item,null,null).length; out.setsExpected+=exp;
    if(!row){ out.missing.push(item.localId); return; }
    const onSrv=setCount[row.id]||0; out.setsOnServer+=onSrv;
    const same=contentHash(row.raw_data)===contentHash(item.s);
    if(!same) out.different.push(item.localId);
    if(onSrv!==exp) out.setsMismatch.push(`${item.localId} (${onSrv}/${exp})`);
    if(same&&onSrv===exp&&row.completed) out.confirmed++;
  });
  const eligIds=new Set(inv.eligible.map(x=>x.localId));
  rows.forEach(r=>{ if(eligIds.has(r.local_id)) return;
    const loc=String(r.local_id||'').startsWith('free-')?(state.freeSessions||{})[r.local_id]:(state.sessions||{})[r.local_id];
    const info={id:r.local_id,completed:!!r.completed,updatedAt:r.updated_at,local:loc?(loc.completed?'terminée en local':(meaningfulSession(loc)?'en cours en local':'vide en local')):'absente en local'};
    if(!r.completed) out.legacy.push(info); else out.orphans.push(info); });
  let app='inconnu'; try{ const {data,error}=await sb().from('app_state').select('updated_at').eq('user_id',user.id).maybeSingle(); app=error?(isMissingTable(error)?'table absente':'erreur'):(data?'sauvegardé le '+new Date(data.updated_at).toLocaleString('fr-FR'):'jamais sauvegardé'); }catch(e){}
  out.appState=app;
  out.ok=out.missing.length===0&&out.different.length===0&&out.setsMismatch.length===0&&out.confirmed===out.local.eligible;
  state.cloud.lastDiagnostic=Object.assign({},out); saveState({sync:false});
  return out;
}
function syncDiagnosticHtml(d){
  if(!d) return '';
  if(d.error) return `<p class="muted">${esc(d.error)}</p>`;
  const li=(arr,max=8)=>arr.length?`<ul class="instruction-list">${arr.slice(0,max).map(x=>`<li>${esc(typeof x==='string'?x:`${x.id} — ${x.local}${x.updatedAt?' · écrit le '+new Date(x.updatedAt).toLocaleDateString('fr-FR'):''}`)}</li>`).join('')}${arr.length>max?`<li>… et ${arr.length-max} autre(s)</li>`:''}</ul>`:'';
  return `<div class="sync-diag ${d.ok?'ok':'warn'}"><p class="eyebrow">Diagnostic de synchronisation · ${new Date(d.at).toLocaleString('fr-FR')}</p>
  <p><strong>${d.ok?'✔ Tout est confirmé côté serveur':'⚠ Des écarts sont à traiter'}</strong></p>
  <p class="muted">Compte : ${esc(d.user.email)}${d.user.provider?' ('+esc(d.user.provider)+')':''}<br>UUID : <code class="uuid">${esc(d.user.id)}</code><br>Projet Supabase : ${esc(d.project||'—')}</p>
  <div class="grid grid-2"><div class="stat"><small>Local</small><strong>${d.local.withData+d.local.freeAll}</strong><small>séances avec données (${d.local.entries} entrées de calendrier dont ${d.local.empty} vides, créées par la navigation)</small></div>
  <div class="stat"><small>Éligibles à l'envoi</small><strong>${d.local.eligible}</strong><small>${d.local.completedPlanned} planifiées + ${d.local.freeDone} libres terminées · ${d.local.inProgress} en cours (non envoyées par conception)</small></div>
  <div class="stat"><small>Sur le serveur</small><strong>${d.server.rows}</strong><small>${d.server.completed} terminées · ${d.server.notCompleted} non terminées</small></div>
  <div class="stat"><small>Confirmées identiques</small><strong>${d.confirmed} / ${d.local.eligible}</strong><small>contenu identique + toutes les séries</small></div></div>
  <p class="muted">Séries : ${d.setsOnServer} sur le serveur pour ${d.setsExpected} attendues · Profil & réglages : ${esc(d.appState)}</p>
  ${d.missing.length?`<p><strong>Absentes du serveur (${d.missing.length})</strong></p>${li(d.missing)}`:''}
  ${d.different.length?`<p><strong>Contenu différent (${d.different.length})</strong> — modifiées depuis le dernier envoi ou envoyées avant la v18.34 : une synchronisation les met à jour.</p>${li(d.different)}`:''}
  ${d.setsMismatch.length?`<p><strong>Séries incomplètes côté serveur (${d.setsMismatch.length})</strong></p>${li(d.setsMismatch)}`:''}
  ${d.legacy.length?`<p><strong>Lignes serveur non terminées (${d.legacy.length})</strong> — écrites par une ancienne version qui envoyait aussi les séances entamées ; la version actuelle ne les crée plus et ne les touche pas.</p>${li(d.legacy)}`:''}
  ${d.orphans.length?`<p><strong>Terminées sur le serveur mais pas éligibles en local (${d.orphans.length})</strong></p>${li(d.orphans)}`:''}
  <p class="muted" style="font-size:12px">Diagnostic en lecture seule : aucune donnée n'est modifiée ni supprimée. Les séries détaillées (côtés gauche/droite, réserve, remplacements…) sont intégralement contenues dans la copie complète de chaque séance (raw_data), comparée ici octet par octet.</p></div>`;
}
/* Restauration SÉCURISÉE : fusion (rien n'est supprimé ni écrasé), aperçu, sauvegarde préalable */
function planRestoreMerge(rows,weights,routines){
  const plan={add:[],same:0,conflicts:[],weightsAdd:[],routinesAdd:[]};
  (rows||[]).forEach(r=>{ const free=String(r.local_id||'').startsWith('free-'); const key=free?r.local_id:(r.local_id||r.session_date); const loc=free?(state.freeSessions||{})[key]:(state.sessions||{})[key];
    if(!r.raw_data) return;
    if(!loc||!meaningfulSession(loc)) plan.add.push({free,key,data:r.raw_data});
    else if(contentHash(loc)===contentHash(r.raw_data)) plan.same++;
    else plan.conflicts.push(key); });
  const have=new Set((state.bodyWeights||[]).map(w=>w.date));
  (weights||[]).forEach(w=>{ if(!have.has(w.measured_at)) plan.weightsAdd.push({date:w.measured_at,kg:Number(w.weight_kg)}); });
  (routines||[]).forEach(r=>{ if(!(state.routine||{})[r.routine_date]) plan.routinesAdd.push({date:r.routine_date,raw:r.raw_data||{}}); });
  return plan;
}
function planAppStateMerge(app){
  const out={full:false,tpl:[],moves:{},keys:[]}; if(!app||typeof app!=='object') return out;
  if(isNewInstall()&&!state.onboarded){ out.full=true; return out; }
  const have=new Set((state.userTemplates||[]).map(t=>t.id)); out.tpl=(app.userTemplates||[]).filter(t=>t&&t.id&&!have.has(t.id));
  if(!Object.keys(state.moves||{}).length) Object.entries(app.moves||{}).forEach(([d,m])=>{ const s=state.sessions&&state.sessions[d]; if(!(s&&s.completed)) out.moves[d]=m; });
  out.trophies=app.trophies||null;
  ['profile','equipment','resume','exerciseSwaps','uniOverrides'].forEach(k=>{ if((state[k]==null||(typeof state[k]==='object'&&!Object.keys(state[k]).length))&&app[k]!=null) out.keys.push(k); });
  return out;
}
function applyAppStateMerge(m,app){
  if(!app) return;
  if(m.full){ Object.keys(app).forEach(k=>{ if(!['migrations','cloud','newInstall'].includes(k)) state[k]=app[k]; }); if(!('newInstall' in app)) delete state.newInstall; return; }
  if(m.tpl.length) state.userTemplates=(state.userTemplates||[]).concat(m.tpl);
  if(Object.keys(m.moves).length){ state.moves=Object.assign({},m.moves); state.moveHistory=(app.moveHistory||[]).filter(op=>op.dates.every(d=>d in m.moves||!(d in (app.moves||{})))); }
  m.keys.forEach(k=>{ state[k]=app[k]; });
  if(m.trophies){ state.trophies=state.trophies||{}; Object.entries(m.trophies).forEach(([id,t])=>{ const c=state.trophies[id]; if(!c||t.tier>c.tier) state.trophies[id]=Object.assign({},t,{dates:Object.assign({},t.dates,c&&c.dates)}); }); }
}
function applyRestoreMerge(plan){
  state.sessions=state.sessions||{}; state.freeSessions=state.freeSessions||{}; state.routine=state.routine||{};
  plan.add.forEach(a=>{ if(a.free) state.freeSessions[a.key]=a.data; else state.sessions[a.key]=a.data; });
  if(plan.weightsAdd.length){ state.bodyWeights=(state.bodyWeights||[]).concat(plan.weightsAdd).sort((x,y)=>String(x.date).localeCompare(String(y.date))); }
  plan.routinesAdd.forEach(r=>{ state.routine[r.date]=r.raw; });
}
async function restoreFromCloud(setStatus=()=>{}){
  if(!supabaseReady()) return setStatus(cloudUnavailableMsg());
  const user = authUser || await getCloudUser();
  if(!user) return setStatus('Connecte-toi avant de restaurer.');
  cloudBusy=true; setStatus('Lecture de la sauvegarde cloud...');
  try{
    const rows=await fetchAllRows('sessions','local_id,session_date,completed,raw_data',user.id);
    const weights=await fetchAllRows('body_weights','measured_at,weight_kg',user.id);
    const routines=await fetchAllRows('daily_routines','routine_date,raw_data',user.id);
    const plan=planRestoreMerge(rows,weights,routines);
    let appData=null; try{ const {data,error}=await sb().from('app_state').select('data').eq('user_id',user.id).maybeSingle(); if(!error&&data) appData=data.data; }catch(e){}
    const am=planAppStateMerge(appData);
    const msg=`Restauration par FUSION (rien n'est supprimé ni remplacé sur ce téléphone) :\n• ${plan.add.length} séance(s) ajoutée(s)\n• ${plan.same} déjà identique(s)\n• ${plan.conflicts.length} différente(s) : la version du téléphone est conservée\n• ${plan.weightsAdd.length} pesée(s) et ${plan.routinesAdd.length} routine(s) ajoutée(s)${appData?(am.full?'\n• profil, objectifs, matériel, séances types et déplacements récupérés':`\n• ${am.tpl.length} séance(s) type et ${Object.keys(am.moves).length} déplacement(s) récupérés${am.keys.length?', '+am.keys.length+' réglage(s) manquant(s) complété(s)':''}`):''}\n\nUne sauvegarde complète du téléphone est faite avant. Continuer ?`;
    if(!confirm(msg)){ setStatus('Restauration annulée : rien n\'a changé.'); return plan; }
    try{ localStorage.setItem('sportTrackerAB.backup.preRestore', JSON.stringify(state)); }catch(e){}
    try{ exportJSON(); }catch(e){}
    applyRestoreMerge(plan); applyAppStateMerge(am,appData);
    state.cloud={...(state.cloud||{}),lastRestore:new Date().toISOString(),status:`Restauré (fusion) : +${plan.add.length} séance(s), ${plan.conflicts.length} conflit(s) gardé(s) en local`};
    saveState({sync:false}); setStatus(state.cloud.status); render();
    return plan;
  }catch(e){ console.error(e); setStatus(`Erreur restauration : ${e.message||e} — rien n'a été modifié.`); return null; }
  finally{ cloudBusy=false; }
}

function exportJSON(){ download(`sport-tracker-${isoToday()}.json`,JSON.stringify(state,null,2),'application/json'); }
function exportCSV(){ const head=['date','week','type','session','completed','strengthDurationSec','volumeKg','rpe','backPain','runKm','runDurationSec','runAvgSpeed','runPace','bikeKm','bikeDurationSec','bikeAvgSpeed','bodyWeightKg','notes']; const lines=[head]; Object.entries(state.sessions).sort().forEach(([iso,s])=>{ const p=planForDate(iso), m=s.metrics||{}; lines.push([iso,p.week,p.type,p.plan.title,s.completed,m.strengthDurationSec||'',m.volumeKg||sessionVolumeKg(iso),s.rpe||'',s.backPain||'',m.runDistanceKm||'',m.runDurationSec||'',m.runAvgSpeed||'',m.runPace||'',m.bikeDistanceKm||'',m.bikeDurationSec||'',m.bikeAvgSpeed||'',currentBodyWeight(iso),String(s.notes||'').replace(/\n/g,' ')]); }); download(`sport-tracker-${isoToday()}.csv`,lines.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n'),'text/csv'); }
function download(name,content,type){ const blob=new Blob([content],{type}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; a.click(); URL.revokeObjectURL(a.href); }
function importJSON(e){ const file=e.target.files[0]; if(!file) return; const reader=new FileReader(); reader.onload=()=>{ try{ state={...defaultState(),...JSON.parse(reader.result)}; saveState(); render(); alert('Sauvegarde importée.'); } catch{ alert('Fichier invalide.'); } }; reader.readAsText(file); }

function startEmom(rounds=10, seconds=60, label='EMOM', exid=null){
  clearInterval(emom.interval);
  clearInterval(timer.interval);
  emom={active:true, interval:null, totalRounds:Math.max(1,Number(rounds)||10), currentRound:1, remaining:Math.max(5,Number(seconds)||60), label, exid};
  const panel=$('#timer');
  if(panel) panel.classList.remove('hidden');
  updateEmomDisplay();
  beep();
  if(state.settings.vibration && navigator.vibrate) navigator.vibrate(120);
  emom.interval=setInterval(()=>{
    if(timer.paused) return;
    emom.remaining--;
    updateEmomDisplay();
    if(emom.remaining<=0){
      beep();
      if(state.settings.vibration && navigator.vibrate) navigator.vibrate([180,70,180]);
      markEmomMinuteDone(emom.currentRound-1);   // coche la minute qui vient de se terminer
      if(emom.currentRound>=emom.totalRounds){ finishEmom(); }
      else { emom.currentRound++; emom.remaining=Math.max(5,Number(seconds)||60); updateEmomDisplay(); }
    }
  },1000);
}
function markEmomMinuteDone(idx){
  if(!emom.exid || idx<0) return;
  const log = (typeof findExerciseLogById==='function') ? findExerciseLogById(emom.exid) : null;
  if(!log || !log.sets || !log.sets[idx]) return;
  const exEmom=(typeof exerciseById==='function')?exerciseById(emom.exid):null;
  if(exEmom && !String(log.sets[idx].actual||'').trim()){ const g=parseReps(exEmom.reps); if(g) log.sets[idx].actual=String(g); }
  if(!log.sets[idx].done){ log.sets[idx].done=true; }
  saveState();
  const card=document.querySelector(`.exercise-card[data-exid="${emom.exid}"]`);
  if(card){
    const row=card.querySelector(`.set-row[data-set="${idx}"]`);
    if(row){ const cb=row.querySelector('input[data-field="done"]'); if(cb) cb.checked=true; const ai=row.querySelector('input[data-field="actual"]'); if(ai && !ai.value && log.sets[idx].actual) ai.value=log.sets[idx].actual; row.classList.add('done'); }
    const badge=card.querySelector('.badge');
    if(badge){ const done=log.sets.filter(s=>s.done).length; badge.textContent=`${done}/${log.sets.length}`; badge.classList.toggle('done',done===log.sets.length); badge.classList.toggle('warn',done>0&&done<log.sets.length); }
  }
  refreshStickyProgress();
}
function updateEmomDisplay(){
  const label=$('#timerLabel'), time=$('#timerTime');
  if(label) label.textContent=`${emom.label} · minute ${emom.currentRound}/${emom.totalRounds}`;
  if(time) time.textContent=mmss(emom.remaining);
}
function finishEmom(){
  clearInterval(emom.interval);
  const exid=emom.exid;
  emom.active=false;
  const panel=$('#timer'); if(panel) panel.classList.add('hidden');
  if(exid){
    const card=document.querySelector(`.exercise-card[data-exid="${exid}"]`);
    const log=findExerciseLogById(exid);
    refreshStickyProgress();
    collapseCardDone(card,log);
  }
}
function shuffledIdx(n){ const a=[...Array(n).keys()]; for(let i=n-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function nextRestQuote(){
  const Q=window.QUOTES||[]; if(!Q.length) return null;
  if(!Array.isArray(state.quoteBag) || !state.quoteBag.length || state.quoteBagSize!==Q.length){ state.quoteBag=shuffledIdx(Q.length); state.quoteBagSize=Q.length; }
  const i=state.quoteBag.pop(); saveState({sync:false});
  return Q[i]||Q[0];
}
function restBarShow(on){ const r=$('#ubRest'), m=$('#ubMid'), b=$('#unifiedBar'); if(r) r.classList.toggle('hidden',!on); if(m) m.classList.toggle('hidden',!!on); if(b) b.classList.toggle('resting',!!on);
  const q=$('#restQuote');
  if(q){
    if(on && state.settings.restQuotes!==false){ const c=nextRestQuote(); if(c){ q.innerHTML=`« ${esc(c.t)} »<span class="rq-src"> — ${esc(c.s)}</span>`; q.classList.remove('hidden'); } }
    else q.classList.add('hidden');
  }
}
function startTimer(seconds,label='Repos'){ clearInterval(emom.interval); emom.active=false; clearInterval(timer.interval); timer={remaining:Number(seconds),interval:null,paused:false,label,endAt:Date.now()+Number(seconds)*1000}; const inBar = label==='Repos série' && $('#ubRest') && currentView==='session'; if(inBar){ const t=$('#ubRestTime'); if(t) t.textContent=mmss(seconds); restBarShow(true); $('#timer').classList.add('hidden'); } else { $('#timerLabel').textContent=label; $('#timerTime').textContent=mmss(seconds); $('#timer').classList.remove('hidden'); } timer.interval=setInterval(timerTick,1000); }
function timerTick(){ if(timer.paused) return; timer.remaining=Math.max(0,Math.ceil(((timer.endAt||Date.now())-Date.now())/1000)); const tt=$('#timerTime'); if(tt) tt.textContent=mmss(timer.remaining); const tb=$('#ubRestTime'); if(tb) tb.textContent=mmss(timer.remaining); const tf=$('#focusRestTime'); if(tf) tf.textContent=mmss(timer.remaining); if(timer.remaining<=0) finishTimer(); }
function timerAdd(sec){ if(!timer.interval) return; if(timer.paused) timer.remaining=Math.max(0,timer.remaining+sec); else timer.endAt=(timer.endAt||Date.now())+sec*1000; timerTick(); }
function finishTimer(){ clearInterval(timer.interval); timer.interval=null; timer.remaining=0; if(typeof focusIsOpen==='function'&&focusIsOpen()) setTimeout(renderFocus,0); $('#timer').classList.add('hidden'); restBarShow(false); beep(); if(state.settings.vibration && navigator.vibrate) navigator.vibrate([250,80,250]); }
function beep(){ if(state.settings.sound===false) return; try{ const AC=window.AudioContext||window.webkitAudioContext; if(!AC) return; const ctx=new AC(), now=ctx.currentTime, g=ctx.createGain(); g.gain.setValueAtTime(.0001,now); g.gain.exponentialRampToValueAtTime(.2,now+.02); g.gain.exponentialRampToValueAtTime(.0001,now+.7); g.connect(ctx.destination); [0,.22,.44].forEach(off=>{ const o=ctx.createOscillator(); o.frequency.value=880; o.connect(g); o.start(now+off); o.stop(now+off+.15); }); setTimeout(()=>ctx.close(),900); }catch(e){} }
$('#pauseTimer').onclick=()=>{ if(!timer.paused) timer.remaining=Math.max(0,Math.ceil(((timer.endAt||Date.now())-Date.now())/1000)); else timer.endAt=Date.now()+timer.remaining*1000; timer.paused=!timer.paused; $('#pauseTimer').textContent=timer.paused?'Reprendre':'Pause'; };
$('#skipTimer').onclick=()=>{ if(emom.active) finishEmom(); else finishTimer(); };
$$('.bottomnav button[data-view]').forEach(btn=>btn.onclick=()=>setView(btn.dataset.view));
$$('#moreSheet button[data-view]').forEach(btn=>btn.onclick=()=>setView(btn.dataset.view));
{ const tb=$('#trophiesBtn'); if(tb) tb.onclick=()=>{ const ms=$('#moreSheet'); if(ms) ms.classList.add('hidden'); openTrophies(); }; }
document.addEventListener('click', ev => { if (ev.target && ev.target.closest && ev.target.closest('#openTrophiesBtn')) openTrophies(); });
{ const lb=$('#libraryBtn'); if(lb) lb.onclick=()=>{ const ms=$('#moreSheet'); if(ms) ms.classList.add('hidden'); openLibrary(); }; }
{ const mt=$('#myTemplatesBtn'); if(mt) mt.onclick=()=>{ const ms=$('#moreSheet'); if(ms) ms.classList.add('hidden'); openTemplates(); }; }
{ const mb=$('#moreBtn'); if(mb) mb.onclick=()=>{ const ms=$('#moreSheet'); if(ms) ms.classList.remove('hidden'); }; }
{ const bb=$('#backBtn'); if(bb) bb.onclick=goBack; }
{ const mc=$('#moreClose'); if(mc) mc.onclick=()=>{ const ms=$('#moreSheet'); if(ms) ms.classList.add('hidden'); }; }
{ const ms=$('#moreSheet'); if(ms) ms.addEventListener('click', e=>{ if(e.target===ms) ms.classList.add('hidden'); }); }
window.addEventListener('resize',()=>{ if(currentView==='charts') drawCharts(); });
/* Clavier ouvert : la barre fixe remonte au-dessus des lignes de série et intercepte les taps.
   → On la masque pendant la saisie d'un champ texte de la séance, et la touche ✓/Entrée ferme le clavier. */
const KB_SEL='#session input[type="text"], #session input[type="number"], #session textarea';
document.addEventListener('focusin', e=>{ const t=e.target; if(t && t.matches && t.matches(KB_SEL)) document.body.classList.add('kb-open'); });
document.addEventListener('focusout', ()=>{ setTimeout(()=>{ const a=document.activeElement; if(!(a && a.matches && a.matches(KB_SEL))) document.body.classList.remove('kb-open'); },80); });
document.addEventListener('keydown', e=>{ if(e.key==='Enter' && e.target && e.target.matches && e.target.matches(KB_SEL)){ e.preventDefault(); e.target.blur(); } });
window.addEventListener('beforeinstallprompt',e=>{ e.preventDefault(); deferredInstallPrompt=e; $('#installBtn').classList.remove('hidden'); });
$('#installBtn').onclick=async()=>{ if(deferredInstallPrompt){ deferredInstallPrompt.prompt(); deferredInstallPrompt=null; $('#installBtn').classList.add('hidden'); } };
document.addEventListener('click', ev => { const mv = ev.target && ev.target.closest ? ev.target.closest('[data-moveday]') : null; if (mv) { ev.stopPropagation(); openMoveSheet(mv.dataset.moveday); } });
document.addEventListener('click', ev => { const c = ev.target && ev.target.closest ? ev.target.closest('[data-cap]') : null; if (c) openCapacitySheet(c.dataset.cap); });
document.addEventListener('click', ev => { const r = ev.target && ev.target.closest ? ev.target.closest('[data-reco]') : null; if (r) { if (r.dataset.reco === 'level') { setLevelFromReco(r.dataset.lvlkey, toNum(r.dataset.val)); } else setReco(r.dataset.key, r.dataset.reco); renderSession(); } const q = ev.target && ev.target.closest ? ev.target.closest('.rir-row [data-rir]') : null; if (q && !(ev.target.closest && ev.target.closest('#focusOverlay'))) { setRir(q.dataset.key, toNum(q.dataset.set), toNum(q.dataset.rir)); q.parentNode.querySelectorAll('.rir-chip').forEach(c => c.classList.toggle('active', c === q)); } });
document.addEventListener('click', ev => { const d = ev.target && ev.target.closest ? ev.target.closest('[data-dup]') : null; if (d) resolveCardioDup(d.dataset.iso, d.dataset.kind, d.dataset.free, d.dataset.dup); });
document.addEventListener('click', ev => { const b = ev.target && ev.target.closest ? ev.target.closest('[data-autoreg]') : null; if (!b) return; setAutoreg(b.dataset.iso || selectedDate, b.dataset.autoreg === 'apply'); });
if('serviceWorker' in navigator){
  const hadController = !!navigator.serviceWorker.controller;
  let swReloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if(hadController && !swReloaded){ swReloaded = true; location.reload(); } });
  navigator.serviceWorker.register('./service-worker.js').then(reg => { try{ reg.update(); }catch(e){} }).catch(()=>{});
}
var renderPlanningBase=renderPlanning; renderPlanning=function(){ renderPlanningBase(); if(runEngineActive()){ const root=$('#planning'); const f=root&&root.querySelector?root.querySelector('section.card'):null; if(f&&f.insertAdjacentHTML) f.insertAdjacentHTML('afterend',runPreviewHtml()); } };
render();
initCloud();

/* ===== Améliorations : progression auto, PR, prévention, dupliquer, flammes ===== */
function allCompletedSessions(){
  const planned = Object.entries(state.sessions||{}).filter(([iso,s])=>s&&s.completed).map(([iso,s])=>({iso,s}));
  const free = Object.values(state.freeSessions||{}).filter(s=>s&&s.completed).map(s=>({iso:s.date||isoToday(),s}));
  return [...planned,...free];
}
function plannedExercisesFor(iso,s){
  if(hasSnapshot(s)) return snapshotList(s);
  return plannedExercisesForLive(iso,s);
}
function plannedExercisesForLive(iso,s){
  if(s.freeMode) return (s.extraExercises||[]);
  const hidden=new Set(s.hiddenExercises||[]);
  const planned=(planForDate(iso).plan?.exercises||[]).filter(e=>!hidden.has(e.id||makeId(e.name+'-'+(e.kind||'')))).map(e=>(s.swaps||state.exerciseSwaps)?applySwap(e,iso,s):e);
  return [...planned,...(s.extraExercises||[])];
}
function topRange(repsStr){ const nums=String(repsStr||'').match(/\d+/g); return nums?Math.max(...nums.map(Number)):0; }
function cardioPlanHtml(kind){
  const exs=cardioExercises(kind); if(!exs.length) return '';
  const seen=new Set();
  const items=exs.map(e=>`<li><strong>${esc(e.sets)} x ${esc(e.reps)}</strong> — ${esc(e.target)}${e.restSec?` · récup ${esc(e.restSec)}s`:''}</li>`).filter(h=>{ if(seen.has(h)) return false; seen.add(h); return true; }).join('');
  const lbl = selectedDate===isoToday() ? "À faire aujourd'hui" : (selectedDate<isoToday() ? 'Prévu ce jour-là' : 'Prévu');
  return `<div class="metric-block" style="background:#0b1224;margin:0 0 12px"><p class="eyebrow">${lbl}</p><ul class="instruction-list" style="margin:0">${items}</ul></div>`;
}

/* --- Progression automatique --- */
function exerciseHistoryById(exId, beforeIso){
  return Object.entries(state.sessions||{})
    .filter(([iso,s])=>s&&s.completed&&iso<beforeIso&&s.exercises&&s.exercises[exId]&&(s.exercises[exId].sets||[]).some(x=>x.done))
    .sort((a,b)=>b[0].localeCompare(a[0]))
    .map(([iso,s])=>({iso,log:s.exercises[exId]}));
}
function progressionHint(e){
  const id=e.id||makeId(e.name+'-'+(e.kind||''));
  if(String(id).startsWith('free-')||e.kind==='run'||e.kind==='bike') return '';
  const hist=exerciseHistoryById(id, selectedDate);
  if(!hist.length) return '';
  const last=hist[0]; const done=(last.log.sets||[]).filter(s=>s.done);
  if(!done.length) return '';
  const reps=done.map(s=>parseReps(s.actual)||0);
  const top=topRange(e.reps); const minReps=Math.min(...reps);
  const enough=done.length>=Math.max(1,Number(e.sets||1));
  if(top>0 && minReps>=top && enough){
    if(e.bodyweight && !toNum(e.defaultLoad)) return `Objectif tenu le ${fmtDate(last.iso)} (${reps.join('/')}). Monte d'1-2 reps, ajoute une série, ou mets le gilet 10 kg.`;
    if(toNum(e.defaultLoad)>0) return `Objectif tenu le ${fmtDate(last.iso)}. Ajoute 1 rep/série ou un peu de charge.`;
    return `Objectif tenu le ${fmtDate(last.iso)}. Augmente légèrement la difficulté.`;
  }
  return `Dernière fois (${fmtDate(last.iso)}) : ${reps.join('/')} reps. ${(top||String(e.reps||'').trim())?` Vise le haut de la fourchette (${top||esc(e.reps)}).`:''}`;
}

/* --- Records personnels (PR) --- */
function computeRecords(){
  const recs={}; let runBest=null,bikeBest=null,runLong=0,bikeLong=0;
  allCompletedSessions().forEach(({iso,s})=>{
    plannedExercisesFor(iso,s).forEach(e=>{
      const timed=isTimedExercise(e);
      if(e.unknown||e.kind==='run'||e.kind==='bike'||e.kind==='activity'||(!timed&&noLoadExercise(e))) return;
      const id=e.id||makeId(e.name+'-'+(e.kind||''));
      const log=s.exercises&&s.exercises[id]; if(!log) return;
      (log.sets||[]).filter(x=>x.done).forEach(x=>{
        // Série cochée sans valeur saisie (ex : minutes EMOM auto-cochées) → borne basse de la prescription
        const reps=setRepsPerSide(x,parseReps(x.actual)||parseReps(e.reps)); if(!reps) return;
        const load=setLoadOf(e,x);
        const eff=e.bodyweight?currentBodyWeight(iso)+load:load;
        const vol=timed?0:eff*reps, oneRm=timed?0:eff*(1+reps/30);
        const rn=canonicalExerciseName(e.name);
        const r=recs[rn]||(recs[rn]={maxReps:0,maxRepsIso:'',oneRm:0,vol:0,timed:false});
        if(timed) r.timed=true;
        if(reps>r.maxReps){ r.maxReps=reps; r.maxRepsIso=iso; }
        if(oneRm>r.oneRm) r.oneRm=oneRm;
        if(vol>r.vol) r.vol=vol;
      });
    });
    const rk=toNum(s.metrics&&s.metrics.runDistanceKm),rs=toNum(s.metrics&&s.metrics.runDurationSec);
    if(rk>0&&rs>0){ const sp=rk/(rs/3600); if(!runBest||sp>runBest.sp) runBest={sp,iso,km:rk,sec:rs}; if(rk>runLong) runLong=rk; }
    const bk=toNum(s.metrics&&s.metrics.bikeDistanceKm),bs=toNum(s.metrics&&s.metrics.bikeDurationSec);
    if(bk>0&&bs>0){ const sp=bk/(bs/3600); if(!bikeBest||sp>bikeBest.sp) bikeBest={sp,iso,km:bk,sec:bs}; if(bk>bikeLong) bikeLong=bk; }
  });
  return {recs,runBest,bikeBest,runLong,bikeLong};
}
function recordsCardHtml(){
  const {recs,runBest,bikeBest,runLong,bikeLong}=computeRecords();
  const names=Object.keys(recs).sort();
  const rows=names.map(n=>`<tr><td>${esc(n)}</td><td>${recs[n].maxReps?recs[n].maxReps+(recs[n].timed?' s':''):'-'}</td><td>${recs[n].oneRm?formatDecimal(recs[n].oneRm,0)+' kg':'-'}</td><td>${recs[n].vol?formatDecimal(recs[n].vol,0)+' kg':'-'}</td></tr>`).join('');
  const cardio=[];
  if(runBest) cardio.push(`Course la plus rapide : ${formatDecimal(runBest.sp,2)} km/h (${pace(runBest.km,runBest.sec)}) le ${fmtDate(runBest.iso)}`);
  if(runLong) cardio.push(`Plus longue course : ${formatDecimal(runLong,2)} km`);
  if(bikeBest) cardio.push(`Vélo le plus rapide : ${formatDecimal(bikeBest.sp,2)} km/h le ${fmtDate(bikeBest.iso)}`);
  if(bikeLong) cardio.push(`Plus longue sortie vélo : ${formatDecimal(bikeLong,2)} km`);
  return `<section class="card"><div class="between"><div><p class="eyebrow">Records</p><h3>Tes meilleures performances</h3></div></div>${names.length?`<div style="overflow:auto"><table class="table"><thead><tr><th>Exercice</th><th>Reps max</th><th>1RM estimé</th><th>Volume série max</th></tr></thead><tbody>${rows}</tbody></table></div>`:'<p class="muted">Pas encore de record. Termine des séances pour en créer.</p>'}${cardio.length?`<ul class="instruction-list">${cardio.map(c=>`<li>${esc(c)}</li>`).join('')}</ul>`:''}</section>`;
}
function newPRMessage(iso){
  const {recs}=computeRecords();
  const hit=Object.keys(recs).find(n=>recs[n].maxRepsIso===iso && recs[n].maxReps>0);
  return hit?`Record reps ${hit} : ${recs[hit].maxReps}`:'';
}
function newPRList(iso){
  const {recs}=computeRecords();
  return Object.keys(recs).filter(n=>recs[n].maxRepsIso===iso && recs[n].maxReps>0).map(n=>`${n} : ${recs[n].maxReps} reps`);
}

/* --- Lot 5 : reprise après une pause (détection auto + plan progressif) --- */
function lastCompletedIso(){
  let m=null;
  Object.entries(state.sessions||{}).forEach(([iso,s])=>{ if(s&&s.completed&&(!m||iso>m)) m=iso; });
  Object.values(state.freeSessions||{}).forEach(s=>{ if(s&&s.completed&&s.date&&(!m||s.date>m)) m=s.date; });
  return m;
}
function daysBetween(isoA,isoB){ return Math.round((parseISO(isoB)-parseISO(isoA))/86400000); }
function detectResume(){
  if(state.resume && state.resume.startIso && daysBetween(state.resume.startIso,isoToday())>=state.resume.weeks*7){ state.resume=null; saveState({sync:false}); }
  if(state.resume) return;
  const last=lastCompletedIso(); if(!last) return;
  const gap=daysBetween(last,isoToday());
  if(gap>=7){
    const weeks=gap>=28?3:(gap>=14?2:1);
    state.resume={startIso:isoToday(),gapDays:gap,weeks,dismissed:false};
    saveState({sync:false});
  }
}
function resumeInfo(iso){
  const r=state.resume; if(!r||r.dismissed||!r.startIso) return null;
  const d=daysBetween(r.startIso,iso); if(d<0) return null;
  const phase=Math.floor(d/7)+1; if(phase>r.weeks) return null;
  const plans={1:[[0.85,-1]],2:[[0.7,-1],[0.85,-1]],3:[[0.7,-1],[0.8,-1],[0.9,0]]}[r.weeks]||[[0.85,-1]];
  const [loadFactor,setsDelta]=plans[Math.min(phase,plans.length)-1];
  return {phase,weeks:r.weeks,gapDays:r.gapDays,loadFactor,setsDelta,label:`reprise S${phase}/${r.weeks}`};
}
function resumeCardHtml(){
  const ri=resumeInfo(isoToday()); if(!ri) return '';
  return `<section class="card autoreg" id="resumeCard"><div class="between"><div><p class="eyebrow">Reprise</p><h3>${ri.gapDays>0?`Retour après ${ri.gapDays} jours`:"Démarrage progressif"}</h3></div><span class="badge warn">S${ri.phase}/${ri.weeks}</span></div><p class="muted">Plan de reprise actif : séries et charges réduites automatiquement dans tes séances (lignes « ↓ Ajusté »), retour à la normale en ${ri.weeks} semaine${ri.weeks>1?'s':''}. Pas de record ni d'intensité maximale cette semaine.</p><div class="footer-actions"><button class="small ghost" id="dismissResume" type="button">Je suis en forme, désactiver</button></div></section>`;
}

/* --- Lot 4 : autorégulation (check matinal -> ajustement séance/charges) --- */
function checkinFor(iso){ return (state.checkins||{})[iso]||null; }
function setCheckin(iso,metric,val){ state.checkins=state.checkins||{}; state.checkins[iso]=state.checkins[iso]||{}; state.checkins[iso][metric]=Number(val); state.checkins[iso].at=new Date().toISOString(); saveState({sync:false}); }
function adjustmentFor(iso){
  const base=checkinAdjustmentFor(iso);
  const ri=resumeInfo(iso);
  if(!ri) return base;
  const adv=[ri.gapDays>0?`Retour après ${ri.gapDays} j d'arrêt : semaine ${ri.phase}/${ri.weeks} de reprise.`:`Démarrage progressif : semaine ${ri.phase}/${ri.weeks}.`,
    ri.loadFactor<=0.7?'Charges ≈ −30 %, bas de fourchette, technique propre.':(ri.loadFactor<=0.8?'Charges ≈ −20 %, bas de fourchette.':(ri.loadFactor<0.95?'Charges ≈ −10/15 %, remonte en douceur.':'Volume quasi normal, écoute-toi.')),
    'Pas de record ni d\'intensité maximale.'];
  if(!base) return {level:'reprise',label:ri.label,score:null,painHigh:false,setsDelta:ri.setsDelta,loadFactor:ri.loadFactor,advice:adv,resume:ri};
  return {level:base.level==='ok'?'reprise':base.level,label:base.level==='ok'?ri.label:base.label+' + reprise',score:base.score,painHigh:base.painHigh,
    setsDelta:Math.min(base.setsDelta,ri.setsDelta),loadFactor:Math.min(base.loadFactor,ri.loadFactor),advice:adv.concat(base.advice),resume:ri};
}
function checkinAdjustmentFor(iso){
  const c=checkinFor(iso); if(!c||!c.sleep||!c.energy||!c.pain) return null;
  const score=Number(c.sleep)+Number(c.energy)+(6-Number(c.pain)); // 3..15
  const painHigh=Number(c.pain)>=4;
  let level='ok',label='feu vert',setsDelta=0,loadFactor=1;
  if(score<=5){ level='allege'; label='fatigue marquée'; setsDelta=-1; loadFactor=0.8; }
  else if(score<=8){ level='leger'; label='forme moyenne'; setsDelta=-1; loadFactor=0.9; }
  const advice=[];
  if(level==='leger') advice.push('Vise le bas des fourchettes de reps.','Retire 1 série sur les gros exercices.','Charges ≈ −10 %.');
  if(level==='allege') advice.push('Retire 1 série partout, bas de fourchette.','Charges ≈ −20 %, technique propre.','Remplace l\'explosif par du travail facile.','Cardio en endurance douce uniquement.');
  if(painHigh) advice.push('Douleur omoplates élevée : routine scapulaire d\'abord, évite ce qui tire au-dessus de la tête.');
  return {level,label,score,painHigh,setsDelta,loadFactor,advice};
}
function applyAutoreg(e, sess){
  const ar=sess&&sess.autoregApplied; if(!ar||!e||e.kind!=='strength'||e.maxTest) return e;
  const sets=Math.max(1,Number(e.sets||1)+toNum(ar.setsDelta));
  return Object.assign({},e,{sets,autoregApplied:ar.label||'ajustement'});
}
function setAutoreg(iso, on){
  const s=getSession(iso); const a=adjustmentFor(iso);
  if(on && a) s.autoregApplied={label:a.label,setsDelta:toNum(a.setsDelta),loadFactor:toNum(a.loadFactor)||1,at:new Date().toISOString()};
  else delete s.autoregApplied;
  saveState(); render();
}
function adjustedLineHtml(e){
  if(e.autoregApplied) return `<small class="muted" style="display:block;margin-top:4px;color:#22c55e">✓ Ajustement appliqué (${esc(e.autoregApplied)}) : ${esc(e.sets)} séries</small>`;
  const a=adjustmentFor(selectedDate);
  if(!a||a.level==='ok'||e.kind==='run'||e.kind==='bike') return '';
  const sets=Math.max(1,Number(e.sets||1)+a.setsDelta);
  const low=parseReps(e.reps)||'';
  const load=toNum(e.defaultLoad);
  const loadTxt=(load>0&&a.loadFactor<1)?` · ≈ ${formatDecimal(load*a.loadFactor,0)} kg`:'';
  return `<small class="muted" style="display:block;margin-top:4px;color:#fbbf24">↓ Ajusté (${esc(a.label)}) : ${sets} x ${low}${loadTxt}</small>`;
}
function autoregBannerHtml(iso){
  const a=adjustmentFor(iso);
  if(!a||(a.level==='ok'&&!a.painHigh)) return '';
  return `<section class="card autoreg ${a.level}"><div class="between"><div><p class="eyebrow">Autorégulation</p><h3>${a.level==='ok'?'Attention douleur':'Séance ajustée · '+esc(a.label)}</h3></div><span class="badge ${a.level==='ok'?'':'warn'}">${a.score?`${a.score}/15`:'↩ reprise'}</span></div><ul class="instruction-list">${a.advice.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>${a.level!=='ok'&&toNum(a.setsDelta)<0?(getSession(iso).autoregApplied?`<div class="footer-actions"><span class="badge done">✓ Appliqué à la séance</span><button class="ghost small" type="button" data-autoreg="undo" data-iso="${iso}">Annuler l'ajustement</button></div>`:`<div class="footer-actions"><button class="primary" type="button" data-autoreg="apply" data-iso="${iso}">Appliquer à la séance (${toNum(a.setsDelta)} série${toNum(a.setsDelta)<-1?'s':''} par exercice)</button></div>`):''}${iso===isoToday()?'<p class="muted">Modifiable depuis l\'onglet Aujourd\'hui.</p>':''}</section>`;
}
function checkinCardHtml(iso){
  const c=checkinFor(iso)||{};
  const a=adjustmentFor(iso);
  const row=(key,label,lowTxt,highTxt)=>`<div class="ck-row"><div><strong>${label}</strong><small class="muted" style="display:block">${lowTxt} → ${highTxt}</small></div><div class="ck-btns">${[1,2,3,4,5].map(v=>`<button type="button" class="ck ${Number(c[key])===v?'active':''}" data-ck="${key}" data-val="${v}">${v}</button>`).join('')}</div></div>`;
  let result='';
  if(a){
    const badge=a.level==='ok'?'<span class="badge done"><i class="dot done"></i>Feu vert</span>':(a.level==='leger'?'<span class="badge warn"><i class="dot part"></i>Allège un peu</span>':'<span class="badge warn"><i class="dot part"></i>Séance allégée</span>');
    result=`<div class="between" style="margin-top:10px">${badge}<span class="muted">${a.score}/15</span></div>${(a.level!=='ok'||a.painHigh)?`<p class="muted" style="margin-top:6px">${esc(a.advice[0]||'')}${a.advice.length>1?' Détails dans la séance.':''}</p>`:''}`;
  }
  return `<section class="card" id="checkinCard"><div class="between"><div><p class="eyebrow">Check matinal</p><h3>Forme du jour</h3></div></div>${row('sleep','😴 Sommeil','mauvais','excellent')}${row('energy','⚡ Énergie','à plat','en forme')}${row('pain','🎯 Douleur omoplates','aucune','forte')}${result}</section>`;
}
function bindCheckin(){
  $$('#checkinCard .ck').forEach(b=>b.onclick=()=>{ setCheckin(isoToday(),b.dataset.ck,b.dataset.val); renderToday(); });
}

/* --- Lot 3 : mini-fiche exercice (ⓘ) --- */
function gradeInfoFor(name){
  const f=gradeFamilies().find(f=>f.match(name)); if(!f) return null;
  const {recs}=computeRecords();
  let best=toNum(profileLevel()[f.key])||0; Object.keys(recs).forEach(n=>{ if(f.match(n)) best=Math.max(best,toNum(recs[n].maxReps)); });
  const gi=gradeFor(best,f.steps);
  return {f,best,gi,grade:GRADE_NAMES[gi],next:gi<f.steps.length?f.steps[gi]:null,pct:Math.min(100,Math.round((best/Math.max(1,f.goalReps))*100))};
}
function exerciseHistoryByName(name,count=8){
  const rows=[];
  allCompletedSessions().forEach(({iso,s})=>{
    plannedExercisesFor(iso,s).forEach(e=>{
      if(canonicalExerciseName(e.name)!==canonicalExerciseName(name)||e.kind==='run'||e.kind==='bike') return;
      const id=e.id||makeId(e.name+'-'+(e.kind||''));
      const log=s.exercises&&s.exercises[id]; if(!log) return;
      const done=(log.sets||[]).filter(x=>x.done); if(!done.length) return;
      rows.push({iso,sets:done.map(x=>({reps:setRepsPerSide(x,parseReps(x.actual)||parseReps(e.reps)),load:setLoadOf(e,x)}))});
    });
  });
  return rows.sort((a,b)=>b.iso.localeCompare(a.iso)).slice(0,count);
}
const GEAR_LABELS=[['pullupBar','Barre de traction'],['dipStation','Station de dips'],['vest','Gilet lesté'],['trainer','Home trainer'],['bike','Vélo (extérieur)'],['bands','Élastiques'],['bench','Banc'],['abWheel','Roulette abdo'],['trx','TRX / anneaux'],['jumpRope','Corde à sauter'],['parallettes','Parallettes'],['sliders','Sliders / serviette'],['step','Marche / step']];
function openGearOverride(iso){
  const s=getSession(iso);
  const ov=s.equipmentOverride||{};
  const base=Object.assign({},baseEquipment(),state.equipment||{});
  const cur=Object.assign({},base,ov);
  const presets=`<div class="move-actions" style="margin:8px 0"><button class="ghost small" type="button" data-govpreset="salle">🏋️ Je suis à la salle</button><button class="ghost small" type="button" data-govpreset="rien">🧳 Sans matériel</button></div>`;
  const rows=GEAR_LABELS.map(([k,lbl])=>`<label class="between" style="padding:8px 0;border-top:1px solid var(--line)"><span>${lbl}</span><select data-govr="${k}"><option value="true" ${cur[k]?'selected':''}>Dispo</option><option value="false" ${!cur[k]?'selected':''}>Absent</option></select></label>`).join('');
  const o=document.createElement('div');
  o.className='sheet-overlay';
  o.innerHTML=`<div class="sheet"><div class="between"><div><h3 style="margin:0">🧳 Matériel du jour</h3><p class="muted" style="margin:2px 0 0">Uniquement pour la séance du ${fmtDate(iso)} — tes réglages habituels ne changent pas.</p></div><button class="ghost small" type="button" data-close>✕</button></div>${presets}<label style="margin-top:10px"><span>Kettlebells dispo (kg, vide si aucune)</span><input id="govrKb" type="text" inputmode="decimal" value="${cur.kettlebells.join(', ')}"></label>${rows}<div class="footer-actions" style="margin-top:12px"><button class="primary" id="govrApply" type="button">Adapter la séance</button><button class="ghost" id="govrClear" type="button">Matériel habituel</button></div></div>`;
  document.body.appendChild(o);
  const close=()=>o.remove();
  pushOverlay(close);
  o.querySelector('[data-close]').onclick=requestCloseOverlay;
  o.addEventListener('click',ev=>{ if(ev.target===o) requestCloseOverlay(); });
  o.querySelectorAll('[data-govpreset]').forEach(b=>b.onclick=()=>{ s.equipmentOverride=b.dataset.govpreset==='salle'?gymPreset(base):Object.assign({},EMPTY_EQUIPMENT); saveState(); requestCloseOverlay(); renderSession(); prToast(b.dataset.govpreset==='salle'?'Séance adaptée à la salle ✔':'Séance adaptée sans matériel ✔'); });
  o.querySelector('#govrApply').onclick=()=>{
    const before=activeExercisesForSession(iso).map(e=>e.name).join('|');
    const next={};
    o.querySelectorAll('[data-govr]').forEach(sel=>{ const k=sel.dataset.govr; const v=sel.value==='true'; if(v!==base[k]) next[k]=v; });
    const kbTxt=String(o.querySelector('#govrKb').value||'');
    const kbs=kbTxt.split(/[,;]+/).map(x=>parseFloat(String(x).trim().replace(',','.'))).filter(x=>x>0).sort((a,b)=>a-b);
    if(kbs.join(',')!==base.kettlebells.join(',')) next.kettlebells=kbs;
    s.equipmentOverride=Object.keys(next).length?next:null;
    saveState({sync:false});
    renderSession();
    requestCloseOverlay();
    const after=activeExercisesForSession(iso).map(e=>e.name).join('|');
    const msg=document.createElement('div'); msg.className='toast';
    msg.textContent = !s.equipmentOverride ? 'Matériel habituel rétabli.' : (after!==before ? 'Séance adaptée à ton matériel du jour ✔' : 'Rien à adapter : cette séance n\'utilise pas ce matériel.');
    document.body.appendChild(msg); setTimeout(()=>msg.remove(),2600);
  };
  o.querySelector('#govrClear').onclick=()=>{ s.equipmentOverride=null; saveState({sync:false}); renderSession(); requestCloseOverlay(); };
}
function openExerciseSheet(exid){
  if(!exid) return;
  const e=exerciseById(exid); if(!e) return;
  const {recs}=computeRecords(); const r=recs[e.name];
  const gi=gradeInfoFor(e.name);
  const hist=exerciseHistoryByName(e.name);
  const recHtml=r&&r.maxReps?`<p class="muted" style="margin:10px 0 0">🏆 Record : <strong style="color:var(--text)">${r.maxReps} ${r.timed?'s':'reps'}</strong>${r.maxRepsIso?` le ${fmtDate(r.maxRepsIso)}`:''}${r.oneRm?` · 1RM estimé ${formatDecimal(r.oneRm,0)} kg`:''}</p>`:'<p class="muted" style="margin:10px 0 0">Pas encore de record.</p>';
  const gradeHtml=gi?`<div class="between" style="margin-top:10px"><span class="badge ${gi.gi>=4?'done':(gi.gi>=2?'warn':'')}">${esc(gi.grade)}</span><span class="muted">${gi.pct} % de l'objectif (${gi.best}/${gi.f.goalReps})</span></div><div class="progressbar" style="margin:8px 0"><span style="width:${gi.best?Math.max(gi.pct,3):0}%"></span></div><p class="muted">${gi.next?`Prochain palier : ${gi.next} reps (${GRADE_NAMES[Math.min(gi.gi+1,GRADE_NAMES.length-1)]}).`:'Palier maximal atteint.'}<br>Échelle : ${esc(gi.f.ladder)}.</p>`:'';
  const timedEx=isTimedExercise(e);
  const histHtml=hist.length?hist.map(h=>{ const loads=[...new Set(h.sets.map(s=>s.load).filter(l=>l>0))]; return `<div class="between" style="padding:8px 0;border-top:1px solid var(--line)"><span class="muted">${fmtDate(h.iso)}</span><strong>${h.sets.map(s=>s.reps).join(' / ')}${timedEx?' s':''}${loads.length?` <span class="muted">@ ${loads.join('/')} kg</span>`:''}</strong></div>`; }).join(''):'<p class="muted">Pas encore d\'historique sur cet exercice.</p>';
  const rdx=repdbFor(e); const illusHtml=rdx?`${repdbPicsHtml(rdx,130)}<p class="muted" style="margin:6px 0 0">${esc(rdx.desc)}</p><p class="muted" style="font-size:11px;margin:2px 0 0">${esc(REPDB_CREDIT)}</p>`:'';
  const ser=exerciseSeries(e.name).slice(-12);
  const useE1=ser.length&&!ser[0].timed&&!ser[0].bodyweight&&ser.some(x=>x.bestLoad>0);
  const val=x=>useE1?Math.round(x.e1):x.bestReps; const unitC=useE1?'kg':(timedEx?'s':'reps');
  const tr=windowTrend(exerciseSeries(e.name),val);
  const chartHtml=ser.length>=2?`<p class="eyebrow" style="margin-top:14px">Évolution · ${useE1?'1RM estimé (meilleure série)':(timedEx?'meilleure durée':'meilleure série')}</p><canvas class="chart" id="exChart"></canvas><div class="cap-foot">${trendBadge(tr,useE1?' kg':(timedEx?' s':''))}<span class="muted">${ser.length} séances</span></div>`:'';
  const o=document.createElement('div');
  o.className='sheet-overlay';
  o.innerHTML=`<div class="sheet"><div class="between"><div><h3 style="margin:0">${esc(e.name)}</h3><p class="muted" style="margin:2px 0 0">${esc(e.target||'')}</p></div><button class="ghost small" type="button" data-close>✕</button></div>${illusHtml}${recHtml}${gradeHtml}${chartHtml}<p class="eyebrow" style="margin-top:14px">Dernières séances</p>${histHtml}</div>`;
  document.body.appendChild(o);
  if(ser.length>=2) setTimeout(()=>drawLine('exChart',ser.map(x=>x.iso.slice(5)),ser.map(val),unitC),30);
  const close=()=>o.remove();
  pushOverlay(close);
  o.querySelector('[data-close]').onclick=requestCloseOverlay;
  o.addEventListener('click',ev=>{ if(ev.target===o) requestCloseOverlay(); });
}

/* ===================== v18.39 : tableau de bord des capacités + graphiques par exercice ===================== */
function familyHistory(key){
  const f=GRADE_FAMILIES_DEF.find(x=>x.key===key); if(!f) return []; const by={};
  allCompletedSessions().forEach(({iso,s})=>{ const exs=s.freeMode?(s.extraExercises||[]):plannedExercisesFor(iso,s);
    exs.forEach(x=>{ if(x.unknown||!f.match(x.name)) return; const log=s.exercises&&s.exercises[x.id||makeId(x.name+'-'+(x.kind||''))]; if(!log) return;
      (log.sets||[]).filter(z=>z.done).forEach(z=>{ const r=setRepsPerSide(z,parseReps(z.actual)||0); if(!r) return; const cur=by[iso]||(by[iso]={iso,best:0,test:false});
        if(r>cur.best){ cur.best=r; cur.test=!!x.maxTest; } else if(r===cur.best&&x.maxTest) cur.test=true; }); }); });
  return Object.values(by).sort((a,b)=>a.iso.localeCompare(b.iso));
}
function exerciseSeries(name){
  const cn=canonicalExerciseName(name); const by={};
  allCompletedSessions().forEach(({iso,s})=>{ const exs=s.freeMode?(s.extraExercises||[]):plannedExercisesFor(iso,s);
    exs.filter(x=>!x.unknown&&canonicalExerciseName(x.name)===cn).forEach(x=>{ const log=s.exercises&&s.exercises[x.id||makeId(x.name+'-'+(x.kind||''))]; if(!log) return;
      (log.sets||[]).filter(z=>z.done).forEach(z=>{ const r=setRepsPerSide(z,parseReps(z.actual)||0); if(!r) return; const ld=setLoadOf(x,z); const eff=x.bodyweight?currentBodyWeight(iso)+ld:ld;
        const c=by[iso]||(by[iso]={iso,bestReps:0,bestLoad:0,e1:0,vol:0,timed:isTimedExercise(x),bodyweight:!!x.bodyweight});
        c.bestReps=Math.max(c.bestReps,r); c.bestLoad=Math.max(c.bestLoad,ld); if(!c.timed){ c.e1=Math.max(c.e1,eff*(1+r/30)); c.vol+=eff*r; } }); }); });
  return Object.values(by).sort((a,b)=>a.iso.localeCompare(b.iso));
}
/* Tendance descriptive : meilleur des 28 derniers jours contre les 28 précédents (pas une prédiction) */
function windowTrend(series,valueOf,days=28){
  const today=isoToday(); const a=localISO(addDays(parseISO(today),-days)), b=localISO(addDays(parseISO(today),-2*days));
  const cur=series.filter(x=>x.iso>a).map(valueOf), prev=series.filter(x=>x.iso>b&&x.iso<=a).map(valueOf);
  if(!cur.length) return {cur:null,prev:prev.length?Math.max(...prev):null,dir:'none'};
  const c=Math.max(...cur); if(!prev.length) return {cur:c,prev:null,dir:'new'};
  const p=Math.max(...prev); return {cur:c,prev:p,dir:c>p?'up':(c<p?'down':'flat'),delta:Math.round((c-p)*10)/10};
}
function trendBadge(t,unit){ unit=unit||''; if(t.dir==='up') return `<span class="cap-trend up">↑ +${t.delta}${unit} sur 4 sem.</span>`; if(t.dir==='down') return `<span class="cap-trend down">↓ ${t.delta}${unit} sur 4 sem.</span>`; if(t.dir==='flat') return '<span class="cap-trend">→ stable sur 4 sem.</span>'; if(t.dir==='new') return '<span class="cap-trend">nouveau repère</span>'; return '<span class="cap-trend muted">pas de séance sur 4 sem.</span>'; }
function sparkSvg(vals,opts){ const o=Object.assign({w:120,h:34},opts); const v=(vals||[]).filter(x=>isFinite(x)); if(v.length<2) return '';
  const mn=Math.min(...v), mx=Math.max(...v), sp=(mx-mn)||1; const pts=v.map((x,i)=>`${(i*(o.w-4)/(v.length-1)+2).toFixed(1)},${(o.h-3-(x-mn)/sp*(o.h-6)).toFixed(1)}`);
  const last=pts[pts.length-1].split(',');
  return `<svg class="spark" viewBox="0 0 ${o.w} ${o.h}" width="${o.w}" height="${o.h}" role="img" aria-label="Évolution : ${v[0]} → ${v[v.length-1]}"><polyline fill="none" stroke="#38bdf8" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" points="${pts.join(' ')}"/><circle cx="${last[0]}" cy="${last[1]}" r="3" fill="#22c55e"/></svg>`; }
/* Temps équivalent sur une distance pour un indice VDOT donné (recherche par dichotomie, méthode de Daniels) */
function predictRaceSec(vdot,km){ let lo=km*120, hi=km*720; for(let k=0;k<60;k++){ const mid=(lo+hi)/2; if(vdotFrom(km,mid)>vdot) lo=mid; else hi=mid; } return Math.round((lo+hi)/2); }
function weeklySeries(weeks,valueForRange){ const out=[]; const mon=mondayOf(parseISO(isoToday())); for(let w=weeks-1;w>=0;w--){ const from=localISO(addDays(mon,-7*w)); const to=localISO(addDays(parseISO(from),6)); out.push({from,val:valueForRange(from,to)}); } return out; }
function runSessionsDone(){ // sorties réellement faites (distance + temps), toutes sources
  const out=[];
  Object.entries(state.sessions||{}).forEach(([d,s])=>{ if(!s||!s.completed) return; const m=s.metrics||{}; const km=toNum(m.runDistanceKm), sec=toNum(m.runDurationSec); if(km>0) out.push({iso:d,km,sec,rpe:toNum(s.rpe),hard:toNum(s.rpe)>=8||(Array.isArray(s.planSnapshot)&&s.planSnapshot.some(e=>e.kind==='run'&&/intervalle|seuil|allure marathon|tempo/i.test(e.target||'')))}); });
  Object.values(state.freeSessions||{}).forEach(f=>{ if(!f||!f.completed) return; const m=f.metrics||{}; const km=toNum(m.runDistanceKm), sec=toNum(m.runDurationSec); if(km>0) out.push({iso:f.date,km,sec,rpe:toNum(f.rpe),hard:toNum(f.rpe)>=8}); });
  const seen=new Set(); return out.filter(o=>{ const k=o.iso+'|'+o.km+'|'+o.sec; if(seen.has(k)) return false; seen.add(k); return true; }).sort((a,b)=>a.iso.localeCompare(b.iso));
}
function runDistanceRecords(){ const runs=runSessionsDone().filter(r=>r.sec>0); return RUN_DISTANCES.map(([d,l])=>{ const c=runs.filter(r=>Math.abs(r.km-d)/d<=0.03); if(!c.length) return {d,l,best:null}; const b=c.reduce((x,y)=>(y.sec/y.km<x.sec/x.km?y:x)); return {d,l,best:b,timeFor:Math.round(b.sec/b.km*d)}; }); }
function plannedKmForWeek(mon){ let km=0; for(let i=0;i<7;i++){ const iso=localISO(addDays(parseISO(mon),i)); const pl=planForDate(iso).plan; pl.exercises.filter(e=>e.kind==='run').forEach(e=>{ const r=String(e.reps||''); const n=(r.match(/\d+(?:[.,]\d+)?/g)||[]).map(x=>parseFloat(x.replace(',','.'))); if(!n.length) return; const avg=n.reduce((a,b)=>a+b,0)/n.length; const sets=Math.max(1,Number(e.sets||1)); if(/km/.test(r)) km+=avg*sets; else if(/min/.test(r)) km+=avg*sets/easyPaceMin(); else if(/\bm\b/.test(r)) km+=avg*sets/1000; }); } return Math.round(km*10)/10; }
function runStatsCardHtml(){
  if(!runEnabled()) return '';
  const runs=runSessionsDone(); const monNow=mondayOf(parseISO(isoToday()));
  const weeks=Array.from({length:8},(_,k)=>{ const mon=localISO(addDays(monNow,-7*(7-k))); const to=localISO(addDays(parseISO(mon),6)); const wr=runs.filter(r=>r.iso>=mon&&r.iso<=to); return {mon,done:Math.round(wr.reduce((a,r)=>a+r.km,0)*10)/10,longest:wr.length?Math.max(...wr.map(r=>r.km)):0,plan:runEngineActive()?plannedKmForWeek(mon):null}; });
  const mx=Math.max(1,...weeks.map(w=>Math.max(w.done,w.plan||0)));
  const bars=`<div class="wkbars">${weeks.map(w=>`<div class="wkbar" title="Semaine du ${fmtDate(w.mon)}"><div class="wkbar-col">${w.plan!=null?`<span class="plan" style="height:${Math.round(w.plan/mx*100)}%"></span>`:''}<span class="done" style="height:${Math.round(w.done/mx*100)}%"></span></div><small>${formatDecimal(w.done,0)}</small></div>`).join('')}</div><p class="muted" style="font-size:12px;margin:4px 0 10px">Km par semaine (8 semaines)${runEngineActive()?' · contour : prévu par le plan':''}.</p>`;
  const lim=localISO(addDays(monNow,-28)); const last=runs.filter(r=>r.iso>=lim); const hard=last.filter(r=>r.hard).length; const easyPct=last.length?Math.round((last.length-hard)/last.length*100):null;
  const rs=runEngineStatus(); const reg=rs?rs.log.slice(-8):[];
  const recs=runDistanceRecords().filter(r=>r.best);
  return `<section class="card"><p class="eyebrow">Course</p><h3>Ta course en chiffres</h3>${bars}
  <div class="grid grid-2"><div class="stat"><small>Facile / intense (4 sem.)</small><strong>${easyPct==null?'—':easyPct+' % / '+(100-easyPct)+' %'}</strong><small>Repère courant : environ 80 % de sorties faciles</small></div>
  <div class="stat"><small>Sortie la plus longue</small>${sparkSvg(weeks.map(w=>w.longest))||'<strong>—</strong>'}<small>${weeks[weeks.length-1].longest?formatDecimal(weeks[weeks.length-1].longest,1)+' km cette semaine':'par semaine, 8 semaines'}</small></div></div>
  ${reg.length?`<p class="muted" style="margin:10px 0 4px">Régularité (semaines du plan) :</p><div class="regdots">${reg.map(x=>`<span class="reg-${x==='validée'?'ok':(x==='manquée'?'ko':'mid')}" title="${esc(x)}"></span>`).join('')}</div>`:''}
  <p class="eyebrow" style="margin-top:12px">Records par distance</p>${recs.length?recs.map(r=>`<div class="between" style="padding:6px 0;border-top:1px solid var(--line)"><span>${esc(r.l)}</span><strong>${esc(hms(r.timeFor))} <small class="muted">${fmtDate(r.best.iso)}</small></strong></div>`).join(''):'<p class="muted">Aucune sortie sur une distance de référence (5, 10, 21,1 ou 42,2 km, à ±3 %) pour l\'instant.</p>'}</section>`;
}
function fmtDur(sec){ sec=Math.round(toNum(sec)); return sec>=3600?hms(sec):mmss(sec); }
/* Ce que la personne a DÉJÀ couru : sa distance max récente, sa plus longue sortie des 8 dernières semaines, ou sa course de référence */
function runDistanceCapacity(){
  const rp=(state.profile&&state.profile.runProfile)||{}; const rr=state.profile&&state.profile.runRef;
  const lim=localISO(addDays(parseISO(isoToday()),-56)); const runs=cardioOutings().filter(o=>o.type==='run'&&o.iso>=lim);
  return Math.max(toNum(rp.maxRecentKm), runs.length?Math.max(...runs.map(o=>o.km)):0, rr&&toNum(rr.km)?toNum(rr.km):0);
}
function capacitiesHtml(){
  const goals=profileGoals(), lvl=profileLevel();
  const pillar=GRADE_FAMILIES_DEF.map(f=>{ const h=familyHistory(f.key); const level=toNum(lvl[f.key]); const goal=toNum(goals[f.key]); const pct=goal?Math.min(100,Math.round(level/goal*100)):0;
    const t=windowTrend(h,x=>x.best); const lastTest=h.filter(x=>x.test).pop();
    return `<button type="button" class="cap-card" data-cap="${f.key}"><div class="between"><strong>${esc(f.label)}</strong>${sparkSvg(h.slice(-12).map(x=>x.best))}</div><div class="cap-main"><span class="cap-val">${level||'—'}</span><span class="muted">/ ${goal||'—'} reps</span></div><div class="progressbar"><span style="width:${level?Math.max(3,pct):0}%"></span></div><div class="cap-foot">${trendBadge(t,'')}<span class="muted">${lastTest?'test '+fmtDate(lastTest.iso):''}</span></div></button>`; }).join('');
  const outs=cardioOutings(); const kmW=ty=>weeklySeries(12,(a,b)=>Math.round(outs.filter(o=>o.type===ty&&o.iso>=a&&o.iso<=b).reduce((s,o)=>s+o.km,0)*10)/10);
  const pc=runPaces(); const goalRun=toNum(goals.run10kMin);
  const runW=kmW('run'); const run4=runW.slice(-4).reduce((s,x)=>s+x.val,0)/4;
  const rp=(state.profile&&state.profile.runProfile)||{}; const tKm=toNum(rp.targetKm)||(isNewInstall()?0:10);
  const goalSec=toNum(rp.targetTimeSec)||(tKm===10&&goalRun?goalRun*60:0);
  const eq10=pc&&tKm?predictRaceSec(pc.vdot,tKm):0;
  const rs=runEngineStatus(); const capKm=runDistanceCapacity(); const fk=x=>formatDecimal(x,x%1?1:0);
  const distMode=tKm&&capKm<tKm; // distance pas encore acquise : c'est elle qu'on suit
  let nextStep=''; if(rs){ try{ const pv=runPreviewData(1); const l=pv&&pv.weeks[0]&&pv.weeks[0].long; if(l) nextStep=`Cette semaine : sortie longue ${fk(l)} km`; }catch(e){} }
  const head=`🏃 ${tKm?fk(tKm)+' km':'Course'}${goalSec?' en '+esc(mmss(goalSec)):''}`;
  const main=distMode
    ? `<div class="cap-main"><span class="cap-val">${fk(capKm||0)} km</span><span class="muted">/ ${fk(tKm)} km</span></div><div class="progressbar"><span style="width:${Math.max(3,Math.min(100,Math.round((capKm||0)/tKm*100)))}%"></span></div><p class="cap-note">Distance déjà courue / distance visée.${eq10&&goalSec?` Temps estimé sur ${fk(tKm)} km une fois la distance acquise : ≈ ${esc(mmss(eq10))}.`:''}</p>`
    : `<div class="cap-main"><span class="cap-val">${eq10?'≈ '+esc(mmss(eq10)):'—'}</span><span class="muted">${goalSec?'/ '+esc(mmss(goalSec))+' visé':(tKm?'· finir':'· objectif à définir')}</span></div><div class="progressbar"><span style="width:${eq10&&goalSec?Math.max(3,Math.min(100,Math.round(goalSec/eq10*100))):0}%"></span></div><p class="cap-note">${eq10?`Ton temps estimé sur ${fk(tKm)} km, d'après ta course de référence.`:'Ajoute une course de référence (Objectifs → Ton niveau actuel) pour estimer ton temps.'}</p>`;
  const volTxt=run4>0?`${formatDecimal(run4,1)} km par semaine en moyenne (4 sem.)`:'Aucune sortie enregistrée pour l\'instant';
  const planTxt=rs?`<span class="muted" style="display:block;font-size:12px">Plan « ${esc(RUN_PLAN_LABEL[rs.type])} » · ${rs.L} semaine${rs.L>1?'s':''} validée${rs.L>1?'s':''}${rs.b.raceDate&&rs.b.raceDate>=isoToday()?` · course dans ${daysBetween(isoToday(),rs.b.raceDate)} j`:''}${nextStep?'<br>'+esc(nextStep):''}</span>`:'';
  const hasRuns=runW.some(x=>x.val>0);
  const runCard=`<button type="button" class="cap-card" data-cap="run"><div class="between"><strong>${head}</strong>${hasRuns?sparkSvg(runW.map(x=>x.val)):''}</div>${main}<div class="cap-foot"><span class="cap-trend">${volTxt}</span></div>${planTxt}</button>`;
  const ftp=ftpValue(); const bw=currentBodyWeight(isoToday());
  const bikeH=weeklySeries(12,(a,b)=>{ let sec=0; const seen=new Set(); allCompletedSessions().forEach(({iso,s})=>{ if(iso<a||iso>b) return; const m=s.metrics||{}; const k=iso+'|'+toNum(m.bikeDistanceKm); if(toNum(m.bikeDurationSec)>0&&!seen.has(k)&&!(s.cardioStatus&&s.cardioStatus.bike==='skipped')&&!(s.cardioCleared&&s.cardioCleared.bike)){ seen.add(k); sec+=toNum(m.bikeDurationSec); } }); return Math.round(sec/360)/10; });
  const bike4=bikeH.slice(-4).reduce((s,x)=>s+x.val,0)/4;
  const bikeCard=`<button type="button" class="cap-card" data-cap="bike"><div class="between"><strong>🚴 Vélo</strong>${sparkSvg(bikeH.map(x=>x.val))}</div><div class="cap-main"><span class="cap-val">${ftp||'—'}</span><span class="muted">W FTP${ftp&&bw?' · '+formatDecimal(ftp/bw,2)+' W/kg':''}</span></div><div class="cap-foot"><span class="cap-trend">${formatDecimal(bike4,1)} h/sem. (4 sem.)</span><span class="muted">objectif ${toNum(goals.bikeKmh)||'—'} km/h</span></div></button>`;
  const rope=exerciseSeries('Corde à sauter'); const ropeCard=rope.length?(()=>{ const t=windowTrend(rope,x=>x.bestReps); return `<button type="button" class="cap-card" data-cap="rope"><div class="between"><strong>🪢 Corde</strong>${sparkSvg(rope.slice(-12).map(x=>x.bestReps))}</div><div class="cap-main"><span class="cap-val">${rope[rope.length-1].bestReps}</span><span class="muted">s par intervalle</span></div><div class="cap-foot">${trendBadge(t,' s')}</div></button>`; })():'';
  const cards=(strengthEnabled()?pillar:'')+(runEnabled()?runCard:'')+(disciplines().bike!==false&&disciplines().bike?bikeCard:'')+ropeCard;
  if(!cards) return `<section class="card"><p class="eyebrow">Capacités</p><p class="muted">Choisis tes sports dans Objectifs pour voir où tu en es.</p></section>`;
  return `<section class="card"><p class="eyebrow">Capacités</p><h2>Où tu en es</h2><p class="muted">Niveau actuel face à l'objectif. Touche une carte pour le détail et la courbe.</p><div class="cap-grid">${cards}</div></section>`;
}
function openCapacitySheet(key){
  let title='', chart=null, body='';
  if(GRADE_FAMILIES_DEF.some(f=>f.key===key)){ const f=GRADE_FAMILIES_DEF.find(x=>x.key===key); const h=familyHistory(key); const lvl=toNum(profileLevel()[key]), goal=toNum(profileGoals()[key]);
    title=f.label; chart={labels:h.slice(-20).map(x=>x.iso.slice(5)),vals:h.slice(-20).map(x=>x.best),unit:'reps'};
    body=`<p class="muted">Niveau <strong style="color:var(--text)">${lvl||'—'}</strong> · objectif <strong style="color:var(--text)">${goal||'—'}</strong>${lvl&&goal?` · reste ${Math.max(0,goal-lvl)} reps`:''}. La courbe montre ta meilleure série par séance ; 🎯 = test de max.</p>${h.length?h.slice(-8).reverse().map(x=>`<div class="between" style="padding:6px 0;border-top:1px solid var(--line)"><span class="muted">${fmtDate(x.iso)}</span><strong>${x.best} reps${x.test?' 🎯':''}</strong></div>`).join(''):'<p class="muted">Pas encore de séance sur ce mouvement.</p>'}`; }
  else if(key==='run'){ const outs=cardioOutings(); const w=weeklySeries(12,(a,b)=>Math.round(outs.filter(o=>o.type==='run'&&o.iso>=a&&o.iso<=b).reduce((s,o)=>s+o.km,0)*10)/10); const pc=runPaces();
    const rp2=(state.profile&&state.profile.runProfile)||{}; const tK=toNum(rp2.targetKm)||(isNewInstall()?0:10); const fk=x=>formatDecimal(x,x%1?1:0); const capKm=runDistanceCapacity();
    title=tK?`Course · objectif ${fk(tK)} km${toNum(rp2.targetTimeSec)?' en '+mmss(rp2.targetTimeSec):''}`:'Course'; chart={labels:w.map(x=>x.from.slice(5)),vals:w.map(x=>x.val),unit:'km/sem.'};
    body=`<p class="muted">${tK?`Distance déjà courue : <strong style="color:var(--text)">${fk(capKm||0)} km</strong> sur ${fk(tK)} km visés.<br>`:''}${pc?`Ta référence : ${formatDecimal(pc.ref.km,1)} km en ${esc(fmtDur(pc.ref.sec))}.${tK?` Temps estimé sur ${fk(tK)} km : ≈ ${esc(mmss(predictRaceSec(pc.vdot,tK)))}.`:''}<br><small>Indice de forme (VDOT) : ${formatDecimal(pc.vdot,1)} — il sert à calculer tes allures d'entraînement.</small>`:'Ajoute une course de référence dans Objectifs pour estimer ton temps et tes allures.'}</p>${w.some(x=>x.val>0)?'<p class="muted">Courbe : kilomètres par semaine (12 semaines).</p>':'<p class="muted">La courbe de tes kilomètres apparaîtra dès tes premières sorties enregistrées.</p>'}`; }
  else if(key==='bike'){ title='Vélo'; const ftp=ftpValue(); const outs=cardioOutings(); const w=weeklySeries(12,(a,b)=>Math.round(outs.filter(o=>o.type==='bike'&&o.iso>=a&&o.iso<=b).reduce((s,o)=>s+o.km,0)));
    chart={labels:w.map(x=>x.from.slice(5)),vals:w.map(x=>x.val),unit:'km/sem.'}; body=`<p class="muted">FTP ${ftp?ftp+' W':'non renseignée'}. Courbe : kilomètres par semaine. Refais un test FTP toutes les 6 à 8 semaines pour garder des zones justes.</p>`; }
  else if(key==='rope'){ const r=exerciseSeries('Corde à sauter'); title='Corde à sauter'; chart={labels:r.slice(-20).map(x=>x.iso.slice(5)),vals:r.slice(-20).map(x=>x.bestReps),unit:'s'}; body='<p class="muted">Meilleur intervalle par séance, en secondes.</p>'; }
  else return;
  const o=document.createElement('div'); o.className='sheet-overlay';
  o.innerHTML=`<div class="sheet"><div class="between"><h3 style="margin:0">${esc(title)}</h3><button class="ghost small" type="button" data-close>✕</button></div>${chart&&chart.vals.length>=2?'<canvas class="chart" id="capChart"></canvas>':''}${body}</div>`;
  document.body.appendChild(o); const close=()=>o.remove(); pushOverlay(close);
  o.querySelector('[data-close]').onclick=requestCloseOverlay; o.addEventListener('click',ev=>{ if(ev.target===o) requestCloseOverlay(); });
  if(chart&&chart.vals.length>=2) setTimeout(()=>drawLine('capChart',chart.labels,chart.vals,chart.unit),30);
}
/* --- Prévention blessures (charge aiguë/chronique + douleur) --- */
function freeVolumeOn(iso){
  let v=0;
  Object.values(state.freeSessions||{}).forEach(f=>{ if(f&&f.completed&&f.date===iso){ (f.extraExercises||[]).forEach(e=>{ if(e.kind==='run'||e.kind==='bike'||noLoadExercise(e)) return; const log=f.exercises&&f.exercises[e.id||makeId(e.name+'-'+(e.kind||''))]; if(!log) return; (log.sets||[]).forEach(s=>{ if(!s.done) return; const reps=parseReps(s.actual)||parseReps(e.reps); if(!reps) return; const load=toNum(s.load||e.defaultLoad); const eff=e.bodyweight?currentBodyWeight(iso)+load:load; v+=eff*reps; }); }); } });
  return v;
}
function dailyLoad(iso){
  const s=state.sessions[iso]; let load=0;
  if(s){ load+=sessionVolumeKg(iso)/100; const c=cardioEffort(s,iso); load+=c.run+c.bike; }
  load+=freeVolumeOn(iso)/100;
  return load;
}
function loadStats(){
  const today=parseISO(isoToday()); let acute=0,chronic=0;
  for(let i=0;i<28;i++){ const iso=localISO(addDays(today,-i)); const l=dailyLoad(iso); chronic+=l; if(i<7) acute+=l; }
  const chronicWeekly=chronic/4; const ratio=chronicWeekly>0?acute/chronicWeekly:0;
  const firsts=allCompletedSessions().map(x=>x.iso).sort(); const historyDays=firsts.length?daysBetween(firsts[0],isoToday())+1:0;
  let weeksWithLoad=0; for(let w=0;w<4;w++){ let l=0; for(let k=0;k<7;k++) l+=dailyLoad(localISO(addDays(today,-(w*7+k)))); if(l>0) weeksWithLoad++; }
  return {acute,chronicWeekly,ratio,historyDays,weeksWithLoad,enough:historyDays>=21&&weeksWithLoad>=3};
}
function painTrend(){
  const today=parseISO(isoToday()); const recent=[],prev=[];
  for(let i=0;i<14;i++){ const iso=localISO(addDays(today,-i)); const s=state.sessions[iso]; const p=s?toNum(s.backPain):0; if(s&&s.completed&&p){ (i<7?recent:prev).push(p); } }
  const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0;
  return {recent:avg(recent),prev:avg(prev)};
}
function preventionCardHtml(){
  const {acute,chronicWeekly,ratio,historyDays,enough}=loadStats(); const pain=painTrend();
  let status='Charge stable par rapport à tes 4 dernières semaines.', cls='done';
  if(!enough||chronicWeekly<0.1){ status=`Historique encore trop court pour comparer (${Math.min(historyDays,21)}/21 jours, 3 semaines actives). La comparaison s'activera automatiquement.`; cls=''; }
  else if(ratio>1.5 && resumeInfo(isoToday())){ status='Charge en forte hausse — normal après une pause. Suis le plan de reprise, ne rattrape pas les séances manquées.'; cls='warn'; }
  else if(ratio>1.5){ status='Charge nettement plus élevée que ta moyenne des 4 dernières semaines : augmente plutôt progressivement.'; cls='warn'; }
  else if(ratio>1.3){ status='Charge en hausse. Surveille la fatigue et le sommeil.'; cls='warn'; }
  else if(ratio>0 && ratio<0.7){ status='Charge en baisse (récupération ou affûtage).'; cls=''; }
  let painNote='';
  if(pain.recent>pain.prev+1 && pain.recent>=3) painNote=' Douleur omoplates en hausse : allège le haut du corps et insiste sur la routine dos.';
  return `<section class="card"><div class="between"><div><p class="eyebrow">Charge & prévention</p><h3>Suivi de la charge</h3></div><span class="badge ${cls}">${(enough&&chronicWeekly>=0.1)?'× '+formatDecimal(ratio,2)+' vs moyenne':'Données insuffisantes'}</span></div><p class="muted">${esc(status)}${esc(painNote)}</p><p class="muted" style="font-size:12px">Indicateur descriptif de ta charge, pas une prédiction de blessure.</p><div class="computed"><span>7 derniers jours : <strong>${formatDecimal(acute,0)}</strong></span><span>Moyenne 4 sem. : <strong>${formatDecimal(chronicWeekly,0)}</strong></span>${pain.recent?`<span>Douleur récente : <strong>${formatDecimal(pain.recent,1)}/10</strong></span>`:''}</div></section>`;
}

/* --- Flammes / streak + motivation --- */
function plannedTrainingDays(baseMonday){ return Array.from({length:7},(_,i)=>localISO(addDays(baseMonday,i))).filter(iso=>!isRestDay(planForDate(iso).plan)).length; }
function weekValidated(baseMonday){ const goal=Math.max(1,plannedTrainingDays(baseMonday)-1); return weeklyStats(baseMonday).doneSessions>=goal; }
function weekActive(m){ return weeklyStats(m).doneSessions>=1; }
function currentStreak(){ let streak=0; const cur=mondayOf(parseISO(isoToday())); if(weekActive(cur)) streak++; for(let i=1;i<104;i++){ const wm=mondayOf(addDays(cur,-7*i)); if(weekActive(wm)) streak++; else break; } return streak; }
function fullWeekStreak(){ let streak=0; const cur=mondayOf(parseISO(isoToday())); if(weekValidated(cur)) streak++; for(let i=1;i<104;i++){ const wm=mondayOf(addDays(cur,-7*i)); if(weekValidated(wm)) streak++; else break; } return streak; }
function weekAdherence(){ const m=mondayOf(parseISO(isoToday())); const planned=plannedTrainingDays(m); const done=weeklyStats(m).doneSessions; return {done,planned,pct:planned?Math.round(done/planned*100):0}; }
function motivationMessage(){
  const a=weekAdherence();
  if(!a.planned) return 'Profite de ta semaine !';
  if(a.pct>=100) return 'Semaine parfaite, continue comme ça !';
  if(a.pct>=70){ const left=Math.max(0,Math.max(1,a.planned-1)-a.done); return left>0?`Plus que ${left} séance(s) pour valider ta semaine.`:'Belle semaine, encore un effort !'; }
  if(a.pct>=40) return 'Bon début, accroche-toi cette semaine.';
  return 'Nouvelle semaine : lance-toi, une séance à la fois.';
}
function streakCardHtml(){
  const streak=currentStreak(); const full=fullWeekStreak(); const a=weekAdherence();
  const flame=streak>0?'🔥':'·';
  return `<section class="card"><div class="between"><div><p class="eyebrow">Régularité</p><h2>${flame} ${streak} semaine${streak>1?'s':''} d'affilée</h2><p class="muted">≥ 1 séance/sem. · Semaines complètes : ${full} d'affilée</p></div><span class="badge ${a.pct>=100?'done':(a.pct>=70?'warn':'')}">${a.done}/${a.planned} cette semaine</span></div><div class="progressbar"><span style="width:${Math.min(100,a.pct)}%"></span></div><p class="muted">${esc(motivationMessage())}</p></section>`;
}
function renderTodayExtras(){ const root=$('#today'); if(!root) return; const iso=isoToday();
  detectResume();
  if(!state.onboarded && (isNewInstall() || !lastCompletedIso())){
    const first0=root.querySelector('section.card');
    if(first0) first0.insertAdjacentHTML('beforebegin', `<section class="card" id="onboardCard"><p class="eyebrow">Bienvenue 👋</p><h3>Construisons ton programme</h3><p class="muted">Dis-nous ce que tu veux réussir et ce que tu sais faire aujourd'hui : quelques questions, une minute. Rien n'est présélectionné.</p><div class="footer-actions"><button class="primary" id="onboardStart" type="button">Commencer</button>${isNewInstall()?'':'<button class="ghost" id="onboardDone" type="button">Plus tard</button>'}</div></section>`);
    const ost=$('#onboardStart'); if(ost) ost.onclick=()=>openOnboarding();
    if(isNewInstall()&&!onbAutoShown){ onbAutoShown=true; setTimeout(()=>{ if(!state.onboarded) openOnboarding(); },400); }
    $$('#onboardCard [data-goto]').forEach(b=>b.onclick=()=>setView(b.dataset.goto));
    const od=$('#onboardDone'); if(od) od.onclick=()=>{ state.onboarded=true; saveState({sync:false}); renderToday(); };
  }
  const ti=targetInfo();
  const capHtml=ti?(ti.passed?`<section class="card"><div class="between"><div><p class="eyebrow">Cap</p><h3>🎯 Date objectif atteinte</h3></div><span class="badge warn">${fmtDate(ti.date)}</span></div><p class="muted">Fais le bilan dans Stats et fixe un nouveau cap dans Objectifs.</p></section>`:`<section class="card"><div class="between"><div><p class="eyebrow">Cap</p><h3>🎯 Objectifs dans ${ti.weeksLeft} semaine${ti.weeksLeft>1?'s':''}</h3></div><span class="badge">${fmtDate(ti.date)}</span></div></section>`):'';
  const kNow=blockIndexFor(iso); let repHtml='';
  if(kNow>0&&weekInBlock(weekIndexFor(iso))===1&&!(state.blockReportSeen&&state.blockReportSeen[kNow-1])) repHtml=blockReportHtml(blockReport(kNow-1),true);
  const first=root.querySelector('section.card'); if(first) first.insertAdjacentHTML('afterend', repHtml+capHtml+resumeCardHtml()+checkinCardHtml(iso));
  const dbr=$('#dismissBlockReport'); if(dbr) dbr.onclick=()=>{ state.blockReportSeen=Object.assign({},state.blockReportSeen,{[kNow-1]:true}); saveState({sync:false}); renderToday(); };
  const dr=$('#dismissResume'); if(dr) dr.onclick=()=>{ if(state.resume){ state.resume.dismissed=true; saveState({sync:false}); } renderToday(); };
  const frees=Object.entries(state.freeSessions||{}).filter(([,s])=>s && (s.date===iso));
  let freeHtml='';
  if(frees.length){ freeHtml='<section class="card"><p class="eyebrow">Séances libres du jour</p>'+frees.map(([id,s])=>{ const n=(s.extraExercises||[]).length; return `<div class="between" style="padding:10px 0;border-top:1px solid var(--line)"><div><strong>${esc(s.title||'Séance libre')}</strong><p class="muted">${n} exercice(s) · <i class="dot ${s.completed?'done':'part'}"></i>${s.completed?'terminée':'en cours'}</p></div><button class="ghost" data-openfree="${esc(id)}" type="button">Ouvrir</button></div>`; }).join('')+'</section>'; }
  root.insertAdjacentHTML('beforeend', freeHtml+streakCardHtml()+preventionCardHtml());
  bindCheckin();
  $$('#today [data-openfree]').forEach(b=>b.onclick=()=>{ selectedFreeId=b.dataset.openfree; const s=state.freeSessions[selectedFreeId]; selectedDate=(s&&s.date)||isoToday(); setView('session'); });
}

/* --- Dupliquer une séance --- */
function completedSessionOptions(){
  const list=[];
  Object.entries(state.sessions||{}).forEach(([iso,s])=>{ if(s&&s.completed) list.push({key:iso,iso,label:`${fmtDate(iso)} · ${planForDate(iso).plan.title}`,at:s.completedAt||iso}); });
  Object.entries(state.freeSessions||{}).forEach(([id,s])=>{ if(s&&s.completed) list.push({key:'free:'+id,iso:s.date||isoToday(),label:`${fmtDate(s.date||isoToday())} · ${s.title||'Séance libre'} (libre)`,at:s.completedAt||s.date||''}); });
  return list.sort((a,b)=>String(b.at).localeCompare(String(a.at))).slice(0,40);
}
function duplicateControlHtml(){
  const opts=completedSessionOptions();
  if(!opts.length) return '';
  return `<div class="grid grid-4" style="margin-top:10px"><label style="grid-column:span 3"><span>Dupliquer une séance déjà faite</span><select id="dupSelect">${opts.map(o=>`<option value="${esc(o.key)}">${esc(o.label)}</option>`).join('')}</select></label><div style="align-self:end"><button class="ghost" id="dupBtn" type="button">Dupliquer</button></div></div>`;
}
function duplicateSession(key){
  if(!key) return;
  let src,srcIso;
  if(key.startsWith('free:')){ const id=key.slice(5); src=state.freeSessions[id]; srcIso=src&&src.date; }
  else { src=state.sessions[key]; srcIso=key; }
  if(!src) return;
  const list=plannedExercisesFor(srcIso,src).filter(e=>e.kind!=='run'&&e.kind!=='bike');
  const fs=newFreeSession('Copie · '+(src.freeMode?(src.title||'Séance libre'):planForDate(srcIso).plan.title));
  fs.extraExercises=list.map(e=>{
    const exId=e.id||makeId(e.name+'-'+(e.kind||''));
    const log=src.exercises&&src.exercises[exId];
    const lastLoad=log&&log.sets&&log.sets.length?toNum(log.sets[0].load||e.defaultLoad):toNum(e.defaultLoad);
    return {...e, id:'free-'+Math.random().toString(36).slice(2), defaultLoad:lastLoad};
  });
  const id='free-'+Date.now();
  state.freeSessions[id]=fs; selectedFreeId=id; selectedDate=fs.date; saveState(); setView('session');
}
