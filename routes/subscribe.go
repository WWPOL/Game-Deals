package routes

import (
	"fmt"
	"net/http"
	"context"

	"github.com/WWPOL/Game-Deals/models"
	"github.com/WWPOL/Game-Deals/config"
	
	"github.com/Noah-Huppert/golog"
	"github.com/jmoiron/sqlx"
	"firebase.google.com/go/messaging"
)

// SubscribeHandler inserts a subscription into the database and adds a device to a FCM topic
//
// This endpoint is a bit tricky because we are changing state in 2 places: the database and FCM
//
// First we insert a subscription into the database.
// Then we subscribe the client to the FCM deals topic.
//
// If the FCM subscription API call fails we must delete the subscription from the database.
// This is because the subscriptions table in the database is supposed to directly mirror the
// state of subscribed clients in the FCM API.
//
// If deleting the subscription from the database fails then we are in a bind. Since the database
// thinks a client is subscribed but the FCM API thinks a client isn't subscribed.
//
// If this occurs we crash the server and write what we must do to fix this to the logs.
type SubscribeHandler struct {
	// Ctx is the application context
	Ctx context.Context
	
	// Logger
	Logger golog.Logger

	// Config
	Config config.Config

	// Dbx is a Sqlx database instance
	Dbx *sqlx.DB

	// FCMClient is a FCM client
	FCMClient *messaging.Client
}

// subscribeRequest is a subscribe endpoint request
type subscribeRequest struct {
	// Subscription
	Subscription models.Subscription `json:"subscription" validate:"required"`
}

// subscribeResponse is a subscribe endpoint response
type subscribeResponse struct {
	// Subscription
	Subscription models.Subscription `json:"subscription"`
}

// ServeHTTP implements http.Handler
func (h SubscribeHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Read request
	req := subscribeRequest{}

	if err := DecodeJSON(r, &req); err != nil {
		RespondError(h.Logger, w, err, http.StatusBadRequest)
		return
	}

	// Insert
	subscription := &req.Subscription
	if err := subscription.Insert(h.Dbx); err != nil {
		h.Logger.Errorf("error inserting subscription: %s", err.Error())
		RespondError(h.Logger, w, fmt.Errorf("error inserting subscription"),
			http.StatusInternalServerError)
		return
	}

	// Subscribe to topic
	topicResp, err := h.FCMClient.SubscribeToTopic(h.Ctx,
		[]string{req.Subscription.RegistrationToken},
		h.Config.Firebase.DealsTopic)
	if err != nil || topicResp.SuccessCount != 1 {
		if err != nil {
			h.Logger.Errorf("error subscribing \"%s\" to \"%s\": %s",
				req.Subscription.RegistrationToken,
				h.Config.Firebase.DealsTopic,
				err.Error())
		}

		for _, err := range topicResp.Errors {
			h.Logger.Errorf("error subscribing \"%s\" to \"%s\": %s",
				req.Subscription.RegistrationToken,
				h.Config.Firebase.DealsTopic,
				err.Reason)
		}

		// Delete database entry if FCM subscribe fails
		// shouldPanic will be set to true if the endpoint fails to clean itself up
		shouldPanic := false
		if err := subscription.Delete(h.Dbx); err != nil {
			h.Logger.Errorf("error deleting subscription from database after "+
				"FCM subscribe API call failed, endpoint was not atomic "+
				"for this call, delete subscription id: %d, error: %s",
				subscription.ID, err.Error())
			shouldPanic = true
		}

		RespondError(h.Logger, w, fmt.Errorf("failed to subscribe client to FCM topic"),
			http.StatusInternalServerError)

		if shouldPanic {
			h.Logger.Fatalf("endpoint call ended up not being atomic, manual "+
				"cleanup required")
		}
		return
	}

	// Response
	resp := subscribeResponse{
		Subscription: *subscription,
	}

	RespondJSON(h.Logger, w, resp, http.StatusOK)
}
