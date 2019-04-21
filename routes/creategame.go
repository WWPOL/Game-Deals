package routes

import (
	"net/http"
	"fmt"

	"github.com/WWPOL/Game-Deals/models"
	"github.com/WWPOL/Game-Deals/config"

	"github.com/Noah-Huppert/golog"
	"github.com/jmoiron/sqlx"
)

// CreateGameHandler inserts a game into the database
type CreateGameHandler struct {
	// Logger
	Logger golog.Logger

	// Dbx is a sqlx database
	Dbx *sqlx.DB

	// Config
	Config config.Config
}

// createGameRequest is a create game endpoint request
type createGameRequest struct {
	// Game to create
	Game models.Game `validate:"required" json:"game"`
}

// createGameResponse is a create game endpoint response
type createGameResponse struct {
	Game models.Game `json:"game"`
}

// ServeHTTP implements http.Handler
func (h CreateGameHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Authenticate
	if err := Authenticate(r, h.Config); err != nil {
		h.Logger.Errorf(err.Error())
		RespondError(h.Logger, w, ErrorNotAuthenticated, http.StatusUnauthorized)
		return
	}
	
	// Read request
	req := createGameRequest{}
	if err := DecodeJSON(r, &req); err != nil {
		RespondError(h.Logger, w, err, http.StatusBadRequest)
		return
	}

	// Insert
	game := &req.Game

	if err := game.Insert(h.Dbx); err != nil {
		h.Logger.Errorf("error inserting game: %s", err.Error())
		RespondError(h.Logger, w, fmt.Errorf("error inserting game"),
			http.StatusInternalServerError)
		return
	}

	// Respond
	resp := createGameResponse{
		Game: *game,
	}
	RespondJSON(h.Logger, w, resp, http.StatusOK)
}
