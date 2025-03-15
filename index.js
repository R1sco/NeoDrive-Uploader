// Suppress deprecation warnings
process.removeAllListeners('warning');

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

const CONFIG_PATH = 'config.json';

// Replace the hardcoded values with configuration
const API_URL = process.env.API_URL || 'https://drive-api.neova.io';
const DEFAULT_PARENT_ID = process.env.DEFAULT_PARENT_ID || 'b2cd331c-bde3-497e-9b5b-6b810b6c2702';

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB

// Load tokens from file
function loadTokens() {
    try {
        const data = fs.readFileSync('token.txt', 'utf8');
        const tokens = JSON.parse(data);
        
        if (!tokens.access_token || !tokens.refresh_token) {
            console.error('Invalid token format in token.txt');
            return null;
        }
        
        return {
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token
        };
    } catch (error) {
        console.error('Error loading tokens:', error);
        console.log('Please ensure token.txt exists and contains valid tokens in format:');
        console.log('{\n  "access_token": "your_access_token",\n  "refresh_token": "your_refresh_token"\n}');
        return null;
    }
}

// Get file encryption key
async function getFileKey(accessToken) {
    try {
        if (!accessToken) {
            throw new Error('No access token provided');
        }

        const response = await fetch("https://kms-api.neova.io/keys/me", {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (response.status === 401) {
            console.error('Authentication failed: Invalid or expired token');
            return null;
        }

        if (!response.ok) {
            throw new Error(`Failed to get key: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        if (!data.key) {
            throw new Error('No key received in response');
        }
        
        console.log('Got encryption key successfully');
        return data.key;
    } catch (error) {
        console.error('Error getting file key:', error);
        return null;
    }
}

// Create file upload
async function createFileUpload(accessToken, filePath, key) {
    try {
        const fileSize = fs.statSync(filePath).size;
        const filename = path.basename(filePath);
        
        // Log the request details for debugging
        console.log('Creating upload for:', {
            fileSize,
            filename,
            hasKey: !!key,
            hasToken: !!accessToken
        });

        const metadata = {
            filename: Buffer.from(filename).toString('base64'),
            key: Buffer.from(key).toString('base64')
        };

        // Only add parent if it's configured
        if (process.env.PARENT_ID) {
            metadata.parent = Buffer.from(process.env.PARENT_ID).toString('base64');
        }

        // Log the full request for debugging
        console.log('Request headers:', {
            'Authorization': `Bearer ${accessToken.substring(0, 10)}...`,
            'Tus-Resumable': '1.0.0',
            'Upload-Length': fileSize.toString(),
            'Upload-Metadata': Object.entries(metadata)
                .map(([key, value]) => `${key} ${value}`)
                .join(',')
        });

        const response = await fetch(`${API_URL}/files/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Tus-Resumable': '1.0.0',
                'Upload-Length': fileSize.toString(),
                'Upload-Metadata': Object.entries(metadata)
                    .map(([key, value]) => `${key} ${value}`)
                    .join(','),
                'Content-Length': '0'
            }
        });

        // Log the response details
        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));

        if (response.status !== 201) {
            const errorBody = await response.text();
            throw new Error(`Failed to create upload: ${response.status}\nResponse: ${errorBody}`);
        }

        const location = response.headers.get('Location');
        if (!location) {
            throw new Error('No upload location returned');
        }

        console.log('Upload creation successful');
        console.log('Got upload URL:', location);
        return location;
    } catch (error) {
        console.error('Error creating file upload:', error);
        // Log more details about the error
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response headers:', error.response.headers);
            console.error('Response body:', await error.response.text());
        }
        return null;
    }
}

// Upload file chunks
async function uploadChunk(uploadUrl, accessToken, chunk, offset, totalSize) {
    try {
        const response = await fetch(uploadUrl, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Tus-Resumable': '1.0.0',
                'Upload-Offset': offset.toString(),
                'Content-Type': 'application/offset+octet-stream',
                'Content-Length': chunk.length.toString()
            },
            body: chunk
        });

        if (!response.ok) {
            throw new Error(`Failed to upload chunk: ${response.status}`);
        }

        const newOffset = parseInt(response.headers.get('Upload-Offset'));
        const percentage = ((newOffset / totalSize) * 100).toFixed(2);
        console.log(`Uploaded ${newOffset} of ${totalSize} bytes (${percentage}%)`);
        return newOffset;
    } catch (error) {
        console.error('Error uploading chunk:', error);
        throw error;
    }
}

