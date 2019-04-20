package models

// User on site
type User struct {
	// Username
	Username string

	// PasswordHash bcrypt hash
	PasswordHash
}
