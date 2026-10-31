# 03: Fewer interruptions

Branch: `task/03-fewer-interruptions`. Read `CLAUDE.md` first.

## Why

A playtester had several chapter announcements and decisions arrive one after another, and they displaced the window in use. The cause of the displacement is confirmed: `src/App.tsx:344-349` closes the open window whenever a briefing is unread, and nothing brings it back. The earlier work on this (TODO.md, "Fewer pop-ups", 2026-10-29) cut how many notices appear. This task is about how they arrive.

## What to do

1. **Give the window back.** When a briefing or letter closes the open window, reopen that window, at the same section, once the last one waiting is dealt with. Unless the player has since chosen to go somewhere else (a briefing's "Go" button, say), which wins.
2. **One story beat, one stop.** A story chapter's briefing and its letter arrive as two separate stops (`readBriefing` in `src/application/chapters.ts`). Make them read as one step for the player, without changing what either one says or does.
3. **Queue what isn't urgent.** When several chapters open close together, show them one at a time, with a sign of how many are waiting. Check first what the game already does: `advanceChapters` can open more than one on a day, and `ChapterBriefing.tsx` shows them.
4. **Measure it.** Report how many stops a scripted careful game has in its first six months, before and after, for all three nations on Normal.

## Out of scope

The number or timing of chapters, the chance of random letters, and any wording of a letter. The rule that story letters can't be closed unanswered, and that the clock stays stopped while one waits (`isLetterWaiting` in `useGameClock.ts`).

## Done when

- Tests cover items 1 and 2, including an old save with briefings waiting.
- All checks in `CLAUDE.md` pass, and the balance figures in `tests/balance.test.ts` are unchanged. The scripted player reads its briefings, so check this one closely.
- Results include browser screenshots of a window coming back after a briefing, with their file paths.

## Stop and ask if

Item 2 would change when a letter's effects apply, or which day a later chapter opens.

## Results

### What changed

1. **The window comes back.** A letter now holds the open window back instead of closing it (`src/presentation/windowHold.ts`), with the window kept mounted but hidden under React's `Activity`. So it returns exactly as it was: section, the category tab in Laws and Research (which live in the panel, not in `sections`), selection and scroll. It returns once `isLetterWaiting` is false and no story letter is queued in `chapters.letters`. Any window the player opens meanwhile replaces the one held. That is reachable, because the top bar and toasts stay live behind a letter. If another letter then arrives, the chosen window is the one that returns.
2. **One beat, one stop.** When a story letter would come straight after its briefing anyway (`joinedLetter` in `chapters.ts`), both appear on one two-column page and one answer does both (`readAndAnswer`: `readBriefing` then `resolveDecision`, nothing between them). `readBriefing` and `resolveDecision` are unchanged. It stays two stops whenever joining would change the order or the day: another briefing unread, a letter already open, a burden offered, or a chapter with a crisis (none has both today, and a test says so). So this doesn't change when effects apply or which day a chapter opens, and the "stop and ask" condition did not arise. A joined page can't be closed, because a story letter can't be closed unanswered, and its answers don't take focus, so Enter can't answer by accident.
3. **The queue.** The game already showed chapters one at a time (`unread[0]`). The game stops until a briefing is read, so chapters only pile up when they open on the same day. Added the sign, "2 more waiting" (`stopsBehind`), which counts the other briefings, the letters still to come and any other letter waiting. Also keyed the briefing's `Modal` by chapter: the next in a queue kept the last one's scroll, starting partway down at 1000px.
4. **Stops in the first six months.** See below. `tests/support/carefulPlayer.ts` gained an `onStop` hook, which only observes.

Other files: `ChapterBriefing.tsx/.css`, `DecisionModal.tsx` (its answers became `LetterAnswers`, shared), `App.tsx`, `TECHNICAL_DESIGN.md`, new `tests/interruptions.test.ts` (18 tests).

### Before and after

180 days, careful script, Normal. A stop is each letter or briefing the player must deal with, including the opening one. Before counts a joined briefing and letter as two, after as one. It is one scripted game counted both ways, since the game itself did not change.

| Nation | Seed 20261015 (the balance seed) | Five seeds (20261015, 1, 2, 3, 4), before | After | Mean |
| --- | --- | --- | --- | --- |
| Astravia | 8 to 7 | 8 11 9 10 8 | 7 10 8 9 7 | 9.2 to 8.2 |
| Caldenreich | 12 to 11 | 12 11 8 14 9 | 11 11 7 13 8 | 10.8 to 10.0 |
| Veldoria | 11 to 10 | 11 10 10 13 9 | 10 10 10 12 8 | 10.6 to 10.0 |

The drop is small: one stop per six months, as each nation has one story letter that early. In 2 of the 15 games it did not join, because something else stood between the briefing and its letter. Most stops are other briefings, random decisions, demands and crises, all out of scope here. What the player gains most is item 1.

The script deals with a day's letters in its own order (the decision last, where `App.tsx` shows it first). That doesn't change the count.

### Checks

- `npx tsc -b`: exit 0, no output.
- `npm run lint`: the five known warnings and no others (`useGameClock.ts:53`, `Gauge.tsx:125`, `BuildingIcon.tsx:8`, `ResourceIcon.tsx:5`, `App.tsx:333`, the last the old `state.outcome` dependency at its new line number).
- `npm run build`: built in 321ms.
- `npm test`: Test Files 30 passed (30), Tests 426 passed (426). Before this work: 29 files, 408 tests.
- **Balance unchanged, checked closely.** `tests/balance.test.ts` passes, but its checks are thresholds, so I also compared whole games. 42 three-year games (three nations; Easy, Normal, Hard, sloppy, every habit on, Long Reign, a law path; two seeds each) dumped before any change and after the last one: date, stats, elections, chapters opened, deeds and a hash of the full state with running ids taken out. The two files are byte-identical (SHA-256 `7585F753...0294E7`). The dump was a temporary test, not committed.

### Browser

Driven in Chrome at 1440x900 and 1000x760 with no page errors. Saves were edited to put the date just before a chapter, then played on at 5x.

- Laws on its third category (Order), a story chapter arrives: Laws hidden, joined page up, clock stopped, Escape does nothing. Answered: Laws back on Order.
- Build's People scrolled to 150, two chapters on one day: sign says "1 more waiting", then the joined page, then People back at scroll 150.
- Reports opened from the top bar with a letter up: after the answer Reports stands and Build does not return.
- Old-shape save (no `chapters.letters`) with a briefing waiting: loads, one stop, no window opens after it.

Screenshots, in `C:\Users\lorta\AppData\Local\Temp\claude\c--Users-lorta-Documents-repos-Theworldgame\e368a804-c798-48e1-adaa-e1b647feed00\scratchpad\shots\`:

- Window coming back, 1440: `normal-1-window-open.png`, `normal-2-letter-up.png`, `normal-4-window-back.png`
- Window coming back, 1000: `narrow-1-window-open.png`, `narrow-2-letter-up.png`, `narrow-4-window-back.png`
- The sign: `normal-5-more-waiting.png`, `narrow-5-more-waiting.png`
- People back after two chapters: `normal-6-people-back.png`, `narrow-6-people-back.png`

### Could not verify

- `npm test` does not exercise the window coming back in a real React tree. The repo has no DOM test library, so `tests/interruptions.test.ts` covers the hold rules as pure functions and the page with `renderToStaticMarkup`. The hide and return themselves were checked only in the browser run above, which isn't repeatable by `npm test`.
- Scroll kept through `Activity` was seen in Chrome only. Other browsers may reset a hidden element's scroll. The section and selection don't depend on this.
- Sound wasn't checked by ear. By the code, a joined page plays one letter sound, where the separate letter used to play a second.
- Only Astravia's joined page was looked at in the browser. All 21 story letters are covered by the tests for joining and for state.

### For the owner

- **The joined page is a new look**, and `CLAUDE.md` asks for screenshots before look changes. The task called for it, so it is built: see `normal-2-letter-up.png`. Its story and letter sit side by side so the answers show without scrolling (stacked, they fell below the fold at 900px tall), and it drops to one column below 820px wide.
- **A joined page has no "To work" button**, since answering replaces it. That is the one word that goes. No letter or briefing wording changed.

### Left open, not touched

- A burden offer doesn't take the window away, as the other letters do, so it opens over it. Unchanged. The hold does wait for it before giving a window back.
- The "more waiting" sign is on briefings only. A decision, crisis or demand letter shows no count.
- A danger pause (`applyDangerPause`) isn't counted as a stop: it opens no window, and the script calls `simulateDay`, so it never pauses this way.
- While a story letter sits in `chapters.letters`, a held window stays hidden for the day until that letter is sent, with the clock running and the map showing.
- The "To work" button's `autoFocus` scrolls a tall briefing to its foot at small sizes, so its top is out of view on arrival. This was already so.

