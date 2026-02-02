# API Documentation

This document describes the API endpoints for the Groepsbezoeken App (BiebBattle). The backend is implemented as a Cloudflare Worker with D1 (SQLite) database.

**Base URL:** `https://groepsbezoeken-bieb-app.digilab-464.workers.dev`

## Authentication

All requests require authentication via a `secret` parameter:

| Endpoint Type | Required Secret | Environment Variable |
|---------------|-----------------|---------------------|
| Standard (createSession, joinTeam, updateTeam, fetchSessionState) | APP_SECRET | `APP_SECRET` |
| Admin (adminUpdateWords, purgeSession) | ADMIN_SECRET | `ADMIN_SECRET` |

**Secret can be passed in two ways:**
1. **URL Query String** (primary): `?secret=YOUR_SECRET`
2. **Request Body** (for POST): `{ "secret": "YOUR_SECRET", ... }`

### Example URLs
```
# Player/Standard access
https://app.example.com/?secret=your_app_secret

# Admin access
https://app.example.com/?secret=your_admin_secret&adminSecret=your_admin_secret
```

## Rate Limiting

The API implements rate limiting to prevent abuse:
- **Default limit:** 60 requests per minute per IP per session code
- **Response when limited:** HTTP 429 with `{ "error": "Rate limit exceeded..." }`

## Endpoints

### 1. Create Session

Initializes a new game session.

*   **URL:** `/api/createSession`
*   **Method:** `POST`
*   **Auth:** `APP_SECRET`
*   **Request Body:**
    ```json
    {
      "secret": "YOUR_APP_SECRET",
      "sessionName": "Name of the session"
    }
    ```
*   **Response (200):**
    ```json
    {
      "sessionId": "550e8400-e29b-41d4-a716-446655440000",
      "sessionName": "Groep 6B",
      "sessionCode": "XYZ4829",
      "startTime": null,
      "words": []
    }
    ```

**Notes:**
- `sessionCode` is a 7-character alphanumeric code (format: `ABC1234`)
- Session is created with empty words array; use `adminUpdateWords` to set words

---

### 2. Fetch Session State

Retrieves the current state of a session including all teams.

*   **URL:** `/api/fetchSessionState?code=ABC1234`
*   **Method:** `GET`
*   **Auth:** `APP_SECRET`
*   **URL Parameters:**
    *   `code` (required): The 7-character session code
    *   `secret` (required): The app secret
*   **Response (200):**
    ```json
    {
      "sessionId": "550e8400-e29b-41d4-a716-446655440000",
      "sessionCode": "XYZ4829",
      "sessionName": "Groep 6B",
      "startTime": "2024-01-15T10:30:00.000Z",
      "words": ["In", "de", "bibliotheek", ...],
      "teams": [
        {
          "teamId": "team-uuid",
          "teamName": "De Leeuwen",
          "animalId": 3,
          "progress": 8,
          "score": 0,
          "hintsUsed": 1,
          "timePenaltySeconds": 30,
          "finished": false,
          "lastSeen": "2024-01-15T10:45:00.000Z"
        }
      ],
      "now": "2024-01-15T10:46:00.000Z"
    }
    ```

**Notes:**
- `now` is the server timestamp (use for time synchronization)
- `teams` array is ordered by `animalId`
- `score` is always included (default: 0)

---

### 3. Join Team

Registers a player/team in a session. This endpoint is **idempotent** - calling it multiple times with the same `(sessionCode, animalId)` returns the existing team.

*   **URL:** `/api/joinTeam`
*   **Method:** `POST`
*   **Auth:** `APP_SECRET`
*   **Request Body:**
    ```json
    {
      "secret": "YOUR_APP_SECRET",
      "sessionCode": "XYZ4829",
      "animalId": 3,
      "teamName": "De Leeuwen",
      "teamColor": "#FF5722"
    }
    ```
*   **Response (200):**
    ```json
    {
      "teamId": "550e8400-e29b-41d4-a716-446655440001",
      "teamToken": "aB3xY9kLmN2pQ4rS5tU6vW7xY8zA1bC2",
      "animalId": 3,
      "word1": "bibliotheek",
      "word2": "vinden"
    }
    ```

**Notes:**
- `animalId` must be 1-10 (corresponds to the 10 available animal avatars)
- `teamToken` is a 32-character secret token required for `updateTeam`
- Words are assigned based on `animalId`:
  - Animal 1 → words[0], words[1]
  - Animal 2 → words[2], words[3]
  - ...
  - Animal 10 → words[18], words[19]
- If no words are configured yet, `word1` and `word2` will be empty strings
- `teamName` and `teamColor` are optional

---

### 4. Update Team

Updates the progress or state of a specific team.

