package database

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

const db_url = "postgres://postgres:postgres@localhost:5432/jobs001?sslmode=disable"

func ConnectDB(ctx context.Context) (*pgxpool.Pool, error) {
	pool, err := pgxpool.New(ctx, db_url)
	if err != nil {
		return nil, fmt.Errorf("unable to connect to database: %w", err)
	}
	if err := pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("unable to ping database: %w", err)
	}
	return pool, nil
}

func InsertJD(file_name, jd string, pool *pgxpool.Pool, ctx context.Context) error {
	sql := `INSERT INTO jobs (file_name, job_description) VALUES ($1, $2)`
	_, err := pool.Exec(
		ctx,
		sql,
		file_name,
		jd,
	)
	return err
}

func SearchJobs(ctx context.Context, pool *pgxpool.Pool, query string) ([]Job, error) {
	sql := `
        SELECT id, file_name, job_description
        FROM jobs
        WHERE description_tsv @@ to_tsquery('english', $1)
    `
	rows, err := pool.Query(ctx, sql, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var jobs []Job
	for rows.Next() {
		var j Job
		if err := rows.Scan(&j.ID, &j.FileName, &j.Description); err != nil {
			return nil, err
		}
		jobs = append(jobs, j)
	}

	return jobs, nil
}

func printJobs(jobs []Job) {
	if len(jobs) == 0 {
		fmt.Println("  -> No results found.")
		return
	}
	for _, j := range jobs {
		// Truncate description for cleaner output
		desc := j.Description
		if len(desc) > 80 {
			desc = desc[:80] + "..."
		}
		fmt.Printf("  -> Found: [ID: %d] %s - %s\n", j.ID, j.FileName, desc)
	}
}
