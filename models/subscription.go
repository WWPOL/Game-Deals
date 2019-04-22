package models

// Subscription to new game deals
type Subscription struct {
	// Email of subscribing user
	Email string `db:"email" json:"email" validate:"email,required"`

	// NotifyEmail indicates if a user wants to recieve email notifications
	NotifyEmail bool `db:"notify_email" json:"notify_email" validate:"required"`

	// NotifyPush indicates if a user wants to receive push notifications
	NotifyPush bool `db:"notify_push" json:"notify_push" validate:"required"`

	// VerifyToken is a secret value which a user is emailed to verify they own the email
	VerifyToken string `db:"verify_token" json:"-"`

	// Verified indicates if a user's email has been verified
	Verified bool `db:"verified" json:"verified"`
}
