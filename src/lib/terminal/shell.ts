/**
 * A pretend terminal for practising commands safely.
 *
 * Everything here is make-believe: the "files" are just data in memory and
 * nothing touches your real computer. It copies the messages a real Mac
 * terminal (zsh) and Git give, so what you learn carries over.
 *
 * Supported: help, pwd, ls, cd, mkdir, touch, cat, echo (with > and >>),
 * rm, mv, cp, clear, history, whoami, code, open, and git (init, status,
 * add, commit, log).
 */

export type FsNode = { type: "dir"; children: Record<string, FsNode> } | { type: "file"; content: string };

export interface Commit {
  id: string;
  message: string;
  files: Record<string, string>;
}

export interface Repo {
  /** The "staging area": what the next commit will contain. */
  index: Record<string, string>;
  commits: Commit[];
}

export interface ShellState {
  root: FsNode & { type: "dir" };
  cwd: string;
  home: string;
  /** Git repositories, by the folder they live in. */
  repos: Record<string, Repo>;
  history: string[];
}

export type Tone = "error" | "dir" | "muted" | "success";
export interface OutLine {
  text: string;
  tone?: Tone;
}

export interface ExecResult {
  state: ShellState;
  lines: OutLine[];
  /** The command name that ran, e.g. "ls" or "git commit". */
  command: string;
  ok: boolean;
  /** True for `clear`: the screen should be wiped. */
  clear?: boolean;
}

export interface ShellSetup {
  cwd?: string;
  dirs?: string[];
  files?: Record<string, string>;
  /** Folders that already have Git switched on (as if `git init` had run). */
  repos?: string[];
}

export const HOME = "/Users/learner";

/* ---------- Paths ---------- */

export function normalise(path: string): string {
  const out: string[] = [];
  for (const part of path.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") out.pop();
    else out.push(part);
  }
  return "/" + out.join("/");
}

export function resolvePath(cwd: string, home: string, input: string): string {
  if (input === "~" || input.startsWith("~/")) return normalise(home + input.slice(1));
  if (input.startsWith("/")) return normalise(input);
  return normalise(`${cwd}/${input}`);
}

/** Show paths the way zsh does: the home folder as ~. */
export function displayPath(path: string, home: string): string {
  if (path === home) return "~";
  if (path.startsWith(home + "/")) return "~" + path.slice(home.length);
  return path;
}

const baseName = (p: string) => p.split("/").filter(Boolean).pop() ?? "/";
const parentOf = (p: string) => normalise(p + "/..");

/* ---------- File system helpers (they copy rather than change) ---------- */

function clone<T>(v: T): T {
  return structuredClone(v);
}

export function getNode(root: FsNode, path: string): FsNode | undefined {
  let node: FsNode | undefined = root;
  for (const part of path.split("/").filter(Boolean)) {
    if (!node || node.type !== "dir") return undefined;
    node = node.children[part];
  }
  return node;
}

function setNode(root: FsNode & { type: "dir" }, path: string, value: FsNode | undefined) {
  const parent = getNode(root, parentOf(path));
  if (!parent || parent.type !== "dir") throw new Error("parent missing");
  if (value) parent.children[baseName(path)] = value;
  else delete parent.children[baseName(path)];
}

function mkdirP(root: FsNode & { type: "dir" }, path: string) {
  let node: FsNode = root;
  for (const part of path.split("/").filter(Boolean)) {
    if (node.type !== "dir") throw new Error("not a directory");
    node.children[part] ??= { type: "dir", children: {} };
    node = node.children[part];
  }
}

/** Every file under a folder, as path -> content (skipping .git). */
function filesUnder(root: FsNode, dir: string): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (node: FsNode, path: string) => {
    if (node.type === "file") out[path] = node.content;
    else for (const [name, child] of Object.entries(node.children)) if (name !== ".git") walk(child, `${path}/${name}`);
  };
  const start = getNode(root, dir);
  if (start) walk(start, dir === "/" ? "" : dir);
  return out;
}

