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
            keyword: city.keyword + ' 連泊',
            middleClassCode: city.middle,
            smallClassCode: city.small,
            hits: 30
        };
        if (city.detail) params.detailClassCode = city.detail;

        const hotels = await fetchRakutenApi(url, params, 3.5, 'cheap', 3);
        if (hotels && hotels.length > 0) {
            const title = `【${getDateString()}版・${city.name}】長期滞在・ワーケーションにおすすめ！連泊プラン厳選3施設 - Tabi Plan`;
            const intro = `Tabi Plan AIが厳選した、本日の${city.name}エリアの「長期滞在・連泊」向け高コスパホテルをお届けします。<br>ワーケーションや出張、じっくり観光したい方に最適です。`;
            const body = generateHtmlBody(city, intro, hotels);
            const tags = ["国内旅行", "ホテル", "楽天トラベル", "ワーケーション", "長期滞在", city.name, "TabiPlan"];
            articles.push({ city: city.id, title, body, tags });
        }
    }

    return articles;
}

module.exports = { generate };
