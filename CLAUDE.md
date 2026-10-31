# The World Game

A browser strategy game: governing a country and power across a map. React, TypeScript, Vite, Vitest. No backend.

Read before changing anything: [TECHNICAL_DESIGN.md](TECHNICAL_DESIGN.md) for how the code is laid out, [TODO.md](TODO.md) for known rough edges and measured balance notes. [GAME_DESIGN.md](GAME_DESIGN.md) and [ROADMAP.md](ROADMAP.md) say what the game is and where it is going.

## Checks before calling work done

- `npx tsc -b`, `npm run lint` (five old fast-refresh and hook-dependency warnings are known), `npm run build`, `npm test`.
- In a fresh worktree, run `npm ci` first: `node_modules` is not shared.
- If every test file fails to load ("reading 'config'"), vitest was started from a lowercase `c:/` path. Use `C:/`.
- UI changes: look at the screen in a browser, at a normal window and at about 1000px wide.

## Code rules

- Domain rules in `src/domain/<concept>/`, cross-domain use cases in `src/application/`, React only in `src/presentation/`.
- Every tunable number goes in `src/domain/constants.ts`.
- A new `GameState` field needs a default in `hydrateGameState` (`src/presentation/hooks/gameSave.ts`), so old saves load.
- Each thing has one name (`src/presentation/glossary.ts`) and one number format (`src/presentation/formatNumber.ts`). Tests enforce both.
- A test of one rule uses `tests/support/calmStart.ts`. Long scripted games live in `tests/balance.test.ts`.
- Match the surrounding code. Save edits as UTF-8.

## Player-visible text

- Plain sentences. Never an em dash.
- Short. Explanations go in tips; visible words are for actions and reasons.

## Look and feel

- Clear first, beautiful second, accessible third. Its own sharp style: never soft rounded boxes, and never a copy of HoI4.
- Chrome is bottle green with gilt borders (`--bar*` tokens in `src/index.css`), and tabs keep their borders.
- Navigation uses icons, named in the tip. This was the owner's choice on 2026-10-29: do not add permanent text labels. Actions and reasons keep words.
- New features add no window or tab. Each thing lives in one window (`src/presentation/navigation.ts`).
- Tips wait for the pointer to rest. Only one tip shows at a time: use `data-tip`, not SVG titles.
- Map pictures never overlap each other. No province names on the map.
- Changes to the look: show real screenshots and let the owner pick before building.

## Decisions that belong to the owner

Stop and ask rather than guess on:

- The words of story letters, which are agreed before they are built.
- Inflation and making the game educational: neither is decided, so do not start on them.
- Anything that changes the difficulty ladder recorded in `src/domain/difficulty/difficultyData.ts`.

"A government always falling apart" (2026-10-31, see TODO.md) is deliberate. Make the pressure easier to understand. Do not remove it.

## Working from a task file

When given a file in `plans/tasks/`:

1. Do only what it says. Note anything else you find under Results, and leave it alone.
2. Work on your own branch and commit there. Never push, and never merge into another branch.
3. Do not edit `ROADMAP.md` or `plans/board.md`: the manager keeps those.
4. When finished, fill in Results in the task file: what changed, the output of the checks, what you could not verify, and anything left open.
5. If you hit one of its "stop and ask" conditions, write the question under Results and finish there.
