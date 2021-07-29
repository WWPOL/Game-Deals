export { Login } from "~/components/Auth/Login";
export { Logout } from "~/components/Auth/Logout";

/**
 * The local storage key in which the API authorization token will be stored. This value will be set to null if the user is not logged in.
 */
const LOCAL_STORAGE_API_AUTH_TOKEN_KEY = "apiAuthToken";

/**
 * Retrive currently stored auth token.
 * @returns string if value stored, null if no value stored.
 */
export function getStoredAuthToken(): string | null {
  return localStorage.getItem(LOCAL_STORAGE_API_AUTH_TOKEN_KEY);
}

/**
 * Sets a stored auth token.
 * @param token Token to store, if null then clears the stored token.
 */
export function setStoredAuthToken(token: string | null) {
  if (token !== null) {
    // Save new value
    localStorage.setItem(LOCAL_STORAGE_API_AUTH_TOKEN_KEY, token);
  } else {
    // Clear value
    localStorage.removeItem(LOCAL_STORAGE_API_AUTH_TOKEN_KEY);
  }
}
