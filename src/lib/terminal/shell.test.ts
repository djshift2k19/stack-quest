import { describe, expect, it } from "vitest";
import { checkTask, createShell, execute, promptText, resolvePath, tokenize, type ShellState } from "./shell";

/** Run several commands, returning the final state and every result. */
function run(state: ShellState, ...commands: string[]) {
  const results = [];
  for (const c of commands) {
    const r = execute(state, c);
    state = r.state;
    results.push(r);
  }
  return { state, results, last: results.at(-1)!, text: results.at(-1)!.lines.map((l) => l.text).join("\n") };
}

describe("paths and parsing", () => {
  it("resolves ~, .., and relative paths", () => {
    expect(resolvePath("/Users/learner/Documents", "/Users/learner", "..")).toBe("/Users/learner");
    expect(resolvePath("/a/b", "/Users/learner", "~/Projects")).toBe("/Users/learner/Projects");
    expect(resolvePath("/a/b", "/h", "./c/../d")).toBe("/a/b/d");
  });

  it("keeps quoted words together", () => {
    expect(tokenize(`git commit -m "Add my notes"`)).toEqual(["git", "commit", "-m", "Add my notes"]);
    expect(tokenize(`echo ''`)).toEqual(["echo", ""]);
  });
});

describe("moving around and files", () => {
  it("starts in the home folder with the usual folders", () => {
    const s = createShell();
    expect(run(s, "pwd").text).toBe("/Users/learner");
    expect(run(s, "ls").text).toBe("Desktop/\nDocuments/\nDownloads/");
    expect(promptText(s)).toBe("learner@stack-quest ~ %");
  });

  it("makes folders and files, moves around and writes text", () => {
    const { state, text } = run(createShell(), "mkdir projects", "cd projects", "touch notes.txt", 'echo "Hello" > notes.txt', 'echo "World" >> notes.txt', "cat notes.txt");
    expect(text).toBe("Hello\nWorld");
    expect(state.cwd).toBe("/Users/learner/projects");
    expect(promptText(state)).toBe("learner@stack-quest projects %");
  });

  it("gives the same error messages as a real Mac", () => {
    const s = createShell();
    expect(run(s, "lss").text).toBe("zsh: command not found: lss");
    expect(run(s, "cd nowhere").text).toBe("cd: no such file or directory: nowhere");
    expect(run(s, "mkdir Desktop").text).toBe("mkdir: Desktop: File exists");
    expect(run(s, "rm Desktop").text).toBe("rm: Desktop: is a directory");
    expect(run(s, "cat missing.txt").text).toBe("cat: missing.txt: No such file or directory");
  });

  it("moves, copies and deletes", () => {
    const { state } = run(createShell({ files: { "a.txt": "A\n" } }), "cp a.txt b.txt", "mv a.txt Documents", "rm b.txt");
    expect(run(state, "ls Documents").text).toBe("a.txt");
    expect(run(state, "ls").text).not.toContain("b.txt");
  });

  it("won't delete the folder you're in or your home", () => {
    const { last } = run(createShell(), "cd Documents", "rm -r ~/Documents");
    expect(last.ok).toBe(false);
  });

  it("hides dot-files unless you ask with ls -a", () => {
    const { state } = run(createShell(), "mkdir p", "cd p", "git init");
    expect(run(state, "ls").text).toBe("");
    expect(run(state, "ls -a").text).toBe(".git/");
  });
});

describe("git", () => {
  it("refuses outside a repository", () => {
    expect(run(createShell(), "git status").text).toContain("fatal: not a git repository");
  });

  it("goes through init, add, commit and log like real Git", () => {
    let { state, text } = run(createShell(), "mkdir site", "cd site", "git init", 'echo "Hi" > index.html', "git status");
    expect(text).toContain("No commits yet");
    expect(text).toContain("Untracked files:");
    expect(text).toContain("index.html");

    ({ state, text } = run(state, "git commit -m 'Too soon'"));
    expect(text).toContain("nothing added to commit but untracked files present");

    ({ state, text } = run(state, "git add index.html", "git status"));
    expect(text).toContain("Changes to be committed:");
    expect(text).toContain("new file:   index.html");

    ({ state, text } = run(state, 'git commit -m "Add home page"'));
    expect(text).toMatch(/^\[main \(root-commit\) [0-9a-f]{7}\] Add home page\n 1 file changed$/);

    ({ state, text } = run(state, "git status"));
    expect(text).toContain("nothing to commit, working tree clean");

    ({ state, text } = run(state, 'echo "Bye" >> index.html', "git status"));
    expect(text).toContain("modified:   index.html");

    ({ state, text } = run(state, "git add .", 'git commit -m "Say bye"', "git log --oneline"));
    expect(text.split("\n")).toHaveLength(2);
    expect(text.split("\n")[0]).toContain("Say bye");
  });

  it("asks for a message instead of opening an editor", () => {
    const { text } = run(createShell(), "git init", "touch a", "git add a", "git commit");
    expect(text).toContain("add a message with -m");
  });
});

describe("task checks", () => {
  it("can check the exact command typed, ignoring extra spaces and trailing slashes", async () => {
    const { normaliseCommandLine } = await import("./shell");
    expect(normaliseCommandLine("ls   Documents/")).toBe("ls Documents");
  });

  it("can start with Git already switched on in a folder", () => {
    const s = createShell({ dirs: ["projects/site"], repos: ["projects/site"], cwd: "projects/site" });
    expect(run(s, "git status").text).toContain("No commits yet");
  });

  it("checks folders, files, commands and git progress", () => {
    const { state } = run(createShell(), "mkdir projects", "cd projects", "git init", 'echo "x" > a.txt', "git add a.txt");
    const ran = ["mkdir", "cd", "git init", "echo", "git add"];
    expect(checkTask(state, { cwd: "~/projects", exists: ["~/projects/a.txt"] }, ran)).toBe(true);
    expect(checkTask(state, { fileContains: { path: "~/projects/a.txt", text: "x" } }, ran)).toBe(true);
    expect(checkTask(state, { gitRepo: "~/projects", gitStaged: { repo: "~/projects", paths: ["~/projects/a.txt"] } }, ran)).toBe(true);
    expect(checkTask(state, { gitCommits: { repo: "~/projects", atLeast: 1 } }, ran)).toBe(false);
    expect(checkTask(state, { ran: "pwd" }, ran)).toBe(false);
  });
});
