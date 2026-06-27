const fs = require('fs');
const path = require('path');
const { CITIES } = require('./utils');
const nicheConfig = require('./niche_config.json');

const OLD_STR = 'https://hb.afl.rakuten.co.jp/hgc/047ad0f1.183c70cf.047ad0f2.1e4c3769/?pc=';
const NEW_STR = 'https://hb.afl.rakuten.co.jp/hgc/047ad0f1.183c70cf.047ad0f2.1e4c3769/tabiplan-web/?pc=';

function replaceInFile(filePath) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    
    if (content.includes(OLD_STR)) {
        // 全て置換
        const regex = new RegExp(OLD_STR.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'g');
        content = content.replace(regex, NEW_STR);
        fs.writeFileSync(filePath, content);
        console.log(`Replaced in ${filePath}`);
    }
}

// 1. 各都市トップページへの適用
for (const city of CITIES) {
    const filePath = path.join(__dirname, '..', city.id, 'index.html');
    replaceInFile(filePath);
}

// 2. ニッチページへの適用
for (const key in nicheConfig) {
    const niche = nicheConfig[key];
    const filePath = path.join(__dirname, '..', niche.city, niche.slug, 'index.html');
    replaceInFile(filePath);
}

// 3. ピックアップページの適用
const pickupDir = path.join(__dirname, '..', 'pickup');
if (fs.existsSync(pickupDir)) {
    const files = fs.readdirSync(pickupDir);
    for (const file of files) {
        if (file.endsWith('.html')) {
            replaceInFile(path.join(pickupDir, file));
        }
    }
}

// 4. トップページ (index.html)
replaceInFile(path.join(__dirname, '..', 'index.html'));

console.log('Tracking ID injection completed.');
