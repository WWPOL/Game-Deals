package routes

import (
	"net/http"
	"database/sql"
	"fmt"

	"github.com/WWPOL/Game-Deals/models"

	"github.com/Noah-Huppert/golog"
	"github.com/jmoiron/sqlx"
	"github.com/gorilla/mux"
)

// GetSubscriptionHandler retreives a subscription from the database
type GetSubscriptionHandler struct {
	// Logger
	Logger golog.Logger

	// Dbx is a Sqlx database instance
	Dbx *sqlx.DB
}

// getSubscriptionResponse is a response for the get subscription endpoint
type getSubscriptionResponse struct {
	// Subscription
	Subscription models.Subscription `json:"subscription"`
}

// ServeHTTP implements http.Handler
func (h GetSubscriptionHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Get variable from request
	rVars := mux.Vars(r)

	regToken := ""

	if v, ok := rVars["registration_token"]; !ok {
		h.Logger.Fatalf("registration_token variable not in request URL")
	} else {
		regToken = v
	}

	// Query
	subscription := &models.Subscription{
		RegistrationToken: regToken,
	}
	if err := subscription.QueryByRegistrationToken(h.Dbx); err == sql.ErrNoRows {
		RespondError(h.Logger, w, fmt.Errorf("not found"), http.StatusNotFound)
		return
	} else if err != nil {
		h.Logger.Errorf("failed to query for subscription: %s", err.Error())
		RespondError(h.Logger, w, fmt.Errorf("failed to query for subscription"),
			http.StatusInternalServerError)
		return
	}

	// Respond
	resp := getSubscriptionResponse{
		Subscription: *subscription,
	}
	RespondJSON(h.Logger, w, resp, http.StatusOK)
}
