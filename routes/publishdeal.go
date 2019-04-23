package routes

import (
	"context"
	"time"
	"path"
	"net/url"
	"net/http"
	"database/sql"
	"fmt"
	"strconv"

	"github.com/WWPOL/Game-Deals/config"
	"github.com/WWPOL/Game-Deals/models"

	"github.com/Noah-Huppert/golog"
	"github.com/jmoiron/sqlx"
	"github.com/gorilla/mux"
	"firebase.google.com/go/messaging"
)

// PublishDealHandler sends a Firebase cloud messaging notification out to all
// clients which are subscribed
type PublishDealHandler struct {
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

// publishDealResponse is a response for the publish deal endpoint
type publishDealResponse struct {
	// Deal
	Deal models.Deal
}

// ServeHTTP implements http.Handler
func (h PublishDealHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Get deal ID
	urlVars := mux.Vars(r)
	var dealID int64
	
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
		
		dealID = n
	}

	// Get deal
	deal := &models.Deal{
		ID: dealID,
	}
	if err := deal.QueryByID(h.Dbx); err == sql.ErrNoRows {
		RespondError(h.Logger, w, fmt.Errorf("not found"),
			http.StatusNotFound)
		return
	} else if err != nil {
		h.Logger.Errorf("error querying for deal: %s", err.Error())
		RespondError(h.Logger, w, fmt.Errorf("failed to query for deal"),
			http.StatusInternalServerError)
		return
	}

	// Check if already published
	if deal.Published != nil {
		RespondError(h.Logger, w, fmt.Errorf("deal already published"),
			http.StatusConflict)
		return
	}

	// Get game linked to deal
	game := &models.Game{
		ID: deal.GameID,
	}
	if err := game.QueryByID(h.Dbx); err != nil {
		h.Logger.Errorf("error queryinf for associated game: %s", err.Error())
		RespondError(h.Logger, w, fmt.Errorf("error querying for deal's game"),
			http.StatusInternalServerError)
		return
	}

	// Build URL for icon
	iconURL, err := url.Parse(h.Config.Server.ExternalURL)
	if err != nil {
		RespondError(h.Logger, w, fmt.Errorf("failed to build URLs"),
			http.StatusInternalServerError)
		h.Logger.Fatalf("failed to parse server external URL from configuration: %s",
			err.Error())
	}
	iconURL.Path = path.Join(iconURL.Path, "img/notification-icon.png")

	// Send message
	_, err = h.FCMClient.Send(h.Ctx, &messaging.Message{
		Topic: h.Config.Firebase.DealsTopic,
		Webpush: &messaging.WebpushConfig{
			Headers: map[string]string{
				// https://tools.ietf.org/html/rfc8030#section-5.3
				"Urgency": "normal",
			},
			Notification: &messaging.WebpushNotification{
				Title: deal.Title,
				Body: fmt.Sprintf("New deal on %s!", game.Name),
				//Vibration pattern ms, on 200, pause 100, on 200
				Vibrate: []int{200, 100, 200},
				Renotify: true,
				RequireInteraction: true,
				Actions: []*messaging.WebpushNotificationAction{
					&messaging.WebpushNotificationAction{
						Action: fmt.Sprintf("open:deal:%d", deal.ID),
						Title: "Open",
					},
				},
				Icon: iconURL.String(),
			},
		},
	})
	if err != nil {
		h.Logger.Errorf("failed to push notification to FCM topic: %s", err.Error())
		RespondError(h.Logger, w, fmt.Errorf("failed to push notification"),
			http.StatusInternalServerError)
		return
	}

	// Set published at field
	now := time.Now()
	deal.Published = &now

	if err := deal.Update(h.Dbx); err != nil {
		h.Logger.Errorf("failed to update deal's published at time: %s", err.Error())
		RespondError(h.Logger, w, fmt.Errorf("failed to update deal's published at time"),
			http.StatusInternalServerError)
		return
	}

	// Respond
	resp := publishDealResponse{
		Deal: *deal,
	}
	RespondJSON(h.Logger, w, resp, http.StatusOK)
}
