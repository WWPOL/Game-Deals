package models

import (
	"time"
)

// Deal on game
type Deal struct {
	// ID
	ID int64
	
	// GameID is the ID of game deal relates to
	GameID int

	// Start is the date and time a deal starts on
	Start time.Time

	// End is the optional deal end date and time
	End time.Time

	// Price of game with deal, 0 if free
	Price float64

	// Link to game deal
	Link string

	// Description is an optional description of the deal
	Description string
}
