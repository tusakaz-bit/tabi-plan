const fs = require('fs');
const path = require('path');
const { CITIES } = require('./utils');
const nicheConfig = require('./niche_config.json');

// 都市ページ: og:urlをトップページ固定から各都市URLに修正
for (const city of CITIES) {
    const filePath = path.join(__dirname, '..', city.id, 'index.html');
    if (!fs.existsSync(filePath)) continue;
    let content = fs.readFileSync(filePath, 'utf8');
    
    // og:url がトップページ固定になっているものを修正
    content = content.replace(
        '<meta property="og:url" content="https://tabi-plan.org/">',
        `<meta property="og:url" content="https://tabi-plan.org/${city.id}/">`
    );
    
    fs.writeFileSync(filePath, content);
    console.log(`Fixed og:url for city: ${city.id}`);
}

// ニッチページ: canonicalタグ追加 & og:url修正
for (const key in nicheConfig) {
    const niche = nicheConfig[key];
    const filePath = path.join(__dirname, '..', niche.city, niche.slug, 'index.html');
    if (!fs.existsSync(filePath)) continue;
    let content = fs.readFileSync(filePath, 'utf8');
    
    const canonicalUrl = `https://tabi-plan.org/${niche.city}/${niche.slug}/`;
    const canonicalTag = `<link rel="canonical" href="${canonicalUrl}">`;
    
    // og:url を修正
    content = content.replace(
        '<meta property="og:url" content="https://tabi-plan.org/">',
        `<meta property="og:url" content="${canonicalUrl}">`
    );
    
    // canonicalタグがなければ追加（<title>の直前）
    if (!content.includes('<link rel="canonical"')) {
        content = content.replace(
            '<title>',
            `${canonicalTag}\n    <title>`
        );
    }
    
    fs.writeFileSync(filePath, content);
    console.log(`Fixed canonical + og:url for niche: ${niche.city}/${niche.slug}`);
}

console.log('\nAll canonical/og:url fixes applied!');
