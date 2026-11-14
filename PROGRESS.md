# Stack Quest: where we are

_Last updated: 14 November 2026_

## Done
- **Phase 0 (plan):** agreed. Your answers:
  1. Extra libraries approved: zod, idb, yaml, MDX, CodeMirror 6, PGlite, Vitest, Testing Library, Playwright.
  2. Git on this Mac only for now. We connect GitHub during Trail 2.
  3. A streak day ends at midnight South African time. You get 1 free streak freeze per week, and you earn more by finishing modules.
  4. Hosting: Vercel's free Hobby plan in Phase 4 (personal use only). I ask before creating any account.
  5. Sessions are 30 to 60 minutes.
- Git history started (`git log` shows it).
- Libraries installed: zod, idb, yaml, @mdx-js/mdx.

## In progress: Phase 1 (skeleton)
- [ ] **Fix first:** Vitest and Playwright failed to install. The cause is a version clash with `@types/node` v20, and Vitest needs v22 or newer. The fix is to update `@types/node` to match Node v26, then install again. Playwright will use your installed Google Chrome, so there's no 150 MB browser download.
- [ ] App shell, light and dark mode, dashboard
- [ ] Trail, module and unit pages, plus the content loader (`content/` folder)
- [ ] Saving progress in the browser (IndexedDB)
- [ ] XP, levels, badges, streaks with streak freeze
- [ ] "How this app works" trail, first units
- [ ] Tests, README for beginners, CONTENT_GUIDE.md, bundle size measurement
- [ ] End-of-phase summary and your "Your turn" task

## To resume
Open this folder in VS Code, start Claude, and say **"continue Phase 1"**.
