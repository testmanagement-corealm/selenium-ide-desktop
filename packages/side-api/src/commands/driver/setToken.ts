/**
 * Get the authentication token.
 * @returns A promise that resolves with the token or null if not set.
 */
export type Shape = (token: string) => Promise<string | null>;
