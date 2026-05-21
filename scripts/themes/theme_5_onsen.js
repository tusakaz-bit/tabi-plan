const { RAKUTEN_APP_ID, RAKUTEN_AFFILIATE_ID, CITIES, fetchRakutenApi, generateHtmlBody, getDateString } = require('../utils');

async function generate() {
    const results = [];
    const url = 'https://openapi.rakuten.co.jp/services/api/Travel/KeywordHotelSearch/20170426';

    for (const city of CITIES) {
        const params = {
            applicationId: RAKUTEN_APP_ID,
            affiliateId: RAKUTEN_AFFILIATE_ID,
            format: 'json',
            keyword: `${city.keyword} 髴ｲ螟ｩ鬚ｨ蜻Ａ,
            middleClassCode: city.middle,
            smallClassCode: city.small,
            hits: 30
        };
        if (city.detail) params.detailClassCode = city.detail;

        const hotel = await fetchRakutenApi(url, params);
        if (hotel) results.push({ city, hotel });
    }

    const title = `縲・{getDateString()}迚医鷹ｱ譛ｫ蜑阪↓逋偵＠繧抵ｼ∽ｻ頑律縺ｮ髴ｲ螟ｩ鬚ｨ蜻ゆｻ倥″繝帙ユ繝ｫ迚ｹ髮・- Tabi Plan`;
    const intro = `Tabi Plan AI縺悟宍驕ｸ縺励◆縲∵悽譌･縺ｮ蜈ｨ蝗ｽ荳ｻ隕√お繝ｪ繧｢縺ｮ縲碁愆螟ｩ鬚ｨ蜻ゅ・貂ｩ豕我ｻ倥″繝励Λ繝ｳ縲肴怙螳牙､繧偵♀螻翫￠縺励∪縺吶・br>譌･縲・・逍ｲ繧後ｒ逋偵ｄ縺吶∵･ｵ荳翫・繝ｪ繝ｩ繝・け繧ｹ繧ｿ繧､繝繧偵♀驕弱＃縺励￥縺縺輔＞縲Ａ;
    const body = generateHtmlBody(intro, results);
    const tags = ["蝗ｽ蜀・羅陦・, "繝帙ユ繝ｫ", "讌ｽ螟ｩ繝医Λ繝吶Ν", "譛螳牙､", "貂ｩ豕・, "髴ｲ螟ｩ鬚ｨ蜻・, "逋偵＠譌・, "TabiPlan"];

    return { title, body, tags };
}

module.exports = { generate };
