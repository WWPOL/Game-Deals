package models

import (
	"fmt"
	
	"github.com/jmoiron/sqlx"
)

// Game is a video game
type Game struct {
	// ID
	ID int64 `db:"id" json:"id"`
	
	// Name
	Name string `db:"name" json:"name" validate:"required"`
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

// Insert game into database
func (g *Game) Insert(dbx *sqlx.DB) error {
	tx, err := dbx.Beginx()
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

// Delete game from database
func (g Game) Delete(dbx *sqlx.DB) error {
	tx, err := dbx.Beginx()
	if err != nil {
		return fmt.Errorf("error starting transaction: %s", err.Error())
	}

	res, err := tx.Exec("DELETE FROM games WHERE id = $1", g.ID)
	if err != nil {
		return fmt.Errorf("error executing delete game query: %s", err.Error())
	}

	if numRows, err := res.RowsAffected(); err != nil {
		return fmt.Errorf("error getting number of rows affected by query: %s", err.Error())
	} else if numRows != 1 {
		return fmt.Errorf("number of rows affected not 1, was: %d", numRows)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("error commiting delete game transaction: %s", err.Error())
	}

	return nil
}

// Update game in database
func (g Game) Update(dbx *sqlx.DB) error {
	tx, err := dbx.Beginx()
	if err != nil {
		fmt.Errorf("error starting transaction: %s", err.Error())
	}

	res, err := tx.Exec("UPDATE games SET name = $1 WHERE id = $2", g.Name, g.ID)
	if err != nil {
		return fmt.Errorf("error executing update game query: %s", err.Error())
	}

	if numRows, err := res.RowsAffected(); err != nil {
		return fmt.Errorf("error getting number of rows affected by query: %s", err.Error())
	} else if numRows != 1 {
		return fmt.Errorf("number of rows affected not 1, was: %d", numRows)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("error commiting update game transaction: %s", err.Error())
	}
	return nil
}
