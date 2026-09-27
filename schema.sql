DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS messages;

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  coins INTEGER NOT NULL DEFAULT 0,
  lifetime_coins INTEGER NOT NULL DEFAULT 0,
  rank TEXT NOT NULL DEFAULT 'Bronze',
  referral_code TEXT UNIQUE NOT NULL,
  referred_by TEXT,
  banned INTEGER NOT NULL DEFAULT 0,
  last_earn_click TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,          -- NULL means broadcast to everyone
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_users_coins ON users(coins DESC);
CREATE INDEX idx_messages_user ON messages(user_id);
