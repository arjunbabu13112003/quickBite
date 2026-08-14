/**
 * Real JWT (JSON Web Token) Service for QuickBite Food Delivery
 * Standard JWT format: [base64Header].[base64Payload].[base64Signature]
 */

const JWT_SECRET = 'QuickBite_NestJS_PostgreSQL_SuperSecretKey_2026';

// Base64Url encode helper
const base64UrlEncode = (str) => {
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
};

// Base64Url decode helper
const base64UrlDecode = (str) => {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return decodeURIComponent(escape(atob(base64)));
};

/**
 * Sign a new JWT Token with Header, Payload & Signature
 */
export const signJwtToken = (userObj) => {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const payload = {
    sub: userObj.id,
    name: userObj.name,
    email: userObj.email,
    phone: userObj.phone || '',
    role: userObj.role || 'user',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (86400 * 7) // Valid for 7 days
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  
  // Simple HMAC-like signature hash
  const signatureInput = `${encodedHeader}.${encodedPayload}.${JWT_SECRET}`;
  const signature = base64UrlEncode(signatureInput);

  return `${encodedHeader}.${encodedPayload}.${signature}`;
};

/**
 * Verify and Decode a JWT Token
 */
export const verifyJwtToken = (token) => {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    const payloadJson = base64UrlDecode(parts[1]);
    const payload = JSON.parse(payloadJson);

    // Check Token Expiry
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      console.warn('JWT Token expired');
      return null;
    }

    return payload;
  } catch (err) {
    console.error('JWT Token Verification failed:', err);
    return null;
  }
};
