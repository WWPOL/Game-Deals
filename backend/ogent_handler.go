package main

import (
	"database/sql"

	"github.com/WWPOL/Game-Deals/backend/ent/ogent"
)

type ogentHandler struct {
  *ogent.OgentHandler
  db *sql.DB
}
