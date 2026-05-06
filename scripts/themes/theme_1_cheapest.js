const { RAKUTEN_APP_ID, RAKUTEN_AFFILIATE_ID, CITIES, fetchRakutenApi, generateHtmlBody, getDateString } = require('../utils');

async function generate() {
    const results = [];
    const url = 'https://app.rakuten.co.jp/services/api/Travel/SimpleHotelSearch/20170426';

    for (const city of CITIES) {
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

        const hotel = await fetchRakutenApi(url, params);
        if (hotel) results.push({ city, hotel });
    }

    const title = `【${getDateString()}版】全国最安値ホテルプランまとめ - Tabi Plan`;
    const intro = `Tabi Plan AIが厳選した、本日の全国主要エリア「最安値」宿泊プランをお届けします。<br>賢く、お得な旅の計画にお役立てください。`;
    const body = generateHtmlBody(intro, results);
    const tags = ["国内旅行", "ホテル", "楽天トラベル", "最安値", "格安旅行", "TabiPlan"];

    return { title, body, tags };
}

module.exports = { generate };
