const fs = require('fs');
const path = require('path');
const { CITIES } = require('./utils');
const nicheConfig = require('./niche_config.json');

const BASE_URL = 'https://tabi-plan.org';
const DEFAULT_IMAGE = 'https://tabi-plan.org/bg_portal_urban_night_1775824496399.png';

function injectOGP(filePath, title, description, url) {
    if (!fs.existsSync(filePath)) return;
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // 既にOGPタグがある場合はスキップ（二重追加防止）
    if (content.includes('og:title')) {
        return;
    }
    
    const ogpTags = `    <!-- OGP Settings -->
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:type" content="article">
    <meta property="og:url" content="${url}">
    <meta property="og:image" content="${DEFAULT_IMAGE}">
    <meta name="twitter:card" content="summary_large_image">`;

    // <meta name="description" content="..."> の直後に挿入する
    const descriptionRegex = /<meta name="description" content="[^"]*">\n/;
    if (descriptionRegex.test(content)) {
        content = content.replace(descriptionRegex, match => match + ogpTags + '\n');
        fs.writeFileSync(filePath, content);
        console.log(`Injected OGP to ${filePath}`);
    }
}

// 1. 各都市トップページへの適用
for (const city of CITIES) {
    const filePath = path.join(__dirname, '..', city.id, 'index.html');
    const title = `【毎朝更新】${city.name}の安いのに高評価なホテルだけ厳選｜Tabi Plan`;
    const desc = `楽天トラベル3万件から「クチコミ3.5以上×最安値クラス」だけを自動抽出。${city.name}のコスパ最強ホテルを毎朝更新中。`;
    const url = `${BASE_URL}/${city.id}/`;
    injectOGP(filePath, title, desc, url);
}

// 2. ニッチページへの適用
for (const key in nicheConfig) {
    const niche = nicheConfig[key];
    const filePath = path.join(__dirname, '..', niche.city, niche.slug, 'index.html');
    const url = `${BASE_URL}/${niche.city}/${niche.slug}/`;
    // タイトルと説明文は、既にHTML内に生成されている可能性が高いが、簡易的に設定
    injectOGP(filePath, niche.title, `楽天トラベルから「${niche.keyword}」の条件に合うコスパ最強ホテルを厳選しました。`, url);
}

console.log('OGP injection completed.');