export function createShell(setup: ShellSetup = {}): ShellState {
  const root: ShellState["root"] = { type: "dir", children: {} };
  mkdirP(root, HOME);
  for (const d of ["Desktop", "Documents", "Downloads"]) mkdirP(root, `${HOME}/${d}`);
  for (const d of setup.dirs ?? []) mkdirP(root, resolvePath(HOME, HOME, d));
  for (const [path, content] of Object.entries(setup.files ?? {})) {
    const full = resolvePath(HOME, HOME, path);
    mkdirP(root, parentOf(full));
    setNode(root, full, { type: "file", content });
  }
  const repos: Record<string, Repo> = {};
  for (const r of setup.repos ?? []) {
    const dir = resolvePath(HOME, HOME, r);
    mkdirP(root, `${dir}/.git`);
    repos[dir] = { index: {}, commits: [] };
  }
  return { root, cwd: resolvePath(HOME, HOME, setup.cwd ?? HOME), home: HOME, repos, history: [] };
}

/* ---------- Parsing a command line ---------- */

/** Split a line into words, keeping "quoted text" together. */
export function tokenize(line: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let quote: string | null = null;
  let has = false;
  for (const ch of line) {
    if (quote) {
      if (ch === quote) quote = null;
      else current += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      has = true;
    } else if (/\s/.test(ch)) {
      if (has || current) tokens.push(current);
      current = "";
      has = false;
    } else {
      current += ch;
      has = true;
    }
  }
  if (has || current) tokens.push(current);
  return tokens;
}

/**
 * A tidy version of what was typed, for checking tasks like "ls Documents":
 * extra spaces and a trailing / on folder names don't matter.
 */
export function normaliseCommandLine(line: string): string {
  return tokenize(line)
    .map((t) => (t.length > 1 ? t.replace(/\/$/, "") : t))
    .join(" ");
}

/* ---------- Git helpers ---------- */

function findRepo(state: ShellState): string | undefined {
  let dir = state.cwd;
  for (;;) {
    if (state.repos[dir]) return dir;
    if (dir === "/") return undefined;
    dir = parentOf(dir);
  }
}

function headFiles(repo: Repo): Record<string, string> {
  return repo.commits.at(-1)?.files ?? {};
}

function shortHash(text: string): string {
  let h = 2166136261;
  for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0).toString(16).padStart(8, "0").slice(0, 7);
}

const NOT_A_REPO = "fatal: not a git repository (or any of the parent directories): .git";

/* ---------- Running a command ---------- */

