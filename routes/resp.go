package routes

import (
	"net/http"
	"encoding/json"

	"github.com/Noah-Huppert/golog"
)

// ErrorResponse is a standard error response
type ErrorResponse struct {
	// Error text
	Error string `json:"error"`
}

// RespondJSON responds to a request with JSON
func RespondJSON(logger golog.Logger, w http.ResponseWriter, data interface{}, status int) {
	// Attempt to marshal
	marshalled, err := json.Marshal(data)
	if err != nil {
		logger.Errorf("failed to JSON encode response: %s", err.Error())

		// Respond with static error respone
		status = http.StatusInternalServerError
		marshalled = []byte("{\"error\": \"failed to JSON encode response\"}")
	}

	// Attempt to write
	w.WriteHeader(status)
	
	_, err = w.Write(marshalled)
	if err != nil {
		logger.Fatalf("failed to write response: %s", err.Error())
	}
}

// RespondError responds to a request with a JSON encoded error
func RespondError(logger golog.Logger, w http.ResponseWriter, err error, status int) {
	RespondJSON(logger, w, ErrorResponse{
		Error: err.Error(),
	}, status)
}
