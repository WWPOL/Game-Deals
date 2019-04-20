package models

// User on site
type User struct {
	// ID
	ID int64
	
	// Username
	Username string

	// PasswordHash bcrypt hash
	PasswordHash string
}
