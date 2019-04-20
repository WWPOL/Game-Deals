package models

import (
	"fmt"
	
	"golang.org/x/crypto/bcrypt"
)

// User on site
type User struct {
	// ID
	ID int64
	
	// Username
	Username string

	// PasswordHash bcrypt hash
	PasswordHash string
}

// HashPassword returns a bcrypt hash for the provided password
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), 14)
	if err != nil {
		return "", fmt.Errorf("failed to hash: %s", err.Error())
	}

	return string(bytes), nil
}
