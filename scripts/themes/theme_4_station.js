const { RAKUTEN_APP_ID, RAKUTEN_AFFILIATE_ID, CITIES, fetchRakutenApi, generateHtmlBody, getDateString } = require('../utils');

async function generate() {
    const results = [];
    const url = 'https://app.rakuten.co.jp/services/api/Travel/KeywordHotelSearch/20170426';

    for (const city of CITIES) {
        const params = {
            applicationId: RAKUTEN_APP_ID,
            affiliateId: RAKUTEN_AFFILIATE_ID,
            format: 'json',
            keyword: `${city.keyword} 駅近`,
            middleClassCode: city.middle,
            smallClassCode: city.small,
            hits: 30
        };
        if (city.detail) params.detailClassCode = city.detail;

        const hotel = await fetchRakutenApi(url, params);
        if (hotel) results.push({ city, hotel });
    }

    const title = `【${getDateString()}版】アクセス抜群！今日の駅チカホテル特集 - Tabi Plan`;
    const intro = `Tabi Plan AIが厳選した、本日の全国主要エリアの「駅近・駅チカプラン」最安値をお届けします。<br>重い荷物があっても安心！移動に便利な好立地ホテルで快適な旅を。`;
    const body = generateHtmlBody(intro, results);
    const tags = ["国内旅行", "ホテル", "楽天トラベル", "最安値", "駅近", "駅チカ", "交通便利", "TabiPlan"];

    return { title, body, tags };
}

module.exports = { generate };
