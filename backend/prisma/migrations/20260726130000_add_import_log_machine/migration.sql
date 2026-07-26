-- Identifiant de la machine ayant exécuté ce passage de la routine d'import
-- (plusieurs machines peuvent tourner en parallèle : PC principal, VM dédiée...).
ALTER TABLE "import_log_entries" ADD COLUMN "machine" TEXT;
