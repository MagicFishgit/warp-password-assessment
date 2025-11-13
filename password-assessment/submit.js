import 'dotenv/config';
import fs from 'fs';
import axios from 'axios';
import archiver from 'archiver';

//Create zip file and return as Base64 string.
function createZipBase64(cvPath, sourcePaths, dictPath){
    return new Promise((resolve, reject) => {
        const archive = archiver('zip', { zlib: { level: 9}});
        const buffers = [];

        //Listen for data events, collect buffer chunks.

        archive.on('data', (buffer) => {
            buffers.push(buffer);
        });

//Listen for end event:
archive.on('end', () => {
    const finalBuffer = Buffer.concat(buffers);
    console.log("Zip file created in mem.");
    resolve(finalBuffer.toString('base64'));
});

//Error handling:
archive.on('warning', (err) => reject(err));
archive.on('error', (err) => reject(err));

//Push files to stream:
archive.file(cvPath, {name: 'archived_cv.pdf'});
const codeDirectory = 'source_code';
for (const path of sourcePaths) {
    archive.file(path, {name: `${codeDirectory}/${path}` });
}
archive.file(dictPath, { name: 'dict.txt'});

//Finish archiving, triggers end event.
archive.finalize();

    });
}

//Submit final payload:
export async function submitCV(tempUrl, cvPath, sourcePaths, dictPath) {
    console.log("Creating Zip...");
    const zipAsB64 = await createZipBase64(cvPath, sourcePaths, dictPath);

    const payload = {
        data: zipAsB64,
        name: process.env.NAME,
        surname: process.env.SURNAME,
        email: process.env.EMAIL
    };

    console.log(`Posting to ${tempUrl}`);

    try{
        const response = await axios.post(tempUrl, payload, {
            headers: { 'Content-Type': 'application/json' }
        });
        console.log("Submission completed!", response.data.message);
    }catch (error) {
        const errData = error.response?.data || error.message;
        console.error ("Submission Failed!", errData);
    }
}