# UserAuthenticating Implementation Guide

> See `UserAuthenticating.md` for the complete concept specification (purpose, principle, state, actions, queries).

## How It Works

### Registration Flow

1. **Client Request**: User provides `email` and `password` → `register(email, password)`
2. **Validation**: Check if user with email already exists
3. **Hashing**: Hash the provided password using configured algorithm
4. **Storage**: Create new user record with email and password hash
5. **Response**: Return `{ user: User }` on success or `{ error: String }` on failure

### Login Flow

1. **Client Request**: User provides `email` and `password` → `login(email, password)`
2. **Lookup**: Find user by email in database
3. **Verification**: Hash provided password and compare with stored hash
4. **Response**: Return `{ user: User }` on match or `{ error: String }` on failure

### Security Features

- **Password Hashing**: Passwords are never stored in plaintext
- **Timing Attack Protection**: Generic error messages prevent username enumeration
- **Unique Email Constraint**: Database-level uniqueness ensures no duplicate accounts

## Implementation Details

### Database Schema

**MongoDB Collection: `UserAuthenticating.users`**

```typescript
interface UserDoc {
  _id: User;              // User ID (generated via freshID())
  email: string;          // User's email address (unique, indexed)
  passwordHash: string;   // Hashed password (never plaintext)
}
```

**Design Rationale:**
- Single collection storing all user credentials
- Unique index on email ensures no duplicate accounts
- Password hash stored separately from user identity
- Minimal schema focused only on authentication concerns

### Password Hashing

**Current Implementation:**

The current implementation uses SHA-256 via Web Crypto API:

```typescript
async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
```

**⚠️ Security Note:** This is a simple, unsalted hash suitable for development. For production, use a proper password hashing algorithm (see "Changing Password Hashing Algorithm" below).

### Configuration

**No Environment Variables Required:**
- Password hashing algorithm is hardcoded in the implementation
- Email uniqueness is enforced via MongoDB unique index

**Dependencies:**
- MongoDB driver (via `npm:mongodb`)
- Web Crypto API (built-in for Deno/Node.js)

## Important Notes for Modification

### Changing Password Hashing Algorithm

The current implementation uses SHA-256, which is **not suitable for production** because:
- ❌ No salting (vulnerable to rainbow table attacks)
- ❌ Fast computation (vulnerable to brute force attacks)
- ❌ No work factor (can't be adjusted for security)

**For Production, Use:**

**Option 1: bcrypt** (Recommended for general use)
```typescript
import { hash, compare } from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

async function hashPassword(password: string): Promise<string> {
  return await hash(password);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await compare(password, hash);
}
```

**Option 2: Argon2** (Recommended for maximum security)
```typescript
import { hash, verify } from "https://deno.land/x/argon2@v0.26.0/mod.ts";

async function hashPassword(password: string): Promise<string> {
  return await hash(password);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await verify(hash, password);
}
```

**Migration Strategy:**
- Old users with SHA-256 hashes can continue using old algorithm
- On login, check hash format and verify accordingly
- Optionally re-hash with new algorithm on successful login
- Gradually migrate all passwords over time

### Email Validation

The concept specification does not enforce email format validation. Consider adding:

```typescript
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
```

**Note:** Email validation should be added at the registration action level, before checking for duplicates.

### Password Strength Requirements

The concept does not enforce password complexity. Consider adding:

- Minimum length (e.g., 8 characters)
- Character requirements (uppercase, lowercase, numbers, symbols)
- Common password rejection (dictionary attacks)

**Implementation Location:** Add validation in `register()` action before hashing.

### Case Sensitivity

**Email:** Typically case-insensitive. Consider normalizing:
```typescript
const normalizedEmail = email.toLowerCase().trim();
```

**Password:** Typically case-sensitive (keep as-is).

### Error Messages

The current implementation uses generic error messages to prevent timing attacks and username enumeration:

- Login errors: `"Invalid username or password"` (regardless of whether email exists or password is wrong)
- Registration errors: `"Username already exists"` (specific since this is user-created data)

**Security Consideration:** Generic login errors protect against:
- Username enumeration (can't tell if email exists)
- Timing attacks (can't tell which step failed)

## Security Considerations

✅ **Implemented:**
- Password hashing (never stored in plaintext)
- Unique email constraint (database-level)
- Generic error messages for login (prevents enumeration)
- Timing attack mitigation via consistent error responses

⚠️ **Current Limitations:**
- SHA-256 hashing (not suitable for production - see above)
- No password strength requirements
- No email format validation
- No password reset mechanism
- No rate limiting on login attempts

🔒 **Production Recommendations:**
- Use bcrypt or Argon2 for password hashing with appropriate work factors
- Add email format validation
- Add password strength requirements
- Implement rate limiting to prevent brute force attacks
- Use HTTPS in production (passwords transmitted over network)
- Consider password reset functionality (separate concept)
- Monitor for suspicious login patterns
- Implement account lockout after failed attempts

### Database Indexes

**Automatic Index:**
- Unique index on `email` field (created in constructor)

**Performance Considerations:**
- Email lookups are fast (indexed)
- No additional indexes needed for current query patterns

### Error Handling

All actions return either success or `{ error: string }`. Common errors:

- **Registration:**
  - `"Username already exists"` - Email is already registered
  - Database errors (rare, re-thrown)

- **Login:**
  - `"Invalid username or password"` - Email doesn't exist or password doesn't match

Ensure syncs handle both success and error cases appropriately.

### Query Behavior

Queries return arrays even for single results:
- `_getUserByEmail()` returns `[{ user: User }]` if found, `[]` if not found
- Always check array length before accessing results
- Supports pattern matching in syncs where multiple results are expected

