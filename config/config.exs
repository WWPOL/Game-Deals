# This file is responsible for configuring your application
# and its dependencies with the aid of the Mix.Config module.
#
# This configuration file is loaded before any dependency and
# is restricted to this project.

# General application configuration
use Mix.Config

config :game_deals,
  ecto_repos: [GameDeals.Repo]

# Configures the endpoint
config :game_deals, GameDealsWeb.Endpoint,
  url: [host: "localhost"],
  secret_key_base: "D9wTKPOp3i3AmmYIpyDQNHJbbuoiiijrPXHwP8JnPrSf5+bqVy21d6O0xLuy0t8O",
  render_errors: [view: GameDealsWeb.ErrorView, accepts: ~w(html json)],
  pubsub: [name: GameDeals.PubSub, adapter: Phoenix.PubSub.PG2]

# Configures Elixir's Logger
config :logger, :console,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id]

# Use Jason for JSON parsing in Phoenix
config :phoenix, :json_library, Jason

# Import environment specific config. This must remain at the bottom
# of this file so it overrides the configuration defined above.
import_config "#{Mix.env()}.exs"