*   **URL:** `/api/updateTeam`
*   **Method:** `POST`
*   **Auth:** `APP_SECRET`
*   **Request Body:**
    ```json
    {
      "secret": "YOUR_APP_SECRET",
      "teamId": "550e8400-e29b-41d4-a716-446655440001",
      "teamToken": "aB3xY9kLmN2pQ4rS5tU6vW7xY8zA1bC2",
      "progress": 8,
      "hintsUsed": 1,
      "timePenaltySeconds": 30,
      "finished": true,
      "teamName": "Updated Name"
    }
    ```
*   **Response (200):**
    ```json
    {
      "ok": true
    }
    ```

**Notes:**
- `teamId` and `teamToken` are required (token validation prevents unauthorized updates)
- All other fields are optional - only provided fields are updated
- `progress` is 0-12 (number of completed questions)
- `finished` marks the team as having completed the game
- `lastSeen` is automatically updated on each call

---

### 5. Admin Update Words

Updates the 20-word solution sentence for a session. **Requires ADMIN_SECRET.**

*   **URL:** `/api/adminUpdateWords?code=XYZ4829`
*   **Method:** `POST`
*   **Auth:** `ADMIN_SECRET`
*   **URL Parameters:**
    *   `code` (required): The session code
*   **Request Body:**
    ```json
    {
      "secret": "YOUR_ADMIN_SECRET",
      "sessionCode": "XYZ4829",
      "words": ["In", "de", "bibliotheek", "vinden", "we", "verhalen", "om", "in", "te", "verdwijnen", "spanning", "actie", "fantasie", "verbeelding", "en", "samen", "ontdekken", "we", "nieuwe", "werelden"],
      "startTime": "2024-01-15T10:30:00.000Z"
    }
    ```
*   **Response (200):**
    ```json
    {
      "ok": true
    }
    ```

**Notes:**
- `words` array must contain exactly **20 words** (validation enforced)
- `startTime` is optional (used to set/update the game start time)
- Existing teams with empty words will be updated with their assigned words
- Teams that already have words are not affected (game consistency)

---

### 6. Purge Session

Deletes a session and all associated teams. **Requires ADMIN_SECRET.**

*   **URL:** `/api/purgeSession`
*   **Method:** `POST`
*   **Auth:** `ADMIN_SECRET`
*   **Request Body:**
    ```json
    {
      "secret": "YOUR_ADMIN_SECRET",
      "sessionCode": "XYZ4829"
    }
    ```
    Or by sessionId:
    ```json
    {
      "secret": "YOUR_ADMIN_SECRET",
      "sessionId": "550e8400-e29b-41d4-a716-446655440000"
    }
    ```
*   **Response (200):**
    ```json
    {
      "ok": true
    }
    ```

**Notes:**
- Either `sessionCode` or `sessionId` is required
- All teams associated with the session are deleted
- This action is irreversible

---

## Auto-Purge (Scheduled)

A cron job runs every **Sunday at 22:00 UTC** (≈23:00 Dutch winter time) to automatically clean up old sessions:

- Sessions older than **14 days** are deleted
- All associated teams are deleted
- This is a safety net; manual purge is still available

---

## Error Responses

| Status Code | Response | Cause |
|-------------|----------|-------|
| 400 | `{ "error": "..." }` | Invalid request (missing fields, validation error) |
| 401 | `{ "error": "Invalid secret" }` | Invalid or missing authentication |
| 404 | `{ "error": "Session not found" }` | Session or team does not exist |
| 429 | `{ "error": "Rate limit exceeded..." }` | Too many requests |
| 500 | `{ "error": "Internal server error" }` | Server-side error |

---

## CORS

The API accepts requests from configured origins:
- `https://digilabbnwv.github.io` (production)
- `http://localhost:3000` (development)

Preflight (OPTIONS) requests are handled automatically.

---

## Database Schema

### Sessions Table
| Column | Type | Description |
|--------|------|-------------|
| sessionId | TEXT | Primary key (UUID) |
| sessionName | TEXT | Display name |
| sessionCode | TEXT | Unique 7-char code |
| startTime | TEXT | ISO timestamp or null |
| wordsJson | TEXT | JSON array of 20 words |
| createdAt | INTEGER | Unix timestamp |

### Teams Table
| Column | Type | Description |
|--------|------|-------------|
| teamId | TEXT | Primary key (UUID) |
| teamToken | TEXT | Unique auth token |
| sessionCode | TEXT | Foreign key to sessions |
| animalId | INTEGER | 1-10 |
| teamName | TEXT | Display name |
| teamColor | TEXT | Hex color |
| progress | INTEGER | 0-12 |
| score | INTEGER | Calculated score |
| hintsUsed | INTEGER | 0-3 |
| timePenaltySeconds | INTEGER | Penalty time |
| finished | INTEGER | 0 or 1 |
| lastSeen | INTEGER | Unix timestamp |
| word1, word2 | TEXT | Assigned words |

**Constraints:**
- `sessions(sessionCode)` is UNIQUE
- `teams(sessionCode, animalId)` is UNIQUE (enables idempotent joins)
