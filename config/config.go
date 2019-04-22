package config

// Config is application configuration
type Config struct {
	// Server configuration
	Server struct {
		// Port
		Port int `default:"8000" validate:"required"`
	}
	
	// Database configuration
	Database struct {
		// Host
		Host string `default:"localhost" validate:"required"`

		// User
		User string `default:"postgres" validate:"required"`

		// Database
		Database string `default:"game_deals" validate:"required"`
	}

	// Authentication configuration
	Authentication struct {
		// Signing secret
		Secret string `validate:"required"`
	}

	// Firebase configuration
	Firebase struct {
		// ServiceAccountFile is the path to a Firebase service account credentials file
		ServiceAccountFile string `validate:"required"`

		// DealsTopic is the name of Firebase Cloud Messaging topic which new deals
		// will be published
		DealsTopic string `default:"deals" validate:"required"`
	}
}