export function execute(previous: ShellState, line: string): ExecResult {
  const state = clone(previous);
  const trimmed = line.trim();
  if (trimmed) state.history.push(trimmed);
  const lines: OutLine[] = [];
  const out = (text: string, tone?: Tone) => lines.push({ text, tone });
  const fail = (text: string, command: string): ExecResult => ({ state, lines: [...lines, { text, tone: "error" }], command, ok: false });
  const done = (command: string): ExecResult => ({ state, lines, command, ok: true });

  let words = tokenize(trimmed);
  if (words.length === 0) return done("");

  // Redirection for echo: echo hello > file.txt
  let redirect: { mode: ">" | ">>"; target: string } | undefined;
  const r = words.findIndex((w) => w === ">" || w === ">>");
  if (r !== -1) {
    if (!words[r + 1]) return fail("zsh: parse error near `\\n'", words[0]);
    redirect = { mode: words[r] as ">" | ">>", target: words[r + 1] };
    words = words.slice(0, r);
  }

  const [cmd, ...args] = words;
  const flags = args.filter((a) => a.startsWith("-") && a.length > 1);
  const operands = args.filter((a) => !(a.startsWith("-") && a.length > 1));
  const at = (p: string) => resolvePath(state.cwd, state.home, p);

  switch (cmd) {
    case "help":
      out("Commands you can practise here:");
      out("  pwd                 print where you are (working directory)");
      out("  ls [-a] [folder]    list what's in a folder");
      out("  cd <folder>         change directory (cd .. goes up, cd ~ goes home)");
      out("  mkdir <name>        make a folder");
      out("  touch <file>        make an empty file");
      out("  cat <file>          show what's in a file");
      out('  echo "text" > file  write text into a file (>> adds to the end)');
      out("  mv <from> <to>      move or rename");
      out("  cp <from> <to>      copy a file");
      out("  rm <file>           delete a file (rm -r for a folder)");
      out("  clear, history, whoami");
      out("  git init | status | add | commit -m \"message\" | log");
      return done("help");

    case "pwd":
      out(state.cwd);
      return done("pwd");

    case "whoami":
      out("learner");
      return done("whoami");

    case "history":
      state.history.forEach((h, i) => out(`${String(i + 1).padStart(4)}  ${h}`));
      return done("history");

    case "clear":
      return { state, lines: [], command: "clear", ok: true, clear: true };

    case "ls": {
      const showHidden = flags.some((f) => f.includes("a"));
      const target = operands[0] ? at(operands[0]) : state.cwd;
      const node = getNode(state.root, target);
      if (!node) return fail(`ls: ${operands[0]}: No such file or directory`, "ls");
      if (node.type === "file") {
        out(operands[0]);
        return done("ls");
      }
      const names = Object.keys(node.children)
        .filter((n) => showHidden || !n.startsWith("."))
        .sort((a, b) => a.localeCompare(b));
      for (const n of names) {
        const isDir = node.children[n].type === "dir";
        out(isDir ? `${n}/` : n, isDir ? "dir" : undefined);
      }
      return done("ls");
    }

    case "cd": {
      const target = operands[0] === undefined ? state.home : at(operands[0]);
      const node = getNode(state.root, target);
      if (!node) return fail(`cd: no such file or directory: ${operands[0]}`, "cd");
      if (node.type !== "dir") return fail(`cd: not a directory: ${operands[0]}`, "cd");
      state.cwd = target;
      return done("cd");
    }

    case "mkdir": {
      if (!operands.length) return fail("usage: mkdir [-p] directory_name ...", "mkdir");
      const parents = flags.some((f) => f.includes("p"));
      for (const name of operands) {
        const path = at(name);
        if (getNode(state.root, path)) {
          if (parents) continue;
          return fail(`mkdir: ${name}: File exists`, "mkdir");
        }
        const parent = getNode(state.root, parentOf(path));
        if (!parent && !parents) return fail(`mkdir: ${name}: No such file or directory`, "mkdir");
        mkdirP(state.root, path);
      }
      return done("mkdir");
    }

    case "touch": {
      if (!operands.length) return fail("usage: touch file ...", "touch");
      for (const name of operands) {
        const path = at(name);
        const parent = getNode(state.root, parentOf(path));
        if (!parent || parent.type !== "dir") return fail(`touch: ${name}: No such file or directory`, "touch");
        if (!getNode(state.root, path)) setNode(state.root, path, { type: "file", content: "" });
      }
      return done("touch");
    }

    case "cat": {
      if (!operands.length) return fail("cat: please give a file name, e.g. cat notes.txt", "cat");
      for (const name of operands) {
        const node = getNode(state.root, at(name));
        if (!node) return fail(`cat: ${name}: No such file or directory`, "cat");
        if (node.type === "dir") return fail(`cat: ${name}: Is a directory`, "cat");
        for (const l of node.content.replace(/\n$/, "").split("\n")) if (node.content) out(l);
      }
      return done("cat");
    }

    case "echo": {
      const text = args.join(" ");
      if (!redirect) {
        out(text);
        return done("echo");
      }
      const path = at(redirect.target);
      const parent = getNode(state.root, parentOf(path));
      if (!parent || parent.type !== "dir") return fail(`zsh: no such file or directory: ${redirect.target}`, "echo");
      const existing = getNode(state.root, path);
      if (existing?.type === "dir") return fail(`zsh: is a directory: ${redirect.target}`, "echo");
      const before = redirect.mode === ">>" && existing?.type === "file" ? existing.content : "";
      setNode(state.root, path, { type: "file", content: `${before}${text}\n` });
      return done("echo");
    }

    case "rm": {
      if (!operands.length) return fail("usage: rm [-r] file ...", "rm");
      const recursive = flags.some((f) => /[rR]/.test(f));
      for (const name of operands) {
        const path = at(name);
        const node = getNode(state.root, path);
        if (!node) return fail(`rm: ${name}: No such file or directory`, "rm");
        if (node.type === "dir" && !recursive) return fail(`rm: ${name}: is a directory`, "rm");
        if (path === state.home || state.cwd.startsWith(path + "/") || path === state.cwd || path === "/") {
          return fail(`rm: ${name}: Stack Quest won't let you delete a folder you're standing in (or your home folder)`, "rm");
        }
        setNode(state.root, path, undefined);
        delete state.repos[path];
      }
      return done("rm");
    }

    case "mv":
    case "cp": {
      if (operands.length !== 2) return fail(`usage: ${cmd} source target`, cmd);
      const [from, to] = operands.map(at);
      const node = getNode(state.root, from);
      if (!node) return fail(`${cmd}: ${operands[0]}: No such file or directory`, cmd);
      if (cmd === "cp" && node.type === "dir") return fail(`cp: ${operands[0]} is a directory (not copied).`, cmd);
      const targetNode = getNode(state.root, to);
      const dest = targetNode?.type === "dir" ? `${to}/${baseName(from)}` : to;
      const destParent = getNode(state.root, parentOf(dest));
      if (!destParent || destParent.type !== "dir") return fail(`${cmd}: ${operands[1]}: No such file or directory`, cmd);
      setNode(state.root, dest, clone(node));
      if (cmd === "mv") setNode(state.root, from, undefined);
      return done(cmd);
    }

    case "code":
      out(`(In real life, this opens ${operands[0] === "." ? "this folder" : operands[0] ?? "VS Code"} in VS Code.)`, "muted");
      return done("code");

    case "open":
      out(`(In real life, this opens ${operands[0] === "." ? "this folder" : operands[0] ?? "it"} in Finder.)`, "muted");
      return done("open");

    case "git":
      return git(state, args, lines, fail, done);

    case "sudo":
      return fail("Stack Quest's practice terminal doesn't do sudo. On a real Mac, sudo runs a command with full admin power, so only use it when you understand exactly why.", "sudo");

    default:
      return fail(`zsh: command not found: ${cmd}`, cmd);
  }
}

