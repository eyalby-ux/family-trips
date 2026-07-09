import { useMemo, useState } from "react";
import { charadePrompts, dailyPhotoChallenges, roadBingoItems, songGuessItems, triviaQuestions, trueFalseQuestions } from "../data/funData";
import { getPreviewDayIndex } from "../utils/devPreview";

type GameTab = "photo" | "bingo" | "trivia" | "truth" | "songs" | "charades";

function pickRandomIndex(length: number) {
  return Math.floor(Math.random() * length);
}

function Games() {
  const [tab, setTab] = useState<GameTab>("photo");
  const [bingoDone, setBingoDone] = useState<Record<string, boolean>>({});
  const [photoDone, setPhotoDone] = useState<Record<string, boolean>>({});
  const [triviaIndex, setTriviaIndex] = useState(0);
  const [triviaAnswer, setTriviaAnswer] = useState<number | null>(null);
  const [truthIndex, setTruthIndex] = useState(0);
  const [truthAnswer, setTruthAnswer] = useState<boolean | null>(null);
  const [songIndex, setSongIndex] = useState(0);
  const [charadeIndex, setCharadeIndex] = useState(0);

  const tabs = useMemo(
    () => [
      { id: "photo" as GameTab, label: "📸 צילום" },
      { id: "bingo" as GameTab, label: "🚗 Bingo" },
      { id: "trivia" as GameTab, label: "🧠 טריוויה" },
      { id: "truth" as GameTab, label: "😂 אמת/שקר" },
      { id: "songs" as GameTab, label: "🎵 שירים" },
      { id: "charades" as GameTab, label: "🎭 המחזים" },
    ],
    []
  );

  const currentTrivia = triviaQuestions[triviaIndex];
  const currentTruth = trueFalseQuestions[truthIndex];
  const currentSong = songGuessItems[songIndex];
  const currentCharade = charadePrompts[charadeIndex];
  const todayChallenge = dailyPhotoChallenges[getPreviewDayIndex(0, dailyPhotoChallenges.length)] ?? dailyPhotoChallenges[0];
  const photoDoneCount = todayChallenge.items.filter((item) => photoDone[`${todayChallenge.dayId}-${item}`]).length;

  return (
    <section className="section gamesPage">
      <div className="sectionTitle">
        <h2>משחקים בדרך</h2>
        <span>פעילויות קצרות לנסיעות ולזמן פנוי</span>
      </div>

      <div className="gameTabs">
        {tabs.map((item) => (
          <button key={item.id} className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}>
            {item.label}
          </button>
        ))}
      </div>

      {tab === "photo" && (
        <article className="gameCard">
          <h3>📸 אתגר צילום</h3>
          <strong>{todayChallenge.title}</strong>
          <p>סומנו {photoDoneCount} מתוך {todayChallenge.items.length}. הסימון זמני ונשמר רק כל עוד האפליקציה פתוחה.</p>
          <div className="gameList">
            {todayChallenge.items.map((item) => {
              const key = `${todayChallenge.dayId}-${item}`;
              return (
                <button key={key} className={photoDone[key] ? "done" : ""} onClick={() => setPhotoDone((current) => ({ ...current, [key]: !current[key] }))}>
                  {photoDone[key] ? "✅" : "⭕"} {item}
                </button>
              );
            })}
          </div>
          <button
            className="primaryButton"
            onClick={() =>
              setPhotoDone((current) => {
                const next = { ...current };
                todayChallenge.items.forEach((item) => delete next[`${todayChallenge.dayId}-${item}`]);
                return next;
              })
            }
          >
            אפס סימונים ליום הזה
          </button>
        </article>
      )}

      {tab === "bingo" && (
        <article className="gameCard">
          <h3>🚗 Bingo לדרך</h3>
          <p>מצאתם משהו? סמנו.</p>
          <div className="bingoGrid">
            {roadBingoItems.map((item) => (
              <button key={item.id} className={bingoDone[item.id] ? "done" : ""} onClick={() => setBingoDone((current) => ({ ...current, [item.id]: !current[item.id] }))}>
                {bingoDone[item.id] ? "✅" : "⬜"} {item.label}
              </button>
            ))}
          </div>
        </article>
      )}

      {tab === "trivia" && (
        <article className="gameCard">
          <h3>🧠 טריוויה</h3>
          <strong>{currentTrivia.question}</strong>
          <div className="answerGrid">
            {currentTrivia.answers.map((answer, index) => (
              <button key={answer} className={triviaAnswer === index ? (index === currentTrivia.correctIndex ? "correct" : "wrong") : ""} onClick={() => setTriviaAnswer(index)}>
                {answer}
              </button>
            ))}
          </div>
          {triviaAnswer !== null && <p>{triviaAnswer === currentTrivia.correctIndex ? "✅ נכון! " : "🙂 נסו שוב. "}{currentTrivia.explanation}</p>}
          <button className="primaryButton" onClick={() => { setTriviaIndex((current) => (current + 1) % triviaQuestions.length); setTriviaAnswer(null); }}>
            שאלה הבאה
          </button>
        </article>
      )}

      {tab === "truth" && (
        <article className="gameCard">
          <h3>😂 אמת או שקר</h3>
          <strong>{currentTruth.statement}</strong>
          <div className="answerGrid two">
            <button onClick={() => setTruthAnswer(true)}>אמת</button>
            <button onClick={() => setTruthAnswer(false)}>שקר</button>
          </div>
          {truthAnswer !== null && <p>{truthAnswer === currentTruth.answer ? "✅ נכון! " : "🙂 לא בדיוק. "}{currentTruth.explanation}</p>}
          <button className="primaryButton" onClick={() => { setTruthIndex((current) => (current + 1) % trueFalseQuestions.length); setTruthAnswer(null); }}>
            הבא
          </button>
        </article>
      )}

      {tab === "songs" && (
        <article className="gameCard">
          <h3>🎵 זיהוי שירים</h3>
          <p>פתחו שיר ביוטיוב ותראו מי מזהה ראשון.</p>
          <strong>{currentSong.category}</strong>
          <a className="hubAction" href={currentSong.youtubeUrl} target="_blank" rel="noreferrer">פתח שיר אקראי</a>
          <button className="primaryButton" onClick={() => setSongIndex(pickRandomIndex(songGuessItems.length))}>בחר שיר אחר</button>
        </article>
      )}

      {tab === "charades" && (
        <article className="gameCard">
          <h3>🎭 המחזים</h3>
          <p>בלי לדבר. האחרים צריכים לנחש.</p>
          <div className="charadePrompt">{currentCharade.text}</div>
          <button className="primaryButton" onClick={() => setCharadeIndex(pickRandomIndex(charadePrompts.length))}>משפט חדש</button>
        </article>
      )}
    </section>
  );
}

export default Games;
