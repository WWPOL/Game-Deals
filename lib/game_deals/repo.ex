defmodule GameDeals.Repo do
  use Ecto.Repo,
    otp_app: :game_deals,
    adapter: Ecto.Adapters.Postgres
end
