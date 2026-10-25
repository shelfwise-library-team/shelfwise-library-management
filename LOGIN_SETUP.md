# Shelfwise login-protection update

This update keeps the existing Shelfwise React welcome/dashboard UI and adds server-side access control for the Java API.

## What this changes

- Adds a login screen to the React app. The welcome page remains public; entering the dashboard requires login.
- Adds `POST /api/auth/login`, `GET /api/auth/me`, and `POST /api/auth/logout` endpoints.
- Requires a valid bearer session token for dashboard, books, members, and circulation endpoints. `GET /api/health` remains public for Render health checks.
- Passwords are represented in the Render environment by salted PBKDF2-HMAC-SHA256 hashes, not stored in JavaScript or committed source code.
- Session tokens expire after 8 hours. Sessions are held in backend memory, so a backend restart/redeploy logs everyone out.
- CORS defaults to the current Render site plus local Vite: `https://shelfwise-library-management.onrender.com,http://localhost:5173`.

## Deployment order — follow this carefully

### 1. Generate the four team-account hashes locally

Extract this update ZIP somewhere on your PC. Open a terminal in the extracted folder and run:

```powershell
python tools/generate_users.py
```

The script prompts for four unique user IDs and passwords. Password input is hidden, passwords are not printed or saved, and the script outputs only the salted hashes as JSON. Use a unique password of at least 12 characters for each person. Do not send passwords or the generated JSON to ChatGPT.

If `python` is not recognized, try `py tools/generate_users.py`.

### 2. Add the environment variable to the existing Render backend service BEFORE pushing the code

1. Open Render Dashboard and select the existing `shelfwise-api` Web Service.
2. Open **Environment** (sometimes shown under Settings → Environment Variables).
3. Add an environment variable:
   - **Key:** `SHELFWISE_USERS_JSON`
   - **Value:** paste the entire JSON output from the local script.
4. Save the change. Store this value only in Render's private environment settings; do not add it to a repository or source file.

The old code remains unauthenticated until the updated backend is deployed, so apply the code update promptly after setting this variable. Adding the variable alone does not secure the old version.

### 3. Replace two source files in the existing VS Code project

Copy these files from the extracted update folder over the corresponding files in your existing `D:\Projects\LibraryManagement` project:

- `backend/src/main/java/ApiServer.java`
- `frontend/src/App.jsx`

Keep the rest of your project as it is. Do not copy any generated users JSON into your repository.

### 4. Build and test locally

From a VS Code terminal at the project root:

```powershell
cd backend
mvn clean package
cd ..\frontend
npm run build
cd ..
```

If either build fails, stop and fix the error before pushing.

To run the updated backend locally, set `SHELFWISE_USERS_JSON` in that terminal session to the generated JSON before starting Java. The Render setting does not automatically exist on your PC.

### 5. Commit and push the changes

From the project root:

```powershell
git add backend/src/main/java/ApiServer.java frontend/src/App.jsx
git commit -m "Add Shelfwise team login protection"
git push
```

Render should redeploy the backend and frontend from `main` if automatic deployments are enabled. Watch both deployment logs for success.

### 6. Verify protection after both deployments are live

- Visiting the public website should still show the Shelfwise welcome page.
- Clicking **Enter Dashboard** should show the team login form.
- A configured user ID/password should open the dashboard.
- The Sign out icon in the profile area should end the session.
- Opening `https://shelfwise-api-la62.onrender.com/api/dashboard` directly without a token should return HTTP 401 instead of library data.
- `https://shelfwise-api-la62.onrender.com/api/health` should still return `{"status":"ok"}`.

## Limitations to be aware of

- This implementation uses in-memory sessions and environment-configured accounts, not a user management page. To add/change an account, regenerate the JSON and update the Render environment variable, then redeploy/restart the backend; this logs existing sessions out.
- It does not add a login-attempt lockout/rate limiter, password reset flow, or multi-factor authentication. Use strong unique passwords and keep Render account access limited to trusted administrators.
- The existing SQLite database is still on Render's local filesystem. Render's free service filesystem is not durable across all restarts/redeploys; configure persistent storage or move to a managed database before storing real member/staff data.
