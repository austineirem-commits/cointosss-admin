import { json } from "./utils.js";
import { calcRank } from "./rank.js";

const COOLDOWN_SECONDS = 3;
const COINS_PER_CLICK = 10;

export async function handleEarnClick(env, user) {
  const now = Date.now();

  if (user.last_earn_click) {
    const last = new Date(user.last_earn_click).getTime();
    const elapsed = (now - last) / 1000;
    if (elapsed < COOLDOWN_SECONDS) {
      const remaining = Math.ceil(COOLDOWN_SECONDS - elapsed);
      return json({ error: `Still on cooldown, wait ${remaining}s.` }, 429);
    }
  }

  const newCoins = user.coins + COINS_PER_CLICK;
  const newLifetime = user.lifetime_coins + COINS_PER_CLICK;
  const newRank = calcRank(newLifetime);
  const nowIso = new Date(now).toISOString();

  await env.DB.prepare(
    `UPDATE users SET coins = ?, lifetime_coins = ?, rank = ?, last_earn_click = ? WHERE id = ?`
  )
    .bind(newCoins, newLifetime, newRank, nowIso, user.id)
    .run();

  return json({
    coins: newCoins,
    lifetime_coins: newLifetime,
    rank: newRank,
    last_earn_click: nowIso,
  });
}
