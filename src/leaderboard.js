import { json } from "./utils.js";

export async function handleLeaderboard(env) {
  const { results } = await env.DB.prepare(
    `SELECT username, coins, rank FROM users WHERE banned = 0 ORDER BY coins DESC LIMIT 50`
  ).all();

  return json({ leaderboard: results });
}
