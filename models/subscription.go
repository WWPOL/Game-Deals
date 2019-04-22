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

// QueryByRegistrationToken queries the database for a subscription with a matching
// RegistrationToken field
func (s *Subscription) QueryByRegistrationToken(db *sqlx.DB) error {
	return dbx.Get(s, "SELECT id FROM subscriptions WHERE registration_token = $1",
		s.RegistrationToken)
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

// Delete subscription from database
func (s Subscription) Delete(db *sqlx.DB) error {
	tx, err := db.Beginx()
	if err != nil {
		return fmt.Errorf("error beginning transaction: %s", err.Error())
	}

	res, err := tx.Exec("DELETE FROM subscriptions WHERE id = $1", s.ID)
	if err != nil {
		return fmt.Errorf("error executing delete query: %s", err.Error())
	}

	if numRows, err := res.RowsAffected(); err != nil {
		return fmt.Errorf("error getting number of rows affected by query: %s",
			err.Error())
	} else if numRows != 1 {
		return fmt.Errorf("number of rows affected by query != 1, was: %d", numRows)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("error committing transaction: %s", err.Error())
	}

	return nil
}
