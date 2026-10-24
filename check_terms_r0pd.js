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

async function checkTerms() {
    console.log('Querying all terms collectionGroup...');
    const url = 'https://firestore.googleapis.com/v1/projects/anatomy-quiz-7cb36/databases/(default)/documents:runQuery';
    const res = await post(url, {
        structuredQuery: {
            from: [{ collectionId: 'terms', allDescendants: true }]
        }
    });

    if (Array.isArray(res)) {
        console.log(`Total terms returned: ${res.length}`);
        const matches = res.filter(item => {
            const str = JSON.stringify(item).toLowerCase();
            return str.includes('r0pd') || str.includes('ropd');
        });
        console.log('Matches in terms:', matches.length);
        if (matches.length > 0) {
            console.log(JSON.stringify(matches, null, 2));
        }

        const creators = new Set();
        res.forEach(item => {
            if (item.document?.fields?.creatorId?.stringValue) {
                creators.add(item.document.fields.creatorId.stringValue);
            }
        });
        console.log('Distinct creatorIds across all terms:', Array.from(creators));
    }
}

checkTerms().catch(console.error);
