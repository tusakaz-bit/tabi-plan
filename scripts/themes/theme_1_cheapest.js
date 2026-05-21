const { RAKUTEN_APP_ID, RAKUTEN_AFFILIATE_ID, CITIES, fetchRakutenApi, generateHtmlBody, getDateString } = require('../utils');

async function generate() {
    const results = [];
    const url = 'https://openapi.rakuten.co.jp/services/api/Travel/KeywordHotelSearch/20170426';

    for (const city of CITIES) {
        const params = {
            applicationId: RAKUTEN_APP_ID,
            affiliateId: RAKUTEN_AFFILIATE_ID,
            format: 'json',
            keyword: city.keyword,
            middleClassCode: city.middle,
            smallClassCode: city.small,
            hits: 30 // 隍・焚蜿門ｾ励＠縺ｦ譛螳牙､繧偵た繝ｼ繝・        };
        if (city.detail) params.detailClassCode = city.detail;

        const hotel = await fetchRakutenApi(url, params);
        if (hotel) results.push({ city, hotel });
    }

    const title = `縲・{getDateString()}迚医大・蝗ｽ譛螳牙､繝帙ユ繝ｫ繝励Λ繝ｳ縺ｾ縺ｨ繧・- Tabi Plan`;
    const intro = `Tabi Plan AI縺悟宍驕ｸ縺励◆縲∵悽譌･縺ｮ蜈ｨ蝗ｽ荳ｻ隕√お繝ｪ繧｢縲梧怙螳牙､縲榊ｮｿ豕翫・繝ｩ繝ｳ繧偵♀螻翫￠縺励∪縺吶・br>雉｢縺上√♀蠕励↑譌・・險育判縺ｫ縺雁ｽｹ遶九※縺上□縺輔＞縲Ａ;
    const body = generateHtmlBody(intro, results);
    const tags = ["蝗ｽ蜀・羅陦・, "繝帙ユ繝ｫ", "讌ｽ螟ｩ繝医Λ繝吶Ν", "譛螳牙､", "譬ｼ螳画羅陦・, "TabiPlan"];

    return { title, body, tags };
}

module.exports = { generate };
