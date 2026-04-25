-- =============================================
-- SCHEMA DE GAMIFICACIÓN
-- Ejecutar en: Supabase → SQL Editor → New Query
-- =============================================

-- Tabla de usuarios del juego
CREATE TABLE IF NOT EXISTS game_users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT UNIQUE NOT NULL,
  name         TEXT,
  xp           INTEGER DEFAULT 0,
  level        INTEGER DEFAULT 1,
  streak       INTEGER DEFAULT 0,
  last_active  DATE,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- Tabla de premios ganados
CREATE TABLE IF NOT EXISTS prizes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES game_users(id) ON DELETE CASCADE,
  type         TEXT NOT NULL,        -- 'coupon' | 'xp' | 'sorteo' | 'vip'
  label        TEXT NOT NULL,        -- '20% OFF', '+100 XP', etc.
  code         TEXT,                 -- código de cupón si aplica
  source       TEXT NOT NULL,        -- 'scratch' | 'wheel' | 'trivia'
  claimed      BOOLEAN DEFAULT false,
  email_sent   BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- Tabla de notas leídas (para saber qué scratch cards tiene disponibles)
CREATE TABLE IF NOT EXISTS note_reads (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES game_users(id) ON DELETE CASCADE,
  note_id      TEXT NOT NULL,
  note_title   TEXT,
  scratch_used BOOLEAN DEFAULT false,
  read_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, note_id)
);

-- Tabla de spins de ruleta (1 por día por usuario)
CREATE TABLE IF NOT EXISTS wheel_spins (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES game_users(id) ON DELETE CASCADE,
  spin_date    DATE NOT NULL,
  prize_id     UUID REFERENCES prizes(id),
  UNIQUE(user_id, spin_date)
);

-- Tabla de sorteos semanales
CREATE TABLE IF NOT EXISTS raffles (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start   DATE NOT NULL,
  winner_id    UUID REFERENCES game_users(id),
  prize_desc   TEXT NOT NULL,
  resolved     BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS raffle_entries (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raffle_id    UUID REFERENCES raffles(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES game_users(id) ON DELETE CASCADE,
  entries      INTEGER DEFAULT 1,
  UNIQUE(raffle_id, user_id)
);

-- Vista de leaderboard semanal (los últimos 7 días)
CREATE OR REPLACE VIEW leaderboard_weekly AS
SELECT
  u.id,
  u.name,
  u.email,
  COALESCE(SUM(
    CASE WHEN p.type = 'xp' THEN CAST(REGEXP_REPLACE(p.label, '[^0-9]', '', 'g') AS INTEGER) ELSE 0 END
  ), 0) AS weekly_xp,
  u.xp AS total_xp,
  u.streak,
  u.level
FROM game_users u
LEFT JOIN prizes p ON p.user_id = u.id AND p.created_at > now() - INTERVAL '7 days'
GROUP BY u.id
ORDER BY weekly_xp DESC, u.xp DESC
LIMIT 20;

-- Row Level Security: los usuarios solo ven sus propios datos
ALTER TABLE game_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE prizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE wheel_spins ENABLE ROW LEVEL SECURITY;

-- Políticas (el service_role key las bypasea, solo afecta al anon key)
CREATE POLICY "users_own_data" ON game_users FOR ALL USING (id = auth.uid());
CREATE POLICY "users_own_prizes" ON prizes FOR ALL USING (user_id = auth.uid());
CREATE POLICY "users_own_reads" ON note_reads FOR ALL USING (user_id = auth.uid());
CREATE POLICY "users_own_spins" ON wheel_spins FOR ALL USING (user_id = auth.uid());

-- El leaderboard es público (solo lectura)
CREATE POLICY "leaderboard_public" ON game_users FOR SELECT USING (true);
