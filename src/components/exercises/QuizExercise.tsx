"use client";

import { useId, useState } from "react";
import type { Question } from "@/lib/content/schema";
import { CodeBlock, ExerciseCard, primaryButton, secondaryButton } from "./ui";

/**
 * Multiple-choice questions, one at a time. Wrong answers explain why and
 * you simply try again: unlimited retries, no penalty.
 */
export function QuizExercise({
  questions,
  title = "Quiz",
  onPassed,
}: {
  questions: Question[];
  title?: string;
  onPassed: (hintsUsed: number) => void;
}) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState<number | null>(null);
  const [hintsShown, setHintsShown] = useState<Set<number>>(new Set());
  const [finished, setFinished] = useState(false);
  const groupId = useId();

  const q = questions[index];
  const correctIndex = q.options.findIndex((o) => o.correct);
  const isCorrect = checked !== null && checked === correctIndex;
  const isLast = index === questions.length - 1;

  function check() {
    if (selected === null) return;
    setChecked(selected);
  }

  function next() {
    if (isLast) {
      setFinished(true);
      onPassed(hintsShown.size);
      return;
    }
    setIndex(index + 1);
    setSelected(null);
    setChecked(null);
  }

  function restart() {
    setIndex(0);
    setSelected(null);
    setChecked(null);
    setFinished(false);
  }

  if (finished) {
    return (
      <ExerciseCard title={title}>
        <p>
          <span aria-hidden="true">✅ </span>All {questions.length} question{questions.length === 1 ? "" : "s"} answered correctly.
        </p>
        <button type="button" className={`${secondaryButton} mt-3`} onClick={restart}>
          Try the questions again
        </button>
      </ExerciseCard>
    );
  }

  return (
    <ExerciseCard title={title}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        Question {index + 1} of {questions.length}
      </p>
      <fieldset className="mt-2">
        <legend className="mb-3 font-semibold">{q.prompt}</legend>
        {q.code && (
          <div className="mb-3">
            <CodeBlock code={q.code} />
          </div>
        )}
        <div className="space-y-2">
          {q.options.map((option, i) => {
            const showState = checked !== null && i === checked;
            return (
              <label
                key={i}
                className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border p-3 ${
                  showState ? (option.correct ? "border-accent bg-accent-soft" : "border-flame/50") : selected === i ? "border-accent" : "border-border"
                } ${isCorrect ? "cursor-default" : ""}`}
              >
                <input
                  type="radio"
                  name={groupId}
                  className="mt-1 size-4 accent-[var(--accent)]"
                  checked={selected === i}
                  disabled={isCorrect}
                  onChange={() => {
                    setSelected(i);
                    if (checked !== null && !isCorrect) setChecked(null);
                  }}
                />
                <span>{option.text}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div aria-live="polite">
        {checked !== null && (
          <div className={`mt-4 rounded-xl p-3 ${isCorrect ? "bg-accent-soft" : "bg-surface-2"}`} data-testid="quiz-feedback">
            <p className="font-semibold">{isCorrect ? "✅ Correct!" : "Not quite. Have another go."}</p>
            {q.options[checked].why && <p className="mt-1 text-sm">{q.options[checked].why}</p>}
          </div>
        )}
      </div>

      {q.hint && !isCorrect && (
        <div className="mt-3">
          {hintsShown.has(index) ? (
            <p className="rounded-lg bg-surface-2 p-3 text-sm">
              <strong>💡 Hint:</strong> {q.hint}
            </p>
          ) : (
            <button type="button" className={secondaryButton} onClick={() => setHintsShown(new Set(hintsShown).add(index))}>
              Show a hint
            </button>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        {!isCorrect ? (
          <button type="button" className={primaryButton} onClick={check} disabled={selected === null}>
            Check answer
          </button>
        ) : (
          <button type="button" className={primaryButton} onClick={next}>
            {isLast ? "Finish" : "Next question"}
          </button>
        )}
      </div>
    </ExerciseCard>
  );
}
