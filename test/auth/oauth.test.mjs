import test from "node:test";
import assert from "node:assert/strict";
import { acquireToken, extractScopesFromToken, validateVectorSearchAccess, clearTokenCache } from "../../src/auth/oauth.mjs";

test("extractScopesFromToken parses scopes correctly", () => {
  // Mock JWT: header.payload.signature
  const createMockJwt = (payload) => {
    return `header.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.signature`;
  };

  assert.deepEqual(extractScopesFromToken(createMockJwt({ scope: "vector:search" })), ["vector:search"]);
  assert.deepEqual(extractScopesFromToken(createMockJwt({ scope: "vector:read memory:write" })), ["vector:read", "memory:write"]);
  assert.deepEqual(extractScopesFromToken(createMockJwt({ scp: ["vector:search"] })), ["vector:search"]);
  
  assert.deepEqual(extractScopesFromToken("invalid.token"), []);
  assert.deepEqual(extractScopesFromToken(null), []);
});

test("validateVectorSearchAccess enforces scope requirements", () => {
  const createMockJwt = (payload) => `header.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.signature`;

  // Should pass when not enforced and no token provided
  assert.doesNotThrow(() => validateVectorSearchAccess({}));

  // Should throw when enforced but no token provided
  assert.throws(() => validateVectorSearchAccess({ enforceOAuth: true }), /Access token required/);

  // Should throw when token is provided but lacks scopes
  assert.throws(() => validateVectorSearchAccess({
    accessToken: createMockJwt({ scope: "memory:read" })
  }), /Missing required vector search scopes/);

  // Should pass with valid token
  assert.doesNotThrow(() => validateVectorSearchAccess({
    accessToken: createMockJwt({ scope: "vector:search" })
  }));
});

test("acquireToken fetches and caches token", async (t) => {
  clearTokenCache();
  
  let fetchCount = 0;
  
  // Mock global fetch for this test
  const originalFetch = global.fetch;
  global.fetch = async (url, options) => {
    fetchCount++;
    assert.equal(url, "https://mock.auth/token");
    assert.equal(options.method, "POST");
    
    // Convert body to string for verification
    const bodyStr = options.body.toString();
    assert.ok(bodyStr.includes("client_id=test-client"));
    
    return {
      ok: true,
      json: async () => ({
        access_token: "mock-token-123",
        expires_in: 3600
      })
    };
  };

  try {
    const token1 = await acquireToken({
      tokenEndpoint: "https://mock.auth/token",
      clientId: "test-client",
      clientSecret: "test-secret"
    });
    
    assert.equal(token1, "mock-token-123");
    assert.equal(fetchCount, 1);
    
    // Second call should return cached token, fetchCount remains 1
    const token2 = await acquireToken({
      tokenEndpoint: "https://mock.auth/token",
      clientId: "test-client",
      clientSecret: "test-secret"
    });
    
    assert.equal(token2, "mock-token-123");
    assert.equal(fetchCount, 1);
  } finally {
    global.fetch = originalFetch;
    clearTokenCache();
  }
});
