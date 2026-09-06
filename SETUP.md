# Setup & Deployment Guide

This guide walks you through setting up and configuring all required environment variables for the **Personal Document Storage and Reader** application, both locally and for deployment on Vercel.

---

## 1. Environment Variables Overview

Create or edit `.env.local` in the project root with the following keys:

```env
MONGODB_URI=xxxxx
CLOUDINARY_CLOUD_NAME=xxxxx
CLOUDINARY_API_KEY=xxxxx
CLOUDINARY_API_SECRET=xxxxx
JWT_SECRET=xxxxx
```

---

## 2. Step-by-Step Instructions for Each Key

### A. MongoDB Connection String (`MONGODB_URI`)
MongoDB is used to persist user credentials and file metadata.

1. **Sign up / Log in to MongoDB Atlas**:
   - Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) and sign in or create a free account.
2. **Create a Free Cluster**:
   - Click **"Create"** or **"Build a Database"**.
   - Select the free **M0 (Shared)** tier, pick a provider and region close to you, and click **"Create Deployment"**.
3. **Set Up Database Access (User Credentials)**:
   - In the left sidebar, navigate to **Security** → **Database Access**.
   - Click **"Add New Database User"**.
   - Choose **Password** authentication.
   - Enter a username (e.g., `docreader_admin`) and generate/enter a secure password.
   - Set Built-in Role to **"Read and write to any database"** and click **"Add User"**.
4. **Configure Network Access**:
   - In the left sidebar, navigate to **Security** → **Network Access**.
   - Click **"Add IP Address"**.
   - Select **"Allow Access from Anywhere"** (`0.0.0.0/0`) so Vercel serverless functions can connect, then click **"Confirm"**.
5. **Get the Connection String**:
   - In the left sidebar, navigate to **Deployment** → **Database**.
   - Click **"Connect"** on your cluster.
   - Select **"Drivers"** (Node.js).
   - Copy the connection string. It will look like:
     ```
     mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/docreader?retryWrites=true&w=majority
     ```
   - Replace `<username>` and `<password>` with the credentials you created in Step 3.
   - Replace `xxxxx` in `MONGODB_URI` with this connection string.

---

### B. Cloudinary Credentials (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`)
Cloudinary provides CDN storage for documents (PDF, TXT, CSV, HTML, images).

1. **Sign up / Log in to Cloudinary**:
   - Go to [cloudinary.com](https://cloudinary.com/) and register or log in for a free account.
2. **Access the Cloudinary Dashboard**:
   - Once logged in, go to the **Cloudinary Console / Dashboard** ([console.cloudinary.com](https://console.cloudinary.com/)).
3. **Copy Your API Keys**:
   - On the dashboard homepage (or under **Settings** → **Access Keys**), you will see the **Product Environment Credentials**:
     - **Cloud Name**: Copy and set as `CLOUDINARY_CLOUD_NAME`.
     - **API Key**: Copy and set as `CLOUDINARY_API_KEY`.
     - **API Secret**: Click the eye/copy icon to reveal and copy, then set as `CLOUDINARY_API_SECRET`.

---

### C. JWT Secret (`JWT_SECRET`)
The secret key used to sign and verify in-memory JSON Web Tokens.

Generate a cryptographically secure 32-byte secret using any of the following methods:

- **Using Terminal (macOS/Linux)**:
  ```bash
  openssl rand -base64 32
  ```
- **Using Node.js**:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- Copy the resulting string and set it as `JWT_SECRET`.

---

## 3. Local Development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Populate `.env.local` with the actual values obtained above.
3. Start the Next.js development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser:
   - Register a new user account.
   - Log in and upload test documents (.pdf, .txt, .csv, .html, image).
   - View documents inline with full-screen, theme switcher, and font adjustments.

---

## 4. Vercel Deployment

Deploying the app to Vercel takes less than two minutes:

1. **Push your code to GitHub / GitLab / Bitbucket**:
   ```bash
   git add .
   git commit -m "feat: complete personal document reader app"
   git push origin main
   ```

2. **Import Project into Vercel**:
   - Go to [vercel.com/new](https://vercel.com/new).
   - Select and import your repository.

3. **Configure Environment Variables in Vercel**:
   - Under the **Environment Variables** section of the deployment screen, add the 5 variables:
     - `MONGODB_URI`
     - `CLOUDINARY_CLOUD_NAME`
     - `CLOUDINARY_API_KEY`
     - `CLOUDINARY_API_SECRET`
     - `JWT_SECRET`
   - Paste the production values for each key.

4. **Deploy**:
   - Click **"Deploy"**.
   - Vercel will build and deploy the Next.js app on a global serverless edge network.
