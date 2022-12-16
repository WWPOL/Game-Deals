import * as T from "io-ts";
import * as DT from "io-ts-types";

export const DealC = T.type({
  id: T.number,
  author_id: T.number,
  game_id: T.number,
  start_date: DT.DateFromNumber,
  end_date: DT.DateFromNumber,
});
export type Deal = T.TypeOf<typeof DealC>;

export const UserNonSecureC = T.type({
  id: T.number,
  username: T.string,
});
export type UserNonSecure = T.TypeOf<typeof UserNonSecureC>;
