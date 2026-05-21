const { RAKUTEN_APP_ID, RAKUTEN_AFFILIATE_ID, CITIES, fetchRakutenApi, generateHtmlBody, getDateString } = require('../utils');

async function generate() {
    const results = [];
    const url = 'https://openapi.rakuten.co.jp/services/api/Travel/KeywordHotelSearch/20170426';

    for (const city of CITIES) {
        const params = {
            applicationId: RAKUTEN_APP_ID,
            affiliateId: RAKUTEN_AFFILIATE_ID,
            format: 'json',
            keyword: `${city.keyword} 繝ｬ繝・ぅ繝ｼ繧ｹ`,
            middleClassCode: city.middle,
            smallClassCode: city.small,
            hits: 30 // 隍・焚蜿門ｾ励＠縺ｦutils蜀・〒譛螳牙､繧偵た繝ｼ繝医☆繧九◆繧・        };
        if (city.detail) params.detailClassCode = city.detail;

        const hotel = await fetchRakutenApi(url, params);
        if (hotel) results.push({ city, hotel });
    }

    const title = `縲・{getDateString()}迚医大･ｳ諤ｧ縺ｲ縺ｨ繧頑羅縺ｫ譛驕ｩ・∽ｻ頑律縺ｮ繝ｬ繝・ぅ繝ｼ繧ｹ繝励Λ繝ｳ迚ｹ髮・- Tabi Plan`;
    const intro = `Tabi Plan AI縺悟宍驕ｸ縺励◆縲∵悽譌･縺ｮ蜈ｨ蝗ｽ荳ｻ隕√お繝ｪ繧｢縺ｮ縲後Ξ繝・ぅ繝ｼ繧ｹ繝励Λ繝ｳ縲肴怙螳牙､繧偵♀螻翫￠縺励∪縺吶・br>螳牙ｿ・・繧｢繝｡繝九ユ繧｣繧・そ繧ｭ繝･繝ｪ繝・ぅ縺ｪ縺ｩ縲∝･ｳ諤ｧ縺ｫ螫峨＠縺・音蜈ｸ莉倥″繝励Λ繝ｳ縺ｧ邏謨ｵ縺ｪ譎る俣繧偵♀驕弱＃縺励￥縺縺輔＞縲Ａ;
    const body = generateHtmlBody(intro, results);
    const tags = ["蝗ｽ蜀・羅陦・, "繝帙ユ繝ｫ", "讌ｽ螟ｩ繝医Λ繝吶Ν", "譛螳牙､", "繝ｬ繝・ぅ繝ｼ繧ｹ繝励Λ繝ｳ", "螂ｳ諤ｧ譌・, "荳莠ｺ譌・, "TabiPlan"];

    return { title, body, tags };
}

module.exports = { generate };
