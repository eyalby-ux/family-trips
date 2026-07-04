import { useState } from "react";
import { trivia } from "../data/tripData";

function Games() {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});

  return (
    <section className="section">
      <div className="sectionTitle">
        <h2>משחקים וטריוויה</h2>
        <span>גרסה ראשונה לנסיעות</span>
      </div>

      <div className="timeline">
        {trivia.map((question) => {
          const selected = selectedAnswers[question.id];

          return (
            <article key={question.id} className="dayCard">
              <h3>{question.question}</h3>

              <div className="answerGrid">
                {question.answers.map((answer, index) => {
                  const isSelected = selected === index;
                  const isCorrect = question.correctIndex === index;

                  return (
                    <button
                      key={answer}
                      className={
                        selected === undefined
                          ? "answerButton"
                          : isSelected && isCorrect
                            ? "answerButton correct"
                            : isSelected
                              ? "answerButton wrong"
                              : "answerButton"
                      }
                      onClick={() =>
                        setSelectedAnswers((current) => ({
                          ...current,
                          [question.id]: index,
                        }))
                      }
                    >
                      {answer}
                    </button>
                  );
                })}
              </div>

              {selected !== undefined && (
                <p className="explanation">
                  {selected === question.correctIndex ? "✅ נכון! " : "❌ לא בדיוק. "}
                  {question.explanation}
                </p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default Games;