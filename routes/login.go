package routes

import (
	"fmt"
	"net/http"
	"database/sql"

	"github.com/WWPOL/Game-Deals/models"
	"github.com/WWPOL/Game-Deals/config"

	"github.com/Noah-Huppert/golog"
	"github.com/dgrijalva/jwt-go"
	"github.com/jmoiron/sqlx"
)

// UserLoginHandler exchanges a user's username and password for a JWT
type UserLoginHandler struct {
	// Logger
	Logger golog.Logger

	// Dbx Sqlx database
	Dbx *sqlx.DB

	// Config
	Config config.Config
}

// userLoginRequest is a user login request body
type userLoginRequest struct {
	// Username of user
	Username string `json:"username" validate:"required"`

	// Password of user
	Password string `json:"password" validate:"required"`
}

// userLoginResponse is a user login response body
type userLoginResponse struct {
	// Token is the user's authentication token
	Token string `json:"token"`
}

// ServeHTTP implements http.Handler
func (h UserLoginHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Parse request
	req := userLoginRequest{}
	
	if err := DecodeJSON(r, &req); err != nil {
		RespondError(h.Logger, w, err, http.StatusBadRequest)
		return
	}

	// Find user
	user := &models.User{
		Username: req.Username,
	}

	err := user.QueryByUsername(h.Dbx)
	if err == sql.ErrNoRows {
		RespondError(h.Logger, w, fmt.Errorf("no user"), http.StatusNotFound)
		return
	} else if err != nil {
		h.Logger.Errorf("failed to query user by username: %s", err.Error())
		RespondError(h.Logger, w, fmt.Errorf("error while looking up user"),
			http.StatusInternalServerError)
		return
	}

	// Check password
	ok, err := user.CheckPassword(req.Password)
	if err != nil {
		h.Logger.Errorf("failed to check password: %s", err.Error())
		RespondError(h.Logger, w, fmt.Errorf("failed to check password"),
			http.StatusInternalServerError)
		return
	}

	if !ok {
		RespondError(h.Logger, w, fmt.Errorf("incorrect password"),
			http.StatusUnauthorized)
		return
	}

	// Create authentication token
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": req.Username,
	})

	tokenStr, err := token.SignedString([]byte(h.Config.Authentication.Secret))
	if err != nil {
		h.Logger.Errorf("failed to created signed token string: %s", err.Error())
		RespondError(h.Logger, w, fmt.Errorf("failed to create authentication token"),
			http.StatusInternalServerError)
		return
	}

	RespondJSON(h.Logger, w, userLoginResponse{
		Token: tokenStr,
	}, http.StatusOK)
}
