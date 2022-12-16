import { login } from "./login";
import { listGameDeals } from "./list-game-deals";
import { createGameDeal } from "./create-game-deal";
import { listUsers } from "./list-users";

export const ERROR_CODE_MUST_RESET_PASSWORD = "must_reset_password";

export default {
  login,
  listGameDeals,
  createGameDeal,
  listUsers,
}
