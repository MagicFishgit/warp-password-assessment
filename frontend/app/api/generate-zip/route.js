import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';

function createZipBuffer(cvBuffer, sourcePaths, dictPath) {
    return new Promise((resolve, reject) => {
        const archive = archiver('zip', { zlib: { level: 9 } });
        const buffers = [];
        archive.on('data', (buffer) => buffers.push(buffer));
        archive.on('end', () => {
            console.log("Zip buffer created for download.");
            resolve(Buffer.concat(buffers)); // Return the raw buffer
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
        const cvFile = data.get('cv');

        if (!cvFile) {
            return NextResponse.json({ message: "CV file is required" }, { status: 400 });
        }

        const cvBuffer = Buffer.from(await cvFile.arrayBuffer());
        
        //Files to include
        const sourcePaths = [
            'package.json', 
            'app/page.js', 
            'app/api/attack/route.js', 
            'app/api/submit/route.js',
            'app/api/generate-zip/route.js',
            'README.md' 
        ];
        const dictPath = 'dict.txt';

        const zipBuffer = await createZipBuffer(cvBuffer, sourcePaths, dictPath);
        
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