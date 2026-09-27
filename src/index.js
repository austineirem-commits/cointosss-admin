import { json, corsPreflight, getUserFromRequest } from "./utils.js";
import { handleSignup, handleLogin } from "./auth.js";
import { handleMe, handleUpdateProfile } from "./user.js";
import { handleEarnClick } from "./coins.js";
import { handleLeaderboard } from "./leaderboard.js";
import { handleGetMessages } from "./messages.js";
import {
  isAdmin,
  handleAdminListUsers,
  handleAdminBan,
  handleAdminSendMessage,
  handleAdminEditCoins,
  handleAdminAddBonus,
  handleAdminDeductCoins,
} from "./admin.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    if (method === "OPTIONS") return corsPreflight();

    try {
      // ---------- PUBLIC ----------
      if (path === "/auth/signup" && method === "POST") return await handleSignup(request, env);
      if (path === "/auth/login" && method === "POST") return await handleLogin(request, env);
      if (path === "/leaderboard" && method === "GET") return await handleLeaderboard(env);

      // ---------- ADMIN (protected by x-admin-key header, not user login) ----------
      if (path === "/admin/users" && method === "GET") {
        if (!isAdmin(request, env)) return json({ error: "Unauthorized." }, 401);
        return await handleAdminListUsers(env);
      }
      if (path === "/admin/ban" && method === "POST") {
        if (!isAdmin(request, env)) return json({ error: "Unauthorized." }, 401);
        return await handleAdminBan(request, env);
      }
      if (path === "/admin/message" && method === "POST") {
        if (!isAdmin(request, env)) return json({ error: "Unauthorized." }, 401);
        return await handleAdminSendMessage(request, env);
      }
      if (path === "/admin/edit-coins" && method === "POST") {
        if (!isAdmin(request, env)) return json({ error: "Unauthorized." }, 401);
        return await handleAdminEditCoins(request, env);
      }
      if (path === "/admin/add-bonus" && method === "POST") {
        if (!isAdmin(request, env)) return json({ error: "Unauthorized." }, 401);
        return await handleAdminAddBonus(request, env);
      }
      if (path === "/admin/deduct-coins" && method === "POST") {
        if (!isAdmin(request, env)) return json({ error: "Unauthorized." }, 401);
        return await handleAdminDeductCoins(request, env);
      }

      // ---------- REQUIRES USER LOGIN ----------
      const user = await getUserFromRequest(request, env);
      if (!user) return json({ error: "Not logged in." }, 401);
      if (user.banned) return json({ error: "This account has been banned." }, 403);

      if (path === "/user/me" && method === "GET") return await handleMe(user);
      if (path === "/user/me" && method === "PATCH") return await handleUpdateProfile(request, env, user);
      if (path === "/coins/earn" && method === "POST") return await handleEarnClick(env, user);
      if (path === "/messages" && method === "GET") return await handleGetMessages(env, user);

      return json({ error: "Not found." }, 404);
    } catch (err) {
      return json({ error: "Server error: " + err.message }, 500);
    }
  },

  // Runs automatically on the schedule set in wrangler.toml [triggers] crons
  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      env.DB.prepare("UPDATE users SET coins = 0").run()
    );
  },
};
