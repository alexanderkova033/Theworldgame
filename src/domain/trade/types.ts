import type { ResourceType } from "../resources/types";

// Food can be given or received alongside the 4 crafted resources in a
// barter trade — see FOOD_TRADE_UNIT/FOOD_TRADE_BATCH_SIZE in constants.ts
// for why it uses its own scale instead of joining the small-integer
// resource batches (application/actions/tradeResources.ts).
export type TradeableType = ResourceType | "food";
