import React from "react";

import { getStoredAuthToken } from "~api/auth";
import { DashboardLogin } from "~pages/DashboardLogin";

/**
 * Redirects the user to the login page if they are not logged in.
 */
export function EnsureAuth({
    children,
}: {
    readonly children: React.Elements,
}) {
    if (!getStoredAuthToken()) {
        return (
            <DashboardLogin />
        )
    }

    return children;
}