function git(
  state: ShellState,
  args: string[],
  lines: OutLine[],
  fail: (t: string, c: string) => ExecResult,
  done: (c: string) => ExecResult,
): ExecResult {
  const out = (text: string, tone?: Tone) => lines.push({ text, tone });
  const [sub, ...rest] = args;

  if (!sub || sub === "help") {
    out("usage: git <command>");
    out("  init     start tracking this folder");
    out("  status   see what has changed");
    out("  add      choose changes to include in the next snapshot");
    out('  commit   save a snapshot: git commit -m "what you did"');
    out("  log      list the snapshots so far");
    return done("git");
  }
  if (sub === "--version") {
    out("git version 2.50.1");
    return done("git --version");
  }

  if (sub === "init") {
    if (state.repos[state.cwd]) {
      out(`Reinitialized existing Git repository in ${state.cwd}/.git/`);
      return done("git init");
    }
    mkdirP(state.root, `${state.cwd}/.git`);
    state.repos[state.cwd] = { index: {}, commits: [] };
    out(`Initialized empty Git repository in ${state.cwd}/.git/`);
    return done("git init");
  }

  const repoDir = findRepo(state);
  if (!repoDir) return fail(NOT_A_REPO, `git ${sub}`);
  const repo = state.repos[repoDir];
  const working = filesUnder(state.root, repoDir);
  const head = headFiles(repo);
  const rel = (p: string) => p.slice(repoDir.length + 1);

  if (sub === "status") {
    out("On branch main");
    if (repo.commits.length === 0) out("\nNo commits yet");
    const staged: string[] = [];
    const unstaged: string[] = [];
    const untracked: string[] = [];
    for (const p of new Set([...Object.keys(repo.index), ...Object.keys(head)])) {
      if (!(p in head)) staged.push(`new file:   ${rel(p)}`);
      else if (!(p in repo.index)) staged.push(`deleted:    ${rel(p)}`);
      else if (repo.index[p] !== head[p]) staged.push(`modified:   ${rel(p)}`);
    }
    for (const p of Object.keys(repo.index)) {
      if (!(p in working)) unstaged.push(`deleted:    ${rel(p)}`);
      else if (working[p] !== repo.index[p]) unstaged.push(`modified:   ${rel(p)}`);
    }
    for (const p of Object.keys(working)) if (!(p in repo.index)) untracked.push(rel(p));
    if (staged.length) {
      out("\nChanges to be committed:");
      staged.sort().forEach((s) => out(`\t${s}`, "success"));
    }
    if (unstaged.length) {
      out("\nChanges not staged for commit:");
      unstaged.sort().forEach((s) => out(`\t${s}`, "error"));
    }
    if (untracked.length) {
      out("\nUntracked files:");
      out('  (use "git add <file>..." to include in what will be committed)', "muted");
      untracked.sort().forEach((s) => out(`\t${s}`, "error"));
    }
    if (!staged.length && !unstaged.length && !untracked.length) {
      out(repo.commits.length ? "nothing to commit, working tree clean" : "\nnothing to commit (create/copy files and use \"git add\" to track)");
    }
    return done("git status");
  }

  if (sub === "add") {
    if (!rest.length) return fail("Nothing specified, nothing added.\nhint: Maybe you wanted to say 'git add .'?", "git add");
    for (const spec of rest) {
      const path = resolvePath(state.cwd, state.home, spec);
      const matchesWorking = Object.keys(working).filter((p) => p === path || p.startsWith(path + "/") || path === repoDir);
      const matchesIndex = Object.keys(repo.index).filter((p) => p === path || p.startsWith(path + "/") || path === repoDir);
      if (!matchesWorking.length && !matchesIndex.length) return fail(`fatal: pathspec '${spec}' did not match any files`, "git add");
      for (const p of matchesWorking) repo.index[p] = working[p];
      for (const p of matchesIndex) if (!(p in working)) delete repo.index[p];
    }
    return done("git add");
  }

  if (sub === "commit") {
    const m = rest.indexOf("-m");
    const message = m === -1 ? undefined : rest[m + 1];
    if (!message) {
      return fail('Aborting commit: add a message with -m, e.g. git commit -m "Add notes file"\n(The real Git would open a text editor here instead.)', "git commit");
    }
    const changed = new Set([...Object.keys(repo.index), ...Object.keys(head)].filter((p) => repo.index[p] !== head[p]));
    if (changed.size === 0) {
      const untracked = Object.keys(working).some((p) => !(p in repo.index));
      return fail(
        untracked ? 'nothing added to commit but untracked files present (use "git add" to track)' : "nothing to commit, working tree clean",
        "git commit",
      );
    }
    const id = shortHash(`${repo.commits.length}:${message}:${JSON.stringify(repo.index)}`);
    repo.commits.push({ id, message, files: { ...repo.index } });
    out(`[main${repo.commits.length === 1 ? " (root-commit)" : ""} ${id}] ${message}`);
    out(` ${changed.size} file${changed.size === 1 ? "" : "s"} changed`);
    return done("git commit");
  }

  if (sub === "log") {
    if (!repo.commits.length) return fail("fatal: your current branch 'main' does not have any commits yet", "git log");
    const oneline = rest.includes("--oneline");
    for (const c of [...repo.commits].reverse()) {
      if (oneline) out(`${c.id} ${c.message}`);
      else {
        out(`commit ${c.id}`, "success");
        out("Author: Learner <learner@example.com>");
        out("");
        out(`    ${c.message}`);
        out("");
      }
    }
    return done("git log");
  }

  return fail(`git: '${sub}' is not a git command in Stack Quest's practice terminal. Try git help.`, `git ${sub}`);
}

