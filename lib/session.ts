/**
 * Session management utilities for user data isolation
 * Generates and stores a unique session ID per browser
 */

const SESSION_STORAGE_KEY = "rag_chatbot_session_id";

/**
 * Generates a unique session ID
 * Format: session_[timestamp]_[random]
 */
function generateSessionId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `session_${timestamp}_${random}`;
}

/**
 * Gets or creates a session ID for the current user
 * Session ID is stored in localStorage and persists across page refreshes
 * @returns The session ID for the current user
 */
export function getSessionId(): string {
    // Check if we're in a browser environment
    if (typeof window === "undefined") {
        throw new Error("getSessionId can only be called in browser context");
    }

    // Try to get existing session ID
    let sessionId = localStorage.getItem(SESSION_STORAGE_KEY);

    // If no session ID exists, generate a new one
    if (!sessionId) {
        sessionId = generateSessionId();
        localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
        console.log("New session created:", sessionId);
    } else {
        console.log("Existing session found:", sessionId);
    }

    return sessionId;
}

/**
 * Clears the current session
 * Use this when implementing logout functionality
 */
export function clearSession(): void {
    if (typeof window !== "undefined") {
        localStorage.removeItem(SESSION_STORAGE_KEY);
        console.log("Session cleared");
    }
}

/**
 * Checks if a session exists
 */
export function hasSession(): boolean {
    if (typeof window === "undefined") {
        return false;
    }
    return localStorage.getItem(SESSION_STORAGE_KEY) !== null;
}
