package routes

import (
	"net/http"
	"fmt"

	"github.com/WWPOL/Game-Deals/models"

	"github.com/Noah-Huppert/golog"
	"github.com/jmoiron/sqlx"
)

// ListDealsHandler lists deals present in database
type ListDealsHandler struct {
	// Logger
	Logger golog.Logger

	// Dbx is a Sqlx database instance
	Dbx *sqlx.DB
}

// listDealsResponse is a response for the list deals endpoint
type listDealsResponse struct {
	// Deals
	Deals []models.Deal `json:"deals"`
}

// ServeHTTP implements http.Handler
func (h ListDealsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	deals, err := models.QueryAllDeals(h.Dbx)
	if err != nil {
		h.Logger.Errorf("failed to query all deals: %s", err.Error())
		RespondError(h.Logger, w, fmt.Errorf("error query for deals"),
			http.StatusInternalServerError)
		return
	}

	resp := listDealsResponse{
		Deals: deals,
	}
	RespondJSON(h.Logger, w, resp, http.StatusOK)
}
