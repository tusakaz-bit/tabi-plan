const fs = require('fs');

// 1. Update seo_overrides.json for main city pages
const seoOverridesPath = 'scripts/seo_overrides.json';
const seoOverrides = JSON.parse(fs.readFileSync(seoOverridesPath, 'utf8'));

const cities = {
    '/tokyo/': '東京',
    '/osaka/': '大阪',
    '/kyoto/': '京都',
    '/sapporo/': '札幌',
    '/okinawa/': '沖縄',
    '/fukuoka/': '福岡',
    '/kanazawa/': '金沢'
};

for (const [path, cityName] of Object.entries(cities)) {
    if (seoOverrides[path]) {
        seoOverrides[path].title = `【${cityName}】安くて綺麗！失敗しない高コスパ・おすすめホテル厳選`;
        seoOverrides[path].metaDescription = `${cityName}で『安くて綺麗なホテル』をお探しですか？格安ホテル選びで失敗しないために、独自の厳しい基準（清潔感・セキュリティ・評価）をクリアした適正価格の高コスパ宿だけをリストアップしました。`;
    } else {
        seoOverrides[path] = {
            title: `【${cityName}】安くて綺麗！失敗しない高コスパ・おすすめホテル厳選`,
            metaDescription: `${cityName}で『安くて綺麗なホテル』をお探しですか？格安ホテル選びで失敗しないために、独自の厳しい基準（清潔感・セキュリティ・評価）をクリアした適正価格の高コスパ宿だけをリストアップしました。`
        };
    }
}
fs.writeFileSync(seoOverridesPath, JSON.stringify(seoOverrides, null, 2), 'utf8');

// 2. Update niche_config.json for "sudomari" pages
const nicheConfigPath = 'scripts/niche_config.json';
const nicheConfig = JSON.parse(fs.readFileSync(nicheConfigPath, 'utf8'));

for (const key in nicheConfig) {
    if (key.includes('sudomari')) {
        const cityName = nicheConfig[key].cityName;
        const areaMatch = nicheConfig[key].keyword.split(' ')[0]; // E.g., "すすきの" from "すすきの 素泊まり ホテル 安い"
        // Sometimes keyword might just be "札幌 素泊まり", so let's use cityName if areaMatch is too generic, 
        // actually let's use the explicit `areaName` if possible or fallback to `cityName`.
        const areaName = areaMatch.length > 0 ? areaMatch : cityName;

        nicheConfig[key].title = `【${cityName}】素泊まりでお得にステイ！安くて綺麗な高コスパ厳選ホテル`;
        nicheConfig[key].seoTitle = `【${cityName}】素泊まりでお得にステイ！安くて綺麗な高コスパ厳選ホテル`; // Just in case seoTitle is used
        nicheConfig[key].seoDescription = `食事は外で楽しみたい方へ。${areaName}エリアで『素泊まり』だからこそ実現できる、価格以上の満足度を誇る高コスパホテルだけを厳選しました。清潔感とセキュリティ重視で女性の一人旅にもおすすめです。`;
    }
}
fs.writeFileSync(nicheConfigPath, JSON.stringify(nicheConfig, null, 2), 'utf8');

console.log('Update complete.');
