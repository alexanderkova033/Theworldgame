// How restless the country is — see unrestRules.ts. Collapse isn't a stage
// here: it's the end of the game (stability 0, see simulateDay.ts).
export type UnrestStage = "calm" | "discontent" | "strikes" | "riots";
