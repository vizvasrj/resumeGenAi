-- Add up migration script here
-- Create the table to hold job information
CREATE TABLE IF NOT EXISTS jobs (
    id BIGSERIAL PRIMARY KEY,
    file_name TEXT NOT NULL,
    job_description TEXT,
    -- This column will store the processed text for searching
    description_tsv TSVECTOR
);

-- Create a GIN index on the tsvector column for fast searching.
-- GIN is the preferred index type for full-text search.
CREATE INDEX IF NOT EXISTS jobs_description_tsv_idx ON jobs USING GIN (description_tsv);

-- Create a function that will be called by the trigger.
-- This function takes the 'job_description' text, converts it to a tsvector,
-- and saves it in the 'description_tsv' column.
-- 'english' is the dictionary we use for stemming and stop words.
CREATE OR REPLACE FUNCTION update_description_tsv() RETURNS trigger AS $$
BEGIN
    NEW.description_tsv := to_tsvector('english', NEW.job_description);
    RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- Create a trigger that automatically calls our function whenever a row is
-- inserted or the 'job_description' is updated.
-- This keeps the search data perfectly in sync with the raw text.
DROP TRIGGER IF EXISTS jobs_tsv_trigger ON jobs; -- Drop existing trigger to be safe
CREATE TRIGGER jobs_tsv_trigger
BEFORE INSERT OR UPDATE OF job_description ON jobs
FOR EACH ROW EXECUTE FUNCTION update_description_tsv();
