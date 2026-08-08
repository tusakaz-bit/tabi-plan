const fs = require('fs');
const path = require('path');
const { CITIES } = require('./utils');
const nicheConfig = require('./niche_config.json');

const CITY_BG_FILENAME = {
    tokyo: "bg_tokyo_new.jpg",
    osaka: "bg_osaka_new.jpg",
    kyoto: "bg_kyoto_new.jpg",
    sapporo: "bg_sapporo_new.jpg",
    okinawa: "bg_okinawa_new.jpg",
    fukuoka: "bg_fukuoka_new.jpg"
};

const OLD_OGP = '<meta property="og:image" content="https://tabi-plan.org/bg_portal_urban_night_1775824496399.png">';

function replaceInFile(filePath, cityId) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    
    if (content.includes(OLD_OGP)) {
        const NEW_OGP = `<meta property="og:image" content="https://tabi-plan.org/${CITY_BG_FILENAME[cityId]}">`;
        content = content.replace(OLD_OGP, NEW_OGP);
        fs.writeFileSync(filePath, content);
        console.log(`Replaced OGP in ${filePath}`);
    }
}

// 1. 各都市トップページへの適用
for (const city of CITIES) {
    const filePath = path.join(__dirname, '..', city.id, 'index.html');
    replaceInFile(filePath, city.id);
}

// 2. ニッチページへの適用
for (const key in nicheConfig) {
    const niche = nicheConfig[key];
    const filePath = path.join(__dirname, '..', niche.city, niche.slug, 'index.html');
    replaceInFile(filePath, niche.city);
}

console.log('OGP Image injection completed.');
