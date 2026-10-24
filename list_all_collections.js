const https = require('https');

function post(url, body) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const data = JSON.stringify(body);
        const req = https.request({
            hostname: u.hostname,
            path: u.pathname + u.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        }, (res) => {
            let resData = '';
            res.on('data', chunk => resData += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(resData));
                } catch(e) {
                    resolve(resData);
                }
            });
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function listAllRootCollections() {
    console.log('Listing root collections via listCollectionIds...');
    const url = 'https://firestore.googleapis.com/v1/projects/anatomy-quiz-7cb36/databases/(default)/documents:listCollectionIds';
    const res = await post(url, {});
    console.log('Collection IDs in (default):', res);
}

listAllRootCollections().catch(console.error);
