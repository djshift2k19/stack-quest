"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { UnitFrontmatter } from "@/lib/content/schema";
import type { Celebration } from "@/lib/gamification/progress";
import { useProgress } from "@/lib/progress/ProgressProvider";
import { CelebrationList, NextLink } from "../lesson/Celebrations";

// Each exercise type is its own download, fetched only when needed.
const loading = () => <p className="mt-8 text-muted">Loading the exercise…</p>;
const QuizExercise = dynamic(() => import("./QuizExercise").then((m) => m.QuizExercise), { loading });
const PredictOutput = dynamic(() => import("./PredictOutput").then((m) => m.PredictOutput), { loading });
const TypeTheCode = dynamic(() => import("./TypeTheCode").then((m) => m.TypeTheCode), { loading });
const CodeChallenge = dynamic(() => import("./CodeChallenge").then((m) => m.CodeChallenge), { loading });

export function UnitExercise({
  unit,
  unitKey,
  nextHref,
  nextLabel,
}: {
  unit: UnitFrontmatter;
  unitKey: string;
  nextHref: string;
  nextLabel: string;
}) {
  const { completeUnit, state } = useProgress();
  const [celebrations, setCelebrations] = useState<Celebration[] | null>(null);
  const record = state.units[unitKey];

  async function handlePassed(hintsUsed: number) {
    setCelebrations(await completeUnit({ unitKey, baseXp: unit.xp, hintsUsed }));
  }

  let exercise: React.ReactNode = null;
  switch (unit.type) {
    case "quiz":
      exercise = <QuizExercise questions={unit.questions} onPassed={handlePassed} />;
      break;
    case "predict-output":
      exercise = (
        <PredictOutput
          code={unit.code}
          language={unit.language}
          options={unit.options}
          answer={unit.answer}
          explanation={unit.explanation}
          hints={unit.hints}
          onPassed={handlePassed}
        />
      );
      break;
    case "type-the-code":
      exercise = <TypeTheCode target={unit.target} language={unit.language} onPassed={handlePassed} />;
      break;
    case "fix-the-bug":
    case "build-it":
      exercise = <CodeChallenge challenge={unit.challenge} kind={unit.type} onPassed={handlePassed} />;
      break;
    case "boss":
      exercise = unit.challenge ? (
        <CodeChallenge challenge={unit.challenge} kind="boss" onPassed={handlePassed} />
      ) : (
        <QuizExercise questions={unit.questions ?? []} title="Boss Challenge" onPassed={handlePassed} />
      );
      break;
    case "reading":
      return null;
  }

  return (
    <>
      {exercise}
      <section aria-label="Your progress on this unit" className="mt-6 rounded-2xl border border-border bg-surface p-5">
        <div role="status" aria-live="polite">
          {celebrations ? (
            <CelebrationList celebrations={celebrations} />
          ) : record ? (
            <p className="text-muted">
              <span aria-hidden="true">✓ </span>You&apos;ve completed this before. Practise as many times as you like.
              {record.fewestHints > 0 && " Finish without hints to earn the no-hint bonus."}
            </p>
          ) : (
            <p className="text-muted">Complete the exercise above to finish this unit and earn {unit.xp} XP.</p>
          )}
        </div>
        {(celebrations || record) && (
          <div className="mt-4">
            <NextLink href={nextHref} label={nextLabel} />
          </div>
        )}
      </section>
    </>
  );
}
