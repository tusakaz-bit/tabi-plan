const fs = require('fs');
const path = require('path');

const PICKUP_DIR = path.join(__dirname, '../pickup');
const AFFILIATE_ID = '047ad0f1.183c70cf.047ad0f2.1e4c3769';

function fixLinksInFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // 間違った画像リダイレクトURLを検出して修正する正規表現
    // 例: https://hb.afl.rakuten.co.jp/hgc/...f_no%3D12345
    const badLinkRegex = /https:\/\/hb\.afl\.rakuten\.co\.jp\/hgc\/.*?f_no%3D(\d+)/g;

    const newContent = content.replace(badLinkRegex, (match, hotelNo) => {
        modified = true;
        return `https://hb.afl.rakuten.co.jp/hgc/${AFFILIATE_ID}/?pc=https%3A%2F%2Ftravel.rakuten.co.jp%2FHOTEL%2F${hotelNo}%2F${hotelNo}.html`;
    });

    if (modified) {
        fs.writeFileSync(filePath, newContent);
        console.log(`Fixed: ${path.basename(filePath)}`);
    }
}

// pickupディレクトリ内の全HTMLファイルを処理
const files = fs.readdirSync(PICKUP_DIR);
files.forEach(file => {
    if (file.endsWith('.html') && file !== 'index.html' && file !== 'template.html') {
        fixLinksInFile(path.join(PICKUP_DIR, file));
    }
});

console.log('All legacy links have been checked and fixed where necessary.');
