defmodule GameDealsWeb.PageController do
  use GameDealsWeb, :controller

  def index(conn, _params) do
    render(conn, "index.html")
  end
end
