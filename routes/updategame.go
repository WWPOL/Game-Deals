package routes

import (
	"net/http"
	"fmt"
	"strconv"

	"github.com/WWPOL/Game-Deals/config"
	"github.com/WWPOL/Game-Deals/models"

	"github.com/jmoiron/sqlx"
	"github.com/Noah-Huppert/golog"
	"github.com/gorilla/mux"
)

// UpdateGameHandler updates a game in the database
type UpdateGameHandler struct {
	// Logger
	Logger golog.Logger

	// Config
	Config config.Config

	// Dbx is an Sqlx database
	Dbx *sqlx.DB
}

// updateGameRequest is an update gmae endpoint request
type updateGameRequest struct {
	// Game
	Game models.Game `json:"game"`
}

// updateGameResponse is an update game endpoint response
type updateGameResponse struct {
	// Game
	Game models.Game `json:"game"`
}

// ServeHTTP implements http.Handler
func (h UpdateGameHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Authenticate
	if err := Authenticate(r, h.Config); err != nil {
		h.Logger.Error(err.Error())
		RespondError(h.Logger, w, ErrorNotAuthenticated, http.StatusUnauthorized)
		return
	}

	// Get id from request URL
	urlVars := mux.Vars(r)
	var updateID int64
	
	if rawID, ok := urlVars["id"]; !ok {
		RespondError(h.Logger, w, fmt.Errorf("internal server error"),
			http.StatusInternalServerError)
		h.Logger.Fatalf("id URL parameter not found")
		return
	} else {
		n, err := strconv.ParseInt(rawID, 10, 64)

		if err != nil {
			panic(err)
		}
		
		updateID = n
	}

	// Parse body
	req := updateGameRequest{}
	
	if err := DecodeJSON(r, &req); err != nil {
		RespondError(h.Logger, w, err, http.StatusBadRequest)
		return
	}

	// Update
	req.Game.ID = updateID
	if err := req.Game.Update(h.Dbx); err != nil {
		h.Logger.Errorf("error updating game: %s", err.Error())
		RespondError(h.Logger, w, fmt.Errorf("error updating game"),
			http.StatusInternalServerError)
		return
	}

	// Respond
	resp := updateGameResponse{
		Game: req.Game,
	}

	RespondJSON(h.Logger, w, resp, http.StatusOK)
}
