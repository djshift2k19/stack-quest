# Content guide: writing lessons for Stack Quest

All lessons live in the `content/` folder. You can add or change lessons without touching any app code. When the app starts, the **content loader** (`src/lib/content/loader.ts`) checks every file against the rules in `src/lib/content/schema.ts`. If something is wrong, it stops with a message naming the file and the problem.

After editing content, run `npm test`. The loader tests read every real lesson file and fail if any is broken.

## Folder layout

```
content/trails/
└── 01-how-computers-work/          ← a trail (the number sets its order)
    ├── trail.yaml                  ← about the trail
    └── 01-your-computer/           ← a module (the number sets its order)
        ├── module.yaml             ← about the module
        ├── 01-what-is-a-computer.mdx   ← a unit (the number sets its order)
        └── 02-files-and-folders.mdx
```

- The **number prefixes** (`01-`, `02-`, …) only control the order. Leave gaps or renumber freely.
- Web addresses use the **ids** inside the files, not the folder names: `/trails/how-computers-work/your-computer/what-is-a-computer`.
- **Ids** use lowercase letters, numbers and dashes only (`what-is-a-file`). Once learners have progress on a unit, **don't change its id**, or their progress for that unit is lost.

## `trail.yaml`

```yaml
id: how-computers-work
title: How Computers and the Internet Work
summary: One or two sentences shown on the dashboard.
status: available          # or: coming-soon
badge:
  name: Internet Explorer of the Mind
  emoji: 🌍
```

A **coming-soon** trail has no module folders yet. Instead it lists an outline:

```yaml
status: coming-soon
plannedModules:
  - title: The Terminal, Without Fear
    goals:
      - Move around folders and list files using typed commands.
    units: [What is a terminal?, Moving around (cd)]
```

## `module.yaml`

```yaml
id: your-computer
title: "Your Computer: Files and Programs"
summary: Shown on the trail page.
goals:                     # at least one; shown as "By the end you'll be able to…"
  - Explain in your own words what a computer does.
badge:
  name: Computer Whisperer
  emoji: 💻
```

## The glossary

`content/glossary.yaml` lists every term with an `id`, `term`, `definition` (one or two plain sentences) and an optional `example`. Add an entry before using a new `<Term word="...">`.

## Unit files (`.mdx`)

A unit starts with a **frontmatter** header between `---` lines, then the lesson text:

```mdx
---
id: what-is-a-file
title: What is a file?
type: reading
minutes: 5        # 1 to 10: units must take 10 minutes or less
xp: 10            # optional, default 10
goals:
  - Explain what a file is.
---

<Analogy title="A filing cabinet">
Everyday comparison first...
</Analogy>

## Then the technical idea

Normal text, **bold**, `code`, lists, and code blocks.

<KeyIdea>
One- or two-sentence summary.
</KeyIdea>
```

### Unit types

Every unit has the same base fields (`id`, `title`, `type`, `minutes`, `xp`, `goals`). The lesson text under the header is shown first. For exercises, it's the explanation and instructions. Then each type adds its own fields:

**`reading`**: nothing extra. The learner presses "Mark as complete".

**`quiz`**: one or more multiple-choice questions. Exactly one option per question must have `correct: true`. `why` is shown when that option is picked, so explain the misunderstanding kindly.

```yaml
type: quiz
questions:
  - prompt: Which part is the input?
    options:
      - text: Typing the message
        correct: true
        why: Yes. Input is information going in.
      - text: The message arriving
        why: That's output.
    hint: Input means "information going in".   # optional
```

**`predict-output`**: show code and ask what it prints. Give either `options` (multiple choice) or `answer` (the exact printed text), plus an `explanation` and exactly 3 `hints`.

```yaml
type: predict-output
language: javascript
code: |
  console.log(2 + 3);
answer: "5"
explanation: The + adds the numbers, so it prints 5.
hints: [Nudge…, Bigger hint…, Nearly the answer…]
```

**`type-the-code`**: the learner types `target` exactly. Hints are generated automatically from the first difference.

```yaml
type: type-the-code
language: javascript
target: |
  console.log("Hello!");
```

**`fix-the-bug`**, **`build-it`** and **`boss`**: a code `challenge` with automatic checks. A `boss` can instead use `questions` (like a quiz) for no-code trails. Bosses default to 50 XP.

```yaml
type: fix-the-bug            # or build-it, or boss
challenge:
  language: javascript       # javascript | html | css | sql
  starter: |                 # what's in the editor at the start
    ...
  solution: |                # shown only after all 3 hints
    ...
  hints:                     # exactly 3: nudge, bigger hint, near-solution
    - ...
    - ...
    - ...
  tests:
    - name: add(2, 3) gives 5          # write names as facts the learner can read
      code: expect(add(2, 3)).toBe(5)
```

Test code for **JavaScript, HTML and CSS** uses `expect(...)`, which can see the learner's variables and functions (and `document` for HTML/CSS). Available checks: `toBe`, `toEqual`, `toBeTruthy`, `toBeFalsy`, `toBeDefined`, `toBeUndefined`, `toContain`, `toMatch`, `toHaveLength`, `toBeGreaterThan`, `toBeLessThan` and `toThrow`. Put `.not` in front to flip any of them (`expect(x).not.toBe(3)`). Test code can use `await`.

- **CSS** challenges need a `fixture`: the HTML page that the learner's CSS styles. Check styles with `getComputedStyle(element).color`, and so on. Colours come back as `rgb(...)`.
- **JavaScript** challenges can add a pretend API with `api:` (a list of `method`, `path`, `status` and `body`), which `fetch(...)` answers. Learner code can also act as the server: `server.get("/path/:id", (req, res) => res.status(200).json({...}))`.
- **SQL** challenges need `setup` (statements that create and fill the tables). SQL tests are either `sameResultAs: <model query>` (with `orderMatters: true` if order is part of the task), or `check: <query>` with `expect: [[row values], ...]` to inspect the database after the learner's INSERT, UPDATE or DELETE.

**Every challenge is tested automatically** (`tests/content-solutions.test.ts`): each solution must pass its own tests, and each starter must not. Run `npm test` after writing one.

### Building blocks you can use

| Block | Use it for |
|---|---|
| `<Analogy title="...">…</Analogy>` | The everyday comparison. Put it **before** the technical term. |
| `<KeyIdea>…</KeyIdea>` | The one thing to remember. End each reading with one. |
| `<Term word="file-path">file path</Term>` | A tappable technical term that shows its definition. The `word` must match an `id` in `content/glossary.yaml` (the checker insists). |

### Writing style

1. **Analogy first, then the technical term.** Define every term the first time it appears.
2. **Short.** If a unit takes more than 10 minutes, split it.
3. **Talk to one person**, using "you". Use South African examples where natural.
4. **No punishment language.** Mistakes are normal; retrying is always fine.

### Gotchas

- In the YAML header, a sentence that contains `: ` (colon then space) must be wrapped in quote marks:
  `- "Name the three things: input, process, output."`
- In MDX text, `{`, `}` and `<` have special meanings. Put code in backticks (`like this`) or code blocks.
- Tables aren't supported yet (they need an extra library). Use lists.
- In YAML, text that starts with `<`, `{`, `[` or a quote, or contains `: `, should be wrapped in quote marks.
- MDX can contain code, so the app only renders files from this folder, never text typed in by learners.
