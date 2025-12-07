# ConceptHub API Specification

## Overview

This document provides a complete API specification for the ConceptHub backend server. The API is dynamically generated from concept classes found in `src/concepts/`. Each concept exposes its public methods as POST endpoints.

The ConceptHub CLI tool (`conceptual`) provides a command-line interface for interacting with the API. See the CLI section below for details on how CLI commands map to API endpoints.

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

Records and analyzes download events. Downloads are tracked per concept (using the concept ID as the `item`), not per version. Each download record includes the user ID and timestamp for analytics and abuse detection.

#### `POST /api/DownloadAnalyzing/record`

Records a download event for an item (typically a concept ID). When users download concept versions via `/concepts/download/version`, the system records the download using the concept ID, not the specific version ID. **Note:** Authentication is optional for concept downloads via `/concepts/download/version` - downloads work without authentication, but are only tracked for analytics when a user is authenticated.

**Request Body:**
```json
{
  "item": "concept123",
  "user": "user456",
  "at": "2024-01-15T10:30:00.000Z"
}
```

**Note:** 
- `item` should be a valid item ID (typically a concept ID)
- `user` should be a valid user ID
- `at` should be a valid ISO 8601 date string or Date object

**Response:**
```json
{
  "ok": true
}
```

**Error Responses:**
- `{ "error": "..." }` (400) - if validation fails

---

#### `POST /api/DownloadAnalyzing/_countForItem`

Query: Returns the total count of all downloads for an item (concept). This returns the total count across all time periods - time-based filtering is not currently supported in the implementation.

**Request Body:**
```json
{
  "item": "concept123"
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

**Note:** Returns `[{ count: 0 }]` if the item has no downloads or doesn't exist.

---

#### `POST /api/concepts/download/version`

Downloads a specific version of a concept by unique name. If no version is specified, downloads the latest version. **Authentication is optional** - downloads work without authentication, but downloads are only tracked for analytics when a user is authenticated. The endpoint validates that the concept's author username matches the provided `author_username` to ensure concepts are only downloaded from the correct author.

**Headers:**
- `Authorization: Bearer <accessToken>` (optional)
- `Content-Type: application/json`

**Request Body:**
```json
{
  "unique_name": "username/MyConcept",
  "author_username": "johndoe",
  "version": 2
}
```

**Note:**
- `unique_name` (string, required): The unique name of the concept to download. Can be in the format `username/concept_name` (e.g., `"johndoe/MyConcept"`) or just `concept_name` if the concept is globally unique. The CLI tool uses the `username/concept_name` format.
- `author_username` (string, required): The username of the concept's author. The endpoint validates that the concept's author username matches this value. If the author username does not match, the download will fail with an empty files response.
- `version` (number, optional): The specific version number to download. If omitted, downloads the latest version. Version numbers are integers (e.g., `1`, `2`, `10`).
- Authentication is **optional** - if a valid Bearer token is provided, the download will be tracked in DownloadAnalyzing for analytics. Without authentication, the download still works but is not tracked.
- Downloads are recorded per concept (using the concept ID), not per version
- Files are returned as decoded UTF-8 strings when possible, or base64-encoded for binary files
- **Author validation**: The endpoint verifies that the concept's author (retrieved via `ConceptRegistering._getAuthor`) has a username (retrieved via `UserProfileDisplaying._profileOf`) that matches the provided `author_username`. If validation fails, an empty files object is returned.

**Response:**
```json
{
  "files": {
    "src/index.ts": "export default function...",
    "README.md": "# My Concept\n\n..."
  },
  "version": 2,
  "created_at": "2024-01-15T10:30:00.000Z"
}
```

**Error Responses:**
- Returns empty `files` object if:
  - Concept not found (404)
  - Author not found for the concept
  - Author's profile/username not found
  - Author username mismatch (the provided `author_username` does not match the concept's author username)
  - Version not found
- Timeout errors (504) if the sync fails to respond within the timeout period
- `{ "error": "Invalid token signature" }` (401) - if authentication token is invalid
- `{ "error": "Session not found or revoked" }` (401) - if authentication session is invalid
- `{ "error": "Invalid access token" }` (401) - if access token is invalid

**Example using curl:**
```bash
curl -X POST http://localhost:8000/api/concepts/download/version \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "unique_name": "johndoe/MyConcept",
    "author_username": "johndoe",
    "version": 2
  }'
```

---

### UserProfileDisplaying

Manages user profile information (username, display name, avatar, bio).

#### `POST /api/UserProfileDisplaying/setProfile`

Sets or updates profile fields for a user. Only provided fields are updated; others remain unchanged.

**Request Body:**
```json
{
  "user": "user123",
  "username": "johndoe",
  "displayName": "John Doe",
  "avatarUrl": "https://example.com/avatar.jpg",
  "bio": "Software developer and concept enthusiast"
}
```

**Note:** All fields (`username`, `displayName`, `avatarUrl`, `bio`) are optional. You can provide any combination of these fields to update only the desired fields.

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
    "username": "johndoe",
    "displayName": "John Doe",
    "avatarUrl": "https://example.com/avatar.jpg",
    "bio": "Software developer and concept enthusiast"
  }
]
```

