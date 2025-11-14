import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';

function createZipBuffer(cvBuffer) {
    return new Promise((resolve, reject) => {
        const archive = archiver('zip', { zlib: { level: 9 } });
        const buffers = [];
        archive.on('data', (buffer) => buffers.push(buffer));
        archive.on('end', () => {
            console.log("Zip buffer created for download.");
            resolve(Buffer.concat(buffers)); // Return the raw buffer
        });
        archive.on('error', (err) => reject(err));

        const isProduction = process.env.NODE_ENV === 'production';
        const cwd = process.cwd(); // This is /app in Docker, /frontend locally

        //In Docker, code is in /app/source-for-zip. Locally, it's in the project root.
        const frontendSourceRoot = isProduction 
            ? path.join(cwd, 'source-for-zip') 
            : cwd;
            
        // In Docker: /app/source-for-zip/mock-api
        // Locally: /mock-api (one level up from /frontend)
        const mockApiSourceRoot = isProduction 
            ? path.join(frontendSourceRoot, 'mock-api')
            : path.join(cwd, '../mock-api');

        // In Docker, dict.txt is at /app/dict.txt. Locally, it's at /frontend/dict.txt.
        const dictPath = path.join(cwd, 'dict.txt');

        // In Docker, README is in /app/source-for-zip/README.md. Locally, it's at ../README.md.
        const readmePath = isProduction 
            ? path.join(frontendSourceRoot, 'README.md')
            : path.join(cwd, '../README.md'); 

        //Add CV from buffer
        archive.append(cvBuffer, { name: 'cv.pdf' });

        //Add Dictionary
        if (fs.existsSync(dictPath)) {
            archive.file(dictPath, { name: 'dict.txt' });
        }
        
        //Add Root README
        if (fs.existsSync(readmePath)) {
            archive.file(readmePath, { name: 'README.md' });
        }

        // List of source files (relative to sourceRoot)
        const frontendSourceFiles = [
            'package.json',
            'next.config.js',
            'tailwind.config.js',
            '.env.example',
            'app/page.js',
            'app/layout.js',
            'app/globals.css',
            'app/api/attack/route.js',
            'app/api/submit/route.js',
            'app/api/generate-zip/route.js'
        ];
        
        const mockApiSourceFiles = [
            'server.js',
            'package.json',
            '.env.example'
        ];

        //Add Source Code
        const codeDirectory = 'source_code';
        
        for (const file of frontendSourceFiles) {
            const fullPath = path.join(frontendSourceRoot, file);
            if (fs.existsSync(fullPath)) {
                // This zips 'app/page.js' as 'source_code/frontend/app/page.js'
                archive.file(fullPath, { name: `${codeDirectory}/frontend/${file}` });
            } else {
                console.warn(`[ZIP] Missing frontend file: ${fullPath}`);
            }
        }
        
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
        const cvFile = data.get('cv');

        if (!cvFile) {
            return NextResponse.json({ message: "CV file is required" }, { status: 400 });
        }

        const cvBuffer = Buffer.from(await cvFile.arrayBuffer());
        
        // Call the zipping function
        const zipBuffer = await createZipBuffer(cvBuffer);
        
        // Return the buffer directly as a file download
        return new Response(zipBuffer, {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': 'attachment; filename="submission_inspect.zip"',
            },
            status: 200,
        });

    } catch (error) {
        console.error("Zip generation error:", error);
        return NextResponse.json({ message: "Zip generation failed", error: error.message }, { status: 500 });
    }
}