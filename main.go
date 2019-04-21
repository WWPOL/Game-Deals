package main

import (
	"os"
	"fmt"
	"flag"
	"database/sql"
	"os/signal"
	"net/http"
		
	"github.com/WWPOL/Game-Deals/config"
	"github.com/WWPOL/Game-Deals/models"
	"github.com/WWPOL/Game-Deals/routes"

	_ "github.com/lib/pq"
        "github.com/jmoiron/sqlx"
	"github.com/Noah-Huppert/golog"
	"github.com/Noah-Huppert/goconf"
	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/gorilla/mux"
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
	// {{{2 Raw database
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

	// {{{1 Sqlx
	dbx := sqlx.NewDb(db, "postgres")

	// {{{1 Perform utility actions
	// {{{2 Parse flags
	var createUserName string
	flag.StringVar(&createUserName, "u", "", "Create user with name")

	var createUserPassword string
	flag.StringVar(&createUserPassword, "p", "", "Create user with password")

	var migrateMode bool
	flag.BoolVar(&migrateMode, "m", false, "Run database migrations and exit")

	flag.Parse()

	// {{{2 Check flags aren't competing
	if len(createUserName) > 0 && len(createUserPassword) > 0 && migrateMode {
		logger.Fatal("-m flag cannot be provided with -u and -p flags")
	}

	// {{{2 Migrate if -m migrate flag provided
	if migrateMode {
		logger.Info("running migrations")
		
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

	// {{{2 Create user if -u username:password flag provided
	if len(createUserName) > 0 && len(createUserPassword) > 0 {
		tx, err := dbx.Beginx()
		if err != nil {
			logger.Fatalf("failed to create transaction for user insert: %s",
				err.Error())
		}

		passwordHash, err := models.HashPassword(createUserPassword)
		if err != nil {
			logger.Fatalf("failed to hash user password: %s", err.Error())
		}

		user := models.User{
			Username: createUserName,
			PasswordHash: passwordHash,
		}

		err = tx.QueryRowx("INSERT INTO users (username, password_hash) "+
			"values ($1, $2) RETURNING id",
			user.Username, user.PasswordHash).StructScan(&user)

		if err != nil {
			logger.Fatalf("failed to insert user: %s", err.Error())
		}

		if err = tx.Commit(); err != nil {
			logger.Fatalf("failed to commit user insert: %s", err.Error())
		}

		logger.Infof("Inserted user %s with ID %d", user.Username, user.ID)

		os.Exit(0)
	}

	// {{{1 Exit on interrupt signal
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt)

	// {{{1 Setup API server
	r := mux.NewRouter()

	r.Handle("/api/v0/users/login", routes.UserLoginHandler{
		Logger: logger.GetChild("user login route"),
		Config: cfg,
		Dbx: dbx,
	}).Methods("POST")
	
	r.Handle("/api/v0/games", routes.ListGamesHandler{
		Logger: logger.GetChild("games list route"),
		Config: cfg,
		Dbx: dbx,
	}).Methods("GET")

	r.Handle("/api/v0/games", routes.CreateGameHandler{
		Logger: logger.GetChild("games create"),
		Config: cfg,
		Dbx: dbx,
	}).Methods("POST")

	r.Handle("/api/v0/games/{id:[0-9]+}", routes.DeleteGameHandler{
		Logger: logger.GetChild("games delete"),
		Config: cfg,
		Dbx: dbx,
	}).Methods("DELETE")

	r.Handle("/api/v0/games/{id:[0-9]+}", routes.UpdateGameHandler{
		Logger: logger.GetChild("games update"),
		Config: cfg,
		Dbx: dbx,
	}).Methods("UPDATE")

	r.Handle("/api/v0/deals", routes.ListDealsHandler{
		Logger: logger.GetChild("deals list"),
		Dbx: dbx,
	}).Methods("GET")

	serverAddr := fmt.Sprintf(":%d", cfg.Server.Port)

	server := http.Server{
		Addr: serverAddr,
		Handler: r,
	}

	logger.Infof("starting API server on %s", serverAddr)

	go func() {
		err = server.ListenAndServe()
		if err != nil && err != http.ErrServerClosed {
			logger.Fatalf("failed to run API server")
		}
	}()

	_ = <-sigChan
	logger.Info("stopping API server")

	if err := server.Close(); err != nil {
		logger.Fatalf("failed to stop API server")
	}
}
