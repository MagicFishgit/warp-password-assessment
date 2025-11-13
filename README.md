# warp-password-assessment

This project is a full-stack solution to the technical assessment, including a rate-limited Mock API for safe local testing and a robust attack/submission script built with Node.js and Next.js (App Router).

## 1. Setup
1. Install nodeJS (v24.x.x)
2. Navigate to the `password-assessment` directory.
3. Install dependencies: `npm install`
4. Add a Resume file, as a PDF, to the root directory and update the `Resume_PATH` in `.env`.

## 2. Run the Mock Server.
1. Ensure you comment/uncomment the correct `TARGET_API_URL` to use the mock server instead of the real API endpoint.
2. Navigate to the `mock-api` directory.
3. Install dependencies: `npm install`
4. Run the server: `node server.js` - Keep the server running while testing.

## 3. Run the Attack Script
The attacks will not be instant as there is an API limit. It will run safely at ~9.5 requests/s.
1. Navigate to the `password-assessment` directory.
2. Run the script: `node attack.js`

The script will find the password, create `subm.zip` for manual inspection and post the final payload if all tests pass.

## IMPORTANT

The payload will contain the requested data and the mock server. The rest of the program will make use of NextJS, shadCN, Tailwind to create a web UI.
You can find this code at: https://github.com/MagicFishgit/warp-password-assessment 

The application will include a GitHub actions CI/CD pipline which will containerize the application and then deploy on my GCP Virtual Machine.

You can access it by navigating to `https://warp-password-assessment.magicfish.dev/`

Your requests will be sent to an NGINX webserver which will also act as a reverse proxy to serve the requests to my application sitting behind it.
The domain is TLS encrypted and the Linux VM is security hardened.

Thank you for taking the time to read this!
Have fun.