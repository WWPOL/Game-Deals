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

// DeleteDealHandler deletes a deal from the database
type DeleteDealHandler struct {
	// Logger
	Logger golog.Logger

	// Config
	Config config.Config

	// Dbx is an Sqlx database
	Dbx *sqlx.DB
}

// deleteDealResponse is a response for the delete deal endpoint
type deleteDealResponse struct {
	// OK
	OK bool `json:"ok"`
}

// ServeHTTP implements http.Handler
func (h DeleteDealHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
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
	deal := models.Deal{ID: deleteID}
	if err := deal.Delete(h.Dbx); err != nil {
		h.Logger.Errorf("error deleting deal: %s", err.Error())
		RespondError(h.Logger, w, fmt.Errorf("error deleting deal"),
			http.StatusInternalServerError)
		return
	}

	// Respond
	resp := deleteDealResponse{
		OK: true,
	}

	RespondJSON(h.Logger, w, resp, http.StatusOK)
}
