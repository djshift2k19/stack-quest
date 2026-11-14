# Stack Quest: where we are

_Last updated: 14 November 2026_

## Your Phase 0 answers
1. Extra libraries approved: zod, idb, yaml, MDX, CodeMirror 6, PGlite, Vitest, Testing Library, Playwright.
2. Git on this Mac only for now. We connect GitHub during Trail 2.
3. A streak day ends at midnight South African time. You get 1 free streak freeze per week, and you earn more by finishing modules.
4. Hosting: Vercel's free Hobby plan in Phase 4 (personal use only). I ask before creating any account.
5. Sessions are 30 to 60 minutes.

## ✅ Phase 1: skeleton (done, waiting for your "continue")
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

## Next: Phase 2 (lesson engine)
Quiz, predict-the-output, fix-the-bug, type-the-code, hint ladder, error translator, glossary, and the HTML/CSS, JavaScript and SQL sandboxes.

## To resume
Open this folder in VS Code, start Claude, and say **"continue"**.
