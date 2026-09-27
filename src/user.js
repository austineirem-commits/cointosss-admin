import { json } from "./utils.js";

export function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    coins: user.coins,
    lifetime_coins: user.lifetime_coins,
    rank: user.rank,
    referral_code: user.referral_code,
    last_earn_click: user.last_earn_click,
  };
}

export async function handleMe(user) {
  return json({ user: publicUser(user) });
}

export async function handleUpdateProfile(request, env, user) {
  const body = await request.json().catch(() => ({}));
  const newUsername = (body.username || "").trim();

  if (newUsername.length < 3 || newUsername.length > 20) {
    return json({ error: "Username must be 3-20 characters." }, 400);
  }

  if (newUsername !== user.username) {
    const clash = await env.DB.prepare("SELECT id FROM users WHERE username = ?")
      .bind(newUsername)
      .first();
    if (clash) return json({ error: "Username already taken." }, 400);
  }

  await env.DB.prepare("UPDATE users SET username = ? WHERE id = ?").bind(newUsername, user.id).run();
  user.username = newUsername;

  return json({ user: publicUser(user) });
}