**Note:** If no profile exists, returns empty strings for all fields.

---

#### `POST /api/UserProfileDisplaying/_userByUsername`

Query: Retrieves a user ID by username.

**Request Body:**
```json
{
  "username": "johndoe"
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

**Error Responses:**
- `{ "error": "Username is required" }` (400) - when username is empty or missing
- `{ "error": "Username not found" }` (404) - when no user has the given username

---

### Concept Management

High-level endpoints for managing concepts and their versions.

#### `POST /api/registry/publish`

Creates a new concept with a unique name and publishes its first version (version 1), or publishes a new version of an existing concept. This endpoint combines concept registration and version upload into a single operation. Requires authentication.

**Headers:**
- `Authorization: Bearer <accessToken>` (required)
- `Content-Type: application/json`

**Request Body:**
```json
{
  "unique_name": "MyNewConcept",
  "files": {
    "design/concepts/MyNewConcept/MyNewConcept.md": [/* Uint8Array as array of numbers */],
    "src/concepts/MyNewConcept/MyNewConceptConcept.ts": [/* Uint8Array as array of numbers */],
    "src/concepts/MyNewConcept/MyNewConceptConcept.test.ts": [/* Uint8Array as array of numbers */]
  }
}
```

**Note:**
- `unique_name` (string, required): A unique name for the concept. The concept name should match the directory name in the workspace structure. If the concept already exists, this endpoint will publish a new version (incrementing from the previous version).
- `files` (object, required): A map where keys are file paths relative to the workspace root (e.g., `"design/concepts/MyConcept/MyConcept.md"`, `"src/concepts/MyConcept/MyConceptConcept.ts"`, `"src/concepts/MyConcept/MyConceptConcept.test.ts"`) and values are file contents as arrays of numbers representing Uint8Array bytes
- When sent as JSON, `files` should be an object with string keys and array-of-numbers values (e.g., `{"path/to/file.txt": [104, 101, 108, 108, 111]}`)
- Authentication is provided via the `Authorization` header with a Bearer token
- The user extracted from the access token becomes the author of the concept
- For new concepts, this endpoint automatically creates version 1
- For existing concepts, this endpoint increments the version number and publishes the new version

**Response:**
```json
{
  "concept": "concept123",
  "version": "version456",
  "unique_name": "MyNewConcept",
  "ok": true
}
```

**Error Responses:**
- `{ "error": "unique_name is required" }` (400)
- `{ "error": "author is required" }` (400)
- `{ "error": "A concept with this unique_name already exists" }` (409)
- `{ "error": "files is required" }` (400)
- `{ "error": "version must be a non-negative number" }` (400)
- `{ "error": "Concept does not exist" }` (404)
- `{ "error": "A version with this concept and version number already exists" }` (409)
- `{ "error": "Failed to upload file(s) to storage: ..." }` (500)
- `{ "error": "Authorization header with Bearer token is required" }` (401)
- `{ "error": "Access token expired" }` (401)
- `{ "error": "Invalid token signature" }` (401)
- `{ "error": "Session not found or revoked" }` (401)
- `{ "error": "Invalid access token" }` (401)

**Example using curl:**
```bash
curl -X POST http://localhost:8000/api/registry/publish \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "unique_name": "MyNewConcept",
    "files": {
      "src/index.ts": "...",
      "README.md": "..."
    }
  }'
```

---

#### `POST /api/registry/all`

Retrieves all registered concepts from the registry. This endpoint returns a list of all concepts with their details including unique name, author, and timestamps.

**Headers:**
- `Content-Type: application/json` (optional)

**Request Body:**
```json
{}
```

**Note:**
- No authentication required
- No request body parameters needed (empty object or no body)
- Returns all concepts registered in the system

**Response:**
```json
{
  "results": [
    {
      "concept": "concept123",
      "unique_name": "MyNewConcept",
      "author": "user456",
      "author_username": "johndoe",
      "created_at": "2024-01-15T10:30:00.000Z",
      "updated_at": "2024-01-15T10:30:00.000Z"
    },
    {
      "concept": "concept789",
      "unique_name": "AnotherConcept",
      "author": "user123",
      "author_username": "janedoe",
      "created_at": "2024-01-14T08:20:00.000Z",
      "updated_at": "2024-01-14T08:20:00.000Z"
    }
  ]
}
```

**Note:**
- If no concepts are registered, returns an empty array: `{ "results": [] }`
- Each concept in the results includes:
  - `concept` (string): The unique concept ID
  - `unique_name` (string): The unique name of the concept
  - `author` (string): The user ID of the concept author
  - `author_username` (string): The username of the concept author (empty string if no username is set)
  - `created_at` (string): ISO 8601 timestamp of when the concept was created
  - `updated_at` (string): ISO 8601 timestamp of when the concept was last updated

**Example using curl:**
```bash
curl -X POST http://localhost:8000/api/registry/all \
  -H "Content-Type: application/json" \
  -d '{}'
