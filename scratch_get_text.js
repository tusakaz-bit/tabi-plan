const axios = require('axios');

const RAKUTEN_APP_ID = '2d0fb5d11e725c9ab3b42cf9f5bca085';
const RAKUTEN_AFFILIATE_ID = '047ad0f1.183c70cf.047ad0f2.1e4c3769';

const CITIES = [
    { name: '東京', middle: 'tokyo', small: 'tokyo', detail: 'A' },
    { name: '大阪', middle: 'osaka', small: 'shi', detail: 'D' },
    { name: '京都', middle: 'kyoto', small: 'shi', detail: 'B' },
    { name: '札幌', middle: 'hokkaido', small: 'sapporo', detail: 'B' },
    { name: '沖縄', middle: 'okinawa', small: 'nahashi', detail: '' },
    { name: '福岡', middle: 'hukuoka', small: 'fukuoka', detail: '' }
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
    } catch (error) {}
    return null;
}

async function run() {
    const results = [];
    for (const city of CITIES) {
        const hotel = await getLowestPriceHotel(city);
        if (hotel) results.push({ city, hotel });
    }

    console.log('--- SUMMARY TWEET ---');
    let summary = `【本日の格安宿ガイド】\n旅プランが厳選した各都市の最安プランはこちら！\n\n`;
    results.forEach(r => {
        summary += `📍${r.city.name}: ${Number(r.hotel.price).toLocaleString()}円〜\n`;
    });
    summary += `\n詳細は各ツリーをチェック👇\n#TabiPlan #最安値 #国内旅行`;
    console.log(summary);

    results.forEach(r => {
        console.log(`\n--- ${r.city.name} TWEET ---`);
        const text = `【${r.city.name}エリア最安値】\n\n🏨 ${r.hotel.name}\n💰 料金: ${Number(r.hotel.price).toLocaleString()}円〜\n\n「賢く、美しく」旅を楽しみましょう。\n\n▼詳細・予約はこちら\n${r.hotel.url}\n\n#${r.city.name}旅行 #TabiPlan`;
        console.log(text);
    });
}

run();
