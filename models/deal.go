package models

import (
	"time"
	"fmt"

	"github.com/jmoiron/sqlx"
)

// Deal on game
type Deal struct {
	// ID
	ID int64 `db:"id" json:"id"`
	
	// GameID is the ID of game deal relates to
	GameID int `db:"game_id" validate:"required" json:"game_id"`

	// Start is the date and time a deal starts on
	Start *time.Time `db:"start_time" json:"start_time"`

	// End is the optional deal end date and time
	End *time.Time `db:"end_time" json:"end_time"`

	// Published is the optional published time
	Published *time.Time `db:"published_time" json:"published_time"`

	// Price of game with deal, 0 if free
	Price float64 `db:"price" validate:"required" json:"price"`

	// Link to game deal
	Link string `db:"link" validate:"required" json:"link"`

	// Description is an optional description of the deal
	Description string `db:"description" validate:"required" json:"description"`
}

// QueryAllDeals return an array of deals in the database
func QueryAllDeals(dbx *sqlx.DB) ([]Deal, error) {
	deals := []Deal{}

	rows, err := dbx.Queryx("SELECT * FROM deals")
	if err != nil {
		return nil, fmt.Errorf("failed to execute query: %s", err.Error())
	}

	for rows.Next() {
		deal := Deal{}

		if err = rows.StructScan(&deal); err != nil {
			return nil, fmt.Errorf("failed to scan row into struct: %s", err.Error())
		}
		deals = append(deals, deal)
	}

	return deals, nil
}

// Insert deal into database
func (d *Deal) Insert(dbx *sqlx.DB) error {
	tx, err := dbx.Beginx()
	if err != nil {
		return fmt.Errorf("error beginning transaction: %s", err.Error())
	}

	err = tx.QueryRowx("INSERT INTO deals (game_id, start_time, end_time, "+
		"published_time, price, link, description) VALUES ($1, $2, $3, "+
		"$4, $5, $6, $7) RETURNING id", d.GameID, d.Start, d.End, d.Published,
	        d.Price, d.Link, d.Description).StructScan(d)
	if err != nil {
		return fmt.Errorf("error executing query: %s", err.Error())
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("error commiting transaction: %s", err.Error())
	}

	return nil
}

// Update deal in database
func (d Deal) Update(dbx *sqlx.DB) error {
	tx, err := dbx.Beginx()
	if err != nil {
		return fmt.Errorf("error beginning transaction: %s", err.Error())
	}

	res, err := tx.Exec("UPDATE deals SET game_id = $1, start_time = $2, end_time = $3, "+
		"published_time = $4, price = $5, link = $6, description = $7",
		d.GameID, d.Start, d.End, d.Published, d.Price, d.Link, d.Description)
	if err != nil {
		return fmt.Errorf("error executing query: %s", err.Error())
	}

	if numRows, err := res.RowsAffected(); err != nil {
		return fmt.Errorf("error getting number of rows affected by query: %s",
			err.Error())
	} else if numRows != 1 {
		return fmt.Errorf("number of rows affect not 1, was: %d", numRows)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("error commit transaction: %s", err.Error())
	}

	return nil
}

// Delete deal in database
func (d Deal) Delete(dbx *sqlx.DB) error {
	tx, err := dbx.Beginx()
	if err != nil {
		return fmt.Errorf("error beginning transaction: %s", err.Error())
	}

	res, err := tx.Exec("DELETE FROM deals WHERE id = $1", d.ID)
	if err != nil {
		return fmt.Errorf("error executing query: %s", err.Error())
	}

	if numRows, err := res.RowsAffected(); err != nil {
		return fmt.Errorf("error getting number of rows affected: %s", err.Error())
	} else if numRows != 1 {
		return fmt.Errorf("number of rows affected by query != 1, is: %d", numRows)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("error comitting transaction: %s", err.Error())
	}

	return nil
