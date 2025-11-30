# UserProfileDisplaying Implementation Guide

> See `UserProfileDisplaying.md` for the complete concept specification (purpose, principle, state, actions, queries).

## Overview

The UserProfileDisplaying concept manages user identity presentation attributes that are separate from authentication. It provides a clean separation between who a user is (authentication) and how they present themselves (profile display).

## Key Design Decisions

### Separation of Concerns

UserProfileDisplaying is intentionally **independent** of:

- **UserAuthenticating**: Authentication credentials (email, password) are separate from display attributes
- **UserSessioning**: Session management doesn't depend on profile data
- **Activity tracking**: Profile is static identity, not activity-based

This allows profile data to be:

- Updated independently of authentication
- Queried without security implications
- Cached separately from sensitive data
- Modified without affecting login state

### Optional Fields

All profile fields (`displayName`, `avatarUrl`, `bio`) are **optional**. This means:

- Users can have partial profiles (e.g., just a display name)
- Empty profiles are valid (returns empty strings)
- Fields can be set individually without affecting others
- `clearProfile` removes all fields but doesn't delete the profile record

## Integration with Other Concepts

### UserAuthenticating

There's a synchronization that sets a default display name when a user registers:

```sync
sync DefaultDisplayNameOnRegister
when
  UserAuthenticating.register ( email, password ) : (user)
then
  UserProfileDisplaying.setDisplayName ( user, name: email )
```

This ensures every new user has at least a display name (their email) for immediate display purposes.

### UserSessioning

While UserProfileDisplaying doesn't directly depend on UserSessioning, in practice:

- Profile updates typically require an authenticated session
- Profile reads are usually public (no session required)
- Syncs can use `UserSessioning._getUser(session)` to get the user for profile operations

## Usage Patterns

### Setting Profile Information

Users can set profile fields individually:

```typescript
// Set display name
await UserProfileDisplaying.setDisplayName({ user: userId, name: "John Doe" });

// Set avatar
await UserProfileDisplaying.setAvatar({ user: userId, url: "https://example.com/avatar.jpg" });

// Set bio
await UserProfileDisplaying.setBio({ user: userId, bio: "Software developer and concept enthusiast" });
```

### Reading Profile Information

Profiles can be read by anyone (no authentication required):

```typescript
const [profile] = await UserProfileDisplaying._profileOf({ user: userId });
// Returns: { displayName: "John Doe", avatarUrl: "...", bio: "..." }
```

### Clearing Profile

Users can clear all profile fields:

```typescript
await UserProfileDisplaying.clearProfile({ user: userId });
// All display fields are unset, but profile record remains
```

## Implementation Details

### Database Schema

**MongoDB Collection: `UserProfileDisplaying.profiles`**

```typescript
interface ProfileDoc {
  _id: User;              // User ID (used as document ID for fast lookup)
  user: User;             // Reference to user (redundant but matches spec)
  displayName?: string;   // Optional display name
  avatarUrl?: string;     // Optional avatar URL
  bio?: string;           // Optional biography
}
```

**Design Rationale:**

- User ID as `_id` enables O(1) lookups
- Optional fields allow partial profiles
- Upsert pattern: profile created on first field set
- `clearProfile` uses `$unset` to remove fields without deleting document

### Query Behavior

The `_profileOf` query:

- Returns empty strings for missing profiles
- Returns empty strings for unset optional fields
- Always returns a single-element array (matches concept query pattern)
- Never throws errors (graceful degradation)

## Common Synchronizations

### Profile Update via Request

```sync
sync UpdateProfileRequest
when
  UserRequesting.request ( path: "/profile/update", session, displayName, avatarUrl, bio ) : (request)
where
  user is UserSessioning._getUser ( session )
then
  UserProfileDisplaying.setDisplayName ( user, name: displayName )
  UserProfileDisplaying.setAvatar ( user, url: avatarUrl )
  UserProfileDisplaying.setBio ( user, bio )
```

### Profile Read via Request

```sync
sync GetProfileRequest
when
  UserRequesting.request ( path: "/profile/get", userId ) : (request)
then
  profile is UserProfileDisplaying._profileOf ( user: userId )
  UserRequesting.respond ( request, profile )
```

## Important Notes

### Profile vs. Authentication

- **Profile fields are public**: Anyone can read a user's profile
- **Profile updates may require auth**: Implement authorization in syncs
- **Email is not in profile**: Email is in UserAuthenticating, not here
- **Display name ≠ username**: Display name is for presentation, username/email is for login

### Field Validation

The concept specification doesn't enforce:

- Display name length limits
- Avatar URL format validation
- Bio character limits
- Content moderation

These should be handled in:

- Synchronization guards (`where` clauses)
- Frontend validation
- Separate moderation concepts

### Performance Considerations

- Profile reads are fast (single document lookup by `_id`)
- Profile writes are fast (upsert operations)
- No indexes needed (using `_id` as primary key)
- Consider caching for frequently accessed profiles

### Future Enhancements

Potential additions (not in current spec):

- Profile versioning/history
- Profile privacy settings
- Multiple profile fields (location, website, etc.)
- Profile completion percentage
- Profile verification badges
