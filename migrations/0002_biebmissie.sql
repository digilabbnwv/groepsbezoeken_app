-- BiebMissie-modus: stations per boek met een "verkeersleider"

-- Sessions: welk soort groepsbezoek en (bij BiebMissie) de stationconfig
ALTER TABLE sessions ADD COLUMN mode TEXT NOT NULL DEFAULT 'regulier';
ALTER TABLE sessions ADD COLUMN configJson TEXT NOT NULL DEFAULT '{}';

-- Teams: bij welk boek zit het team nu, en welke boeken zijn klaar
ALTER TABLE teams ADD COLUMN currentStation TEXT NOT NULL DEFAULT '';
ALTER TABLE teams ADD COLUMN stationsDoneJson TEXT NOT NULL DEFAULT '[]';

CREATE INDEX IF NOT EXISTS idx_teams_station ON teams(sessionCode, currentStation);
