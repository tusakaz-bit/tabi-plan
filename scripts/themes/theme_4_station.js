const { RAKUTEN_APP_ID, RAKUTEN_AFFILIATE_ID, CITIES, fetchRakutenApi, generateHtmlBody, getDateString } = require('../utils');

async function generate() {
    const articles = [];
    const url = 'https://openapi.rakuten.co.jp/engine/api/Travel/KeywordHotelSearch/20170426';

    for (const city of CITIES) {
        const params = {
            applicationId: RAKUTEN_APP_ID,
            accessKey: 'pk_5MWJwVdIjLhdoj7Zg1RriahaHY2JahwsKyl6c3KDRkG',
            affiliateId: RAKUTEN_AFFILIATE_ID,
            format: 'json',
            keyword: city.keyword + ' 駅チカ',
            middleClassCode: city.middle,
            smallClassCode: city.small,
            hits: 30
        };
        if (city.detail) params.detailClassCode = city.detail;

        const hotels = await fetchRakutenApi(url, params, 3.8, 'review', 3);
        if (hotels && hotels.length > 0) {
            const title = `【${getDateString()}版・${city.name}】駅チカで便利！アクセス抜群のホテル厳選3施設 - Tabi Plan`;
            const intro = `Tabi Plan AIが厳選した、本日の${city.name}エリアの「駅チカ・アクセス抜群」の高評価ホテルをお届けします。<br>観光の拠点やビジネスでの利用に非常に便利です。`;
            const body = generateHtmlBody(city, intro, hotels);
            const tags = ["国内旅行", "ホテル", "楽天トラベル", "駅チカ", "ビジネスホテル", city.name, "TabiPlan"];
            articles.push({ city: city.id, title, body, tags });
        }
    }

    return articles;
}

module.exports = { generate };
