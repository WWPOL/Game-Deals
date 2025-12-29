package main

import (
	"fmt"
	"github.com/caarlos0/env/v11"
)

type config struct {
	DBURI string `env:"DB_URI" envDefault:"postgres://devgamedeals:devgamedeals@localhost/devgamedeals"`

  APIAddr string `env:"API_ADDR" envDefault:":8000"`
}

func ParseConfig() (*config, error) {
	var cfg config
	if err := env.Parse(&cfg); err != nil {
		return nil, fmt.Errorf("failed to parse config from env vars: %s", err)
	}

  return &cfg, nil
}
