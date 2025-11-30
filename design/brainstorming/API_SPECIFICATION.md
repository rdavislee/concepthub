# ConceptHub API Specification

## Overview

This document provides a complete API specification for the ConceptHub backend server. The API is dynamically generated from concept classes found in `src/concepts/`. Each concept exposes its public methods as POST endpoints.

## Base Configuration

- **Base URL**: `/api` (configurable via `--baseUrl` flag)
- **Port**: `8000` (configurable via `--port` flag)
- **Protocol**: HTTP
- **Content-Type**: `application/json`

## Request Format

All endpoints accept POST requests with JSON bodies. The request body should contain the parameters required by the specific action.

## Response Format

All endpoints return JSON responses. Successful responses contain the result data, while error responses contain an `error` field with a descriptive message.

```json
// Success response example
{
  "ok": true
}

// Error response example
{
  "error": "Resource not found."
}
```

## Endpoints

### Liking

Manages binary like/unlike relationships between users and items.

#### `POST /api/Liking/like`

Likes an item for a user.

**Request Body:**
```json
{
  "item": "item123",
  "user": "user456"
}
```

**Response:**
```json
{
  "ok": true
}
```

**Error Responses:**
- `{ "error": "Like already exists for this (item,user) pair" }` (400)

---

#### `POST /api/Liking/unlike`

Removes a like for an item by a user.

**Request Body:**
```json
{
  "item": "item123",
  "user": "user456"
}
```

**Response:**
```json
{
  "ok": true
}
```

**Error Responses:**
- `{ "error": "No existing like to remove for this (item,user) pair" }` (404)

---

#### `POST /api/Liking/_isLiked`

Query: Checks if a user has liked an item.

**Request Body:**
```json
{
  "item": "item123",
  "user": "user456"
}
```

**Response:**
```json
[
  {
    "liked": true
  }
]
```

---

#### `POST /api/Liking/_count`

Query: Returns the number of likes for an item.

**Request Body:**
```json
{
  "item": "item123"
}
```

**Response:**
```json
[
  {
    "n": 42
  }
]
```

---

### DownloadAnalyzing

Records and analyzes download events.

#### `POST /api/DownloadAnalyzing/record`

Records a download event.

**Request Body:**
```json
{
  "item": "item123",
  "user": "user456",
  "at": "2024-01-15T10:30:00.000Z"
}
```

**Note:** `at` should be a valid ISO 8601 date string.

**Response:**
```json
{
  "download": "download789"
}
```

**Error Responses:**
- `{ "error": "Missing required fields item, user or at" }` (400)

---

#### `POST /api/DownloadAnalyzing/_countForItem`

Query: Returns the count of downloads for an item within a date range.

**Request Body:**
```json
{
  "item": "item123",
  "from": "2024-01-01T00:00:00.000Z",
  "to": "2024-01-31T23:59:59.999Z"
}
```

**Response:**
```json
[
  {
    "count": 150
  }
]
```

---

#### `POST /api/DownloadAnalyzing/_recentForUser`

Query: Returns recent downloads for a user.

**Request Body:**
```json
{
  "user": "user456",
  "limit": 25
}
```

**Note:** `limit` is optional and defaults to 25.

**Response:**
```json
[
  {
    "download": "download789"
  },
  {
    "download": "download788"
  }
]
```

---

### UserProfileDisplaying

Manages user profile information (display name, avatar, bio).

#### `POST /api/UserProfileDisplaying/setDisplayName`

Sets or updates a user's display name.

**Request Body:**
```json
{
  "user": "user123",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "ok": true
}
```

**Error Responses:**
- `{ "error": "User ID is required" }` (400)

---

#### `POST /api/UserProfileDisplaying/setAvatar`

Sets or updates a user's avatar URL.

**Request Body:**
```json
{
  "user": "user123",
  "url": "https://example.com/avatar.jpg"
}
```

**Response:**
```json
{
  "ok": true
}
```

**Error Responses:**
- `{ "error": "User ID is required" }` (400)

---

#### `POST /api/UserProfileDisplaying/setBio`

Sets or updates a user's bio.

**Request Body:**
```json
{
  "user": "user123",
  "bio": "Software developer and concept enthusiast"
}
```

**Response:**
```json
{
  "ok": true
}
```

**Error Responses:**
- `{ "error": "User ID is required" }` (400)

---

#### `POST /api/UserProfileDisplaying/clearProfile`

Clears all profile fields for a user.

**Request Body:**
```json
{
  "user": "user123"
}
```

