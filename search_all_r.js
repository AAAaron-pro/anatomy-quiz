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

function get(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let resData = '';
            res.on('data', chunk => resData += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(resData));
                } catch(e) {
                    resolve(resData);
                }
            });
        }).on('error', reject);
    });
}

async function searchAllR() {
    console.log('Querying user_progress for any userId starting with R or r...');
    const url = 'https://firestore.googleapis.com/v1/projects/anatomy-quiz-7cb36/databases/(default)/documents:runQuery';
    
    // Check uppercase R
    const queryR = {
        structuredQuery: {
            from: [{ collectionId: 'user_progress' }],
            where: {
                fieldFilter: {
                    field: { fieldPath: 'userId' },
                    op: 'GREATER_THAN_OR_EQUAL',
                    value: { stringValue: 'R' }
                }
            }
        }
    };
    const resR = await post(url, queryR);
    const validR = Array.isArray(resR) ? resR.filter(item => item.document && (item.document.fields?.userId?.stringValue || '').startsWith('R')) : [];
    console.log(`Results starting with 'R': ${validR.length}`);
    validR.forEach(item => {
        console.log('Doc:', item.document.name, item.document.fields);
    });

    // Check lowercase r
    const queryLowerR = {
        structuredQuery: {
            from: [{ collectionId: 'user_progress' }],
            where: {
                fieldFilter: {
                    field: { fieldPath: 'userId' },
                    op: 'GREATER_THAN_OR_EQUAL',
                    value: { stringValue: 'r' }
                }
            }
        }
    };
    const resLowerR = await post(url, queryLowerR);
    const validLowerR = Array.isArray(resLowerR) ? resLowerR.filter(item => item.document && (item.document.fields?.userId?.stringValue || '').startsWith('r')) : [];
    console.log(`Results starting with 'r': ${validLowerR.length}`);
    validLowerR.forEach(item => {
        console.log('Doc:', item.document.name, item.document.fields);
    });

    // Also check if there is a document in user_stats with prefix R
    const statsUrl = 'https://firestore.googleapis.com/v1/projects/anatomy-quiz-7cb36/databases/(default)/documents:runQuery';
    const queryStats = {
        structuredQuery: {
            from: [{ collectionId: 'user_stats' }]
        }
    };
    const resStats = await post(statsUrl, queryStats);
    console.log('All user_stats docs:');
    if (Array.isArray(resStats)) {
        resStats.forEach(item => {
            if (item.document) console.log('  -', item.document.name);
        });
    }
}

searchAllR().catch(console.error);
