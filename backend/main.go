package main

import (
	"flag"
	golog "log"
	"os"
	"strings"

	"github.com/WWPOL/Game-Deals/backend/ent"
	"go.uber.org/zap"
  "github.com/Noah-Huppert/gointerrupt"
)

func main() {
  ctxPair := gointerrupt.NewCtxPair()

  // Setup logger
  log, err := zap.NewDevelopment()
  if err != nil {
    golog.Fatalf("failed to create zap logger: %s", err)
  }
  defer func() {
    if err := log.Sync(); err != nil && !strings.HasSuffix(err.Error(), os.ErrInvalid.Error()) {
      golog.Fatalf("failed to sync zap logger: %s", err)
    }
  }()

  // Load config
  cfg, err := ParseConfig()
  if err != nil {
    log.Fatal("failed to parse config", zap.Error(err))
  }

  // Setup ent
  entClient, err := ent.Open("postgres", cfg.DBURI)
  if err != nil {
    log.Fatal("failed to create ent client", zap.Error(err))
  }
  defer func() {
    if err := entClient.Close(); err != nil {
      log.Error("failed to close ent client", zap.Error(err))
    }
  }()

  var flagCreateSchema bool
  flag.BoolVar(&flagCreateSchema, "create-schema", false, "Use Ent to migrate the database to match the schema")
  if flagCreateSchema {
    log.Info("Using ent to migrate database to match schema")

    if err := entClient.Schema.Create(ctxPair.Graceful()); err != nil {
      log.Fatal("failed to use Ent to migrate database to match schema", zap.Error(err))
    }

    log.Info("Done migrating database")
  }

  // Start API server

}
