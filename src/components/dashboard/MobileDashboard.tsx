import { useEffect, useState } from "react";
import { listenToChecklistItems } from "../../services/checklistService";
import { listenToPreparationTask } from "../../services/preparationService";
import { preparationParticipants, preparationTasks } from "../../data/preparationData";
import type { PreparationTaskDefinition, PreparationTaskState, Screen, SharedChecklistItem } from "../../types";
type Props = { onNavigate: (screen: Screen) => void };
const tripStartDate = new Date("2026-07-12T00:00:00");
function startOfDay(d: Date){return new Date(d.getFullYear(),d.getMonth(),d.getDate())}
function daysUntil(){return Math.max(Math.ceil((startOfDay(tripStartDate).getTime()-startOfDay(new Date()).getTime())/(1000*60*60*24)),0)}
function toneForTask(task: PreparationTaskDefinition, state: PreparationTaskState){ if(task.mode==="group") return state.groupDone?"ready":"pending"; const done=preparationParticipants.filter(p=>state.participants?.[p.id]).length; return done===preparationParticipants.length?"ready":done>0?"progress":"pending"; }
function Visual({tone}:{tone:string}){return <div className={`visualProgress ${tone}`}><span /></div>}
function listTone(items: SharedChecklistItem[]){return items.length>0&&items.every(i=>i.done)?"ready":items.some(i=>i.done)?"progress":"pending"}
function MobileDashboard({onNavigate}:Props){
 const [packing,setPacking]=useState<SharedChecklistItem[]>([]); const [shopping,setShopping]=useState<SharedChecklistItem[]>([]); const [prep,setPrep]=useState<Record<string,PreparationTaskState>>({});
 useEffect(()=>{const u=[listenToChecklistItems("packing",setPacking,()=>undefined),listenToChecklistItems("shopping",setShopping,()=>undefined),...preparationTasks.map(t=>listenToPreparationTask(t.id,s=>setPrep(c=>({...c,[t.id]:s})),()=>undefined))];return()=>u.forEach(x=>x())},[])
 const tones=preparationTasks.map(t=>toneForTask(t, prep[t.id]??{taskId:t.id})); const prepTone=tones.every(t=>t==="ready")?"ready":tones.some(t=>t!=="pending")?"progress":"pending";
 return <section className="mobileDashboard homeExperience"><div className="tripHero countdownHero"><div><span className="heroEyebrow">Dolomites 2026</span><h2>מתכוננים לטיול</h2><p>עוד {daysUntil()} ימים יוצאים לדולומיטים</p></div><div className="countdownPill"><strong>{daysUntil()}</strong><span>ימים</span></div></div><button className={`homeCard preparationOverview ${prepTone}`} onClick={()=>onNavigate("preparations")}><div className="cardHeaderLine"><h3>מצב ההכנות</h3><span>{prepTone==="ready"?"מוכנים":prepTone==="progress"?"בתהליך":"להתחיל"}</span></div><Visual tone={prepTone}/><div className="prepOverviewList">{preparationTasks.map(t=><div key={t.id}><span>{t.icon}</span><strong>{t.title}</strong><Visual tone={toneForTask(t, prep[t.id]??{taskId:t.id})}/></div>)}</div></button><div className="homeCard"><h3>רשימות</h3><div className="miniStatusGrid"><button className={`miniStatusCard ${listTone(packing)}`} onClick={()=>onNavigate("packing")}><span>🎒</span><strong>ציוד קבוצתי</strong><Visual tone={listTone(packing)}/></button><button className={`miniStatusCard ${listTone(shopping)}`} onClick={()=>onNavigate("shopping")}><span>🛒</span><strong>קניות</strong><Visual tone={listTone(shopping)}/></button></div></div><div className="homeCard"><h3>האירועים הקרובים</h3><div className="nextEvents"><span>✈️ 12.7 · טיסה למילאנו</span><span>🏨 12.7 · Hotel La Nuova Rotaia</span><span>🚗 13.7 · איסוף רכב במלפנסה</span></div></div></section>
}
export default MobileDashboard;
