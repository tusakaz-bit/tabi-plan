const fs = require('fs');
const path = require('path');

const PICKUP_DIR = path.join(__dirname, '../pickup');

function run() {
    const files = fs.readdirSync(PICKUP_DIR);
    let count = 0;

    for (const file of files) {
        if (!file.endsWith('.html')) continue;

        // Extract date from filename (e.g. 2026-05-15-...)
        const match = file.match(/^(\d{4}-\d{2}-\d{2})/);
        if (!match) continue;

        const dateStr = match[1];
        // 2026-06-22 より前の記事を判定
        if (dateStr < '2026-06-22') {
            const filePath = path.join(PICKUP_DIR, file);
            let html = fs.readFileSync(filePath, 'utf8');

            if (!html.includes('<meta name="robots" content="noindex">')) {
                // <head>の直後に挿入
                html = html.replace('<head>', '<head>\n    <meta name="robots" content="noindex">');
                fs.writeFileSync(filePath, html);
                console.log(`Added noindex to: ${file}`);
                count++;
            }
        }
    }
    console.log(`\nSuccess: Added noindex to ${count} old articles.`);
}

run();
