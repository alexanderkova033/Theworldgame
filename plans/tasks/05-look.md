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

