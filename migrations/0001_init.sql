-- D1 Schema voor Groepsbezoeken App
-- Vervangt Microsoft Lists backend

-- Sessions tabel: houdt game sessies bij
CREATE TABLE IF NOT EXISTS sessions (
    sessionId TEXT PRIMARY KEY,
    sessionName TEXT NOT NULL DEFAULT '',
    sessionCode TEXT NOT NULL UNIQUE,
    startTime TEXT,  -- ISO 8601 timestamp of NULL
    wordsJson TEXT NOT NULL DEFAULT '[]',  -- JSON array van 20 woorden
    createdAt INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Index op sessionCode voor snelle lookups
CREATE INDEX IF NOT EXISTS idx_sessions_code ON sessions(sessionCode);
-- Index op createdAt voor auto-purge queries
CREATE INDEX IF NOT EXISTS idx_sessions_created ON sessions(createdAt);

-- Teams tabel: houdt deelnemende teams bij
CREATE TABLE IF NOT EXISTS teams (
    teamId TEXT PRIMARY KEY,
    teamToken TEXT NOT NULL UNIQUE,
    sessionCode TEXT NOT NULL,
    animalId INTEGER NOT NULL,
    teamName TEXT NOT NULL DEFAULT '',
    teamColor TEXT DEFAULT '#000000',
    progress INTEGER NOT NULL DEFAULT 0,
    score INTEGER NOT NULL DEFAULT 0,
    hintsUsed INTEGER NOT NULL DEFAULT 0,
    timePenaltySeconds INTEGER NOT NULL DEFAULT 0,
    lastSeen INTEGER NOT NULL DEFAULT (unixepoch()),
    word1 TEXT NOT NULL DEFAULT '',
    word2 TEXT NOT NULL DEFAULT '',
    finished INTEGER NOT NULL DEFAULT 0,
    
    -- Ensure one animal per session (idempotent join)
    CONSTRAINT unique_animal_per_session UNIQUE (sessionCode, animalId)
);

-- Indexes voor teams
CREATE INDEX IF NOT EXISTS idx_teams_session ON teams(sessionCode);
CREATE INDEX IF NOT EXISTS idx_teams_token ON teams(teamToken);
