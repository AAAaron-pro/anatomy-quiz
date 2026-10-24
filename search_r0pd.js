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

async function searchR0PD() {
    console.log('Searching for R0PD / r0pd across Firestore...');

    // 1. Check user_stats all documents (pagination)
    console.log('\n--- Checking user_stats ---');
    let pageToken = '';
    const allUserStats = [];
    do {
        const url = `https://firestore.googleapis.com/v1/projects/anatomy-quiz-7cb36/databases/(default)/documents/user_stats?pageSize=300${pageToken ? '&pageToken=' + pageToken : ''}`;
        const res = await get(url);
        if (res.documents) allUserStats.push(...res.documents);
        pageToken = res.nextPageToken;
    } while (pageToken);
    console.log(`Total user_stats docs: ${allUserStats.length}`);
    allUserStats.forEach(d => {
        const id = d.name.split('/').pop();
        console.log('user_stats doc id:', id);
        if (id.toLowerCase().includes('r0pd') || JSON.stringify(d).toLowerCase().includes('r0pd')) {
            console.log('🎯 FOUND IN user_stats:', id, JSON.stringify(d.fields, null, 2));
        }
    });

    // 2. Check user_progress all documents (pagination)
    console.log('\n--- Checking user_progress ---');
    pageToken = '';
    const allProgress = [];
    do {
        const url = `https://firestore.googleapis.com/v1/projects/anatomy-quiz-7cb36/databases/(default)/documents/user_progress?pageSize=300${pageToken ? '&pageToken=' + pageToken : ''}`;
        const res = await get(url);
        if (res.documents) allProgress.push(...res.documents);
        pageToken = res.nextPageToken;
    } while (pageToken);
    console.log(`Total user_progress docs: ${allProgress.length}`);

    const r0pdProgress = allProgress.filter(d => {
        const str = JSON.stringify(d).toLowerCase();
        return str.includes('r0pd');
    });
    console.log(`Matches in user_progress: ${r0pdProgress.length}`);
    if (r0pdProgress.length > 0) {
        r0pdProgress.forEach(d => {
            console.log('Prog doc:', d.name.split('/').pop());
            console.log('UpdateTime:', d.updateTime);
            console.log(JSON.stringify(d.fields, null, 2));
        });
    }

    // 3. What if it's 'ROPD' (letter O instead of digit 0)? Or vice-versa!
    console.log('\n--- Checking letter O variation (ropd) ---');
    const ropdProgress = allProgress.filter(d => {
        const str = JSON.stringify(d).toLowerCase();
        return str.includes('ropd');
    });
    console.log(`Matches with letter O (ropd) in user_progress: ${ropdProgress.length}`);
    if (ropdProgress.length > 0) {
        ropdProgress.forEach(d => {
            console.log('Prog doc (letter O):', d.name.split('/').pop(), d.updateTime, d.fields);
        });
    }

    // Check all unique user IDs found in user_progress
    const uniqueUids = new Set();
    allProgress.forEach(d => {
        const f = d.fields || {};
        const uid = f.userId?.stringValue || d.name.split('/').pop().split('_')[0];
        uniqueUids.add(uid);
    });
    console.log('\nAll unique userIds in user_progress:');
    uniqueUids.forEach(u => console.log(' -', u));

    // 4. Check quiz_data creatorId
    console.log('\n--- Checking quiz_data creatorId ---');
    pageToken = '';
    const creators = new Set();
    do {
        const url = `https://firestore.googleapis.com/v1/projects/anatomy-quiz-7cb36/databases/(default)/documents/quiz_data?pageSize=300${pageToken ? '&pageToken=' + pageToken : ''}`;
        const res = await get(url);
        if (res.documents) {
            res.documents.forEach(d => {
                const c = d.fields?.creatorId?.stringValue;
                if (c) creators.add(c);
            });
        }
        pageToken = res.nextPageToken;
    } while (pageToken);
    console.log('Creators in quiz_data:', Array.from(creators));
}

searchR0PD().catch(console.error);
