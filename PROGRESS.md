# Stack Quest: where we are

_Last updated: 14 November 2026_

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

## ✅ Phase 2: lesson engine (done, waiting for your "continue")
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

## Next: Phase 3 (content)
Write Trails 1 and 2 in full, plus outlines for the other trails.

## To resume
Open this folder in VS Code, start Claude, and say **"continue"**.
