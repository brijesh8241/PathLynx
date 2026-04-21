# PathLynx 

PathLynx has been upgraded from a static website to a dynamic web application powered by **Node.js** and **Express.js**.

## Getting Started

1. **Install Dependencies (if not already done)**:
   ```bash
   npm install
   ```
2. **Start the Development Server**:
   ```bash
   node server.js
   ```
3. Open your browser and navigate to `http://localhost:3000`.

## Setting up Google Authentication

To enable the "Login with Google" button, you must wire it up to your Google Developer console.

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a New Project.
3. Search for "OAuth consent screen" and configure it (User Type: External).
4. Go to **Credentials**, click **Create Credentials**, and select **OAuth client ID**.
5. Application type: **Web application**.
6. Under **Authorized redirect URIs**, add exactly: `http://localhost:3000/auth/google/callback`.
7. Once created, copy the **Client ID** and **Client secret**.
8. Rename the `.env.example` file in this directory to `.env`.
9. Paste your copied ID and Secret into the respective fields in the `.env` file.
10. Restart your Node server. Google Authentication is now active!
