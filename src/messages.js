import { json } from "./utils.js";

export async function handleGetMessages(env, user) {
  const { results } = await env.DB.prepare(
    `SELECT id, content, created_at FROM messages
     WHERE user_id = ? OR user_id IS NULL
     ORDER BY created_at DESC LIMIT 30`
  )
    .bind(user.id)
    .all();

  return json({ messages: results });
}
