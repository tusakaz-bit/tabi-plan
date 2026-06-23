const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'niche_config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const newNiches = {
  "tokyo-eki-kirei-yasui": {
    "city": "tokyo",
    "cityName": "東京",
    "slug": "eki-kirei-yasui",
    "title": "【毎朝更新】東京駅周辺・綺麗で安いコスパ最強ホテル",
    "keyword": "東京駅 近く 綺麗で安い ホテル",
    "searchParams": { "keyword": "東京駅 綺麗" },
    "filters": { "maxPrice": 12000, "minReview": 4 },
    "fallbackFilters": { "maxPrice": 15000, "minReview": 3.8 },
    "staticContent": { "guideHtml": "" }
  },
  "tokyo-shinjuku-joshitabi": {
    "city": "tokyo",
    "cityName": "東京",
    "slug": "shinjuku-joshitabi",
    "title": "【毎朝更新】新宿・女子旅向け！かわいくて安いホテル厳選",
    "keyword": "新宿 女子旅 かわいい ホテル 安い",
    "searchParams": { "keyword": "新宿" },
    "filters": { "maxPrice": 9000, "minReview": 3.8 },
    "fallbackFilters": { "maxPrice": 12000, "minReview": 3.5 },
    "staticContent": { "guideHtml": "" }
  },
  "kyoto-eki-daiyokujo": {
    "city": "kyoto",
    "cityName": "京都",
    "slug": "eki-daiyokujo",
    "title": "【毎朝更新】京都駅周辺・大浴場付きの安いホテルTOP5",
    "keyword": "京都駅 近く 大浴場 安い ホテル",
    "searchParams": { "keyword": "京都駅 大浴場" },
    "filters": { "maxPrice": 8000, "minReview": 4 },
    "fallbackFilters": { "maxPrice": 12000, "minReview": 3.8 },
    "staticContent": { "guideHtml": "" }
  },
  "kyoto-kawaramachi-couple": {
    "city": "kyoto",
    "cityName": "京都",
    "slug": "kawaramachi-couple",
    "title": "【毎朝更新】河原町周辺・カップル向け！おしゃれで安いホテル",
    "keyword": "河原町 カップル おしゃれ 安い ホテル",
    "searchParams": { "keyword": "河原町" },
    "filters": { "maxPrice": 8000, "minReview": 4 },
    "fallbackFilters": { "maxPrice": 12000, "minReview": 3.8 },
    "staticContent": { "guideHtml": "" }
  },
  "sapporo-eki-breakfast": {
    "city": "sapporo",
    "cityName": "札幌",
    "slug": "eki-breakfast",
    "title": "【毎朝更新】札幌駅周辺・朝食が美味しくて安いホテル",
    "keyword": "札幌駅 近く 朝食が美味しい ホテル 安い",
    "searchParams": { "keyword": "札幌 朝食" },
    "filters": { "maxPrice": 10000, "minReview": 4.2 },
    "fallbackFilters": { "maxPrice": 13000, "minReview": 4.0 },
    "staticContent": { "guideHtml": "" }
  },
  "sapporo-susukino-sudomari": {
    "city": "sapporo",
    "cityName": "札幌",
    "slug": "susukino-sudomari",
    "title": "【毎朝更新】すすきので素泊まり・3000円台の格安ホテル厳選",
    "keyword": "すすきの 素泊まり 格安 3000円台",
    "searchParams": { "keyword": "すすきの 素泊まり" },
    "filters": { "maxPrice": 4000, "minReview": 3.5 },
    "fallbackFilters": { "maxPrice": 6000, "minReview": 3.5 },
    "staticContent": { "guideHtml": "" }
  },
  "okinawa-naha-kokusaidori": {
    "city": "okinawa",
    "cityName": "沖縄",
    "slug": "naha-kokusaidori",
    "title": "【毎朝更新】那覇・国際通り近くのコスパ最強安いホテル",
    "keyword": "那覇 国際通り 近く 安い ホテル",
    "searchParams": { "keyword": "那覇 国際通り" },
    "filters": { "maxPrice": 7000, "minReview": 3.8 },
    "fallbackFilters": { "maxPrice": 10000, "minReview": 3.5 },
    "staticContent": { "guideHtml": "" }
  },
  "okinawa-naha-airport-sogei": {
    "city": "okinawa",
    "cityName": "沖縄",
    "slug": "naha-airport-sogei",
    "title": "【毎朝更新】那覇空港近く・送迎付きで安いホテル",
    "keyword": "那覇空港 近く 送迎あり 安い ホテル",
    "searchParams": { "keyword": "那覇空港 送迎" },
    "filters": { "maxPrice": 9000, "minReview": 3.8 },
    "fallbackFilters": { "maxPrice": 12000, "minReview": 3.5 },
    "staticContent": { "guideHtml": "" }
  }
};

Object.assign(config, newNiches);
fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
console.log('niche_config.json updated with new keywords.');
