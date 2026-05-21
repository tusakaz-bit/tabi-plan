const { RAKUTEN_APP_ID, RAKUTEN_AFFILIATE_ID, CITIES, fetchRakutenApi, generateHtmlBody, getDateString } = require('../utils');

async function generate() {
    const results = [];
    const url = 'https://openapi.rakuten.co.jp/services/api/Travel/KeywordHotelSearch/20170426';

    for (const city of CITIES) {
        const params = {
            applicationId: RAKUTEN_APP_ID,
            affiliateId: RAKUTEN_AFFILIATE_ID,
            format: 'json',
            keyword: `${city.keyword} 騾｣豕柿,
            middleClassCode: city.middle,
            smallClassCode: city.small,
            hits: 30
        };
        if (city.detail) params.detailClassCode = city.detail;

        const hotel = await fetchRakutenApi(url, params);
        if (hotel) results.push({ city, hotel });
    }

    const title = `縲・{getDateString()}迚医代§縺｣縺上ｊ譌・☆繧九↑繧会ｼ・｣豕翫♀縺吶☆繧√・繝ｩ繝ｳ迚ｹ髮・- Tabi Plan`;
    const intro = `Tabi Plan AI縺悟宍驕ｸ縺励◆縲∵悽譌･縺ｮ蜈ｨ蝗ｽ荳ｻ隕√お繝ｪ繧｢縺ｮ縲碁｣豕翫・繝ｩ繝ｳ縲肴怙螳牙､繧偵♀螻翫￠縺励∪縺吶・br>繝ｯ繝ｼ繧ｱ繝ｼ繧ｷ繝ｧ繝ｳ繧・聞譛滓ｻ槫惠縺ｧ縺雁ｾ励↓豕翫∪繧後ｋ繝励Λ繝ｳ繧呈ｴｻ逕ｨ縺励※縲√ｆ縺｣縺上ｊ縺ｨ陦励・鬲・鴨繧堤匱隕九＠縺ｦ縺ｿ縺ｾ縺帙ｓ縺具ｼ歔;
    const body = generateHtmlBody(intro, results);
    const tags = ["蝗ｽ蜀・羅陦・, "繝帙ユ繝ｫ", "讌ｽ螟ｩ繝医Λ繝吶Ν", "譛螳牙､", "騾｣豕・, "繝ｯ繝ｼ繧ｱ繝ｼ繧ｷ繝ｧ繝ｳ", "髟ｷ譛滓ｻ槫惠", "TabiPlan"];

    return { title, body, tags };
}

module.exports = { generate };
