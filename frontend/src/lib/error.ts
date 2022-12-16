import React from "react";
import * as E from "fp-ts/Either";

import { ErrorCtx } from "~App";

/**
 * Hook which sets up the handle left function with the error context.
 * @returns The handleLeft function.
 */
export function useHandleLeft() {
    const { setError } = React.useContext(ErrorCtx);

    /**
     * If the provided either type is left the error is logged and a user friendly error is displayed to the user. If right then the success function is run.
     * @typeParam L - The left type of the either
     * @typeParma R - The right type of the either
     * @typeParam S - Type returned by the success function
     * @param userErrMsg - User friendly error message which will be shown to the user if either is left
     * @param success - Function which will be run with the right value as its argument if either is right
     */
    return function handleLeft<L, R, S>(userErrMsg: string, success: (res: R)=> S): (either: E.Either<L, R>) => void {
        return (either: E.Either<L, R>): void => {
            return E.match(
                (l: L) => {
                    console.trace(userErrMsg, l);
                    setError(userErrMsg);
                },
                (r: R) => success(r),
            )(either);
        };
    };
}
