# Stack Quest: where we are

_Last updated: 15 November 2026_

## Your Phase 0 answers
1. Extra libraries approved: zod, idb, yaml, MDX, CodeMirror 6, PGlite, Vitest, Testing Library, Playwright.
2. Git on this Mac only for now. We connect GitHub during Trail 2.
3. A streak day ends at midnight South African time. You get 1 free streak freeze per week, and you earn more by finishing modules.
4. Hosting: Vercel's free Hobby plan in Phase 4 (personal use only). I ask before creating any account.
5. Sessions are 30 to 60 minutes.

## ✅ Phase 1: skeleton (done)
- App shell: header, skip link, light, dark and auto themes, mobile layout
- Dashboard: level, XP bar, streak, freezes, "pick up where you left off" and trail cards with progress rings
- Trail, module and unit pages, a "coming soon" outline page, a friendly 404 page and a profile page with badges and reset
- Content loader with schema checking (`content/`, explained in CONTENT_GUIDE.md)
- Progress saved in IndexedDB
- XP (no-hint bonus for challenges), levels, badges, streaks with freezes (South African midnight)
- Lessons: Trail 1 module 1 (3 units), the Trail 2 outline, and "How This App Works" module 1 (4 units)
- Tests: 26 logic tests (Vitest) and 14 browser tests (Playwright, desktop and phone)
- Dashboard JavaScript: **146 KB compressed**

### Known limitations
- Only "reading" units are interactive. The other unit types show a "Phase 2" note.
- The glossary terms in lessons are underlined but not tappable yet (Phase 2).
- Partial Prefetching is turned off so unknown addresses return a proper 404. We revisit this in Phase 4.
- If two browser tabs are open, the last one to save wins. That's fine for one learner, and Phase 4 sync will handle it properly.

## ✅ Phase 2: lesson engine (done)
- Exercise types: quiz, predict the output, type the code, fix the bug, build it, and Boss Challenge (code or questions)
- Three-step hint ladder on every challenge, then the full solution (no-hint bonus, never a penalty)
- Plain-English error translator for JavaScript and SQL errors, with line numbers
- Tappable glossary terms (built-in browser popovers) and a /glossary page
- Sandboxes: JavaScript (sealed iframe, then a worker, with no network and a 3-second limit), HTML/CSS (live preview and checks), SQL (real Postgres via PGlite in a worker, 5-second limit), and a pretend API (`fetch` and `server`)
- SQL engine: downloads only when you tap the button. 5.0 MB measured (squeezed down from 9.2 MB)
- New content: a Trail 1 quiz and Boss Challenge, plus "How This App Works" module 2 (9 units using real Stack Quest code)
- Every challenge's solution is tested automatically

### Known limitations (Phase 2)
- TypeScript can't be run yet. Running it needs an extra library (a TypeScript-to-JavaScript translator). I'll ask before adding one, when we reach the TypeScript trail.
- Tested in Chrome only. Safari should work (it uses the same web standards) but hasn't been tested by the robot.
- If a browser can't start a worker inside the sandbox, code runs in the sealed frame directly. It's still isolated, but an endless loop could then freeze the tab.
- Partial Prefetching is still off (revisit in Phase 4).

### Fixed after Phase 2 (dev mode)
- Lesson edits now show up straight away in `npm run dev`. The loader reads files directly instead of using "use cache".
- No more "Blocking Route" warning for unknown addresses (`instant = false`), and no React warning about the theme script.

## ✅ Phase 3: content (done, waiting for your "continue")
- **Trail 1** (no code), 5 modules, 27 units: your computer · the web · URLs and DNS · HTTP, APIs and JSON · databases and the cloud. Every module ends in a Boss Challenge, and the trail ends with a Trail Boss.
- **Trail 2**, 4 modules, 26 units: the terminal · VS Code · Git and GitHub · reading errors.
- **Practice terminal** (new engine piece): a pretend Mac terminal with pretend files and a mini Git (init, status, add, commit, log). It uses the same messages as the real thing and comes with a terminal error translator.
- **Outlines** for Trails 3–12, with module titles, goals and unit lists.
- **"How This App Works"** module 3: how the practice terminal works, fixing a real path bug, and how every lesson is tested.
- **Glossary** grown to 60 terms.
- **Every exercise is tested automatically**: solutions pass, starters fail, and terminal missions complete with their model commands.

### Known limitations (Phase 3)
- VS Code itself can't be simulated, so that module is readings and quizzes plus "try it on your Mac" steps.
- GitHub isn't connected. The lesson explains how, and we'll do it together when you choose.
- The practice terminal supports the commands listed in CONTENT_GUIDE.md only (no pipes `|`, no `cd -`, no git branches yet).

## 🟡 Phase 4: accounts, sync and offline (almost done)
- **Offline**: a hand-written service worker, a "save all lessons" button, an offline page, and an app manifest and icons so it can be installed like an app
- **Accounts**: email and password sign-in through Supabase, password reset, and "delete my account" (POPIA)
- **Sync**: progress merges between devices without losing anything, and the Supabase library only downloads when you use accounts
- **Leaderboard**: opt-in only, showing display names and XP for the top 20
- **Real Supabase project** "stack-quest" (free plan, EU Ireland). The tables and security rules from `supabase/schema.sql` are in, the security check shows only the 2 expected warnings, and your own sign-up, sync (10 XP) and leaderboard entry were checked in the database on 15 November 2026
- Tests: 105 logic tests and 56 browser tests

### Still to do in Phase 4
- Put the app online with Vercel (free Hobby plan). I'll ask before creating the account.
- After that, add the live address to Supabase (Authentication → URL Configuration) so email links open the live site.

### Known limitations (Phase 4)
- Supabase's built-in email only sends to members of your Supabase organisation, and only a few emails per hour. Before inviting other people, set up a proper email sender (SMTP).
- Free Supabase projects go to sleep after a week without use. Wake it up in the dashboard if sign-in stops working.
- Partial Prefetching is still off.

## ✅ Trail 3: HTML and CSS (written 15 November 2026)
You chose to write all the lessons before putting the app online, so content comes next, one trail at a time.
- **4 modules, 29 units**: your first web page · structure and meaning (semantic HTML, forms, accessibility) · styling with CSS (selectors, colours, fonts, the box model, specificity) · layout and responsive design (Flexbox, Grid, media queries, images that fit). Each module ends in a Boss, and the trail ends with a Trail Boss: a responsive portfolio page.
- 18 new glossary terms (78 in total)
- **New test**: every HTML and CSS exercise is now checked in a real browser (solutions pass, starters don't). Before this, only the JavaScript, SQL and terminal exercises were checked automatically.
- **Fixed**: the HTML/CSS checker could measure the page before its preview window had a size, on a busy computer or a slow phone. Layout and media-query checks could then wrongly fail a correct answer.

### Known limitations (Trail 3)
- The practice preview doesn't download real images (to save data), so exercises show alt text or simple built-in pictures instead.
- Checks measure the page at 800px wide. To see a phone layout, make the browser window narrow or open the lesson on your phone.

## Next: Trail 4 (JavaScript, then TypeScript)
Running TypeScript needs an extra library, a TypeScript-to-JavaScript translator. I'll ask before adding it.

## To resume
Open this folder in VS Code, start Claude, and say **"continue"**.
