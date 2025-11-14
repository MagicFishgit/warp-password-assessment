import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import archiver from 'archiver';

//Load secrets
const MY_NAME = process.env.MY_NAME;
const MY_SURNAME = process.env.MY_SURNAME;
const MY_EMAIL = process.env.MY_EMAIL;

//zipping function from submit.js.
function createZipBase64(cvBuffer, sourcePaths, dictPath) {
    return new Promise((resolve, reject) => {
        const archive = archiver('zip', { zlib: { level: 9 } });
        const buffers = [];

        archive.on('data', (buffer) => buffers.push(buffer));
        archive.on('end', () => {
            console.log("Zip file created in memory.");
            resolve(Buffer.concat(buffers).toString('base64'));
        });
        archive.on('error', (err) => reject(err));

        //Add CV from buffer
        archive.append(cvBuffer, { name: 'cv.pdf' });

        //Add Dictionary
        const dictFullPath = path.join(process.cwd(), dictPath);
        if(fs.existsSync(dictFullPath)) {
            archive.file(dictFullPath, { name: 'dict.txt' });
        }

        //Add Source Code
        const codeDirectory = 'source_code';
        for (const file of sourcePaths) {
            const fullPath = path.join(process.cwd(), file);
            if (fs.existsSync(fullPath)) {
                const zipPath = `${codeDirectory}/${path.basename(file)}`;
                archive.file(fullPath, { name: zipPath });
            }
        }
        
        archive.finalize();
    });
}

//POST Handler
export async function POST(request) {
    try {
        const data = await request.formData();
        
        // Get form fields
        const tempUrl = data.get('tempUrl');
        const cvFile = data.get('cv');

        if (!cvFile || !tempUrl) {
            return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
        }

        // Convert file to buffer
        const cvBuffer = Buffer.from(await cvFile.arrayBuffer());
        
        // Define files to include in zip.
        const sourcePaths = [
            'package.json', 
            'app/page.js', 
            'app/api/attack/route.js', 
            'app/api/submit/route.js',
            'README.md'
        ];
        const dictPath = 'dict.txt';

        const zipAsBase64 = await createZipBase64(cvBuffer, sourcePaths, dictPath);

        const zipBuffer = Buffer.from(zipAsBase64, 'base64');
        const fileSizeInMB = zipBuffer.length / (1024 * 1024);

        if (fileSizeInMB > 5) {
            return NextResponse.json({ message: "Error: Zip file exceeds 5MB limit." }, { status: 400 });
        }

        const payload = {
            data: zipAsBase64,
            name: MY_NAME,
            surname: MY_SURNAME,
            email: MY_EMAIL
        };

        // Submit to the final URL
        const response = await axios.post(tempUrl, payload, {
            headers: { 'Content-Type': 'application/json' }
        });

        return NextResponse.json({ message: "Success", ...response.data });

    } catch (error) {
        console.error("Submit error:", error);
        const errData = error.response?.data || error.message;
        return NextResponse.json({ message: "Submission Failed", error: errData }, { status: 500 });
    }
}