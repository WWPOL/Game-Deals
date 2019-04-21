package models

import (
	"time"
	"fmt"

	"github.com/jmoiron/sqlx"
)

// Deal on game
type Deal struct {
	// ID
	ID int64
	
	// GameID is the ID of game deal relates to
	GameID int

	// Start is the date and time a deal starts on
	Start *time.Time

	// End is the optional deal end date and time
	End *time.Time

	// Published is the optional published time
	Published *time.Time

	// Price of game with deal, 0 if free
	Price float64

	// Link to game deal
	Link string

	// Description is an optional description of the deal
	Description string
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

// Insert game into database
func (g *Game) Insert(dbx *sqlx.DB) error {
	tx, err := dbx.Beginx()
	if err != nil {
		return fmt.Errorf("error beginning transaction: %s", err.Error())
	}

	err = tx.QueryRowx("INSERT INTO deals (game_id, start_time, end_time, "+
		"published_time, price, link, description) VALUES ($1, $2, $3, "+
		"$4, $5, $6, $7) RETURNING id", g.GameID, g.Start, g.End, g.Published,
	        g.Price, g.Link, g.Description).StructScan(g)
	if err != nil {
		return fmt.Errorf("error executing query: %s", err.Error())
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("error commiting transaction: %s", err.Error())
	}

	return nil
}
