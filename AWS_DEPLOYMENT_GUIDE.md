# Kiro (Vitalis AI) AWS Deployment Guide

Based on the project structure, Kiro is a full-stack application consisting of:
1. **Frontend**: Static HTML, CSS, and Vanilla JavaScript (`/frontend`)
2. **Backend**: Node.js/Express API (`/server`)
3. **Database**: MongoDB (external MongoDB Atlas cluster)

The backend (`server.js`) is already configured to serve the frontend statically, which gives you two main ways to deploy this on AWS.

---

## Option 1: Decoupled Architecture (Recommended for Production)
This approach separates the frontend and backend, which provides better performance, easier scaling, and independent updates.

### 1. Frontend: AWS Amplify
AWS Amplify is the easiest and fastest way to host static files on AWS with built-in CI/CD.

* **Step 1**: Go to the **AWS Amplify Console**.
* **Step 2**: Click **"New app"** -> **"Host web app"**.
* **Step 3**: Connect your GitHub/GitLab repository.
* **Step 4**: Select the branch. In the build settings, set the base directory to `frontend`.
* **Step 5**: Deploy. Amplify will provide you with a public URL (e.g., `https://main.xxxxxxx.amplifyapp.com`).

### 2. Backend: AWS App Runner or EC2
**Using AWS App Runner (Easiest for Node.js):**
* **Step 1**: Go to **AWS App Runner**.
* **Step 2**: Click **"Create service"**.
* **Step 3**: Connect your repository and select the `server` directory.
* **Step 4**: Set the build command: `npm install`
* **Step 5**: Set the start command: `npm start`
* **Step 6**: In the **Environment variables**, add:
  * `MONGO_URI`: Your MongoDB Atlas URI
  * `JWT_SECRET`: A secure random string
  * `NODE_ENV`: `production`
  * `FRONTEND_URL`: The URL you got from AWS Amplify.
* **Step 7**: Deploy.

**Update Frontend API Base:**
Once the backend is deployed, copy the backend URL, go to `frontend/api.js`, and update `API_BASE` to point to your new backend URL instead of `/api`.

---

## Option 2: Monolithic Deployment (Easiest to Setup)
Since your `server/server.js` is already configured to serve the `frontend` folder (using `express.static`), you can deploy the entire app to a single server. 

> [!WARNING]
> **Important Fix Required First:**
> In `server.js` on line 13, there is an `app.get("/", ...)` route that returns JSON. This prevents your `index.html` from loading on the root path. You must **delete** lines 13-18 before deploying this way.

### Using Amazon EC2
* **Step 1**: Go to **Amazon EC2** and launch a new instance (Ubuntu Server 22.04 LTS is recommended). Choose a `t2.micro` (free tier eligible).
* **Step 2**: Configure the Security Group to allow inbound traffic on ports **22 (SSH)**, **80 (HTTP)**, and **443 (HTTPS)**.
* **Step 3**: SSH into your instance and install Node.js and Git:
  ```bash
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs git
  ```
* **Step 4**: Clone your repository onto the EC2 instance.
* **Step 5**: Navigate to the `server` directory and install dependencies:
  ```bash
  cd kiro/server
  npm install
  ```
* **Step 6**: Create a `.env` file based on your `.env.example` and fill in the `MONGO_URI` and `JWT_SECRET`. Set `PORT=80` (requires root).
* **Step 7**: Install PM2 (Process Manager) to keep the app running forever:
  ```bash
  sudo npm install -g pm2
  sudo pm2 start server.js --name "vitalis-api"
  ```
*(Note: To run on port 80 with PM2, you might need to use a reverse proxy like Nginx, or run PM2 as root using `sudo`).*

---

## Database (MongoDB Atlas)
Since your project uses MongoDB Atlas (from `.env.example`), you do not need to deploy a database on AWS.
However, you **must** go to the MongoDB Atlas dashboard -> **Network Access** and add the IP address of your AWS EC2 instance or App Runner service so they can communicate. For a quick test, you can allow all IPs (`0.0.0.0/0`), but restrict it in production.
