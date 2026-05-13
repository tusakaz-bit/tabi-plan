const fs = require('fs');
const path = require('path');
const { generateArticle, findPremiumHotels } = require('./generate_pickup');

const CITIES = [
    { name: '東京', middle: 'tokyo', small: 'tokyo', detail: 'A' },
    { name: '大阪', middle: 'osaka', small: 'shi', detail: 'D' },
    { name: '京都', middle: 'kyoto', small: 'shi', detail: 'B' },
    { name: '札幌', middle: 'hokkaido', small: 'sapporo', detail: 'B' },
    { name: '沖縄', middle: 'okinawa', small: 'nahashi', detail: '' },
    { name: '福岡', middle: 'hukuoka', small: 'fukuoka', detail: '' }
];

async function updateIndexHtml(articleData, city) {
    const indexPath = path.join(__dirname, '../index.html');
    let html = fs.readFileSync(indexPath, 'utf8');

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

    // index.htmlのピックアップ部分を正規表現で置き換える
    const pickupRegex = /<a href="pickup\/.*?class="pickup-card-link">[\s\S]*?<\/a>/i;
    html = html.replace(pickupRegex, newPickupHtml.trim());

    fs.writeFileSync(indexPath, html);
    console.log('Successfully updated index.html with new pickup article.');
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
        
        // 記事を生成
        const articleData = await generateArticle(hotelNo, `本日の注目宿 - ${city.name}`);
        
        if (articleData) {
            // トップページを更新
            await updateIndexHtml(articleData, city);
        }
    } else {
        console.log('No premium hotels found for the selected city.');
    }
}

run();
