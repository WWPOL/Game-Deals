package main

import (
	"os"
	"fmt"
	"flag"
	"database/sql"
		
	"github.com/WWPOL/Game-Deals/config"

	_ "github.com/lib/pq"
        "github.com/jmoiron/sqlx"
	"github.com/Noah-Huppert/golog"
	"github.com/Noah-Huppert/goconf"
	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
)

func main() {
	// {{{1 Setup logger
	logger := golog.NewStdLogger("game-deals")

	// {{{1 Load configuration
	cfgLoader := goconf.NewDefaultLoader()
	cfgLoader.AddConfigPath("*.toml")

	var cfg config.Config
	
	if err := cfgLoader.Load(&cfg); err != nil {
		logger.Fatalf("failed to load configuration: %s", err.Error())
	}

	// {{{1 Connect to database
	db, err := sql.Open("postgres",
		fmt.Sprintf("host=%s user=%s dbname=%s sslmode=disable",
			cfg.Database.Host,
			cfg.Database.User,
			cfg.Database.Database))
	if err != nil {
		logger.Fatalf("failed to connect to database: %s", err.Error())
	}

	if err = db.Ping(); err != nil {
		logger.Fatalf("failed to ping database: %s", err.Error())
	}

	// {{{1 Migrate if -m migrate flag provided
	var migrateMode bool
	flag.BoolVar(&migrateMode, "m", false, "Run database migrations and exit")
	
	flag.Parse()

	if migrateMode {
		driver, err := postgres.WithInstance(db, &postgres.Config{})
		if err != nil {
			logger.Fatalf("failed to create Postgres migration driver: %s",
				err.Error())
		}

		migrator, err := migrate.NewWithDatabaseInstance(
			"file://migrations",
			"postgres", driver)
		if err != nil {
			logger.Fatalf("failed to create Postgres migrator: %s", err.Error())
		}

		if err = migrator.Up(); err != nil {
			logger.Fatalf("failed to migrate database: %s", err.Error())
		}

		os.Exit(0)
	}

	// {{{1 Setup sqlx if not migrating
	dbx := sqlx.NewDb(db, "postgres")
	logger.Debugf("debug: %#v", dbx)
}
