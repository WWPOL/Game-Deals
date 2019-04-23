package routes

import (
	"fmt"
	"net/http"
	"context"

	"github.com/WWPOL/Game-Deals/config"
	"github.com/WWPOL/Game-Deals/models"

	"github.com/Noah-Huppert/golog"
	"github.com/jmoiron/sqlx"
	"firebase.google.com/go/messaging"
	"github.com/gorilla/mux"
)

// DeleteSubscriptionHandler deletes a subscription from the database and unsubscribes the client
// from the FCM topic.
//
// This endpoint has similar challenges to the SubscribeHandler endpoint. It modifies state in
// the FCM API and in the database.
//
// First we unsubscribe the client from the FCM topic.
// Then we delete the subscription from the database.
//
// If the subscription fails to delete from the database we are in a bind b/c the state in the
// FCM API and the database differ.
//
// If the database fails to delete the handler will crash the server with instructions on how
// to fix.
type DeleteSubscriptionHandler struct {
	// Ctx is the application context
	Ctx context.Context

	// Logger
	Logger golog.Logger

	// Config
	Config config.Config

	// Dbx is a Sqlx database instance
	Dbx *sqlx.DB

	// FCMClient is a Firebase cloud messaging client
	FCMClient *messaging.Client
}

// deleteSubscriptionResponse is a delete subscription endpoint response
type deleteSubscriptionResponse struct {
	// OK
	OK bool `json:"ok"`
}

// ServeHTTP implements http.Handler
func (h DeleteSubscriptionHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Get registration_token var from URL
	rVars := mux.Vars(r)

	regToken := ""

	if v, ok := rVars["registration_token"]; !ok {
		h.Logger.Fatalf("registration_token not present in URL")
	} else {
		regToken = v
	}

	// Unsubscribe client from FCM topic
	topicResp, err := h.FCMClient.UnsubscribeFromTopic(h.Ctx,
		[]string{regToken},
		h.Config.Firebase.DealsTopic)
	
	unsubOK := true
	
	if topicResp.SuccessCount != 1 {
		for _, err := range topicResp.Errors {
			h.Logger.Errorf("error unsubscribing \"%s\" from \"%s\": %s",
				regToken,
				h.Config.Firebase.DealsTopic,
				err.Reason)
		}
		
		unsubOK = false
	} else if err != nil {
		h.Logger.Errorf("error unsubscribing \"%s\" from \"%s\": %s",
			regToken,
			h.Config.Firebase.DealsTopic,
			err.Error())
		unsubOK = false
	}
	
	if !unsubOK {
		RespondError(h.Logger, w, fmt.Errorf("error unsubscribing topic from FCM topic"),
			http.StatusInternalServerError)
		return
	}

	// Delete
	subscription := &models.Subscription{
		RegistrationToken: regToken,
	}
	if err := subscription.Delete(h.Dbx); err != nil {
		RespondError(h.Logger, w, fmt.Errorf("error deleting subscription from database"),
			http.StatusInternalServerError)
		h.Logger.Fatalf("error deleting subscription from database, this is an issue "+
			"because the endpoint is no longer atomic, make sure the subscription "+
			"with the registration token \"%s\" is deleted manually, error: %s",
			regToken, err.Error())
	}

	// Respond
	resp := deleteSubscriptionResponse{
		OK: true,
	}
	RespondJSON(h.Logger, w, resp, http.StatusOK)
}
