import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import axios from 'axios';

//Load secrets
const MY_NAME = process.env.MY_NAME;
const MY_SURNAME = process.env.MY_SURNAME;
const MY_EMAIL = process.env.MY_EMAIL;

function createZipBuffer(cvBuffer) {
    return new Promise((resolve, reject) => {
        const archive = archiver('zip', { zlib: { level: 9 } });
        const buffers = [];
        archive.on('data', (buffer) => buffers.push(buffer));
        archive.on('end', () => {
            console.log("Zip buffer created.");
            resolve(Buffer.concat(buffers)); // Return the raw buffer
        });
        archive.on('error', (err) => reject(err));

        //Environment-Aware Path Logic 
        const isProduction = process.env.NODE_ENV === 'production';
        const cwd = process.cwd(); // This is /app in Docker, /frontend locally
        
        // This is the base folder where all source files are kept in production
        const prodSourceRoot = path.join(cwd, 'source-for-zip');

        // Define the roots for source code
        const frontendSourceRoot = isProduction 
            ? path.join(prodSourceRoot, 'frontend') 
            : cwd;                                  
            
        const mockApiSourceRoot = isProduction 
            ? path.join(prodSourceRoot, 'mock-api') 
            : path.join(cwd, '../mock-api');      

        //Docker: /app/dict.txt. Locally: /frontend/dict.txt
        const dictPath = path.join(cwd, 'dict.txt');
        
        //Docker: /app/source-for-zip/README.md. Locally: ../README.md
        const readmePath = isProduction 
            ? path.join(prodSourceRoot, 'README.md')
            : path.join(cwd, '../README.md'); 

        //Add CV
        archive.append(cvBuffer, { name: 'cv.pdf' });

        //Add Dictionary
        if (fs.existsSync(dictPath)) {
            archive.file(dictPath, { name: 'dict.txt' });
        } else {
             console.warn(`[ZIP] Missing dict.txt at: ${dictPath}`);
        }
        
        //Add Root README.md
        if (fs.existsSync(readmePath)) {
            archive.file(readmePath, { name: 'README.md' });
        } else {
            console.warn(`[ZIP] Missing root README.md at: ${readmePath}`);
        }

        //Add Frontend Source Code
        const codeDirectory = 'source_code';
        const frontendSourceFiles = [
            'package.json',
            'next.config.mjs',
            '.env.example',
            'app/page.js',
            'app/layout.js',
            'app/globals.css',
            'app/api/attack/route.js',
            'app/api/submit/route.js',
            'app/api/generate-zip/route.js',
            'components/ui/button.js', 
            'components/ui/card.js',
            'components/ui/input.js',
            'components/ui/label.js',
            'components/ui/scroll-area.js',
            'lib/utils.js'
        ];

        for (const file of frontendSourceFiles) {
            const fullPath = path.join(frontendSourceRoot, file);
            if (fs.existsSync(fullPath)) {
                // This zips 'app/page.js' as 'source_code/frontend/app/page.js'
                archive.file(fullPath, { name: `${codeDirectory}/frontend/${file}` });
            } else {
                console.warn(`[ZIP] Missing frontend file: ${fullPath}`);
            }
        }
        
        // --- 5. Add Mock API Source Code ---
        const mockApiSourceFiles = [
            'server.js',
            'package.json',
            '.env.example'
        ];

        for (const file of mockApiSourceFiles) {
            const fullPath = path.join(mockApiSourceRoot, file);
            if (fs.existsSync(fullPath)) {
                // This zips 'server.js' as 'source_code/mock-api/server.js'
                archive.file(fullPath, { name: `${codeDirectory}/mock-api/${file}` });
            } else {
                console.warn(`[ZIP] Missing mock-api file: ${fullPath}`);
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
        
        // Call the new zip function
        const zipBuffer = await createZipBuffer(cvBuffer);

        //Check the filesize:
        const fileSizeMB = zipBuffer.length / (1024 * 1024);
        console.log(`Zip Size: ${fileSizeMB.toFixed(2)} MB`);

        if (fileSizeMB > 5) {
            console.error("WARNING: Zip exceeds max filesize of 5MB");
            return NextResponse.json({ message: "Error: Zip file exceeds 5MB limit." }, { status: 400 });
        }
        
        // Convert the final buffer to Base64
        const zipAsBase64 = zipBuffer.toString('base64');

        const payload = {
            data: zipAsBase64,
            name: MY_NAME,
            surname: MY_SURNAME,
            email: MY_EMAIL
        };

        console.log(`Posting to ${tempUrl}`);

        // Submit to the final URL
        const response = await axios.post(tempUrl, payload, {
            headers: { 'Content-Type': 'application/json' }
        });

        console.log("Submission completed!", response.data.message);
        return NextResponse.json({ message: "Success", ...response.data });

    } catch (error) {
        console.error("Submit error:", error);
        const errData = error.response?.data || error.message;
        return NextResponse.json({ message: "Submission Failed", error: errData }, { status: 500 });
    }
}