package config

// Config is application configuration
type Config struct {
	// Server configuration
	Server struct {
		// Port
		Port int `default:"8000"`
	}
	
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
