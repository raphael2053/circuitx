/**
 * UUID v4 generation utility
 * Uses crypto.randomUUID() for secure random UUIDs
 */

/**
 * Generate a UUID v4 string
 * @returns UUID v4 string (e.g., "550e8400-e29b-41d4-a716-446655440000")
 */
export function generateUUID(): string {
	return crypto.randomUUID();
}

/**
 * Validate if a string is a valid UUID v4 format
 * @param uuid - String to validate
 * @returns true if valid UUID v4 format
 */
export function isValidUUID(uuid: string): boolean {
	const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
	return uuidRegex.test(uuid);
}
