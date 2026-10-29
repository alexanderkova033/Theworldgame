// The season the screen shows, and the season being turned to while its
// turn plays (see components/SeasonTurn.tsx). It follows the calendar only
// once no letter is open, so the turn and a letter never share the screen.
// A game just started or loaded shows its season at once, without a turn.
import { useEffect, useState } from "react";
import type { Season } from "../../domain/country/calendar";

export const SEASON_TURN_MS = 4600;

export function useSeasonTurn(season: Season | null, held: boolean): { shown: Season | null; turning: Season | null } {
  const [shown, setShown] = useState<Season | null>(season);
  const [turning, setTurning] = useState<Season | null>(null);

  useEffect(() => {
    if (season === null || shown === null) {
      setShown(season);
      return;
    }
    if (held || season === shown) return;
    setShown(season);
    setTurning(season);
  }, [season, held, shown]);

  useEffect(() => {
    if (!turning) return;
    const id = setTimeout(() => setTurning(null), SEASON_TURN_MS);
    return () => clearTimeout(id);
  }, [turning]);

  return { shown, turning };
}
