package models

import (
	"fmt"
	
	"github.com/jmoiron/sqlx"
)

// Game is a video game
type Game struct {
	// ID
	ID int64 `db:"id"`
	
	// Name
	Name string `db:"name"`
}

// QueryAllGames returns an array of Games in the database
func QueryAllGames(dbx *sqlx.DB) ([]Game, error) {
	games := []Game{}

	rows, err := dbx.Queryx("SELECT * FROM games")
	if err != nil {
		return nil, fmt.Errorf("failed to execute query: %s", err.Error())
	}

	for rows.Next() {
		game := Game{}

		if err = rows.StructScan(&game); err != nil {
			return nil, fmt.Errorf("failed to scan row into struct: %s", err.Error())
		}
		games = append(games, game)
	}

	return games, nil
}
