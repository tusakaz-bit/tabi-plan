const { RAKUTEN_APP_ID, RAKUTEN_AFFILIATE_ID, CITIES, fetchRakutenApi, generateHtmlBody, getDateString } = require('../utils');

async function generate() {
    const results = [];
    const url = 'https://app.rakuten.co.jp/services/api/Travel/KeywordHotelSearch/20170426';

    for (const city of CITIES) {
        const params = {
            applicationId: RAKUTEN_APP_ID,
            affiliateId: RAKUTEN_AFFILIATE_ID,
            format: 'json',
            keyword: '露天風呂',
            middleClassCode: city.middle,
            smallClassCode: city.small,
            hits: 30
        };
        if (city.detail) params.detailClassCode = city.detail;

        const hotel = await fetchRakutenApi(url, params);
        if (hotel) results.push({ city, hotel });
    }

    const title = `【${getDateString()}版】週末前に癒しを！今日の露天風呂付きホテル特集 - Tabi Plan`;
    const intro = `Tabi Plan AIが厳選した、本日の全国主要エリアの「露天風呂・温泉付きプラン」最安値をお届けします。<br>日々の疲れを癒やす、極上のリラックスタイムをお過ごしください。`;
    const body = generateHtmlBody(intro, results);
    const tags = ["国内旅行", "ホテル", "楽天トラベル", "最安値", "温泉", "露天風呂", "癒し旅", "TabiPlan"];

    return { title, body, tags };
}

module.exports = { generate };
