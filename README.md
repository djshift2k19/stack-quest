# Stack Quest 🧭

A gamified learning app that takes you from "what is a file?" to building full-stack web apps, in short units of 10 minutes or less.

This guide assumes you've never used these tools before. If a word is new, it's explained the first time it appears.

---

## 1. One-time setup on a Mac

You only do this once per computer.

### Open the Terminal

The **Terminal** is an app where you type instructions for your Mac instead of clicking.

1. Press **⌘ Command + Space** to open Spotlight search.
2. Type `Terminal` and press **Return**.

A window with a blinking cursor appears. When this guide shows a grey box of text, type it into the Terminal (or copy and paste it) and press **Return**.

### Install Git

**Git** keeps a history of every change to the project, like "track changes" for a whole folder.

```bash
xcode-select --install
```

A pop-up asks to install "command line developer tools". Click **Install**. It's a large download (several hundred MB), so use Wi-Fi if you can. When it's done, check it worked:

```bash
git --version
```

You should see something like `git version 2.50.1`.

### Install Node.js

**Node.js** lets your Mac run JavaScript programs outside the browser. Stack Quest needs it. Installing it also gives you **npm**, a tool that downloads code libraries the project uses.

1. Go to **https://nodejs.org** and download the **LTS** version for macOS (LTS means "long-term support": the stable one).
2. Open the downloaded file and click through the installer.
3. Close and reopen the Terminal, then check:

```bash
node --version
npm --version
```

You should see two version numbers (Node 20 or newer).

### Get the project and its libraries

Move into the project folder (`cd` means "change directory", that is, go into a folder):

```bash
cd ~/Projects/stack-quest
```

Download the libraries the project needs (about 200 MB the first time; after that it's quick):

```bash
npm install
```

---

## 2. Run the app (every time)

```bash
npm run dev
```

Wait until you see `Ready`, then open **http://localhost:3000** in your browser.

- **localhost** means "this computer": the app runs on your Mac, not the internet.
- **3000** is the "port": like a flat number in a building, so different apps on one computer don't mix up.

The page updates by itself when you save a change to a file. To stop the app, click in the Terminal and press **Control + C**.

---

## 3. Check everything works

| Command | What it does |
|---|---|
| `npm test` | Runs the quick logic tests (XP, levels, streaks, badges, lesson files). Takes about a second. |
| `npm run check` | Runs the linter (spots risky code), the type-checker (spots mismatched data) and the tests. Run this before saving work to Git. |
| `npm run test:e2e` | Builds the app and has a robot click through it in Google Chrome on a desktop and a phone screen size. Takes about a minute. Needs Google Chrome installed. |
| `npm run build` | Builds the fast "production" version, like the one that will go online. |

---

## 4. Where things are

```
content/        the lessons: one .mdx file per unit (see CONTENT_GUIDE.md)
src/app/        the pages; each folder is a web address
src/components/ reusable pieces of screen
src/lib/        the logic: content loading, progress saving, XP/levels/streaks/badges
tests/e2e/      the robot browser tests
PROGRESS.md     what's built so far and what's next
```

The **How This App Works** trail inside the app explains all of this in more depth.

---

## 5. Your progress and privacy

Progress is saved **in your browser** on this device, using a built-in browser database called IndexedDB. There's no account and nothing is sent anywhere. If you clear your browser's site data or switch browsers, progress starts fresh. Accounts and syncing arrive in a later phase.

## 6. Secrets and settings (for later phases)

Some later features need private keys, for example for logins. These go in a file called `.env.local` in the project folder. That file is **never** saved to Git (the `.gitignore` file excludes it) or shared, and you should never paste its contents into a chat. None are needed yet. Each later phase will list its settings here, for example:

| Setting | Phase | Where it's used |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | 4 | accounts and progress sync (your project's address) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 4 | accounts and progress sync (safe in the browser; the *secret* key is never used) |
| `ANTHROPIC_API_KEY` | 6 | the AI tutor, **server only**, never sent to the browser |

## Troubleshooting

- **`command not found: npm`**: Node.js isn't installed, or the Terminal was open during the install. Close and reopen the Terminal.
- **`Port 3000 is in use`**: the app is already running in another Terminal window. Use that one, or stop it with Control + C.
- **Something else?** Copy the **first red line** of the error. That line usually says what went wrong.
