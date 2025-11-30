# UserSessioning Implementation Guide

> See `UserSessioning.md` for the complete concept specification (purpose, principle, state, actions, queries).

## How It Works

### Token Flow

1. **Login/Register**: `create(user)` → Returns `{ accessToken, refreshToken }`
2. **API Requests**: Client sends `accessToken` → `_getUser()` validates and returns user
3. **Token Expiry**: Access token expires → Client calls `refresh(refreshToken)`
4. **Token Refresh**: `refresh()` validates → Issues new token pair → Revokes old session
5. **Logout**: `delete()` → Marks session as revoked

### Token Types

**Access Token:**
- Lifetime: 15 minutes (hardcoded constant)
- Storage: Client-side only (stateless)
- Usage: Sent with every API request
- Validation: Signature, expiration, type="access", session status

**Refresh Token:**
- Lifetime: 7 days (hardcoded constant)
- Storage: Client-side + Database (for revocation)
- Usage: Only for obtaining new access tokens
- Validation: Signature, expiration, type="refresh", session status

## Implementation Details

### Database Schema

**MongoDB Collection: `UserSessioning.sessions`**

```typescript
interface SessionDoc {
  _id: string;              // jti (JWT ID) of refresh token
  user: User;               // User ID this session belongs to
  accessTokenJti: string;   // jti of associated access token (for linking)
  status: "active" | "revoked";  // Session status
  createdAt: Date;          // When session was created
  expiresAt: Date;          // When refresh token expires
  revokedAt?: Date;         // When session was revoked (if revoked)
}
```

**Design Rationale:**
- Single collection with status field (industry standard, more intuitive than separate revocation list)
- Tracks active sessions (refresh tokens with their associated access tokens)
- Enables revocation by marking sessions as "revoked"
- Matches OAuth2, Auth0, Firebase patterns

### Token Structure

**Access Token Payload:**
```json
{
  "sub": "user_123",
  "iat": 1704067200,
  "exp": 1704068100,  // 15 minutes later
  "jti": "access_abc123",
  "type": "access"
}
```

**Refresh Token Payload:**
```json
{
  "sub": "user_123",
  "iat": 1704067200,
  "exp": 1704672000,  // 7 days later
  "jti": "refresh_xyz789",
  "type": "refresh"
}
```

**Header (both tokens):**
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

### Configuration

**Environment Variable:**
```env
JWT_SECRET=your-super-secret-key-minimum-32-characters-long
```

**Code Constants (in UserSessioningConcept.ts):**
```typescript
const JWT_ACCESS_EXPIRATION_MINUTES = 15;
const JWT_REFRESH_EXPIRATION_DAYS = 7;
```

**Dependencies:**
- JWT library: `npm:djwt` (recommended for Deno) or `npm:jsonwebtoken`

## Important Notes for Modification

### Changing Token Expiration

Token expiration values are **hardcoded constants** in the implementation:
- `JWT_ACCESS_EXPIRATION_MINUTES` (default: 15)
- `JWT_REFRESH_EXPIRATION_DAYS` (default: 7)

To change expiration, modify these constants in `UserSessioningConcept.ts`. Consider:
- Shorter access tokens = better security but more refresh operations
- Longer refresh tokens = better UX but larger revocation window

### Access Token Validation Performance

The current implementation checks session status on every access token validation. This provides immediate revocation but adds a database query per API request.

**Option 1 (Current)**: Check session status
- ✅ Immediate revocation
- ❌ Database query on every request

**Option 2 (Alternative)**: Skip session check for access tokens
- ✅ Better performance (stateless validation)
- ❌ Access tokens valid until expiration (15 min window)
- ✅ Industry standard for many systems

To optimize performance, you can skip the session check for access tokens since they expire quickly (15 min). Only check session status for refresh tokens.

### Session Revocation Strategy

Sessions are marked as `status="revoked"` rather than deleted. This allows:
- Audit trail (when was session revoked)
- Potential reuse detection
- Easier debugging

To change this behavior:
- Delete sessions instead: `await sessions.deleteOne({ _id: session._id })`
- Or add TTL index on `expiresAt` for auto-cleanup of expired sessions

### Token Rotation

Refresh tokens are **rotated** on each refresh (new token pair issued, old session revoked). This is a security best practice that:
- Limits token reuse window
- Enables detection of token theft
- Follows industry standards

To disable rotation (not recommended):
- Keep old session active
- Don't revoke old session on refresh

### Secret Key Management

The `JWT_SECRET` must be:
- At least 32 characters
- Stored securely (environment variable, not in code)
- Rotated periodically (rotating invalidates all tokens)

### Database Indexes

Consider adding indexes for performance:
```typescript
// Index on accessTokenJti for fast access token lookups
await sessions.createIndex({ accessTokenJti: 1 });

// Index on status for filtering active sessions
await sessions.createIndex({ status: 1 });

// TTL index for auto-cleanup of expired sessions
await sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
```

### Error Handling

All actions return either success or `{ error: string }`. Common errors:
- Invalid token signature
- Expired token
- Token type mismatch
- Session not found or revoked

Ensure syncs handle both success and error cases appropriately.

## Security Considerations

✅ **Implemented:**
- Token signature verification (HS256)
- Token expiration checking
- Session-based revocation
- Secure secret key from environment
- Token rotation on refresh

⚠️ **Considerations:**
- Use HTTPS in production
- Store tokens securely on client (httpOnly cookies recommended)
- Rotate JWT_SECRET periodically (invalidates all tokens)
- Monitor for suspicious refresh patterns

🔒 **Not Included (By Design):**
- Device/browser tracking
- IP address validation
- Session limits per user
- Refresh token reuse detection (optional enhancement)

