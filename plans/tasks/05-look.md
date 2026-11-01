# 05: Winter, the Build window, and the top bar's lines

Branch: `task/05-look`. Read `CLAUDE.md` first. Owner's list items 1, 2, 5 and 10.

## What to do

1. **A softer winter.** The white on the map is too strong. Weaken the effect in `src/presentation/components/MapSeasons.css` (`.map-panel[data-season="winter"]`, line 35). It should still read clearly as winter, and map pictures, borders and province colours should stay easy to see. Compare before and after by screenshot.
2. **Less text under each building** (`src/presentation/components/ActionsPanel.tsx`, the `build-row` list from about line 543). A row shows the picture, name, yield, costs and count. Move the explanations into tips (`data-tip`, which wait for the pointer to rest). A row keeps words only for a reason it can't be built right now, and that reason stays short.
3. **Show the first payment.** `upfrontCost` (`src/application/actions/createBuildAction.ts:67`) takes 60% of the price when a building is ordered, and the rest during the build. Today this is only in a tip. Show it on the row itself, briefly and with no paragraph, for money and goods. Read the share from one named constant in `src/domain/constants.ts` rather than the bare `0.6`, and do not change its value: the owner agreed on 2026-10-31 to keep 60%.
4. **No red lines in the top bar.** Remove the bars along the foot of top bar items in trouble (`src/presentation/components/ResourceTicker.css`, `.is-danger` line 57 and `.is-warn` line 91). Keep the lettering colour and the "!", so danger still doesn't rest on colour alone. Leave the gilt mark on an open item (line 121), and look at the same bar on the top tabs if there is one.

5. **One size for the Build window.** Today Buildings is docked to the side at 36rem (`.modal.modal--side` in `src/presentation/components/Modal.css:195`) and People is centred over the map at 64rem (`.modal--wide`). The owner chose a size in between: start at 50rem for both sections, so switching between them doesn't change the window's size or position. Buildings must stay docked so its provinces can still be chosen on the map, which means People docks too (`side` in `src/App.tsx`, the Build window). Check that People's tables and cards fit without sideways scrolling. Below about 1100px wide, where 50rem would hide the map, choose what keeps provinces choosable, and say what you chose under Results. Other windows that use `modal--side` or `modal--wide` must not change.

## Out of scope

Rules and numbers. New windows or tabs. Removing facts rather than moving them: the owner has been annoyed before when stats were deleted after they only disliked the look.

## Done when

- All checks in `CLAUDE.md` pass, including `tests/vocabulary.test.ts` and `tests/numbers.test.ts`.
- Results include before and after screenshots of each item, at a normal window and at about 1000px wide, with their file paths.

## Results

### What changed

1. **Winter** (`MapSeasons.css`). Frost 0.34 to 0.10, land wash 0.36 to 0.26, sea 0.28 to 0.22, snow marks 0.85 to 0.70. Province colours and pictures now show through. It still reads as winter from the cool tone and the snow.
2. **Less text under each building** (`ActionsPanel.tsx`, `.css`). Reasons are now a few words ("150 Cr short.", "No room here.", "Not open yet.", "Short of wood.", "Rebels hold North Redgate."), and the old full sentence moved to that reason's `data-tip`. Nothing was dropped: the disabled button's `aria-label` also carries the full sentence. "1 broken here. See Repairs." became a wrench and a number beside the pips, with the sentence in its tip.
3. **First payment**. Each cost now reads "650 (390 now)" and "15 (9 now)". The share is `BUILD_UPFRONT_SHARE = 0.6` in `constants.ts`, value unchanged. `upfrontCost` reads it, and `ActionsPanel` now calls `upfrontCost` rather than keeping its own copy of 0.6.
4. **Top bar** (`ResourceTicker.css`). The red and amber bars are gone. Lettering colour and the "!" stay, and the gilt mark on an open item stays. The top tabs do have a bar at the foot (`.top-bar__tab::after`), but it is only gilt, on hover and on the open tab, never a trouble colour, so I left it.
5. **One size** (`Modal.css`, `App.tsx`, `PeoplePanel.css`). `.modal--side` is 50rem and Build is always `side`, no longer `wide`. Measured in both sections, left, top, width, height: 624, 170, 800, 706 at 1440x900; 408, 204, 576, 532 at 1000x760. Money still opens `modal--wide` at 1024px. No other window uses `modal--side`.

