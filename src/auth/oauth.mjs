const tokenCache = new Map();

/**
 * Acquires a Bearer token using the OAuth 2.0 Client Credentials flow.
 * Caches the token to minimize redundant requests to the Authorization Server.
 * 
 * @param {Object} config 
 * @param {string} config.tokenEndpoint - The OAuth token endpoint URL
 * @param {string} config.clientId - The client identifier
 * @param {string} config.clientSecret - The client secret
 * @param {string} [config.resource] - Optional resource or audience parameter
 * @returns {Promise<string>} The access token
 */
export async function acquireToken({ tokenEndpoint, clientId, clientSecret, resource }) {
  if (!tokenEndpoint || !clientId || !clientSecret) {
    throw new Error("Missing required OAuth parameters: tokenEndpoint, clientId, clientSecret");
  }

  const cacheKey = `${tokenEndpoint}:${clientId}`;
  const cached = tokenCache.get(cacheKey);
  
  // Return cached token if it's still valid for at least 1 more minute
  if (cached && cached.expiresAt > Date.now() + 60000) {
    return cached.token;
  }

  const params = new URLSearchParams();
  params.append("grant_type", "client_credentials");
  params.append("client_id", clientId);
  params.append("client_secret", clientSecret);
  if (resource) {
    params.append("resource", resource);
  }

  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: params
  });

  if (!response.ok) {
    throw new Error(`Failed to acquire OAuth token: ${response.statusText}`);
  }

  const data = await response.json();
  const token = data.access_token;
  const expiresIn = data.expires_in || 3600;

  tokenCache.set(cacheKey, {
    token,
    expiresAt: Date.now() + (expiresIn * 1000)
  });

  return token;
}

/**
 * Extracts scopes from a JWT payload.
 * Note: This does NOT verify the JWT signature. Signature validation 
 * is expected to be handled by an API Gateway or external auth middleware.
 * 
 * @param {string} token - The JWT access token
 * @returns {string[]} Array of authorized scopes
 */
export function extractScopesFromToken(token) {
  if (!token || typeof token !== 'string') return [];
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return []; 
    
    const payloadBuffer = Buffer.from(parts[1], 'base64');
    const payload = JSON.parse(payloadBuffer.toString('utf8'));
    
    // Check standard scope claims
    if (payload.scope) {
      return typeof payload.scope === 'string' ? payload.scope.split(' ') : payload.scope;
    }
    if (payload.scp) {
      return typeof payload.scp === 'string' ? payload.scp.split(' ') : payload.scp;
    }
    return [];
  } catch (error) {
    return [];
  }
}

/**
 * Validates if the provided options containing an access token grant vector search access.
 * Throws an error if a token is present but lacks required scopes.
 * 
 * @param {Object} options - The request options, potentially containing accessToken
 */
export function validateVectorSearchAccess(options = {}) {
  if (options.enforceOAuth || options.accessToken) {
    if (!options.accessToken) {
      throw new Error("Unauthorized: Access token required for vector search");
    }
    const scopes = extractScopesFromToken(options.accessToken);
    if (!scopes.includes("vector:search") && !scopes.includes("vector:read")) {
      throw new Error("Unauthorized: Missing required vector search scopes (vector:search or vector:read)");
    }
  }
}

// For testing purposes
export function clearTokenCache() {
  tokenCache.clear();
}
