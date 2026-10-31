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

