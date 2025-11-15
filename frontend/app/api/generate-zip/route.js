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