**Response:**
```json
{
  "ok": true
}
```

**Error Responses:**
- `{ "error": "User ID is required" }` (400)

---

#### `POST /api/UserProfileDisplaying/_profileOf`

Query: Retrieves profile information for a user.

**Request Body:**
```json
{
  "user": "user123"
}
```

**Response:**
```json
[
  {
    "displayName": "John Doe",
    "avatarUrl": "https://example.com/avatar.jpg",
    "bio": "Software developer and concept enthusiast"
  }
]
```

**Note:** If no profile exists, returns empty strings for all fields.

---

### ConceptRegistering

Manages concept registration, versioning, and publishing.

#### `POST /api/ConceptRegistering/reserveName`

Reserves a unique name for a concept.

**Request Body:**
```json
{
  "uniqueName": "MyAwesomeConcept",
  "owner": "author123"
}
```

**Response:**
```json
{
  "concept": "concept456"
}
```

**Error Responses:**
- `{ "error": "uniqueName is required" }` (400)
- `{ "error": "owner is required" }` (400)
- `{ "error": "A concept with this uniqueName already exists" }` (409)

---

#### `POST /api/ConceptRegistering/publishVersion`

Publishes a new version of a concept.

**Request Body:**
```json
{
  "concept": "concept456",
  "semver": "1.0.0",
  "artifactUrl": "https://example.com/concepts/myconcept-v1.0.0.ts"
}
```

**Response:**
```json
{
  "version": "version789"
}
```

**Error Responses:**
- `{ "error": "concept is required" }` (400)
- `{ "error": "semver is required" }` (400)
- `{ "error": "artifactUrl is required" }` (400)
- `{ "error": "Concept does not exist" }` (404)
- `{ "error": "A version with this semver already exists and is not YANKED" }` (409)

---

#### `POST /api/ConceptRegistering/deprecate`

Deprecates a published version.

**Request Body:**
```json
{
  "version": "version789"
}
```

**Response:**
```json
{
  "ok": true
}
```

**Error Responses:**
- `{ "error": "version is required" }` (400)
- `{ "error": "Version does not exist" }` (404)
- `{ "error": "Version must be PUBLISHED to deprecate" }` (400)

---

#### `POST /api/ConceptRegistering/yank`

Yanks a published or deprecated version.

**Request Body:**
```json
{
  "version": "version789"
}
```

**Response:**
```json
{
  "ok": true
}
```

**Error Responses:**
- `{ "error": "version is required" }` (400)
- `{ "error": "Version does not exist" }` (404)
- `{ "error": "Version must be PUBLISHED or DEPRECATED to yank" }` (400)

---

#### `POST /api/ConceptRegistering/_latestPublished`

Query: Returns the most recently published version for a concept.

**Request Body:**
```json
{
  "concept": "concept456"
}
```

**Response:**
```json
[
  {
    "version": "version789"
  }
]
```

**Note:** Returns empty array if no published version exists.

---

#### `POST /api/ConceptRegistering/_findByName`

Query: Finds concepts by name substring (case-insensitive).

**Request Body:**
```json
{
  "substring": "Awesome"
}
```

**Response:**
```json
[
  {
    "concept": "concept456"
  },
  {
    "concept": "concept789"
  }
]
```

---

#### `POST /api/ConceptRegistering/_getAll`

Query: Returns all concepts in the registry with their associated versions.

**Request Body:**
```json
{}
```

**Response:**
```json
[
  {
    "concept": "concept456",
    "uniqueName": "MyAwesomeConcept",
    "owner": "author123",
    "versions": [
      {
        "version": "version789",
        "semver": "1.0.0",
        "artifactUrl": "https://example.com/concepts/myconcept-v1.0.0.ts",
        "status": "PUBLISHED",
        "publishedAt": "2024-01-15T10:30:00.000Z"
      },
      {
        "version": "version790",
        "semver": "1.1.0",
        "artifactUrl": "https://example.com/concepts/myconcept-v1.1.0.ts",
        "status": "PUBLISHED",
        "publishedAt": "2024-02-01T14:20:00.000Z"
      }
    ]
  },
  {
    "concept": "concept789",
    "uniqueName": "AnotherConcept",
    "owner": "author456",
    "versions": []
  }
]
```

**Note:** Returns an array of all concepts, each with its complete version history. Concepts without versions will have an empty `versions` array.

---

#### `POST /api/ConceptRegistering/_getOwner`

Query: Returns the owner of a concept.

