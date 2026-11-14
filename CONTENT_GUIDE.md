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

| `type` | Status |
|---|---|
| `reading` | ✅ Works now (Phase 1) |
| `quiz`, `predict-output`, `fix-the-bug`, `type-the-code`, `build-it`, `boss` | Accepted by the checker; interactive in Phase 2 |

### Building blocks you can use

| Block | Use it for |
|---|---|
| `<Analogy title="...">…</Analogy>` | The everyday comparison. Put it **before** the technical term. |
| `<KeyIdea>…</KeyIdea>` | The one thing to remember. End each reading with one. |
| `<Term word="file-path">file path</Term>` | Marks a technical term. In Phase 2 it becomes tappable and shows the definition from the glossary. |

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
- MDX can contain code, so the app only renders files from this folder, never text typed in by learners.
