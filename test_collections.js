const https = require('https');

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

async function testCollections() {
    const names = [
        'users', 'user', 'user_sessions', 'sessions', 'logs',
        'analytics', 'history', 'quiz_history', 'user_logs',
        'activity', 'login_logs', 'scores', 'results'
    ];

    for (const name of names) {
        const url = `https://firestore.googleapis.com/v1/projects/anatomy-quiz-7cb36/databases/(default)/documents/${name}?pageSize=10`;
        const res = await get(url);
        if (res.documents) {
            console.log(`Found collection: ${name} (${res.documents.length} docs)`);
            res.documents.forEach(d => console.log('  Doc:', d.name));
        } else if (res.error) {
            // console.log(`${name}: ${res.error.message}`);
        } else {
            console.log(`Collection ${name}: empty or not found`);
        }
    }
}

testCollections().catch(console.error);