/* ---------- Checking tasks ---------- */

export interface TerminalCheck {
  /** A command ran successfully: either its name ("ls", "git status") or the exact line ("ls Documents"). */
  ran?: string;
  /** You're standing in this folder. */
  cwd?: string;
  /** These paths exist. */
  exists?: string[];
  /** These paths don't exist. */
  missing?: string[];
  /** This file contains this text. */
  fileContains?: { path: string; text: string };
  /** A Git repository exists in this folder. */
  gitRepo?: string;
  /** The repository in this folder has at least this many commits. */
  gitCommits?: { repo: string; atLeast: number };
  /** These files are staged (added) in the repository. */
  gitStaged?: { repo: string; paths: string[] };
}

export function checkTask(state: ShellState, check: TerminalCheck, ranCommands: string[]): boolean {
  const p = (path: string) => resolvePath(state.home, state.home, path);
  if (check.ran && !ranCommands.includes(check.ran)) return false;
  if (check.cwd && state.cwd !== p(check.cwd)) return false;
  if (check.exists?.some((x) => !getNode(state.root, p(x)))) return false;
  if (check.missing?.some((x) => getNode(state.root, p(x)))) return false;
  if (check.fileContains) {
    const node = getNode(state.root, p(check.fileContains.path));
    if (node?.type !== "file" || !node.content.includes(check.fileContains.text)) return false;
  }
  if (check.gitRepo && !state.repos[p(check.gitRepo)]) return false;
  if (check.gitCommits && (state.repos[p(check.gitCommits.repo)]?.commits.length ?? 0) < check.gitCommits.atLeast) return false;
  if (check.gitStaged) {
    const repo = state.repos[p(check.gitStaged.repo)];
    const head = repo ? headFiles(repo) : {};
    if (!repo || check.gitStaged.paths.some((x) => repo.index[p(x)] === undefined || repo.index[p(x)] === head[p(x)])) return false;
  }
  return true;
}

export function promptText(state: ShellState): string {
  return `learner@stack-quest ${displayPath(state.cwd, state.home) === "~" ? "~" : baseName(state.cwd)} %`;
}
