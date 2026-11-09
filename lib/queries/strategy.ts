import { query } from "@/lib/db";

export interface StrategyAction {
  text: string;
  priority: "HIGH" | "MED" | "LOW";
}

export interface StrategyCard {
  tag: "BIG BET" | "FIX" | "GROW" | "WATCH";
  title: string;
  description: string;
  actions: StrategyAction[];
  isFeatured?: boolean;
}

export interface StrategyRow {
  platform: string;
  cards: StrategyCard[];
  generated_at: string;
}

export async function getStrategyContent(platform: string): Promise<StrategyRow | null> {
  const rows = await query<StrategyRow>(
    "SELECT platform, cards, generated_at FROM strategy_content WHERE platform = $1",
    [platform]
  );
  return rows[0] ?? null;
}
