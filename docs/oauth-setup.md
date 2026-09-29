# 🔑 Google Cloud OAuth 2.0 Setup Guide

To connect **Google Tasks Desktop** to your own personal Google account, you need free OAuth 2.0 desktop credentials from the Google Cloud Console.

Because this is a 100% open-source, client-side application, your credentials and tokens remain on your local machine and communicate directly with Google's servers without any third-party intermediaries.

---

## 📑 Step-by-Step Walkthrough

### Step 1: Create a Google Cloud Project
1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. In the top navigation bar, click the project selector dropdown and click **New Project**.
3. Name your project (e.g., `Google Tasks Desktop`) and click **Create**.
4. Make sure your new project is selected in the top bar.

---

### Step 2: Enable the Google Tasks API
1. In the left-side navigation menu, go to **APIs & Services** > **Library**.
2. In the search bar, type `Google Tasks API`.
3. Select **Google Tasks API** from the results and click **Enable**.

---

### Step 3: Configure the OAuth Consent Screen
1. In the left menu, click **APIs & Services** > **OAuth consent screen**.
2. Select **External** as the User Type and click **Create**.
3. Fill in the required fields:
   * **App name**: `Google Tasks Desktop`
   * **User support email**: Select your own Gmail address.
   * **Developer contact email**: Enter your email address.
4. Click **Save and Continue**.
5. On the **Scopes** step, click **Add or Remove Scopes**:
   * Filter and add:
     - `https://www.googleapis.com/auth/tasks`
     - `https://www.googleapis.com/auth/userinfo.profile`
     - `https://www.googleapis.com/auth/userinfo.email`
   * Click **Update** and then **Save and Continue**.
6. On the **Test users** step:
   * Click **+ Add Users** and add your personal Google email address.
   > [!IMPORTANT]
   > While your Google Cloud project is in "Testing" mode, only the email addresses you list here under **Test users** will be allowed to log in.
7. Click **Save and Continue** to complete the summary.

---

### Step 4: Create Desktop OAuth Client Credentials
1. In the left menu, click **APIs & Services** > **Credentials**.
2. At the top of the page, click **+ Create Credentials** > **OAuth client ID**.
3. In the **Application type** dropdown, select **Desktop app**.
   > [!WARNING]
   > Do NOT select "Web application". You MUST select **Desktop app** so Google allows local loopback redirects (`http://127.0.0.1`).
4. Name it `Google Tasks Desktop Client` and click **Create**.
5. A dialog will appear displaying your **Client ID** and **Client Secret**. Keep this window open or copy both values.

---

### Step 5: Connect in the Application
1. Launch **Google Tasks Desktop**.
2. On the welcome login screen (or via the gear icon ⚙️ in the top TitleBar), paste your:
   * **Client ID**
   * **Client Secret**
3. Click **Sign in with Google**.
4. Your default web browser will open to Google's authentication page.
5. Select your Google account and grant the requested Tasks permissions.
6. The app's built-in local loopback server will intercept the callback and authenticate automatically. You can now close the browser tab!

---

## 🛠️ Troubleshooting

### Error: `access_denied` / "This app is blocked"
* Ensure your Google email address was added to the **Test users** list in Step 3.6.

### Error: `invalid_client`
* Double-check that you selected **Desktop app** when creating the OAuth Client ID, and verify that there are no leading or trailing spaces in the Client ID or Secret.

### Error: `client_secret is missing` in the code → token exchange
* Even with PKCE, Google requires the `client_secret` for most Client IDs.
  Fill in both **Client ID and Client Secret** under Settings > Google (or via
  `VITE_GOOGLE_CLIENT_ID` / `VITE_GOOGLE_CLIENT_SECRET` in `.env` for dev) and try again.

### Revoking Access
* You can disconnect anytime from the app's Settings dialog, or revoke permissions directly in your [Google Account Permissions Manager](https://myaccount.google.com/permissions).
