# API Documentation

This document describes the API endpoints required for the Groepsbezoeken App. All endpoints are expected to be configured in `js/config.js`.

**Authentication:**
All requests (GET and POST) will automatically include a `secret` parameter in the URL query string (e.g., `?secret=YOUR_KEY`). This is used for validation in Power Automate.
Additionally, POST requests include the `secret` in the JSON body.

## Endpoints

### 1. Create Session
Initializes a new game session.

*   **Config Key:** `createSession`
*   **Method:** `POST`
*   **Request Body:**
    ```json
    {
      "secret": "YOUR_ADMIN_SECRET",
      "sessionName": "Name of the session"
    }
    ```
*   **Response:**
    Returns the created session object.
    ```json
    {
      "sessionId": "unique-session-id",
      "sessionName": "Name",
      "sessionCode": "ABC1234",
      "sessionPin": "1234",
      "status": "running",
      "startTime": null,
      "words": ["..."]
    }
    ```

### 2. Fetch Session State
Retrieves the current state of a session. Used for polling by clients.

*   **Config Key:** `fetchSessionState`
*   **Method:** `GET`
*   **URL Parameters:**
    *   `code`: The session code (e.g., `?code=ABC1234`)
*   **Response:**
    Returns the session object enriched with teams and server time.
    ```json
    {
      "sessionId": "...",
      "sessionCode": "...",
      "status": "running",
      "teams": [
        {
          "teamId": "...",
          "teamName": "...",
          "progress": 0,
          "score": 0
        }
      ],
      "now": "2023-01-01T12:00:00.000Z"
    }
    ```

### 3. Join Team
Allows a player (team) to join a specific session using an animal avatar.

*   **Config Key:** `joinTeam`
*   **Method:** `POST`
*   **Request Body:**
    ```json
    {
      "secret": "YOUR_ADMIN_SECRET",
      "sessionCode": "ABC1234",
      "animalId": 1
    }
    ```
*   **Response:**
    Returns the newly created or existing team object.
    ```json
    {
      "teamId": "team-1",
      "teamToken": "secure-token",
      "animalId": 1,
      "word1": "HiddenWord1",
      "word2": "HiddenWord2"
    }
    ```

### 4. Update Team Protocol
Updates the progress or state of a specific team.

*   **Config Key:** `updateTeam`
*   **Method:** `POST`
*   **Request Body:**
    ```json
    {
      "secret": "YOUR_ADMIN_SECRET",
      "teamId": "team-1",
      "teamToken": "secure-token-from-join",
      "progress": 50,     // Optional
      "hintsUsed": 1,     // Optional
      "teamName": "New Name" // Optional
    }
    ```
*   **Response:**
    ```json
    {
      "ok": true
    }
    ```

### 5. Admin Update Session
Controls session properties.

*   **Config Key:** `adminUpdateSession`
*   **Method:** `POST`
*   **Request Body:**
    ```json
    {
      "secret": "YOUR_ADMIN_SECRET",
      "action": "customAction" 
    }
    ```
*   **Response:**
    ```json
    {
      "ok": true
    }
    ```

### 6. Admin Update Words
Updates the list of words/solution sentence for the session.

*   **Config Key:** `adminUpdateWords`
*   **Method:** `POST`
*   **URL Parameters:**
    *   `code`: The session code (e.g., `?code=ABC1234`)
*   **Request Body:**
    ```json
    {
      "secret": "YOUR_ADMIN_SECRET",
      "sessionCode": "ABC1234",
      "words": ["Word1", "Word2", "Word3", ...]
    }
    ```
*   **Response:**
    ```json
    {
      "ok": true
    }
    ```

### 7. Purge Session
Resets or clears the session data.

*   **Config Key:** `purgeSession`
*   **Method:** `POST`
*   **Request Body:**
    ```json
    {
      "secret": "YOUR_ADMIN_SECRET",
      "sessionId": "..." // Optional/Context dependent
    }
    ```
*   **Response:**
    ```json
    {
      "ok": true
    }
    ```
