# Warp Development - Password API Assessment

This repository contains my solution for the technical assessment. The project is presented in two parts:

1.  **The Core Solution:** A set of lightweight, standalone Node.js scripts (in the `/password-assessment` folder) that fulfill all the basic requirements of the test.
2.  **The Full-Stack Application:** To better demonstrate my skills for a full-stack role, I expanded the core logic into a modern, full-stack application with a Next.js UI, a separate mock API, and a complete CI/CD pipeline deploying to a secure cloud server.

## 🚀 Live Application

The complete, deployed full-stack application is live and accessible here:

**[https://forgetfulme.magicfish.dev/]**

Please have a look at the project in my GitHub: **https://github.com/MagicFishgit/warp-password-assessment**

-----

## 🏗️ Full-Stack Project Overview

This is a multi-service application designed to be robust, secure, and scalable.

### Core Architecture & Features

  * **Frontend:** A responsive UI built with **Next.js (App Router)**, React, and **shadcn/ui**.
  * **Live Attack Log:** The UI features a real-time, streaming log of the dictionary attack, built using **Server-Sent Events (SSE)**.
  * **Backend Services:** The application runs as two separate services:
    1.  The **`frontend`** app (Next.js).
    2.  A standalone **`mock-api`** (Express.js) to enable safe, end-to-end testing without hitting the real API.
  * **Containerization:** Both the `frontend` and `mock-api` are containerized using **Docker**.
  * **CI/CD Pipeline:** A **GitHub Actions** workflow triggers on every push to the `main` branch. It automatically builds both services, pushes the images to Docker Hub, and deploys them to the production server.
  * **Cloud Infrastructure:** The application is hosted on a **Google Cloud Platform (GCP) Compute Engine VM** running Ubuntu Linux.
  * **Networking & Security:**
      * An **Nginx** webserver acts as a **reverse proxy**, serving the `frontend` application.
      * The `mock-api` container is on a private Docker network, inaccessible from the public internet.
      * The domain is secured with **TLS/SSL encryption** via **Let's Encrypt** (Certbot).
      * The server is hardened (UFW, fail2ban) and includes automated log rotation with `cron` to manage disk space.

-----

## 💻 Local Development Setup

To run the full-stack application on your local machine, you will need Node.js (v20.x or higher) and two terminals.

### Terminal 1: Run the Mock API

This server provides a safe, local version of the assessment's authentication API.

```bash
# 1. Navigate to the mock API directory
cd mock-api

# 2. Install dependencies
npm install

# 3. Create the environment file (no secrets, just config)
cp .env.example .env

# 4. Run the server
node server.js
```

The mock API will now be running at `http://localhost:4000`.

### Terminal 2: Run the Frontend App

This is the Next.js UI that you will interact with.

```bash
# 1. Navigate to the frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Create the local environment file
cp .env.example .env.local

# 4. (Optional) Edit .env.local with your personal details for submission
# MY_NAME="Your Name"
# MY_SURNAME="Your Surname"
# MY_EMAIL="your.email@example.com"

# 5. Run the development server
npm run dev
```

The application will now be running at `http://localhost:3001`.

You can now open `http://localhost:3001` in your browser. The "Mock API" button will work, and you can test the entire "attack" and "submit" flow against your local server.

-----

## 🛠️ (Alternative) Running the Core Script Solution

To run the original, simple Node.js script solution (as per the test's minimum requirements):

1.  Make sure the **Mock API** is running (see Terminal 1 above).
2.  In a new terminal, navigate to the script folder: `cd password-assessment`
3.  Install dependencies: `npm install`
4.  Create an environment file: `cp .env.example .env`
5.  Place your CV (e.g., `Resume_Rudi_Visagie.pdf`) in this folder and update the `RESUME_PATH` in `.env`.
6.  Run the attack: `node attack.js`

The script will run in your terminal, find the password, create `subm.zip` for inspection, and post the final payload to the mock server.

-----

## 🤖 AI Usage Declaration

In the spirit of transparency, I utilized an AI assistant (Google Gemini) as a productivity and learning tool throughout this project. My role was that of the project architect and lead developer, using the AI as a "pair programmer" to validate ideas, accelerate development, and debug complex configurations.

All core application logic, architectural decisions, and the final implementation were directed, written, and owned by me. The AI was used as a modern tool to enhance productivity and solve complex problems efficiently.

My primary uses of the AI involved:

  * **Architecture & Brainstorming:**

      * Discussing and validating high-level architectural approaches, such as the two-container (frontend/mock-api) setup, the use of Docker networking, and strategies for environment-aware code.

  * **Boilerplate & Configuration:**

      * Generating initial configuration files for `Dockerfile` and `.github/workflows/deploy.yml`, which I then customized and adapted to the project's specific needs.
      * *Example Prompt:* "What is the current best-practice `Dockerfile` structure for a Next.js app using the `output: 'standalone'` feature?"

  * **Debugging & Troubleshooting:**

      * Working collaboratively to diagnose environment-specific errors. This was particularly useful for the CI/CD pipeline, where I could provide error logs and ask for interpretations.
      * *Example Prompts:*
          * "My build is failing with `file not found` for my `README.md`. Can you review my `Dockerfile.frontend` and `deploy.yml` to ensure the build `context` and `COPY` paths are correct?"
          * "I'm seeing a `PayloadTooLargeError` from my mock server. This is likely the default Express body-parser limit. What is the correct syntax to increase it?"
          * "My SSE stream is bunching up on the deployed site but works locally. This suggests an Nginx buffering issue. What's the correct Nginx directive to disable proxy buffering?"

  * **Learning & Code Refinement:**

      * Accelerating my understanding of technologies I was newer to (like Docker networking and advanced `archiver` pathing).
      * Optimizing core logic, such as debugging why an API route would only run once.
      * *Example Prompt:* "My attack route works once, then fails on subsequent tries. This feels like a state issue with the global `Bottleneck` instance. Is creating a new limiter instance *inside* the request handler the right way to make this route stateless?"