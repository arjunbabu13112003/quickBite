/**
 * QuickBite Admin Portal — JWT Utilities
 * Decodes and validates JWT tokens client-side.
 * Note: This is NOT cryptographic signature verification —
 * it only checks expiry and decodes the payload.
 * Authoritative validation happens server-side on every API request.
 */

const base64UrlDecode = (str) => {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return decodeURIComponent(escape(atob(base64)));
};

/**
 * Decode and validate a JWT token.
 * Returns the payload object if valid and not expired, null otherwise.
 */
export const verifyJwtToken = (token) => {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    const payloadJson = base64UrlDecode(parts[1]);
    const payload = JSON.parse(payloadJson);

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      console.warn('[Admin Portal] JWT token expired');
      return null;
    }

    return payload;
  } catch (err) {
    console.error('[Admin Portal] JWT decode failed:', err);
    return null;
  }
};

/**
 * Extract the role from a stored token without a full verify.
 * Returns null if token is missing or invalid.
 */
export const getRoleFromToken = (token) => {
  const payload = verifyJwtToken(token);
  return payload?.role || null;
};
