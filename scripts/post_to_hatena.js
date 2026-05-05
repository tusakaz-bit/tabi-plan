const axios = require('axios');
const fs = require('fs');
const crypto = require('crypto');

// 環境変数から認証情報を取得（前後の余計な空白や改行を自動で取り除く処理を追加）
const HATENA_ID = (process.env.HATENA_ID || '').trim();
const HATENA_BLOG_ID = (process.env.HATENA_BLOG_ID || '').trim();
const HATENA_API_KEY = (process.env.HATENA_API_KEY || '').trim();

const RAKUTEN_APP_ID = '2d0fb5d11e725c9ab3b42cf9f5bca085';
const RAKUTEN_AFFILIATE_ID = '047ad0f1.183c70cf.047ad0f2.1e4c3769';

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
                url: hotel.affiliateUrl,
                imageUrl: hotel.hotelImageUrl
            };
        }
    } catch (error) {
        console.error(`Error fetching data for ${city.name}:`, error.message);
    }
    return null;
}

// Basic認証のヘッダーを生成
function getBasicAuthHeader() {
    const credentials = Buffer.from(`${HATENA_ID}:${HATENA_API_KEY}`, 'utf-8').toString('base64');
    return { 'Authorization': `Basic ${credentials}` };
}

// WSSE認証のヘッダーを生成
function getWsseAuthHeaders() {
    const nonceBytes = crypto.randomBytes(20);
    const nonceBase64 = nonceBytes.toString('base64');
    const created = new Date().toISOString();
    const digest = crypto.createHash('sha1')
        .update(Buffer.concat([nonceBytes, Buffer.from(created), Buffer.from(HATENA_API_KEY)]))
        .digest('base64');
    const wsseHeader = `UsernameToken Username="${HATENA_ID}", PasswordDigest="${digest}", Nonce="${nonceBase64}", Created="${created}"`;
    return {
        'X-WSSE': wsseHeader,
        'Authorization': 'WSSE profile="UsernameToken"'
    };
}

async function testAuth() {
    const url = `https://blog.hatena.ne.jp/${HATENA_ID}/${HATENA_BLOG_ID}/atom/entry`;
    
    // デバッグ用ログ（値はGitHubが自動マスクするので安全）
    console.log(`--- Debug Info ---`);
    console.log(`HATENA_ID length: ${HATENA_ID.length}, value: [${HATENA_ID}]`);
    console.log(`HATENA_BLOG_ID length: ${HATENA_BLOG_ID.length}, value: [${HATENA_BLOG_ID}]`);
    console.log(`HATENA_API_KEY length: ${HATENA_API_KEY.length}, value: [${HATENA_API_KEY}]`);
    console.log(`Full URL: ${url}`);
    console.log(`--- End Debug ---`);

    // まずBasic認証でGETリクエストを試す（記事一覧の取得）
    console.log('Testing Basic Auth (GET)...');
    try {
        const response = await axios.get(url, {
            headers: { ...getBasicAuthHeader(), 'Accept': 'application/xml' }
        });
        console.log('Basic Auth GET succeeded:', response.status);
        return 'basic';
    } catch (error) {
        console.log('Basic Auth GET failed:', error.response ? `${error.response.status}` : error.message);
    }

    // WSSEでGETリクエストを試す
    console.log('Testing WSSE Auth (GET)...');
    try {
        const response = await axios.get(url, {
            headers: { ...getWsseAuthHeaders(), 'Accept': 'application/xml' }
        });
        console.log('WSSE Auth GET succeeded:', response.status);
        return 'wsse';
    } catch (error) {
        console.log('WSSE Auth GET failed:', error.response ? `${error.response.status}` : error.message);
    }

    return null;
}

async function postToHatena(title, body, authMethod) {
    const url = `https://blog.hatena.ne.jp/${HATENA_ID}/${HATENA_BLOG_ID}/atom/entry`;
    
    // AtomPub用のXMLを作成
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<entry xmlns="http://www.w3.org/2005/Atom"
       xmlns:app="http://www.w3.org/2007/app">
  <title>${title}</title>
  <content type="text/html"><![CDATA[
${body}
  ]]></content>
  <app:control>
    <app:draft>yes</app:draft>
  </app:control>
</entry>`;

    const authHeaders = authMethod === 'basic' ? getBasicAuthHeader() : getWsseAuthHeaders();

    try {
        const response = await axios.post(url, xml, {
            headers: {
                'Content-Type': 'application/xml',
                ...authHeaders
            }
        });
        console.log('Successfully posted to Hatena Blog (Draft):', response.status);
    } catch (error) {
        console.error('Error posting to Hatena Blog:', error.response ? error.response.status : '', error.response ? error.response.data : error.message);
        process.exit(1);
    }
}

async function run() {
    console.log('Starting Hatena Blog auto-post...');

    // 認証テスト
    const authMethod = await testAuth();
    if (!authMethod) {
        console.error('Both Basic and WSSE authentication failed. Please verify your HATENA_ID, HATENA_BLOG_ID, and HATENA_API_KEY secrets.');
        process.exit(1);
    }
    console.log(`Using ${authMethod} authentication.`);

    const results = [];
    for (const city of CITIES) {
        const hotel = await getLowestPriceHotel(city);
        if (hotel) results.push({ city, hotel });
    }

    if (results.length === 0) {
        console.log('No hotel data found.');
        return;
    }

    const now = new Date();
    const jstDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
    const dateStr = `${jstDate.getFullYear()}年${jstDate.getMonth() + 1}月${jstDate.getDate()}日`;
    
    const title = `【${dateStr}版】全国人気エリアの最安値ホテルプランまとめ - Tabi Plan`;
    
    let body = `<p>Tabi Plan AIが厳選した、本日の全国主要エリア最安値宿泊プランをお届けします。</p>
<p>賢く、美しい旅の計画にお役立てください。</p>
<hr />`;

    results.forEach(r => {
        body += `
<h2 style="border-left: 5px solid #D4AF37; padding-left: 15px; margin-top: 30px;">📍 ${r.city.name} エリア</h2>
<div style="display: flex; flex-wrap: wrap; gap: 20px; align-items: center; background: #f9f9f9; padding: 20px; border-radius: 8px;">
    <div style="flex: 1; min-width: 200px;">
        <img src="${r.hotel.imageUrl}" alt="${r.hotel.name}" style="width: 100%; border-radius: 4px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);" />
    </div>
    <div style="flex: 2; min-width: 250px;">
        <h3 style="margin-top: 0;">${r.hotel.name}</h3>
        <p style="font-size: 1.2rem; color: #d32f2f; font-weight: bold;">最安料金：${Number(r.hotel.price).toLocaleString()}円〜</p>
        <p><a href="${r.hotel.url}" target="_blank" style="display: inline-block; background: #D4AF37; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">空室状況・詳細を見る</a></p>
    </div>
</div>
`;
    });

    body += `
<hr />
<p>※表示価格は投稿時点のものです。最新の情報はリンク先をご確認ください。</p>
<p>その他のエリアや観光情報は、<a href="https://tabi-plan.org/">Tabi Plan公式サイト</a>をご覧ください。</p>`;

    await postToHatena(title, body, authMethod);
}

run();
