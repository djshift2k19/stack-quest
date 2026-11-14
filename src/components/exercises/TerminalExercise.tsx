"use client";

import { useEffect, useRef, useState } from "react";
import type { TerminalSpec } from "@/lib/content/schema";
import { checkTask, createShell, execute, normaliseCommandLine, promptText, type OutLine, type ShellState } from "@/lib/terminal/shell";
import { CodeBlock, ErrorExplanation, ExerciseCard, HintLadder, secondaryButton } from "./ui";

type ScreenLine = { kind: "cmd"; prompt: string; text: string } | ({ kind: "out" } & OutLine);

const TONE_CLASS: Record<string, string> = {
  error: "text-[#fca5a5]",
  dir: "text-[#7dd3fc]",
  success: "text-[#86efac]",
  muted: "text-[#a8a29e]",
};

/**
 * The practice terminal. It looks and behaves like the Mac Terminal, but
 * nothing you type touches your real computer.
 */
export function TerminalExercise({
  spec,
  title = "Practice terminal",
  onPassed,
}: {
  spec: TerminalSpec;
  title?: string;
  onPassed: (hintsUsed: number) => void;
}) {
  const [shell, setShell] = useState<ShellState>(() => createShell(spec.setup));
  const [screen, setScreen] = useState<ScreenLine[]>([
    { kind: "out", text: "Practice terminal: nothing here touches your real Mac. Type help to see the commands.", tone: "muted" },
  ]);
  const [input, setInput] = useState("");
  const [historyPos, setHistoryPos] = useState<number | null>(null);
  const [taskIndex, setTaskIndex] = useState(0);
  const [ranThisTask, setRanThisTask] = useState<string[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);
  const [hints, setHints] = useState<number[]>(() => spec.tasks.map(() => 0));
  const [solutions, setSolutions] = useState<boolean[]>(() => spec.tasks.map(() => false));
  const [justDone, setJustDone] = useState<string | null>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const finished = taskIndex >= spec.tasks.length;
  const task = spec.tasks[taskIndex];

  // Keep the newest output in view.
  useEffect(() => {
    screenRef.current?.scrollTo({ top: screenRef.current.scrollHeight });
  }, [screen]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const line = input;
    setInput("");
    setHistoryPos(null);
    const result = execute(shell, line);
    const echoed: ScreenLine = { kind: "cmd", prompt: promptText(shell), text: line };
    setScreen(result.clear ? [] : [...screen, echoed, ...result.lines.map((l) => ({ kind: "out" as const, ...l }))]);
    setShell(result.state);
    setLastError(result.ok ? null : (result.lines.find((l) => l.tone === "error")?.text ?? null));

    if (finished || !line.trim()) return;
    const ran = result.ok ? [...ranThisTask, result.command, normaliseCommandLine(line)] : ranThisTask;
    // Complete the current task (and any following ones that are already satisfied).
    let i = taskIndex;
    let ranNow = ran;
    let explanation: string | null = null;
    while (i < spec.tasks.length && checkTask(result.state, spec.tasks[i].check, ranNow)) {
      explanation = spec.tasks[i].explain ?? "Done!";
      i++;
      ranNow = [];
    }
    setRanThisTask(ranNow);
    if (i !== taskIndex) {
      setJustDone(explanation);
      setTaskIndex(i);
      if (i >= spec.tasks.length) {
        const used = spec.tasks.reduce((sum, _t, k) => sum + hints[k] + (solutions[k] ? 1 : 0), 0);
        onPassed(used);
      }
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    e.preventDefault();
    const history = shell.history;
    if (!history.length) return;
    let pos = historyPos ?? history.length;
    pos = e.key === "ArrowUp" ? Math.max(0, pos - 1) : Math.min(history.length, pos + 1);
    setHistoryPos(pos);
    setInput(history[pos] ?? "");
  }

  function reset() {
    setShell(createShell(spec.setup));
    setScreen([{ kind: "out", text: "Started fresh. Type help to see the commands.", tone: "muted" }]);
    setTaskIndex(0);
    setRanThisTask([]);
    setLastError(null);
    setJustDone(null);
    inputRef.current?.focus();
  }

  return (
    <ExerciseCard title={title}>
      <div className="overflow-hidden rounded-xl border border-black/40 bg-[#1c1b19] text-[#ece9e2] shadow-inner">
        <div className="flex items-center gap-1.5 border-b border-white/10 px-3 py-2" aria-hidden="true">
          <span className="size-3 rounded-full bg-[#ff5f57]" />
          <span className="size-3 rounded-full bg-[#febc2e]" />
          <span className="size-3 rounded-full bg-[#28c840]" />
          <span className="ml-2 text-xs text-[#a8a29e]">Terminal (practice)</span>
        </div>
        <div
          ref={screenRef}
          role="log"
          aria-label="Terminal output"
          className="h-64 overflow-y-auto px-3 py-2 font-mono text-sm leading-relaxed"
          onClick={() => inputRef.current?.focus()}
          data-testid="terminal-output"
        >
          {screen.map((l, i) =>
            l.kind === "cmd" ? (
              <div key={i} className="break-words whitespace-pre-wrap">
                <span className="text-[#86efac]">{l.prompt}</span> {l.text}
              </div>
            ) : (
              <div key={i} className={`break-words whitespace-pre-wrap ${l.tone ? TONE_CLASS[l.tone] : ""}`}>
                {l.text || " "}
              </div>
            ),
          )}
        </div>
        <form onSubmit={submit} className="flex flex-wrap items-center gap-x-2 border-t border-white/10 px-3 py-1 font-mono text-sm">
          <label htmlFor="terminal-input" className="shrink-0 text-[#86efac]">
            {promptText(shell)}
            <span className="sr-only"> Type a command and press Enter</span>
          </label>
          <input
            id="terminal-input"
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
            className="min-h-11 min-w-0 flex-1 basis-40 bg-transparent text-[#ece9e2] caret-[#86efac] outline-none"
          />
        </form>
      </div>

      {lastError && <ErrorExplanation error={{ name: "", message: lastError }} language="terminal" compact />}

      <div aria-live="polite">
        {justDone && (
          <p className="mt-4 rounded-xl bg-accent-soft p-3 text-sm" data-testid="task-done">
            <strong>✅ </strong>
            {justDone}
          </p>
        )}
      </div>

      <h3 className="mt-5 font-semibold">Your tasks</h3>
      <ol className="mt-2 space-y-2" data-testid="terminal-tasks">
        {spec.tasks.map((t, i) => (
          <li
            key={i}
            className={`flex gap-2 rounded-lg p-2 text-sm ${i === taskIndex ? "border border-accent bg-surface" : i < taskIndex ? "text-muted" : "text-muted opacity-70"}`}
            aria-current={i === taskIndex ? "step" : undefined}
          >
            <span aria-hidden="true">{i < taskIndex ? "✅" : i === taskIndex ? "👉" : "○"}</span>
            <span>
              <span className="sr-only">{i < taskIndex ? "Done: " : i === taskIndex ? "Current task: " : "Later: "}</span>
              {t.instruction}
            </span>
          </li>
        ))}
      </ol>

      {!finished && task && (
        <HintLadder
          key={taskIndex}
          hints={task.hints}
          shown={hints[taskIndex]}
          onShowNext={() => setHints(hints.map((h, k) => (k === taskIndex ? h + 1 : h)))}
          solution={<CodeBlock code={task.solution.join("\n")} />}
          solutionShown={solutions[taskIndex]}
          onShowSolution={() => setSolutions(solutions.map((s, k) => (k === taskIndex ? true : s)))}
        />
      )}
      {finished && (
        <p className="mt-4 font-semibold" data-testid="terminal-finished">
          🎉 All tasks done. Keep experimenting in the terminal if you like: it&apos;s all pretend.
        </p>
      )}

      <button type="button" className={`${secondaryButton} mt-4`} onClick={reset}>
        Start the terminal again
      </button>
    </ExerciseCard>
  );
}
