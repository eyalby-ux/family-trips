import { useEffect, useMemo, useState } from "react";
import { preparationParticipants, preparationTasks } from "../data/preparationData";
import { listenToPreparationTask, savePreparationTaskState } from "../services/preparationService";
import type { PreparationTaskDefinition, PreparationTaskState } from "../types";

function getLinearProgress(task: PreparationTaskDefinition, state: PreparationTaskState) {
  if (task.mode === "group") return state.groupDone ? 1 : 0;
  const doneCount = preparationParticipants.filter((person) => state.participants?.[person.id]).length;
  return doneCount / preparationParticipants.length;
}

function getTone(progress: number) {
  if (progress >= 1) return "ready";
  if (progress > 0) return "progress";
  return "pending";
}

function TaskProgress({ task, state }: { task: PreparationTaskDefinition; state: PreparationTaskState }) {
  const progress = getLinearProgress(task, state);
  return (
    <div className={`visualProgress ${getTone(progress)}`}>
      <span style={{ width: `${Math.round(progress * 100)}%` }} />
    </div>
  );
}

function PreparationTaskCard({ task, state }: { task: PreparationTaskDefinition; state: PreparationTaskState }) {
  const [isOpen, setIsOpen] = useState(false);
  const [fields, setFields] = useState<Record<string, string>>(state.fields ?? {});

  useEffect(() => setFields(state.fields ?? {}), [state.fields]);

  async function toggleGroupDone() {
    await savePreparationTaskState(task.id, { groupDone: !state.groupDone });
  }

  async function toggleParticipant(personId: string) {
    await savePreparationTaskState(task.id, { participants: { [personId]: !state.participants?.[personId] } });
  }

  async function saveFields() {
    await savePreparationTaskState(task.id, { fields });
  }

  return (
    <article className={`prepTaskCard ${getTone(getLinearProgress(task, state))}`}>
      <button className="prepTaskSummary" onClick={() => setIsOpen((current) => !current)}>
        <span className="prepTaskIcon">{task.icon}</span>
        <div>
          <strong>{task.title}</strong>
          <small>{task.description}</small>
          <TaskProgress task={task} state={state} />
        </div>
        <span className="compactArrow">›</span>
      </button>

      {isOpen && (
        <div className="prepTaskDetails">
          {task.mode === "group" && (
            <button className="prepDoneButton" onClick={toggleGroupDone}>
              {state.groupDone ? "✅ אושר" : "⬜ סמן כאושר"}
            </button>
          )}

          {task.mode === "perParticipant" && (
            <div className="participantChecklist">
              {preparationParticipants.map((person) => (
                <button key={person.id} className={state.participants?.[person.id] ? "done" : ""} onClick={() => toggleParticipant(person.id)}>
                  {state.participants?.[person.id] ? "✅" : "⬜"} {person.name}
                </button>
              ))}
            </div>
          )}

          {task.fields && task.fields.length > 0 && (
            <div className="prepFields">
              {task.fields.map((field) => (
                <label key={field.key}>
                  <span>{field.label}</span>
                  <input value={fields[field.key] ?? ""} onChange={(event) => setFields((current) => ({ ...current, [field.key]: event.target.value }))} placeholder={field.placeholder} />
                </label>
              ))}
              <button className="primaryButton" onClick={saveFields}>שמור פרטים</button>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function Preparations() {
  const [states, setStates] = useState<Record<string, PreparationTaskState>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribers = preparationTasks.map((task) =>
      listenToPreparationTask(task.id, (state) => setStates((current) => ({ ...current, [task.id]: state })), setError)
    );
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, []);

  const allStates = useMemo(() => preparationTasks.map((task) => ({ task, state: states[task.id] ?? { taskId: task.id } })), [states]);

  return (
    <section className="section preparationsPage">
      <div className="sectionTitle">
        <h2>הכנות</h2>
        <span>ביטוח, eSIM והגעה לשדה</span>
      </div>
      {error && <div className="notice errorNotice"><strong>שגיאה:</strong><span>{error}</span></div>}
      <div className="prepTasksList">
        {allStates.map(({ task, state }) => <PreparationTaskCard key={task.id} task={task} state={state} />)}
      </div>
    </section>
  );
}

export default Preparations;
