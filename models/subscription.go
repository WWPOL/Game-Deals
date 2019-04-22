package models

// Subscription to new game deals
type Subscription struct {
	// ID in database
	ID int64 `db:"id" json:"id"`

	// RegistrationToken is a device's Firebase Cloud Messaging registration token
	RegistrationToken string `db:"registration_token" json:"registration_token" validate:"required"`
}