```

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

## CLI Tool Integration

The ConceptHub CLI tool (`conceptual`) provides a command-line interface for interacting with the API. The CLI handles authentication, file management, and versioning automatically.

### CLI Commands and API Mapping

#### `conceptual login`

Authenticates the user with the concept hub by prompting for email and password. Stores credentials locally for use in subsequent commands.

**API Endpoint:** `POST /api/auth/login`

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

The CLI stores the access token locally and uses it for authenticated requests.

---

#### `conceptual install {USERNAME}/{CONCEPT_NAME}@{VERSION}`

Downloads a concept from the hub and installs it in the local workspace. The username is required, and the version is optional (defaults to latest).

**API Endpoint:** `POST /api/concepts/download/version`

**Request:**
- Constructs `unique_name` from `{USERNAME}/{CONCEPT_NAME}` format
- Sends `author_username` extracted from the `{USERNAME}` part of the command
- Sends version number if specified (integer only, e.g., `1`, `2`, `10`)
- Uses stored access token from `conceptual login` for authentication (optional)
- The endpoint validates that the concept's author username matches the provided `author_username`

**Response Processing:**
- Receives files as a map of file paths to file contents
- Places files in the correct workspace locations:
  - Specification: `design/concepts/{CONCEPT_NAME}/{CONCEPT_NAME}.md`
  - Implementation: `src/concepts/{CONCEPT_NAME}/{CONCEPT_NAME}Concept.ts`
  - Test: `src/concepts/{CONCEPT_NAME}/{CONCEPT_NAME}Concept.test.ts`

**Example:**
```bash
conceptual install johndoe/MyConcept@1
# Downloads version 1 of MyConcept by user johndoe
```

---

#### `conceptual publish {CONCEPT_NAME}`

Publishes a concept from the local workspace to the hub. The concept must be complete (all three required files must exist).

**API Endpoint:** `POST /api/registry/publish`

**Pre-flight Checks:**
- Validates that all three required files exist locally:
  - `design/concepts/{CONCEPT_NAME}/{CONCEPT_NAME}.md`
  - `src/concepts/{CONCEPT_NAME}/{CONCEPT_NAME}Concept.ts`
  - `src/concepts/{CONCEPT_NAME}/{CONCEPT_NAME}Concept.test.ts`

**Request:**
- Reads the three files from the local workspace
- Converts file contents to Uint8Array format (array of numbers)
- Constructs `files` object with workspace-relative paths
- Uses stored access token from `conceptual login` for authentication
- Sets `unique_name` to `{CONCEPT_NAME}`

**Version Handling:**
- For new concepts: API automatically creates version 1
- For existing concepts: API increments the previous version and publishes the new version

**Example:**
```bash
conceptual publish MyConcept
# Publishes MyConcept (creates version 1 if new, or increments version if exists)
```

---

#### `conceptual list`

Lists all concepts found in the local workspace, categorizing them as complete or incomplete. This command does not interact with the API; it only scans the local filesystem.

**No API Endpoint** - Local operation only

**Output:**
- Lists completed concepts (all three files present)
- Lists incomplete concepts (missing files indicated)

---

#### `conceptual init`

Initializes a new conceptual project in the current workspace. This command sets up the workspace structure but does not interact with the API.

**No API Endpoint** - Local operation only

---

### Authentication Flow

1. User runs `conceptual login` and provides email/password
2. CLI calls `POST /api/auth/login` and receives access/refresh tokens
3. CLI stores tokens locally (typically in a config file or secure storage)
4. Subsequent authenticated commands (`install`, `publish`) use the stored access token
5. If the access token expires, the CLI may automatically refresh using the stored refresh token

### File Format

When publishing or installing concepts, files are transmitted as:
- **Request (publish):** Files are converted to Uint8Array and sent as arrays of numbers in JSON
- **Response (install):** Files are returned as decoded UTF-8 strings when possible, or base64-encoded for binary files

### Workspace Structure

The CLI expects and maintains the following workspace structure:

```
workspace/
├── design/
│   └── concepts/
│       └── {CONCEPT_NAME}/
│           └── {CONCEPT_NAME}.md
└── src/
    └── concepts/
        └── {CONCEPT_NAME}/
            ├── {CONCEPT_NAME}Concept.ts
            └── {CONCEPT_NAME}Concept.test.ts
```

---

## Version

This specification is generated from the concept server implementation as of the current codebase state. For the most up-to-date endpoint list, refer to the server startup logs which list all registered endpoints.

