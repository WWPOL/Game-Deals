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

// Insert game
func (g *Game) Insert(dbx *sqlx.DB) error {
	tx, err := dbx.Begin()
	if err != nil {
		return fmt.Errorf("error starting transaction: %s", err.Error())
	}

	err = tx.QueryRowx("INSERT INTO games (name) VALUES ($1) RETURNING id",
		g.Name).StructScan(g)
	if err != nil {
		return fmt.Errorf("failed to execute insert query: %s", err.Error())
	}

	if err = tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit insert game transaction: %s", err.Error())
	}

	return nil
}
