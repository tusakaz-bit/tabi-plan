const fs = require('fs');
const path = require('path');
const { generateArticle, findPremiumHotels } = require('./generate_pickup');
const { HistoryManager } = require('./history_manager');

const historyManager = new HistoryManager();

const CITIES = [
    { name: '東京', en: 'tokyo',   middle: 'tokyo',   small: 'tokyo',   detail: 'A' },
    { name: '大阪', en: 'osaka',   middle: 'osaka',   small: 'shi',     detail: 'D' },
    { name: '京都', en: 'kyoto',   middle: 'kyoto',   small: 'shi',     detail: 'B' },
    { name: '札幌', en: 'sapporo', middle: 'hokkaido', small: 'sapporo', detail: 'B' },
    { name: '沖縄', en: 'okinawa', middle: 'okinawa', small: 'nahashi', detail: '' },
    { name: '福岡', en: 'fukuoka', middle: 'hukuoka', small: 'fukuoka', detail: '' },
    { name: '金沢', en: 'kanazawa', middle: 'ishikawa', small: 'kanazawa', detail: '' }
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
            <a href="${articleData.fileName}" class="archive-card" data-city="${city.en}">
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
    
    // 都市をランダムにシャッフルして30日以内に投稿されていないホテルを探索
    const shuffledCities = [...CITIES].sort(() => Math.random() - 0.5);
    
    let chosenHotel = null;
    let chosenCity = null;
    let fallbackHotel = null;
    let fallbackCity = null;

    for (const city of shuffledCities) {
        console.log(`Checking candidate hotels for city: ${city.name}`);
        const premiumHotels = await findPremiumHotels(city);
        if (!premiumHotels || premiumHotels.length === 0) continue;

        // 30日以内の重複を除外して選定
        const selection = historyManager.selectHotelWithInterval(
            premiumHotels,
            h => ({
                hotelNo: h.hotel[0].hotelBasicInfo.hotelNo,
                hotelName: h.hotel[0].hotelBasicInfo.hotelName
            }),
            30,
            'pickup'
        );

        if (selection.selectedHotel && !selection.fallbackUsed) {
            chosenHotel = selection.selectedHotel;
            chosenCity = city;
            console.log(`✅ [Deduplication] Selected ${chosenHotel.hotel[0].hotelBasicInfo.hotelName} for ${city.name} (${selection.reason})`);
            break;
        } else if (selection.selectedHotel && !fallbackHotel) {
            // 直近30日以内のホテルしかない場合のフォールバック候補として最古のホテルを保持
            fallbackHotel = selection.selectedHotel;
            fallbackCity = city;
        }
    }

    const targetHotel = chosenHotel || fallbackHotel;
    const targetCity = chosenCity || fallbackCity;

    if (targetHotel && targetCity) {
        const hotelBasicInfo = targetHotel.hotel[0].hotelBasicInfo;
        const hotelNo = hotelBasicInfo.hotelNo;
        const hotelName = hotelBasicInfo.hotelName;

        if (!chosenHotel) {
            console.warn(`⚠️ [Deduplication] All candidates within 30 days. Fallback to oldest: ${hotelName} (${targetCity.name})`);
        }

        // 記事を生成（都市の英語名をスラグに使用）
        const articleData = await generateArticle(hotelNo, `本日の注目宿 - ${targetCity.name}`, targetCity.en);
        
        if (articleData) {
            // トップページ・一覧・サイトマップを更新
            await updateIndexHtml(articleData, targetCity);

            // 投稿履歴を post_history.json に記録
            historyManager.recordPost({
                hotelNo: hotelNo,
                hotelName: hotelName,
                category: 'pickup'
            });
        }
    } else {
        console.log('No premium hotels found across all cities.');
    }
}

run();