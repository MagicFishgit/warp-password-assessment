'use client'; 

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

//Log Item Component
const LogItem = ({ log }) => {
    let color = 'text-gray-400';
    if (log.type === 'success') color = 'text-green-500';
    if (log.type === 'fail') color = 'text-red-500';
    return <div className={`font-mono text-sm ${color}`}>{log.message}</div>;
};

//Main Page Component 
export default function Home() {
    const [logs, setLogs] = useState([]);
    const [isRunning, setIsRunning] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false); // --- NEW STATE ---
    const [successfulUrl, setSuccessfulUrl] = useState(null);
    const [cvFile, setCvFile] = useState(null);
    const [attackTarget, setAttackTarget] = useState('mock');
    
    const eventSourceRef = useRef(null);
    const scrollAreaRef = useRef(null);

    //Auto-scroll logic
    useEffect(() => {
        const viewport = scrollAreaRef.current?.querySelector('div[data-radix-scroll-area-viewport]');
        if (viewport) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }, [logs]);

    // Cleanup EventSource on unmount
    useEffect(() => {
        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
        };
    }, []);

    //Attack Function
    const startAttack = () => {
        setIsRunning(true);
        setLogs([{ type: 'log', message: `Starting attack against ${attackTarget} target...` }]);
        setSuccessfulUrl(null);

        const apiUrl = attackTarget === 'real'
            ? `/api/attack?target=real`
            : `/api/attack?target=mock`;

        const es = new EventSource(apiUrl);
        eventSourceRef.current = es;

        es.onmessage = (event) => {
            const data = JSON.parse(event.data);
            setLogs((prevLogs) => [...prevLogs, data]);

            if (data.type === 'success') {
                setSuccessfulUrl(data.url);
                es.close();
                setIsRunning(false);
            }

            if (data.type === 'done' || data.type === 'error') {
                es.close();
                setIsRunning(false);
            }
        };

        es.onerror = () => {
            setLogs((prevLogs) => [...prevLogs, { type: 'error', message: 'Connection error.' }]);
            es.close();
            setIsRunning(false);
        };
    };

    //Submit Function
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!successfulUrl || !cvFile) {
            alert("Please find the URL and select your CV file first.");
            return;
        }

        setIsSubmitting(true);
        setLogs((prev) => [...prev, { type: 'log', message: 'Zipping and submitting...' }]);

        const formData = new FormData();
        formData.append('tempUrl', successfulUrl);
        formData.append('cv', cvFile);

        try {
            const response = await fetch('/api/submit', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Submission failed");
            }
            
            setLogs((prev) => [...prev, { type: 'success', message: `✅ Submission successful! ${result.message}` }]);

        } catch (error) {
            setLogs((prev) => [...prev, { type: 'error', message: `❌ Submission error: ${error.message}` }]);
        } finally {
            setIsSubmitting(false);
        }
    };

    //NEW DOWNLOAD HANDLER
    const handleDownload = async () => {
        if (!cvFile) {
            alert("Please select your CV file first to include it in the zip.");
            return;
        }
        
        setIsDownloading(true);
        setLogs((prev) => [...prev, { type: 'log', message: 'Generating zip for download...' }]);

        const formData = new FormData();
        formData.append('cv', cvFile);

        try {
            const response = await fetch('/api/generate-zip', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || 'Server failed to generate zip');
            }

            // Get the file data
            const blob = await response.blob(); 
            // Create a temporary, hidden link in the browser
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'submission.zip'; // The filename for the download
            document.body.appendChild(a);
            
            // Click the link to trigger the browser's download dialog
            a.click();
            
            // Clean up the temporary link
            a.remove();
            window.URL.revokeObjectURL(url);
            
            setLogs((prev) => [...prev, { type: 'success', message: 'Zip download started.' }]);

        } catch (error) {
            setLogs((prev) => [...prev, { type: 'error', message: `❌ Download error: ${error.message}` }]);
        } finally {
            setIsDownloading(false);
        }
    };
    //END NEW HANDLER


    return (
        <main className="container mx-auto p-4 md:p-8">
            <Card className="w-full max-w-4xl mx-auto">
                <CardHeader>
                    <CardTitle className="text-3xl font-bold">Password API Assessment</CardTitle>
                    <CardDescription>Full-stack solution by Rudi Visagie</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        
                        {/* Left Column: Controls */}
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <Label>Attack Target</Label>
                                <div className="flex space-x-4">
                                    <Button type="button" variant={attackTarget === 'mock' ? 'default' : 'outline'} onClick={() => setAttackTarget('mock')}>
                                        Mock API
                                    </Button>
                                    <Button type="button" variant={attackTarget === 'real' ? 'destructive' : 'outline'} onClick={() => setAttackTarget('real')}>
                                        Real API
                                    </Button>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Test with "Mock API". Use "Real API" for final submission.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="cv">CV (PDF)</Label>
                                <Input id="cv" type="file" accept=".pdf" onChange={(e) => setCvFile(e.target.files[0])} required />
                            </div>
                            
                            <div className="flex flex-col space-y-4">
                                <Button type="button" onClick={startAttack} disabled={isRunning || isSubmitting || isDownloading}>
                                    {isRunning ? 'Attack Running...' : '1. Launch Attack'}
                                </Button>
                                
                                <Button type="submit" disabled={!successfulUrl || isSubmitting || isRunning || isDownloading}>
                                    {isSubmitting ? 'Submitting...' : '2. Submit Application'}
                                </Button>
                                
                                
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    onClick={handleDownload} 
                                    disabled={isRunning || isSubmitting || isDownloading || !cvFile}
                                >
                                    {isDownloading ? 'Generating...' : 'Inspect Zip (Download)'}
                                </Button>
                                {/* END NEW BUTTON */}
                            </div>
                            
                            {successfulUrl && (
                                <div className="text-green-600 text-sm font-medium">
                                    ✅ Success! URL Found: {successfulUrl.substring(0, 50)}...
                                </div>
                            )}
                        </form>
                        
                        {/* Right Column: Log Viewer */}
                        <div className="flex flex-col">
                            <Label className="text-lg font-semibold mb-2">Attack Log</Label>
                            <ScrollArea ref={scrollAreaRef} className="h-[400px] w-full rounded-md border p-4 bg-gray-900 text-white">
                                {logs.length === 0 && (
                                    <div className="text-gray-500">Awaiting attack...</div>
                                )}
                                {logs.map((log, index) => (
                                    <LogItem key={index} log={log} />
                                ))}
                            </ScrollArea>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </main>
    );
}