**Request Body:**
```json
{
  "concept": "concept456"
}
```

**Response:**
```json
[
  {
    "owner": "author123"
  }
]
```

---

#### `POST /api/ConceptRegistering/_getOwnerOfVersion`

Query: Returns the owner of the concept that a version belongs to.

**Request Body:**
```json
{
  "version": "version789"
}
```

**Response:**
```json
[
  {
    "owner": "author123"
  }
]
```

---

#### `POST /api/ConceptRegistering/_getUniqueName`

Query: Returns the unique name of a concept.

**Request Body:**
```json
{
  "concept": "concept456"
}
```

**Response:**
```json
[
  {
    "uniqueName": "MyAwesomeConcept"
  }
]
```

---

#### `POST /api/ConceptRegistering/_artifactUrlOfVersion`

Query: Returns the artifact URL of a version.

**Request Body:**
```json
{
  "version": "version789"
}
```

**Response:**
```json
[
  {
    "artifactUrl": "https://example.com/concepts/myconcept-v1.0.0.ts"
  }
]
```

---

### Registering

Manages concept file registration and downloads.

#### `POST /api/Registering/upload`

Uploads/registers a concept file.

**Request Body:**
```json
{
  "uniqueName": "MyConcept",
  "url": "https://example.com/concepts/myconcept.ts",
  "author": "user123"
}
```

**Response:**
```json
{
  "id": "concept456"
}
```

**Error Responses:**
- `{ "error": "uniqueName, url, and author are required" }` (400)
- `{ "error": "unique_name already registered" }` (409)

---

#### `POST /api/Registering/download`

Downloads/retrieves a registered concept.

**Request Body:**
```json
{
  "id": "concept456"
}
```

**Response:**
```json
{
  "url": "https://example.com/concepts/myconcept.ts",
  "uniqueName": "MyConcept",
  "author": "user123"
}
```

**Error Responses:**
- `{ "error": "id is required" }` (400)
- `{ "error": "Concept not found" }` (404)

---

#### `POST /api/Registering/remove`

Removes a registered concept.

**Request Body:**
```json
{
  "id": "concept456"
}
```

**Response:**
```json
{
  "ok": true
}
```

**Error Responses:**
- `{ "error": "id is required" }` (400)
- `{ "error": "Concept not found" }` (404)

---

### NameDisplaying

Manages display names for concepts.

#### `POST /api/NameDisplaying/change_name`

Sets or updates a display name for a concept.

**Request Body:**
```json
{
  "conceptId": "concept123",
  "displayName": "My Awesome Concept"
}
```

**Response:**
```json
{
  "ok": true
}
```

**Error Responses:**
- `{ "error": "concept_id is required" }` (400)
- `{ "error": "display_name must be non-empty" }` (400)

---

#### `POST /api/NameDisplaying/remove`

Removes a display name for a concept.

**Request Body:**
```json
{
  "conceptId": "concept123"
}
```

**Response:**
```json
{
  "ok": true
}
```

**Error Responses:**
- `{ "error": "concept_id is required" }` (400)
- `{ "error": "concept_id not found" }` (404)

---

#### `POST /api/NameDisplaying/search`

Searches for concepts by display name (case-insensitive subsequence match).

**Request Body:**
```json
{
  "text": "awesome"
}
```

**Response:**
```json
[
  {
    "conceptId": "concept123",
    "displayName": "My Awesome Concept"
  }
]
```

**Note:** If `text` is empty or omitted, returns all concepts with display names.

---

### Authentication

Handles user registration, authentication, session management, and token refresh. All authentication endpoints are routed through the Requesting concept and use JWT-based sessions.

#### `POST /api/auth/register`

Registers a new user and automatically creates a session.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "user": "user123",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**
- `{ "error": "Email already exists" }` (409)

**Note:** The access token expires in 15 minutes, and the refresh token expires in 7 days.

---

#### `POST /api/auth/login`

Authenticates a user and creates a new session.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "user": "user123",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**
- `{ "error": "Invalid email or password" }` (401)

**Note:** The access token expires in 15 minutes, and the refresh token expires in 7 days.

---

#### `POST /api/auth/refresh`

Refreshes an access token using a valid refresh token. This invalidates the old token pair and issues a new one.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**
- `{ "error": "Refresh token expired" }` (401)
- `{ "error": "Invalid token signature" }` (401)
- `{ "error": "Invalid token type" }` (401)
- `{ "error": "Refresh token not found or revoked" }` (401)
- `{ "error": "Invalid refresh token" }` (401)

