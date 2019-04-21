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

// DeleteGameHandler deletes a game from the database
type DeleteGameHandler struct {
	// Logger
	Logger golog.Logger

	// Config
	Config config.Config

	// Dbx is an Sqlx database
	Dbx *sqlx.DB
}

// deleteGameResponse is a response for the delete game endpoint
type deleteGameResponse struct {
	// OK indicates if the operation succeeded
	OK bool `json:"ok"`
}

// ServeHTTP implements http.Handler
func (h DeleteGameHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Authenticate
	if err := Authenticate(r, h.Config); err != nil {
		h.Logger.Error(err.Error())
		RespondError(h.Logger, w, ErrorNotAuthenticated, http.StatusUnauthorized)
		return
	}

	// Get id from request URL
	urlVars := mux.Vars(r)
	var deleteID int64
	
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
		
		deleteID = n
	}

	// Delete
	game := models.Game{
		ID: deleteID,
	}

	if err := game.Delete(h.Dbx); err != nil {
		h.Logger.Errorf("error deleting game: %s", err.Error())
		RespondError(h.Logger, w, fmt.Errorf("error deleting game"),
			http.StatusInternalServerError)
		return
	}

	// Respond
	resp := deleteGameResponse{
		OK: true,
	}

	RespondJSON(h.Logger, w, resp, http.StatusOK)
}
