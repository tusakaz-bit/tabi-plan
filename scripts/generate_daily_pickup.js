const fs = require('fs');
const path = require('path');
const { generateArticle, findPremiumHotels } = require('./generate_pickup');

const CITIES = [
    { name: '東京', en: 'tokyo',   middle: 'tokyo',   small: 'tokyo',   detail: 'A' },
    { name: '大阪', en: 'osaka',   middle: 'osaka',   small: 'shi',     detail: 'D' },
    { name: '京都', en: 'kyoto',   middle: 'kyoto',   small: 'shi',     detail: 'B' },
    { name: '札幌', en: 'sapporo', middle: 'hokkaido', small: 'sapporo', detail: 'B' },
    { name: '沖縄', en: 'okinawa', middle: 'okinawa', small: 'nahashi', detail: '' },
    { name: '福岡', en: 'fukuoka', middle: 'hukuoka', small: 'fukuoka', detail: '' }
];

async function updateIndexHtml(articleData, city) {
    const indexPath = path.join(__dirname, '../index.html');
    const archivePath = path.join(__dirname, '../pickup/index.html');
    
    // トップページの更新
    let indexHtml = fs.readFileSync(indexPath, 'utf8');
    const newPickupHtml = `
                <a href="pickup/${articleData.fileName}" class="pickup-card-link">
                    <div class="pickup-card">
                        <div class="pickup-image" style="background-image: url('${articleData.info.hotelImageUrl}')">
                            <div class="rakuten-credit">Rakuten Travel</div>
                        </div>
                        <div class="pickup-info">
                            <span class="pickup-tag">PICKUP - ${city.name}</span>
                            <h4 class="pickup-title">${articleData.info.hotelName}</h4>
                            <p class="pickup-description">${articleData.data['{{CATCHCOPY}}']}</p>
                            <span class="read-more">記事を詳しく読む <i class="fas fa-arrow-right"></i></span>
                        </div>
                    </div>
                </a>`;

    const pickupRegex = /<a href="pickup\/.*?class="pickup-card-link">[\s\S]*?<\/a>/i;
    indexHtml = indexHtml.replace(pickupRegex, newPickupHtml.trim());
    fs.writeFileSync(indexPath, indexHtml);
    console.log('Successfully updated index.html');

    // 過去のピックアップ一覧（pickup/index.html）の更新
    let archiveHtml = fs.readFileSync(archivePath, 'utf8');
    const newArchiveCard = `
            <!-- ${articleData.info.hotelName} -->
            <a href="${articleData.fileName}" class="archive-card">
                <div class="archive-image" style="background-image: url('${articleData.info.hotelImageUrl}')">
                    <div class="rakuten-credit">Rakuten Travel</div>
                </div>
                <div class="archive-content">
                    <span class="archive-date">${articleData.data['{{PUBLISH_DATE}}'].replace(/-/g, '.')} 掲載</span>
                    <h3 class="archive-title">${articleData.info.hotelName}</h3>
                    <p style="color: rgba(255,255,255,0.5); font-size: 0.9rem; margin-top: 1rem;">${articleData.data['{{CATCHCOPY}}']}</p>
                </div>
            </a>`;

    const gridStartTag = '<div class="archive-grid">';
    archiveHtml = archiveHtml.replace(gridStartTag, `${gridStartTag}\n${newArchiveCard}`);
    fs.writeFileSync(archivePath, archiveHtml);
    console.log('Successfully updated pickup/index.html');

    // サイトマップ（sitemap.xml）の更新
    const sitemapPath = path.join(__dirname, '../sitemap.xml');
    let sitemapHtml = fs.readFileSync(sitemapPath, 'utf8');
    const newSitemapUrl = `  <url>
    <loc>https://tabi-plan.org/pickup/${articleData.fileName}</loc>
    <lastmod>${articleData.data['{{PUBLISH_DATE}}']}</lastmod>
    <priority>0.8</priority>
  </url>`;

    // </urlset>の直前に挿入する
    sitemapHtml = sitemapHtml.replace('</urlset>', `${newSitemapUrl}\n</urlset>`);
    fs.writeFileSync(sitemapPath, sitemapHtml);
    console.log('Successfully updated sitemap.xml');
}

async function run() {
    console.log('Generating daily pickup article...');
    
    // ランダムな都市を選択
    const city = CITIES[Math.floor(Math.random() * CITIES.length)];
    console.log(`Selected city: ${city.name}`);

    // その都市の高級ホテル（評価4.0以上）を取得
    const premiumHotels = await findPremiumHotels(city);
    
    if (premiumHotels && premiumHotels.length > 0) {
        // ランダムに1つ選ぶ
        const selectedHotel = premiumHotels[Math.floor(Math.random() * premiumHotels.length)];
        const hotelNo = selectedHotel.hotel[0].hotelBasicInfo.hotelNo;
        
        // 記事を生成（都市の英語名をスラグに使用）
        const articleData = await generateArticle(hotelNo, `本日の注目宿 - ${city.name}`, city.en);
        
        if (articleData) {
            // トップページを更新
            await updateIndexHtml(articleData, city);
        }
    } else {
        console.log('No premium hotels found for the selected city.');
    }
}

run();
