"use client";

import { useState } from "react";
import { LazyCodeEditor } from "@/components/editor/LazyCodeEditor";
import type { Challenge } from "@/lib/content/schema";
import { runHtmlTests } from "@/sandboxes/html/runHtml";
import { runJs } from "@/sandboxes/js/runJs";
import { runSql } from "@/sandboxes/sql/sqlClient";
import type { SqlRunResult } from "@/sandboxes/sql/sqlCore";
import { HtmlPreview } from "./HtmlPreview";
import { SqlEngineGate } from "./SqlEngineGate";
import {
  CodeBlock,
  ConsoleOutput,
  ErrorExplanation,
  ExerciseCard,
  HintLadder,
  ResultTable,
  TestResults,
  primaryButton,
  secondaryButton,
} from "./ui";

const TITLES = { "fix-the-bug": "Fix the bug", "build-it": "Build it", boss: "Boss Challenge" } as const;

/** A code challenge (fix the bug, build it, or a boss) with automatic checks. */
export function CodeChallenge({
  challenge,
  kind,
  onPassed,
}: {
  challenge: Challenge;
  kind: keyof typeof TITLES;
  onPassed: (hintsUsed: number) => void;
}) {
  const [code, setCode] = useState(challenge.starter);
  const [result, setResult] = useState<SqlRunResult | null>(null);
  const [running, setRunning] = useState(false);
  const [hintsShown, setHintsShown] = useState(0);
  const [solutionShown, setSolutionShown] = useState(false);
  const [passed, setPassed] = useState(false);
  const { language } = challenge;

  async function check() {
    setRunning(true);
    let r: SqlRunResult;
    if (language === "javascript") {
      r = await runJs({ code, tests: challenge.tests, api: challenge.api });
    } else if (language === "sql") {
      r = await runSql({ setup: challenge.setup, code, tests: challenge.tests });
    } else {
      r = await runHtmlTests({ language, code, fixture: challenge.fixture, tests: challenge.tests });
    }
    setResult(r);
    setRunning(false);
    const allPassed = !r.error && r.results.length > 0 && r.results.every((t) => t.passed);
    if (allPassed) {
      setPassed(true);
      onPassed(solutionShown ? challenge.hints.length + 1 : hintsShown);
    }
  }

  const body = (
    <>
      <LazyCodeEditor
        value={code}
        onChange={(v) => {
          setCode(v);
          setPassed(false);
        }}
        language={language}
        label={`Your ${language === "javascript" ? "JavaScript" : language.toUpperCase()} code`}
        minHeight={160}
      />

      {(language === "html" || language === "css") && <HtmlPreview language={language} code={code} fixture={challenge.fixture} />}

      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" className={primaryButton} onClick={check} disabled={running}>
          {running ? "Checking…" : language === "sql" ? "▶ Run query & check" : "▶ Run & check"}
        </button>
        <button
          type="button"
          className={secondaryButton}
          onClick={() => {
            setCode(challenge.starter);
            setResult(null);
          }}
        >
          Start over
        </button>
      </div>

      <div aria-live="polite">
        {passed && (
          <p className="mt-4 rounded-xl bg-accent-soft p-3 font-semibold" data-testid="challenge-passed">
            ✅ Every check passes. You did it!
          </p>
        )}
        {result?.error && <ErrorExplanation error={result.error} language={language === "sql" ? "sql" : "javascript"} />}
        {result && <TestResults results={result.results} />}
      </div>
      {result && <ConsoleOutput logs={result.logs} requests={result.requests} />}
      {result?.table && <ResultTable columns={result.table.columns} rows={result.table.rows} />}
      {result?.summary && !result.table && <p className="mt-4 text-sm text-muted">Database says: {result.summary}</p>}

      {!passed && (
        <HintLadder
          hints={challenge.hints}
          shown={hintsShown}
          onShowNext={() => setHintsShown(hintsShown + 1)}
          solution={
            <>
              <CodeBlock code={challenge.solution} />
              <button type="button" className={`${secondaryButton} mt-2`} onClick={() => setCode(challenge.solution)}>
                Put the solution in the editor
              </button>
            </>
          }
          solutionShown={solutionShown}
          onShowSolution={() => setSolutionShown(true)}
        />
      )}
    </>
  );

  return (
    <ExerciseCard title={TITLES[kind]}>
      {language === "sql" && challenge.setup && (
        <details className="mb-3 text-sm">
          <summary className="cursor-pointer font-semibold">The tables you&apos;re working with</summary>
          <div className="mt-2">
            <CodeBlock code={challenge.setup.trim()} />
          </div>
        </details>
      )}
      {language === "sql" ? <SqlEngineGate>{body}</SqlEngineGate> : body}
    </ExerciseCard>
  );
}
