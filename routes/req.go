package routes

import (
	"fmt"
	"net/http"
	"encoding/json"
	"strings"

	"github.com/WWPOL/Game-Deals/config"
	
	"gopkg.in/go-playground/validator.v9"
	"github.com/dgrijalva/jwt-go"
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

// Authenticate ensures a request has a valid authentication token.
// Returns nil if authenticated.
func Authenticate(r *http.Request, config config.Config) error {
	// Get Authorization header
	authorization := r.Header.Get("Authorization")

	if len(authorization) == 0 {
		return fmt.Errorf("authorization header empty")
	}

	parts := strings.Split(authorization, " ")

	if len(parts) != 2 {
		return fmt.Errorf("authorization header not in format \"Bearer <TOKEN>\"")
	}

	if parts[0] != "Bearer" {
		return fmt.Errorf("authorization header not of type Bearer")
	}

	// Validiate JWT
	token, err := jwt.Parse(parts[1], func(token *jwt.Token) (interface{}, error) {
		// Validate signing algorithm
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("signing method not HMAC")
		}

		return []byte(config.Authentication.Secret), nil
	})

	if err != nil {
		return fmt.Errorf("failed to parse authentication token: %s", err.Error())
	}

	if !token.Valid {
		return fmt.Errorf("authentication token not valid")
	}

	if claims, ok := token.Claims.(jwt.MapClaims); !ok {
		return fmt.Errorf("failed to parse claims")
	} else {
		if sub, ok := claims["sub"].(string); ok && len(sub) > 0 {
			return nil
		}

		return fmt.Errorf("subject claim is empty")
	} 
}
