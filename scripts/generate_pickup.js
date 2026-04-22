const axios = require('axios');
const fs = require('fs');
const path = require('path');

const RAKUTEN_APP_ID = '2d0fb5d11e725c9ab3b42cf9f5bca085';
const RAKUTEN_AFFILIATE_ID = '047ad0f1.183c70cf.047ad0f2.1e4c3769';

const TEMPLATE_PATH = path.join(__dirname, '../pickup/template.html');

async function getHotelDetail(hotelNo) {
    const url = 'https://app.rakuten.co.jp/services/api/Travel/HotelDetailSearch/20170426';
    const params = {
        applicationId: RAKUTEN_APP_ID,
        affiliateId: RAKUTEN_AFFILIATE_ID,
        format: 'json',
        hotelNo: hotelNo
    };

    try {
        const response = await axios.get(url, { params });
        if (response.data && response.data.hotels) {
            return response.data.hotels[0].hotel[0];
        }
    } catch (error) {
        console.error('Error fetching hotel detail:', error.message);
    }
    return null;
}

// AIが宿を「選ぶ」ための簡易的なデモ関数（今後拡張可能）
async function findPremiumHotels(middleClassCode) {
    const url = 'https://app.rakuten.co.jp/services/api/Travel/SimpleHotelSearch/20170426';
    const params = {
        applicationId: RAKUTEN_APP_ID,
        format: 'json',
        largeClassCode: 'japan',
        middleClassCode: middleClassCode,
        sort: '-reviewAverage' // 評価が高い順
    };

    try {
        const response = await axios.get(url, { params });
        return response.data.hotels.filter(h => h.hotel[0].hotelBasicInfo.reviewAverage >= 4.0);
    } catch (error) {
        console.error('Error finding hotels:', error.message);
        return [];
    }
}

async function generateArticle(hotelNo, category = "今週のピックアップ") {
    const hotel = await getHotelDetail(hotelNo);
    if (!hotel) return;

    const info = hotel.hotelBasicInfo;
    const rating = info.reviewAverage || '4.0';
    
    let html = fs.readFileSync(TEMPLATE_PATH, 'utf8');

    // 置換処理
    const data = {
        '{{HOTEL_NAME}}': info.hotelName,
        '{{CATEGORY_NAME}}': category,
        '{{HERO_IMAGE}}': info.hotelImageUrl,
        '{{CATCHCOPY}}': info.hotelSpecial || '非日常を楽しむ、極上の滞在を。',
        '{{SMART_POINT}}': `評価${rating}の高水準でありながら、周辺相場と比較しても納得のプライス。`,
        '{{BEAUTIFUL_POINT}}': info.hotelSpecial || '洗練された空間デザインと、細やかなおもてなし。',
        '{{LOCATION_POINT}}': info.access || '主要駅からのアクセスも良好で、観光の拠点に最適。',
        '{{DETAILED_DESCRIPTION}}': `<p>${info.hotelInformationEmail || '詳しい情報は予約ページをご確認ください。'}</p><p>旅の疲れを癒やす心地よい空間。モダンなインテリアと落ち着いた照明が、上質なひとときを演出します。</p>`,
        '{{ADDRESS}}': `${info.address1}${info.address2}`,
        '{{MIN_CHARGE}}': `${Number(info.hotelMinCharge).toLocaleString()}円〜`,
        '{{RATING}}': rating,
        '{{FACILITIES}}': 'Wi-Fi, レストラン, 大浴場, ルームサービス等',
        '{{AFFILIATE_URL}}': info.affiliateUrl
    };

    for (const [key, value] of Object.entries(data)) {
        html = html.split(key).join(value);
    }

    const fileName = `${new Date().toISOString().split('T')[0]}-${info.hotelName.replace(/\s+/g, '_')}.html`;
    const outputPath = path.join(__dirname, '../pickup/', fileName);
    
    fs.writeFileSync(outputPath, html);
    console.log(`Successfully generated article: ${fileName}`);
}

// 実行例（もしホテルIDが分かればここに入れる）
// generateArticle(12345);

module.exports = { generateArticle, findPremiumHotels };
