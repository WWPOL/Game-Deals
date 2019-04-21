package routes

import (
	"fmt"
	"net/http"

 	"github.com/WWPOL/Game-Deals/config"
	"github.com/WWPOL/Game-Deals/models"

	"github.com/Noah-Huppert/golog"
	"github.com/jmoiron/sqlx"
)

// ListGamesHandler lists games stored in the database
type ListGamesHandler struct {
	// Logger
	Logger golog.Logger

	// Dbx is an Sqlx database
	Dbx *sqlx.DB

	// Config
	Config config.Config
}

// listGamesResponse is the response the list games handler returns
type listGamesResponse struct {
	// Games is a list of games
	Games []models.Game `json:"game"`
}

// ServeHTTP implements http.Handler
func (h ListGamesHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Get games
	games, err := models.QueryAllGames(h.Dbx)
	
	if err != nil {
		h.Logger.Errorf("failed to query all games: %s", err.Error())
		RespondError(h.Logger, w, fmt.Errorf("error retrieving games"),
			http.StatusInternalServerError)
		return
	}

	resp := listGamesResponse{
		Games: games,
	}
	
	RespondJSON(h.Logger, w, resp, http.StatusOK)
}
