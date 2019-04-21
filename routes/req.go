package routes

import (
	"fmt"
	"net/http"
	"encoding/json"
	
	"gopkg.in/go-playground/validator.v9"
)

// DecodeJSON decodes a JSON encoded request body and validates it
func DecodeJSON(r *http.Request, data interface{}) error {
	// Decode
	decoder := json.NewDecoder(r.Body)
	if err := decoder.Decode(&data); err != nil {
		return fmt.Errorf("failed to JSON decode: %s", err.Error())
	}

	// Validate
	validate := validator.New()
	if err := validate.Struct(data); err != nil {
		return fmt.Errorf("decoded struct is not valid: %s", err.Error())
	}

	return nil
}
