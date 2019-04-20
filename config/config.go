package config

// Config is application configuration
type Config struct {
	// Database configuration
	Database struct {
		// Host
		Host string `default:"localhost"`

		// User
		User string `default:"postgres"`

		// Database
		Database string `default:"game_deals"`
	}
}
