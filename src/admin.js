import { json } from "./utils.js";
import { publicUser } from "./user.js";
import { calcRank } from "./rank.js";

// Checks the x-admin-key header against your secret. Returns true if allowed.
export function isAdmin(request, env) {
  const key = request.headers.get("x-admin-key") || "";
  return key && key === env.ADMIN_KEY;
}

export async function handleAdminListUsers(env) {
  const { results } = await env.DB.prepare(
    `SELECT id, username, coins, lifetime_coins, rank, banned, referral_code, referred_by, created_at
     FROM users ORDER BY created_at DESC`
  ).all();
  return json({ users: results });
}

export async function handleAdminBan(request, env) {
  const body = await request.json().catch(() => ({}));
  const { userId, banned } = body;
  if (typeof userId !== "number") return json({ error: "userId (number) required." }, 400);

  await env.DB.prepare("UPDATE users SET banned = ? WHERE id = ?")
    .bind(banned ? 1 : 0, userId)
    .run();

  return json({ success: true });
}

export async function handleAdminSendMessage(request, env) {
  const body = await request.json().catch(() => ({}));
  const { userId, content } = body; // userId omitted/null = broadcast to everyone
  if (!content || !content.trim()) return json({ error: "content required." }, 400);

  await env.DB.prepare("INSERT INTO messages (user_id, content) VALUES (?, ?)")
    .bind(userId || null, content.trim())
    .run();

  return json({ success: true });
}

export async function handleAdminEditCoins(request, env) {
  const body = await request.json().catch(() => ({}));
  const { userId, coins, lifetime_coins } = body;
  if (typeof userId !== "number") return json({ error: "userId (number) required." }, 400);

  const user = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first();
  if (!user) return json({ error: "User not found." }, 404);

  const newCoins = typeof coins === "number" ? coins : user.coins;
  const newLifetime = typeof lifetime_coins === "number" ? lifetime_coins : user.lifetime_coins;

  await env.DB.prepare("UPDATE users SET coins = ?, lifetime_coins = ? WHERE id = ?")
    .bind(newCoins, newLifetime, userId)
    .run();

  return json({ success: true });
}

// Adds a bonus: increases BOTH current coins and lifetime coins, so it
// counts toward rank the same as normal earning would.
export async function handleAdminAddBonus(request, env) {
  const body = await request.json().catch(() => ({}));
  const { userId, amount, note } = body;
  if (typeof userId !== "number") return json({ error: "userId (number) required." }, 400);
  if (typeof amount !== "number" || amount <= 0) return json({ error: "amount must be a positive number." }, 400);

  const user = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first();
  if (!user) return json({ error: "User not found." }, 404);

  const newCoins = user.coins + amount;
  const newLifetime = user.lifetime_coins + amount;
  const newRank = calcRank(newLifetime);

  await env.DB.prepare("UPDATE users SET coins = ?, lifetime_coins = ?, rank = ? WHERE id = ?")
    .bind(newCoins, newLifetime, newRank, userId)
    .run();

  await env.DB.prepare("INSERT INTO messages (user_id, content) VALUES (?, ?)")
    .bind(userId, note ? `You received a bonus of ${amount} coins: ${note}` : `You received a bonus of ${amount} coins!`)
    .run();

  return json({ success: true, coins: newCoins, lifetime_coins: newLifetime, rank: newRank });
}

// Punishes: deducts from CURRENT coins only. Lifetime coins (and therefore
// rank) are left untouched, so a punishment doesn't undo an earned rank.
// Never lets coins go below 0.
export async function handleAdminDeductCoins(request, env) {
  const body = await request.json().catch(() => ({}));
  const { userId, amount, note } = body;
  if (typeof userId !== "number") return json({ error: "userId (number) required." }, 400);
  if (typeof amount !== "number" || amount <= 0) return json({ error: "amount must be a positive number." }, 400);

  const user = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first();
  if (!user) return json({ error: "User not found." }, 404);

  const newCoins = Math.max(0, user.coins - amount);

  await env.DB.prepare("UPDATE users SET coins = ? WHERE id = ?").bind(newCoins, userId).run();

  await env.DB.prepare("INSERT INTO messages (user_id, content) VALUES (?, ?)")
    .bind(userId, note ? `${amount} coins were deducted: ${note}` : `${amount} coins were deducted from your balance.`)
    .run();

  return json({ success: true, coins: newCoins });
}
