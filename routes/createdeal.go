package routes

import (
	"fmt"
	"net/http"
	"net/url"

	"github.com/WWPOL/Game-Deals/models"
	"github.com/WWPOL/Game-Deals/config"

	"github.com/Noah-Huppert/golog"
	"github.com/jmoiron/sqlx"
)

// CreateDealHandler inserts a deal into the database
type CreateDealHandler struct {
	// Logger
	Logger golog.Logger

	// Config
	Config config.Config

	// Dbx is a Sqlx database instance
	Dbx *sqlx.DB
}

// createDealRequest is a request for the create deal endpoint
type createDealRequest struct {
	// Deal
	Deal models.Deal `json:"deal" validate:"required"`
}

// createDealResponse is a response for the create deal endpoint
type createDealResponse struct {
	// Deal
	Deal models.Deal `json:"deal"`
}

// ServeHTTP implements http.Handler
func (h CreateDealHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Authenticate
	if err := Authenticate(r, h.Config); err != nil {
		h.Logger.Error(err.Error())
		RespondError(h.Logger, w, ErrorNotAuthenticated,
			http.StatusUnauthorized)
		return
	}

	// Parse body
	req := createDealRequest{}
	if err := DecodeJSON(r, &req); err != nil {
		RespondError(h.Logger, w, err, http.StatusBadRequest)
		return
	}

	// Ensure link is HTTPS
	linkUrl, err := url.Parse(req.Deal.Link)
	if err != nil {
		RespondError(h.Logger, w,
			fmt.Errorf("failed to parse link as URL: %s", err.Error()),
			http.StatusBadRequest)
		return
	}

	if linkUrl.Scheme != "https" {
		RespondError(h.Logger, w, fmt.Errorf("deal link must use HTTPS"),
			http.StatusBadRequest)
		return
	}

	// Insert
	deal := &req.Deal
	if err := deal.Insert(h.Dbx); err != nil {
		h.Logger.Errorf("failed to insert deal into database: %s", err.Error())
		RespondError(h.Logger, w, fmt.Errorf("error inserting deal into database"),
			http.StatusInternalServerError)
		return
	}

	// Response
	resp := createDealResponse{
		Deal: *deal,
	}
	RespondJSON(h.Logger, w, resp, http.StatusOK)
}
