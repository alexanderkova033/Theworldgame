# 05: Winter, the Build list, and the top bar's lines

Branch: `task/05-look`. Read `CLAUDE.md` first. Owner's list items 1, 2 and 10.

## What to do

1. **A softer winter.** The white on the map is too strong. Weaken the effect in `src/presentation/components/MapSeasons.css` (`.map-panel[data-season="winter"]`, line 35). It should still read clearly as winter, and map pictures, borders and province colours should stay easy to see. Compare before and after by screenshot.
2. **Less text under each building** (`src/presentation/components/ActionsPanel.tsx`, the `build-row` list from about line 543). A row shows the picture, name, yield, costs and count. Move the explanations into tips (`data-tip`, which wait for the pointer to rest). A row keeps words only for a reason it can't be built right now, and that reason stays short.
3. **Show the first payment.** `upfrontCost` (`src/application/actions/createBuildAction.ts:67`) takes 60% of the price when a building is ordered, and the rest during the build. Today this is only in a tip. Show it on the row itself, briefly and with no paragraph, for money and goods. Read the share from one named constant in `src/domain/constants.ts` rather than the bare `0.6`, and do not change its value. The owner believed it was half: report the real figure under Results.
4. **No red lines in the top bar.** Remove the bars along the foot of top bar items in trouble (`src/presentation/components/ResourceTicker.css`, `.is-danger` line 57 and `.is-warn` line 91). Keep the lettering colour and the "!", so danger still doesn't rest on colour alone. Leave the gilt mark on an open item (line 121), and look at the same bar on the top tabs if there is one.

## Out of scope

Rules and numbers. New windows or tabs. Removing facts rather than moving them: the owner has been annoyed before when stats were deleted after they only disliked the look.

## Done when

- All checks in `CLAUDE.md` pass, including `tests/vocabulary.test.ts` and `tests/numbers.test.ts`.
- Results include before and after screenshots of each item, at a normal window and at about 1000px wide, with their file paths.

## Results

