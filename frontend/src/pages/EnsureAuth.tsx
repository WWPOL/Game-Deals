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
    const setJustLoggedIn = React.useState(false)[1];

    const onLogin = () => {
        // Force component to re-render after login
        setJustLoggedIn(true);
    };

    if (!getStoredAuthToken()) {
        return (
            <DashboardLogin onLogin={onLogin} />
        )
    }

    return children;
}
