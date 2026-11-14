"use client";

import { useState } from "react";
import type { Language, QuizOption } from "@/lib/content/schema";
import { sameOutput } from "@/lib/engine/sameOutput";
import { runJs } from "@/sandboxes/js/runJs";
import type { RunResult } from "@/sandboxes/types";
import { CodeBlock, ConsoleOutput, ExerciseCard, HintLadder, primaryButton, secondaryButton } from "./ui";

export function PredictOutput({
  code,
  language,
  options,
  answer,
  explanation,
  hints,
  onPassed,
}: {
  code: string;
  language: Language;
  options?: QuizOption[];
  answer?: string;
  explanation: string;
  hints: string[];
  onPassed: (hintsUsed: number) => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [typed, setTyped] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [hintsShown, setHintsShown] = useState(0);
  const [run, setRun] = useState<RunResult | null>(null);
  const [running, setRunning] = useState(false);

  function check() {
    const ok = options ? selected !== null && options[selected].correct : sameOutput(typed, answer ?? "");
    setAttempted(true);
    setCorrect(ok);
    if (ok) onPassed(hintsShown);
  }

  async function runIt() {
    setRunning(true);
    setRun(await runJs({ code, tests: [] }));
    setRunning(false);
  }

  return (
    <ExerciseCard title="Predict the output">
      <p className="mb-2">What will this code print? Work it out in your head before you answer.</p>
      <CodeBlock code={code} />

      <div className="mt-4">
        {options ? (
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">Your prediction</legend>
            <div className="space-y-2">
              {options.map((o, i) => (
                <label key={i} className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border p-3 ${selected === i ? "border-accent" : "border-border"}`}>
                  <input
                    type="radio"
                    name="prediction"
                    className="size-4 accent-[var(--accent)]"
                    checked={selected === i}
                    disabled={correct}
                    onChange={() => {
                      setSelected(i);
                      setAttempted(false);
                    }}
                  />
                  <code className="font-mono text-sm whitespace-pre-wrap">{o.text}</code>
                </label>
              ))}
            </div>
          </fieldset>
        ) : (
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">Type exactly what it prints</span>
            <textarea
              value={typed}
              onChange={(e) => {
                setTyped(e.target.value);
                setAttempted(false);
              }}
              disabled={correct}
              rows={3}
              spellCheck={false}
              autoCapitalize="off"
              className="w-full rounded-[10px] border border-border bg-surface-2 p-3 font-mono text-sm"
            />
          </label>
        )}
      </div>

      <div aria-live="polite">
        {attempted && (
          <div className={`mt-4 rounded-xl p-3 ${correct ? "bg-accent-soft" : "bg-surface-2"}`} data-testid="predict-feedback">
            <p className="font-semibold">{correct ? "✅ Correct!" : "Not quite. Trace through the code one line at a time and try again."}</p>
            {!correct && options && selected !== null && options[selected].why && <p className="mt-1 text-sm">{options[selected].why}</p>}
            {correct && <p className="mt-1 text-sm">{explanation}</p>}
          </div>
        )}
      </div>

      {!correct && <HintLadder hints={hints} shown={hintsShown} onShowNext={() => setHintsShown(hintsShown + 1)} />}

      <div className="mt-4 flex flex-wrap gap-3">
        {!correct && (
          <button type="button" className={primaryButton} onClick={check} disabled={options ? selected === null : typed.trim() === ""}>
            Check my prediction
          </button>
        )}
        {correct && language === "javascript" && (
          <button type="button" className={secondaryButton} onClick={runIt} disabled={running}>
            {running ? "Running…" : "▶ Run it to see for yourself"}
          </button>
        )}
      </div>
      {run && <ConsoleOutput logs={run.logs} />}
    </ExerciseCard>
  );
}
