const { RAKUTEN_APP_ID, RAKUTEN_AFFILIATE_ID, CITIES, fetchRakutenApi, generateHtmlBody, getDateString } = require('../utils');

async function generate() {
    const results = [];
    const url = 'https://openapi.rakuten.co.jp/services/api/Travel/KeywordHotelSearch/20170426';

    for (const city of CITIES) {
        const params = {
            applicationId: RAKUTEN_APP_ID,
            affiliateId: RAKUTEN_AFFILIATE_ID,
            format: 'json',
            keyword: `${city.keyword} 譛晞｣滉ｻ倭,
            middleClassCode: city.middle,
            smallClassCode: city.small,
            hits: 30
        };
        if (city.detail) params.detailClassCode = city.detail;

        const hotel = await fetchRakutenApi(url, params);
        if (hotel) results.push({ city, hotel });
    }

    const title = `縲・{getDateString()}迚医代ｆ縺｣縺上ｊ讌ｽ縺励・譛晞｣滉ｻ倥″繝帙ユ繝ｫ迚ｹ髮・- Tabi Plan`;
    const intro = `Tabi Plan AI縺悟宍驕ｸ縺励◆縲∵悽譌･縺ｮ蜈ｨ蝗ｽ荳ｻ隕√お繝ｪ繧｢縺ｮ縲梧悃鬟滉ｻ倥″繝励Λ繝ｳ縲肴怙螳牙､繧偵♀螻翫￠縺励∪縺吶・br>鄒主袖縺励＞譛昴＃縺ｯ繧薙〒縲∵羅縺ｮ荳譌･繧貞・豌励↓繧ｹ繧ｿ繝ｼ繝医＆縺帙∪縺励ｇ縺・ｼ～;
    const body = generateHtmlBody(intro, results);
    const tags = ["蝗ｽ蜀・羅陦・, "繝帙ユ繝ｫ", "讌ｽ螟ｩ繝医Λ繝吶Ν", "譛螳牙､", "譛晞｣滉ｻ倥″", "譛昴＃縺ｯ繧・, "TabiPlan"];

    return { title, body, tags };
}

module.exports = { generate };
