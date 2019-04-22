package models

import (
	"fmt"
	
	"github.com/jmoiron/sqlx"
)

// Subscription to new game deals
type Subscription struct {
	// ID in database
	ID int64 `db:"id" json:"id"`

	// RegistrationToken is a device's Firebase Cloud Messaging registration token
	RegistrationToken string `db:"registration_token" json:"registration_token" validate:"required"`
}

// Insert subscription into database
func (s *Subscription) Insert(db *sqlx.DB) error {
	tx, err := db.Beginx()
	if err != nil {
		return fmt.Errorf("error beginning transaction: %s", err.Error())
	}

	err = tx.QueryRowx("INSERT INTO subscriptions (registration_token) "+
		"VALUES ($1) RETURNING id", s.RegistrationToken).StructScan(s)
	if err != nil {
		return fmt.Errorf("error executing insert query: %s", err.Error())
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("error commiting transaction: %s", err.Error())
	}

	return nil
}
