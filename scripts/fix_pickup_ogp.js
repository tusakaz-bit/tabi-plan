const fs = require('fs');
const path = require('path');

const CITY_BG_FILENAME = {
    tokyo: "bg_tokyo_new.jpg",
    osaka: "bg_osaka_new.jpg",
    kyoto: "bg_kyoto_new.jpg",
    sapporo: "bg_sapporo_new.jpg",
    okinawa: "bg_okinawa_new.jpg",
    fukuoka: "bg_fukuoka_new.jpg"
};

const pickupDir = path.join(__dirname, '../pickup');
const files = fs.readdirSync(pickupDir).filter(f => f.endsWith('.html') && f !== 'template.html');

for (const file of files) {
    const filePath = path.join(pickupDir, file);
    let html = fs.readFileSync(filePath, 'utf8');

    // ファイル名から都市を推測（例: 2026-07-03-harumi-tokyo.html）
    let matchedCity = null;
    for (const city of Object.keys(CITY_BG_FILENAME)) {
        if (file.includes(city)) {
            matchedCity = city;
            break;
        }
    }

    let ogImage = 'https://tabi-plan.org/favicon.svg'; // デフォルト
    if (matchedCity) {
        ogImage = `https://tabi-plan.org/${CITY_BG_FILENAME[matchedCity]}`;
    }

    // og:imageとtwitter:imageの古い楽天URL（https://img.travel.rakuten.co.jp/...）を書き換え
    // JSON-LDの中身も変わるかもしれないが、とりあえず meta タグだけ確実に書き換える
    html = html.replace(/<meta property="og:image" content="https:\/\/img\.travel\.rakuten\.co\.jp[^"]+">/g, 
                        `<meta property="og:image" content="${ogImage}">`);
                        
    html = html.replace(/<meta name="twitter:image" content="https:\/\/img\.travel\.rakuten\.co\.jp[^"]+">/g, 
                        `<meta name="twitter:image" content="${ogImage}">`);

    fs.writeFileSync(filePath, html);
    console.log(`Updated OGP for: ${file} -> ${ogImage}`);
}
console.log('Done!');
