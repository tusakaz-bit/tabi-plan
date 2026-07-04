const fs = require('fs');
const path = require('path');

const CITY_BG_FILENAME = {
    tokyo: "bg_tokyo_1776258940200.png",
    osaka: "bg_osaka_1775740031415.png",
    kyoto: "bg_kyoto_night_1776398726246.png",
    sapporo: "bg_sapporo_japanese_dark_hero_1776434374881.png",
    okinawa: "bg_okinawa_japanese_dark_hero_beach_1776487605725.png",
    fukuoka: "bg_fukuoka.png"
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
