const { RAKUTEN_APP_ID, RAKUTEN_AFFILIATE_ID, CITIES, fetchRakutenApi, generateHtmlBody, getDateString } = require('../utils');

async function generate() {
    const results = [];
    const url = 'https://app.rakuten.co.jp/services/api/Travel/KeywordHotelSearch/20170426';

    for (const city of CITIES) {
        const params = {
            applicationId: RAKUTEN_APP_ID,
            affiliateId: RAKUTEN_AFFILIATE_ID,
            format: 'json',
            keyword: '連泊',
            middleClassCode: city.middle,
            smallClassCode: city.small,
            hits: 30
        };
        if (city.detail) params.detailClassCode = city.detail;

        const hotel = await fetchRakutenApi(url, params);
        if (hotel) results.push({ city, hotel });
    }

    const title = `【${getDateString()}版】じっくり旅するなら！連泊おすすめプラン特集 - Tabi Plan`;
    const intro = `Tabi Plan AIが厳選した、本日の全国主要エリアの「連泊プラン」最安値をお届けします。<br>ワーケーションや長期滞在でお得に泊まれるプランを活用して、ゆっくりと街の魅力を発見してみませんか？`;
    const body = generateHtmlBody(intro, results);
    const tags = ["国内旅行", "ホテル", "楽天トラベル", "最安値", "連泊", "ワーケーション", "長期滞在", "TabiPlan"];

    return { title, body, tags };
}

module.exports = { generate };
