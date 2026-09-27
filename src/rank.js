// Rank thresholds based on LIFETIME coins (never resets)
const RANKS = [
  { name: "Diamond", min: 1000000 },
  { name: "Obsidian", min: 500000 },
  { name: "Ruby", min: 200000 },
  { name: "Platinum", min: 75000 },
  { name: "Gold", min: 20000 },
  { name: "Silver", min: 5000 },
  { name: "Bronze", min: 0 },
];

export function calcRank(lifetimeCoins) {
  for (const r of RANKS) {
    if (lifetimeCoins >= r.min) return r.name;
  }
  return "Bronze";
}