**Note:** The old refresh token is revoked when a new token pair is issued.

---

#### `POST /api/auth/logout`

Logs out a user by revoking their session.

**Headers:**
- `Authorization: Bearer <accessToken>` (required)

**Request Body:**
```json
{}
```

**Response:**
```json
{
  "status": "logged_out"
}
```

**Note:** The session associated with the access token (and its corresponding refresh token) is revoked. The access token must be provided in the `Authorization` header with the `Bearer` prefix.

---

#### `POST /api/auth/_getUser`

Validates an access token and returns the associated user.

**Headers:**
- `Authorization: Bearer <accessToken>` (required)

**Request Body:**
```json
{}
```

**Response:**
```json
{
  "user": "user123"
}
```

**Error Responses:**
- `{ "error": "Access token expired" }` (401)
- `{ "error": "Invalid token signature" }` (401)
- `{ "error": "Invalid token type" }` (401)
- `{ "error": "Session not found or revoked" }` (401)
- `{ "error": "Invalid access token" }` (401)

**Note:** This endpoint can be used by the frontend to validate sessions and check if a user is still logged in. The access token must be provided in the `Authorization` header with the `Bearer` prefix.

---

### UserAuthenticating

**Note:** The direct concept endpoints (`/api/UserAuthenticating/register`, `/api/UserAuthenticating/login`) are excluded from passthrough routes. Use the `/api/auth/*` endpoints instead.

#### `POST /api/UserAuthenticating/_getUserByEmail`

Query: Retrieves a user by email (passthrough route, if included).

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
[
  {
    "user": "user123"
  }
]
```

**Note:** Returns empty array if user not found. This is a query endpoint that may be available as a passthrough route.

---

### UserSessioning

**Note:** The direct concept endpoints (`/api/UserSessioning/create`, `/api/UserSessioning/delete`, `/api/UserSessioning/_getUser`) are excluded from passthrough routes. Use the `/api/auth/*` endpoints instead for session management.

**Internal Concept Actions:**
- `create`: Creates a new session (called internally by auth endpoints)
- `delete`: Deletes/revokes a session (called internally by logout)
- `refresh`: Refreshes tokens (called internally by auth refresh endpoint)
- `_getUser`: Validates a session and returns the user (called internally by auth validation)

---

## Requesting Concept

**Note:** The `Requesting` concept is special - it runs its own server and handles passthrough routes. It is not exposed through the standard concept server routing mechanism described above. See the `RequestingConcept.ts` file for details on its specific API.

---

## Error Handling

### HTTP Status Codes

- `200 OK`: Successful request
- `400 Bad Request`: Invalid request parameters or validation failure
- `401 Unauthorized`: Authentication failure
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource conflict (e.g., duplicate entry)
- `500 Internal Server Error`: Server error
- `504 Gateway Timeout`: Request timeout (for Requesting concept)

### Error Response Format

All errors follow this format:
```json
{
  "error": "Descriptive error message"
}
```

---

## Type Definitions

### Common Types

- **ID**: String identifier (opaque, implementation-specific)
- **User**: User identifier (ID type)
- **Item**: Item identifier (ID type)
- **Author**: Author identifier (ID type)
- **DateTime**: ISO 8601 date string (e.g., `"2024-01-15T10:30:00.000Z"`)

### Query Responses

Queries (methods starting with `_`) return arrays, even if they typically return a single result. This allows for consistent handling of empty results.

---

## Notes

1. **Dynamic Routing**: The API is dynamically generated from concept classes. Adding a new concept or method will automatically create new endpoints.

2. **Query Methods**: Methods prefixed with `_` are internal queries but are still exposed as endpoints. They return arrays for consistency.

3. **Empty Bodies**: Some endpoints accept empty request bodies `{}` if they don't require parameters.

4. **Date Handling**: Date fields should be provided as ISO 8601 strings. The server will parse them appropriately.

5. **ID Opaqueness**: All ID types are treated as opaque strings. The frontend should not make assumptions about their format or structure.

6. **Base URL Configuration**: The base URL defaults to `/api` but can be configured when starting the server using the `--baseUrl` flag.

---

## Example Usage

### Liking an Item

```bash
curl -X POST http://localhost:8000/api/Liking/like \
  -H "Content-Type: application/json" \
  -d '{
    "item": "item123",
    "user": "user456"
  }'
```

---

## Version

This specification is generated from the concept server implementation as of the current codebase state. For the most up-to-date endpoint list, refer to the server startup logs which list all registered endpoints.

