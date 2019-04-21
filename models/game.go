package models

// Game is a video game
type Game struct {
	// ID
	ID int64 `db:"id"`
	
	// Name
	Name string `db:"name"`
}
