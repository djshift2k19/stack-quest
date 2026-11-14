"use client";

import { useState } from "react";
import { LazyCodeEditor } from "@/components/editor/LazyCodeEditor";
import type { Language } from "@/lib/content/schema";
import { firstMismatch, typeHints } from "@/lib/engine/typeCompare";
import { runJs } from "@/sandboxes/js/runJs";
import type { RunResult } from "@/sandboxes/types";
import { CodeBlock, ConsoleOutput, ExerciseCard, HintLadder, primaryButton, secondaryButton } from "./ui";

/**
 * Type the example code yourself. Typing (rather than copying) builds
 * muscle memory for the punctuation that makes code work.
 */
export function TypeTheCode({ target, language, onPassed }: { target: string; language: Language; onPassed: (hintsUsed: number) => void }) {
  const [typed, setTyped] = useState("");
  const [checked, setChecked] = useState(false);
  const [hintsShown, setHintsShown] = useState(0);
  const [passed, setPassed] = useState(false);
  const [run, setRun] = useState<RunResult | null>(null);

  const mismatch = firstMismatch(typed, target);
  const hints = typeHints(mismatch);

  function check() {
    setChecked(true);
    if (!mismatch) {
      setPassed(true);
      onPassed(hintsShown);
    }
  }

  return (
    <ExerciseCard title="Type the code">
      <p className="mb-2">Type this into the editor below, exactly as it is. Every bracket and quote mark matters.</p>
      <CodeBlock code={target} />
      <div className="mt-4">
        <LazyCodeEditor
          value={typed}
          onChange={(v) => {
            setTyped(v);
            setChecked(false);
          }}
          language={language}
          label="Your code"
          readOnly={passed}
        />
      </div>

      <div aria-live="polite">
        {checked && (
          <div className={`mt-4 rounded-xl p-3 ${passed ? "bg-accent-soft" : "bg-surface-2"}`} data-testid="type-feedback">
            <p className="font-semibold">
              {passed ? "✅ It matches exactly. Well typed!" : `Almost! There's a difference on line ${mismatch?.line}.`}
            </p>
          </div>
        )}
      </div>

      {!passed && checked && <HintLadder hints={hints} shown={hintsShown} onShowNext={() => setHintsShown(hintsShown + 1)} />}

      <div className="mt-4 flex flex-wrap gap-3">
        {!passed ? (
          <button type="button" className={primaryButton} onClick={check} disabled={typed.trim() === ""}>
            Check
          </button>
        ) : (
          language === "javascript" && (
            <button type="button" className={secondaryButton} onClick={async () => setRun(await runJs({ code: typed, tests: [] }))}>
              ▶ Run what you typed
            </button>
          )
        )}
      </div>
      {run && <ConsoleOutput logs={run.logs} />}
    </ExerciseCard>
  );
}
