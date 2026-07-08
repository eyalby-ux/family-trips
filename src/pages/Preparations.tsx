import { useEffect, useState } from "react";
import { preparationParticipants, preparationTasks } from "../data/preparationData";
import { listenToPreparationTask, savePreparationTaskState } from "../services/preparationService";
import type { PreparationTaskDefinition, PreparationTaskState } from "../types";
function getTaskTone(task: PreparationTaskDefinition, state: PreparationTaskState) { if (task.mode === "group") return state.groupDone ? "ready" : "pending"; const done = preparationParticipants.filter((p) => state.participants?.[p.id]).length; if (done === preparationParticipants.length) return "ready"; if (done > 0) return "progress"; return "pending"; }
function Visual({ tone }: { tone: string }) { return <div className={`visualProgress ${tone}`}><span /></div>; }
function TaskCard({ task, state }: { task: PreparationTaskDefinition; state: PreparationTaskState }) {
  const [open, setOpen] = useState(false); const [fields, setFields] = useState<Record<string,string>>(state.fields ?? {});
  useEffect(() => setFields(state.fields ?? {}), [state.fields]);
  return <article className={`prepTaskCard ${getTaskTone(task,state)}`}>
    <button className="prepTaskSummary" onClick={() => setOpen(!open)}><span className="prepTaskIcon">{task.icon}</span><div><strong>{task.title}</strong><small>{task.description}</small><Visual tone={getTaskTone(task,state)} /></div><span className="compactArrow">›</span></button>
    {open && <div className="prepTaskDetails">
      {task.mode === "group" && <button className="prepDoneButton" onClick={() => savePreparationTaskState(task.id, { groupDone: !state.groupDone })}>{state.groupDone ? "✅ אושר" : "⬜ סמן כאושר"}</button>}
      {task.mode === "perParticipant" && <div className="participantChecklist">{preparationParticipants.map((p) => <button key={p.id} className={state.participants?.[p.id] ? "done" : ""} onClick={() => savePreparationTaskState(task.id, { participants: { [p.id]: !state.participants?.[p.id] } })}>{state.participants?.[p.id] ? "✅" : "⬜"} {p.name}</button>)}</div>}
      {task.fields && <div className="prepFields">{task.fields.map((f) => <label key={f.key}><span>{f.label}</span><input value={fields[f.key] ?? ""} onChange={(e) => setFields((c) => ({...c, [f.key]: e.target.value}))} placeholder={f.placeholder}/></label>)}<button className="primaryButton" onClick={() => savePreparationTaskState(task.id, { fields })}>שמור פרטים</button></div>}
    </div>}
  </article>;
}
function Preparations() {
  const [states, setStates] = useState<Record<string, PreparationTaskState>>({}); const [error, setError] = useState("");
  useEffect(() => { const u = preparationTasks.map((t) => listenToPreparationTask(t.id, (s) => setStates((c) => ({...c, [t.id]: s})), setError)); return () => u.forEach((x) => x()); }, []);
  return <section className="section preparationsPage"><div className="sectionTitle"><h2>הכנות</h2><span>ביטוח, eSIM והגעה לשדה</span></div>{error && <div className="notice errorNotice"><strong>שגיאה:</strong><span>{error}</span></div>}<div className="prepTasksList">{preparationTasks.map((task) => <TaskCard key={task.id} task={task} state={states[task.id] ?? { taskId: task.id }} />)}</div></section>;
}
export default Preparations;