async function selectFile() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const question = (query) => new Promise((resolve) => rl.question(query, resolve));

    async function browseDirectory(currentPath) {
        try {
            console.clear();
            console.log('\nCurrent directory:', currentPath);
            console.log('\nContents:');

            // Get and display directory contents
            const items = fs.readdirSync(currentPath)
                .map(item => ({
                    name: item,
                    isDirectory: fs.statSync(path.join(currentPath, item)).isDirectory()
                }))
                .sort((a, b) => {
                    // Directories first, then files
                    if (a.isDirectory && !b.isDirectory) return -1;
                    if (!a.isDirectory && b.isDirectory) return 1;
                    return a.name.localeCompare(b.name);
                });

            items.forEach((item, index) => {
                const icon = item.isDirectory ? '📁' : '📄';
                console.log(`${index + 1}. ${icon} ${item.name}`);
            });

            console.log('\nOptions:');
            console.log('- Enter number to select item');
            console.log('- Enter ".." to go up one directory');
            console.log('- Enter "q" to quit');

            const choice = await question('\nYour choice: ');

            if (choice.toLowerCase() === 'q') {
                rl.close();
                return null;
            } else if (choice === '..') {
                const parentDir = path.dirname(currentPath);
                return await browseDirectory(parentDir);
            } else if (/^\d+$/.test(choice)) {
                const index = parseInt(choice) - 1;
                if (index >= 0 && index < items.length) {
                    const selectedItem = items[index];
                    const selectedPath = path.join(currentPath, selectedItem.name);
                    
                    if (selectedItem.isDirectory) {
                        return await browseDirectory(selectedPath);
                    } else {
                        rl.close();
                        return selectedPath;
                    }
                }
            }

            // Invalid choice, try again
            return await browseDirectory(currentPath);
        } catch (error) {
            console.error('Error browsing directory:', error);
            rl.close();
            return null;
        }
    }

    return await browseDirectory(process.cwd());
}

// Modify the uploadFile function to use the file selector
async function uploadFile(filePath = null) {
    try {
        // If no filePath provided, use the file selector
        if (!filePath) {
            filePath = await selectFile();
            if (!filePath) {
                console.log('No file selected or operation cancelled.');
                return false;
            }
        }

        if (!fs.existsSync(filePath)) {
            throw new Error(`File ${filePath} does not exist`);
        }

        const tokens = await loadTokens();
        if (!tokens) {
            console.error('Failed to load tokens. Please check your token.txt file.');
            return false;
        }

        const key = await getFileKey(tokens.accessToken);
        if (!key) {
            console.error('Failed to get encryption key. Please check your authentication.');
            return false;
        }

        const uploadUrl = await createFileUpload(tokens.accessToken, filePath, key);
        if (!uploadUrl) {
            console.error('Failed to create upload URL.');
            return false;
        }
        
        const fileSize = fs.statSync(filePath).size;
        const file = fs.openSync(filePath, 'r');
        let offset = 0;

        while (offset < fileSize) {
            const chunkSize = Math.min(CHUNK_SIZE, fileSize - offset);
            const chunk = Buffer.alloc(chunkSize);
            fs.readSync(file, chunk, 0, chunkSize, offset);
            
            try {
                offset = await uploadChunk(uploadUrl, tokens.accessToken, chunk, offset, fileSize);
            } catch (error) {
                console.error('Error uploading chunk:', error);
                fs.closeSync(file);
                return false;
            }
        }

        fs.closeSync(file);
        console.log('Upload completed successfully!');
        return true;
    } catch (error) {
        console.error('Error during upload:', error);
        return false;
    }
}

// Update the example usage
uploadFile().catch(console.error); 