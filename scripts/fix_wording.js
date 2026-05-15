const fs = require('fs');
const path = require('path');

const PICKUP_DIR = path.join(__dirname, '../pickup');

const files = fs.readdirSync(PICKUP_DIR);
files.forEach(file => {
    if (file.endsWith('.html')) {
        const filePath = path.join(PICKUP_DIR, file);
        let content = fs.readFileSync(filePath, 'utf8');
        if (content.includes('今週のピックアップ宿')) {
            content = content.split('今週のピックアップ宿').join('本日の注目宿');
            fs.writeFileSync(filePath, content);
            console.log(`Updated: ${file}`);
        }
    }
});
