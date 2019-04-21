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

// UpdateDealHandler updates a deal in the database
type UpdateDealHandler struct {
	// Logger
	Logger golog.Logger

	// Config
	Config config.Config

	// Dbx is an Sqlx database
	Dbx *sqlx.DB
}

// updateDealRequest is a request for the update deal endpoint
type updateDealRequest struct {
	// Deal
	Deal models.Deal `json:"deal" validate:"required"`
}

// updateDealResponse is a response for the update deal endpoint
type updateDealResponse struct {
	// Deal
	Deal models.Deal `json:"deal"`
}

// ServeHTTP implements http.Handler
func (h UpdateDealHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
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
	req := updateDealRequest{}
	
	if err := DecodeJSON(r, &req); err != nil {
		RespondError(h.Logger, w, err, http.StatusBadRequest)
		return
	}

	// Update
	req.Deal.ID = updateID
	if err := req.Deal.Update(h.Dbx); err != nil {
		h.Logger.Errorf("error updating deal: %s", err.Error())
		RespondError(h.Logger, w, fmt.Errorf("error updating deal"),
			http.StatusInternalServerError)
		return
	}

	// Respond
	resp := updateDealResponse{
		Deal: req.Deal,
	}

	RespondJSON(h.Logger, w, resp, http.StatusOK)
}