**Below 1100px wide: I chose 36rem**, the size Buildings already had, for both sections. It leaves about 400px of map at 1000px wide, where 50rem would leave about 180px. People's two layouts that break at that width (the four needs, and the fill order) now stack below 1100px rather than 760px. Those rules only apply inside this window.

**One change the task did not name.** With People docked, a map click would have opened the province card, which covered most of the remaining map at 1000px. `buildOpen` in `App.tsx` now holds for both sections, so a map click picks the province, and the People table's highlight follows it. Previously a click outside People closed the window, so no player relied on the old behaviour.

### Checks

- `npx tsc -b`: exit 0, no output.
- `npm run lint`: exit 0, the 5 known warnings (`useGameClock.ts:53`, `App.tsx:333`, `BuildingIcon.tsx:8`, `ResourceIcon.tsx:5`, `Gauge.tsx:125`).
- `npm run build`: exit 0, "built in 429ms".
- `npm test`: exit 0, "Test Files 33 passed (33), Tests 483 passed (483)", including `tests/vocabulary.test.ts` and `tests/numbers.test.ts`. One run, no failures.

Browser checks, headless Chromium, at 1440x900 and 1000x760:

- People has no sideways scrolling at either size: `.modal__body` scrollWidth equals clientWidth (798 and 574), and no element inside overflows.
- Top bar items in trouble report `box-shadow: none`, for both `is-danger` and `is-warn`.
- A reason's tip is absent at 100ms and shows after the pointer rests.
- A map click in Buildings changes the province, and in People opens no card.

### Screenshots

Folders, same file names in each (not committed):

- Before: `C:\Users\lorta\AppData\Local\Temp\claude\c--Users-lorta-Documents-repos-Theworldgame\e368a804-c798-48e1-adaa-e1b647feed00\scratchpad\shots\before\`
- After: `C:\Users\lorta\AppData\Local\Temp\claude\c--Users-lorta-Documents-repos-Theworldgame\e368a804-c798-48e1-adaa-e1b647feed00\scratchpad\shots\after\`

By item, each with `-normal` and `-narrow`:

- Item 1: `1-winter-*.png` (also `1-summer-normal.png`, `1-autumn-normal.png` to tell the seasons apart).
- Items 2 and 3: `2-build-buildings-*.png`, `3-build-blocked-*.png`, `3-build-buy-*.png` (also `3-build-no-room.png`, `3-build-rebels.png`, and `-tall` versions of the first two, normal width only).
- Item 4: `4-topbar-trouble-*.png`, `4-topbar-warn-*.png` (also `4-topbar-open-chip.png`, normal width only).
- Item 5: `5-build-people-*.png`.

After only: `3-build-reason-tip-*.png`, `5-build-people-scrolled-*.png`, `5-people-map-click-*.png`, `5-map-dragged-*.png`.

Numbers come from edited saves in slot 0, made to show each state. They are not a played game.

### Open, for the owner

- **50rem hides more of the map.** At 1440x900 and at 1000x760, only 3 of Astravia's 6 provinces can be clicked beside the docked window at the default map position. Dragging the map 300px left makes all 6 clickable at both sizes, and in People the table can pick any province. The window can also be dragged. If this is too much, the 1100px line could go higher or the window narrower.
- **`CLAUDE.md` asks that look changes show screenshots for the owner to pick from before building.** This task set the changes directly, so I built them. The winter values are my judgement: the owner may want it softer or stronger.
- **Two cost tips stay `title`, not `data-tip`.** They say "You have X", which ticks over, and `Tooltips.tsx` only follows a changing `title` while it is pointed at. They wait for the pointer to rest all the same. A reason's `data-tip` holds its text while pointed at, so "Enough money in 12 days" can lag by a few days at most until the pointer moves. I left `Tooltips.tsx` alone as out of scope.

### Could not verify

- Touch and tablet (`pointer: coarse`), and real browsers other than headless Chromium.
- A building's broken mark was seen in the `3-build-blocked-*` shots only for a farm I marked broken in the save.
- Long games with many provinces in the People table: checked with Astravia's 6 only, though rows wrap on names rather than widen.

### Noticed, left alone

- `build-row__art` and `repairs-panel__icon` report scrollWidth a few pixels over clientWidth, from their inset rings. Same before and after, and nothing visible.
- Objectives shows through the Build window for a moment while it slides in, as does the map. Same before.
- Locked rows hide their yield and costs, so the first payment doesn't show there. Unchanged.

