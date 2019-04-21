package models

import (
	"fmt"
	
	"golang.org/x/crypto/bcrypt"
	"github.com/jmoiron/sqlx"
)

// User on site
type User struct {
	// ID
	ID int64 `json:"id"`
	
	// Username
	Username string `json:"username" db:"username"`

	// PasswordHash bcrypt hash
	PasswordHash string `json:"-" db:"password_hash"`
}

// HashPassword returns a bcrypt hash for the provided password
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), 14)
	if err != nil {
		return "", fmt.Errorf("failed to hash: %s", err.Error())
	}

	return string(bytes), nil
}

// QueryByUsername retrieves a user from the database based on its username.
// Returns sql.ErrNoRows if none found.
func (u *User) QueryByUsername(dbx *sqlx.DB) error {
	return dbx.Get(u, "SELECT id, password_hash FROM users WHERE username = $1", u.Username)
}


// CheckPassword checks if a password matches the hash stored for a user
func (u User) CheckPassword(password string) (bool, error) {
	err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(password))
	if err == bcrypt.ErrMismatchedHashAndPassword {
		return false, nil
	} else if err != nil {
		return false, fmt.Errorf("failed to compare hashes: %s", err.Error())
	}

	return true, nil
}
