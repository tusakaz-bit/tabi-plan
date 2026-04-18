const { TwitterApi } = require('twitter-api-v2');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// API Credentials from environment variables
const client = new TwitterApi({
    appKey: process.env.X_API_KEY,
    appSecret: process.env.X_API_SECRET,
    accessToken: process.env.X_ACCESS_TOKEN,
    accessSecret: process.env.X_ACCESS_TOKEN_SECRET,
});

const RAKUTEN_APP_ID = '2d0fb5d11e725c9ab3b42cf9f5bca085';
const RAKUTEN_AFFILIATE_ID = '047ad0f1.183c70cf.047ad0f2.1e4c3769';

const CITIES = [
    { name: '東京', id: 'tokyo', middle: 'tokyo', small: 'tokyo', detail: 'A', image: 'bg_tokyo_1776258940200.png' },
    { name: '大阪', id: 'osaka', middle: 'osaka', small: 'shi', detail: 'D', image: 'bg_osaka_1775740031415.png' },
    { name: '京都', id: 'kyoto', middle: 'kyoto', small: 'shi', detail: 'B', image: 'bg_kyoto_night_1776398726246.png' },
    { name: '札幌', id: 'sapporo', middle: 'hokkaido', small: 'sapporo', detail: 'B', image: 'bg_sapporo_japanese_dark_hero_1776434374881.png' },
    { name: '沖縄', id: 'okinawa', middle: 'okinawa', small: 'nahashi', detail: '', image: 'bg_okinawa_japanese_dark_hero_beach_1776487605725.png' },
    { name: '福岡', id: 'fukuoka', middle: 'hukuoka', small: 'fukuoka', detail: '', image: 'fukuoka_tower_1775312229586.png' }
];

async function getLowestPriceHotel(city) {
    const url = 'https://app.rakuten.co.jp/services/api/Travel/SimpleHotelSearch/20170426';
    const params = {
        applicationId: RAKUTEN_APP_ID,
        affiliateId: RAKUTEN_AFFILIATE_ID,
        format: 'json',
        largeClassCode: 'japan',
        middleClassCode: city.middle,
        smallClassCode: city.small,
        sort: '+roomCharge'
    };
    if (city.detail) params.detailClassCode = city.detail;

    try {
        const response = await axios.get(url, { params });
        if (response.data && response.data.hotels && response.data.hotels.length > 0) {
            const hotel = response.data.hotels[0].hotel[0].hotelBasicInfo;
            return {
                name: hotel.hotelName,
                price: hotel.hotelMinCharge,
                url: hotel.affiliateUrl
            };
        }
    } catch (error) {
        console.error(`Error fetching data for ${city.name}:`, error.message);
    }
    return null;
}

async function run() {
    console.log('Starting daily X post...');
    const results = [];
    
    for (const city of CITIES) {
        const hotel = await getLowestPriceHotel(city);
        if (hotel) results.push({ city, hotel });
    }

    if (results.length === 0) {
        console.log('No hotel data found. Skipping post.');
        return;
    }

    // --- Create Thread ---
    let summaryText = `【本日の最安値ガイド】\n旅プラン厳選の目玉プランはこちら！\n\n`;
    results.forEach(r => {
        summaryText += `📍${r.city.name}: ${r.hotel.price.toLocaleString()}円〜\n`;
    });
    summaryText += `\n詳細は各ツリーをチェック👇\n#TabiPlan #最安値 #旅行`;

    try {
        const tweets = [];
        tweets.push(summaryText);

        for (const r of results) {
            // 文字数制限を考慮してシャープに
            const tweetText = `【${r.city.name}エリア最安値】\n\n🏨 ${r.hotel.name}\n💰 料金: ${r.hotel.price.toLocaleString()}円〜\n\n「賢く、美しく」旅を楽しみましょう。\n\n▼詳細・予約はこちら\n${r.hotel.url}\n\n#${r.city.name}旅行 #TabiPlan`;
            
            let mediaId = null;
            const imagePath = path.resolve(__dirname, '../', r.city.image);
            if (fs.existsSync(imagePath)) {
                try {
                    console.log(`Uploading media for ${r.city.name}: ${imagePath}`);
                    mediaId = await client.v1.uploadMedia(imagePath);
                } catch (e) {
                    console.error(`Media upload failed for ${r.city.name}:`, e.message);
                }
            }

            tweets.push({ text: tweetText, ...(mediaId ? { media: { media_ids: [mediaId] } } : {}) });
        }

        console.log('Posting thread to X...');
        await client.v2.tweetThread(tweets);
        console.log('Successfully posted thread to X!');
    } catch (error) {
        // 詳細なエラー情報を出力
        if (error.data) {
            console.error('X API Error Detail:', JSON.stringify(error.data, null, 2));
        } else {
            console.error('Error posting to X:', error.message);
        }
        process.exit(1); 
    }
}

run();
