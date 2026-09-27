import { json, randomHex, randomReferralCode, hashPassword, verifyPassword } from "./utils.js";
import { calcRank } from "./rank.js";

export async function handleSignup(request, env) {
  const body = await request.json().catch(() => ({}));
  const username = (body.username || "").trim();
  const password = body.password || "";
  const referralCode = (body.referralCode || "").trim().toUpperCase() || null;

  if (username.length < 3 || username.length > 20) {
    return json({ error: "Username must be 3-20 characters." }, 400);
  }
  if (password.length < 6) {
    return json({ error: "Password must be at least 6 characters." }, 400);
  }

  const existing = await env.DB.prepare("SELECT id FROM users WHERE username = ?").bind(username).first();
  if (existing) return json({ error: "Username already taken." }, 400);

  // validate referral code if provided
  let referrer = null;
  if (referralCode) {
    referrer = await env.DB.prepare("SELECT * FROM users WHERE referral_code = ?")
      .bind(referralCode)
      .first();
    if (!referrer) return json({ error: "Invalid referral code." }, 400);
  }

  const { hash, salt } = await hashPassword(password);

  // generate a unique referral code for the new user
  let myCode;
  for (let i = 0; i < 5; i++) {
    myCode = randomReferralCode();
    const clash = await env.DB.prepare("SELECT id FROM users WHERE referral_code = ?").bind(myCode).first();
    if (!clash) break;
  }

  const result = await env.DB.prepare(
    `INSERT INTO users (username, password_hash, salt, referral_code, referred_by)
     VALUES (?, ?, ?, ?, ?)`
  )
    .bind(username, hash, salt, myCode, referralCode)
    .run();

  const newUserId = result.meta.last_row_id;

  // pay out referral bonus to the referrer
  if (referrer) {
    const newCoins = referrer.coins + 1000;
    const newLifetime = referrer.lifetime_coins + 1000;
    await env.DB.prepare(
      `UPDATE users SET coins = ?, lifetime_coins = ?, rank = ? WHERE id = ?`
    )
      .bind(newCoins, newLifetime, calcRank(newLifetime), referrer.id)
      .run();

    await env.DB.prepare(`INSERT INTO messages (user_id, content) VALUES (?, ?)`)
      .bind(referrer.id, `You earned 1000 coins for referring ${username}!`)
      .run();
  }

  const token = randomHex(24);
  await env.DB.prepare("INSERT INTO sessions (token, user_id) VALUES (?, ?)").bind(token, newUserId).run();

  return json({ token });
}

export async function handleLogin(request, env) {
  const body = await request.json().catch(() => ({}));
  const username = (body.username || "").trim();
  const password = body.password || "";

  const user = await env.DB.prepare("SELECT * FROM users WHERE username = ?").bind(username).first();
  if (!user) return json({ error: "Invalid username or password." }, 401);

  if (user.banned) return json({ error: "This account has been banned." }, 403);

  const valid = await verifyPassword(password, user.salt, user.password_hash);
  if (!valid) return json({ error: "Invalid username or password." }, 401);

  const token = randomHex(24);
  await env.DB.prepare("INSERT INTO sessions (token, user_id) VALUES (?, ?)").bind(token, user.id).run();

  return json({ token });
}
