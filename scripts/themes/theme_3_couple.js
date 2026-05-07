const { RAKUTEN_APP_ID, RAKUTEN_AFFILIATE_ID, CITIES, fetchRakutenApi, generateHtmlBody, getDateString } = require('../utils');

async function generate() {
    const results = [];
    const url = 'https://app.rakuten.co.jp/services/api/Travel/KeywordHotelSearch/20170426';

    for (const city of CITIES) {
        const params = {
            applicationId: RAKUTEN_APP_ID,
            affiliateId: RAKUTEN_AFFILIATE_ID,
            format: 'json',
            keyword: `${city.keyword} カップル`,
            middleClassCode: city.middle,
            smallClassCode: city.small,
            hits: 30
        };
        if (city.detail) params.detailClassCode = city.detail;

        const hotel = await fetchRakutenApi(url, params);
        if (hotel) results.push({ city, hotel });
    }

    const title = `【${getDateString()}版】デートにも記念日にも！今日のカップル向けプラン特集 - Tabi Plan`;
    const intro = `Tabi Plan AIが厳選した、本日の全国主要エリアの「カップル向けプラン」最安値をお届けします。<br>大切な人との特別な時間を、お得なプランで満喫してください。`;
    const body = generateHtmlBody(intro, results);
    const tags = ["国内旅行", "ホテル", "楽天トラベル", "最安値", "カップル", "記念日旅行", "二人旅", "TabiPlan"];

    return { title, body, tags };
}

module.exports = { generate };
