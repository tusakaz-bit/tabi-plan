const axios = require('axios');
const fs = require('fs');

const RAKUTEN_APP_ID = '2d0fb5d11e725c9ab3b42cf9f5bca085';
const RAKUTEN_AFFILIATE_ID = '047ad0f1.183c70cf.047ad0f2.1e4c3769';
const BASE_URL = 'https://tabi-plan.org';

const CITIES = [
    { name: '東京', id: 'tokyo', middle: 'tokyo', small: 'tokyo', detail: 'A' },
    { name: '大阪', id: 'osaka', middle: 'osaka', small: 'shi', detail: 'D' },
    { name: '京都', id: 'kyoto', middle: 'kyoto', small: 'shi', detail: 'B' },
    { name: '札幌', id: 'sapporo', middle: 'hokkaido', small: 'sapporo', detail: 'B' },
    { name: '沖縄', id: 'okinawa', middle: 'okinawa', small: 'nahashi', detail: '' },
    { name: '福岡', id: 'fukuoka', middle: 'hukuoka', small: 'fukuoka', detail: '' }
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
    console.log('Generating daily X post drafts...');
    const results = [];
    
    for (const city of CITIES) {
        const hotel = await getLowestPriceHotel(city);
        if (hotel) results.push({ city, hotel });
    }

    if (results.length === 0) {
        console.log('No hotel data found.');
        return;
    }

    // --- Generate Phrases and Date (Tomorrow) ---
    const now = new Date();
    // 翌日の日付を計算（準備して翌朝投稿することを想定）
    const tomorrow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const jstDate = `${tomorrow.getMonth() + 1}/${tomorrow.getDate()}`;
    
    // ランダムな挨拶文のパターン
    const greetings = [
        "旅プラン厳選の目玉プランです✨",
        "今、チェックすべきお得な宿をピックアップしました。",
        "賢く美しい旅、ここから始めてみませんか？",
        "本日の旅のインスピレーションをお届けします。"
    ];
    const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];

    // --- Generate GitHub Actions Summary (Markdown) ---
    let summaryMarkdown = `
# 📝 本日のX投稿用原稿 (Buffer用)
最新の最安値データに基づいた投稿原稿です。

---

## 1. 【親ツイート】まとめ
\`\`\`text
【${jstDate}の最安値ガイド】
${randomGreeting}
賢く美しい旅の第一歩に。

${results.map(r => `📍${r.city.name}: ${Number(r.hotel.price).toLocaleString()}円〜`).join('\n')}

※投稿時点の価格です
詳細はツリーへ👇
#TabiPlan #最安値
\`\`\`

---

## 2. 【返信ツイート】各都市の詳細
上記の投稿への「返信（スレッド）」として、以下の文章を1つずつ作成してください。
※画像は、各都市の背景画像（${BASE_URL} のもの）を添えるのがおすすめです。

`;

    results.forEach(r => {
        summaryMarkdown += `
### 📍 ${r.city.name} エリア
\`\`\`text
📍【${r.city.name}】本日の最安値

🏨 ${r.hotel.name}
💰 ${Number(r.hotel.price).toLocaleString()}円〜

エリアの魅力やアクセス詳細は、Tabi Planで公開中✨

▼詳細はこちら
${BASE_URL}/${r.city.id}/

#${r.city.name}旅行 #TabiPlan
\`\`\`
`;
    });

    summaryMarkdown += `
---
> [!TIP]
> **Bufferでのコツ**: 「Create Post」で1つ目の文章を入力した後、下にある「Add thread item」を押すと連投が作成できます。
`;

    // Write to GitHub Step Summary
    if (process.env.GITHUB_STEP_SUMMARY) {
        fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summaryMarkdown);
    } else {
        console.log(summaryMarkdown);
    }
}

run();
