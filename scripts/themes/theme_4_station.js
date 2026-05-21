const { RAKUTEN_APP_ID, RAKUTEN_AFFILIATE_ID, CITIES, fetchRakutenApi, generateHtmlBody, getDateString } = require('../utils');

async function generate() {
    const results = [];
    const url = 'https://openapi.rakuten.co.jp/services/api/Travel/KeywordHotelSearch/20170426';

    for (const city of CITIES) {
        const params = {
            applicationId: RAKUTEN_APP_ID,
            affiliateId: RAKUTEN_AFFILIATE_ID,
            format: 'json',
            keyword: `${city.keyword} 鬧・ｿ疏,
            middleClassCode: city.middle,
            smallClassCode: city.small,
            hits: 30
        };
        if (city.detail) params.detailClassCode = city.detail;

        const hotel = await fetchRakutenApi(url, params);
        if (hotel) results.push({ city, hotel });
    }

    const title = `縲・{getDateString()}迚医代い繧ｯ繧ｻ繧ｹ謚懃ｾ､・∽ｻ頑律縺ｮ鬧・メ繧ｫ繝帙ユ繝ｫ迚ｹ髮・- Tabi Plan`;
    const intro = `Tabi Plan AI縺悟宍驕ｸ縺励◆縲∵悽譌･縺ｮ蜈ｨ蝗ｽ荳ｻ隕√お繝ｪ繧｢縺ｮ縲碁ｧ・ｿ代・鬧・メ繧ｫ繝励Λ繝ｳ縲肴怙螳牙､繧偵♀螻翫￠縺励∪縺吶・br>驥阪＞闕ｷ迚ｩ縺後≠縺｣縺ｦ繧ょｮ牙ｿ・ｼ∫ｧｻ蜍輔↓萓ｿ蛻ｩ縺ｪ螂ｽ遶句慍繝帙ユ繝ｫ縺ｧ蠢ｫ驕ｩ縺ｪ譌・ｒ縲Ａ;
    const body = generateHtmlBody(intro, results);
    const tags = ["蝗ｽ蜀・羅陦・, "繝帙ユ繝ｫ", "讌ｽ螟ｩ繝医Λ繝吶Ν", "譛螳牙､", "鬧・ｿ・, "鬧・メ繧ｫ", "莠､騾壻ｾｿ蛻ｩ", "TabiPlan"];

    return { title, body, tags };
}

module.exports = { generate };
