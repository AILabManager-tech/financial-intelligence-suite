-- 005 daily snapshot accrual — au plus un snapshot par (mandat, jour calendaire).
--
-- Avant 005, le chemin de capture insérait une ligne à CHAQUE tick de cotation
-- (20 s), inondant la table de points intraday inexploitables pour une série de
-- valeur de portefeuille (TWR / volatilité / Sharpe exigent une série propre,
-- pas 4000 points/jour). Cette migration rend la série JOURNALIÈRE et idempotente :
-- une colonne snapshot_date + un index unique, pour que le repository fasse un
-- upsert (la dernière capture du jour gagne). Aucune donnée fabriquée — la valeur
-- reste celle réellement calculée (positions × cotations réelles), jamais un backfill
-- de jours passés (les quantités ont changé : reconstruire serait une fabrication).

ALTER TABLE portfolio_snapshots ADD COLUMN snapshot_date TEXT;

-- Backfill du jour depuis l'horodatage de capture existant (ISO → 'YYYY-MM-DD',
-- substr littéral pour ne pas réinterpréter le fuseau).
UPDATE portfolio_snapshots
  SET snapshot_date = substr(captured_at, 1, 10)
  WHERE snapshot_date IS NULL OR snapshot_date = '';

-- Réduit les lignes intraday préexistantes à la dernière par (mandat, jour).
DELETE FROM portfolio_snapshots
  WHERE id NOT IN (
    SELECT MAX(id) FROM portfolio_snapshots GROUP BY portfolio_id, snapshot_date
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_portfolio_snapshots_day
  ON portfolio_snapshots (portfolio_id, snapshot_date);
