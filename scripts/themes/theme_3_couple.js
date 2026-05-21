const { RAKUTEN_APP_ID, RAKUTEN_AFFILIATE_ID, CITIES, fetchRakutenApi, generateHtmlBody, getDateString } = require('../utils');

async function generate() {
    const results = [];
    const url = 'https://openapi.rakuten.co.jp/services/api/Travel/KeywordHotelSearch/20170426';

    for (const city of CITIES) {
        const params = {
            applicationId: RAKUTEN_APP_ID,
            affiliateId: RAKUTEN_AFFILIATE_ID,
            format: 'json',
            keyword: `${city.keyword} 繧ｫ繝・・繝ｫ`,
            middleClassCode: city.middle,
            smallClassCode: city.small,
            hits: 30
        };
        if (city.detail) params.detailClassCode = city.detail;

        const hotel = await fetchRakutenApi(url, params);
        if (hotel) results.push({ city, hotel });
    }

    const title = `縲・{getDateString()}迚医代ョ繝ｼ繝医↓繧りｨ伜ｿｵ譌･縺ｫ繧ゑｼ∽ｻ頑律縺ｮ繧ｫ繝・・繝ｫ蜷代￠繝励Λ繝ｳ迚ｹ髮・- Tabi Plan`;
    const intro = `Tabi Plan AI縺悟宍驕ｸ縺励◆縲∵悽譌･縺ｮ蜈ｨ蝗ｽ荳ｻ隕√お繝ｪ繧｢縺ｮ縲後き繝・・繝ｫ蜷代￠繝励Λ繝ｳ縲肴怙螳牙､繧偵♀螻翫￠縺励∪縺吶・br>螟ｧ蛻・↑莠ｺ縺ｨ縺ｮ迚ｹ蛻･縺ｪ譎る俣繧偵√♀蠕励↑繝励Λ繝ｳ縺ｧ貅蝟ｫ縺励※縺上□縺輔＞縲Ａ;
    const body = generateHtmlBody(intro, results);
    const tags = ["蝗ｽ蜀・羅陦・, "繝帙ユ繝ｫ", "讌ｽ螟ｩ繝医Λ繝吶Ν", "譛螳牙､", "繧ｫ繝・・繝ｫ", "險伜ｿｵ譌･譌・｡・, "莠御ｺｺ譌・, "TabiPlan"];

    return { title, body, tags };
}

module.exports = { generate };
