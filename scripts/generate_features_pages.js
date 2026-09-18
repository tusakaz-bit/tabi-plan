const axios = require('axios');
const fs = require('fs');
const path = require('path');

const RAKUTEN_APP_ID = 'ecc263bd-2573-4a88-933e-159e08ff4fff';
const RAKUTEN_AFFILIATE_ID = '047ad0f1.183c70cf.047ad0f2.1e4c3769';
const TEMPLATE_PATH = path.join(__dirname, 'themes/feature_template.html');
const CONFIG_PATH = path.join(__dirname, 'features_config.json');

const CITY_CODES = {
    tokyo:   { middle: 'tokyo', small: 'tokyo' },
    osaka:   { middle: 'osaka', small: 'shi' },
    kyoto:   { middle: 'kyoto', small: 'shi' },
    sapporo: { middle: 'hokkaido', small: 'sapporo' },
    okinawa: { middle: 'okinawa', small: 'nahashi' },
    fukuoka: { middle: 'hukuoka', small: 'fukuoka' },
    kanazawa: { middle: 'ishikawa', small: 'kanazawa' }
};

const CITY_BG_FILENAME = {
    tokyo: "bg_tokyo_new.jpg",
    osaka: "bg_osaka_new.jpg",
    kyoto: "bg_kyoto_new.jpg",
    sapporo: "bg_sapporo_new.jpg",
    okinawa: "bg_okinawa_new.jpg",
    fukuoka: "bg_fukuoka_new.jpg",
    kanazawa: "bg_kanazawa_new.jpg"
};

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function fetchHotels(searchParams, filters, cityEn, maxResults = 10) {
    const cityCode = CITY_CODES[cityEn];
    const url = 'https://openapi.rakuten.co.jp/engine/api/Travel/KeywordHotelSearch/20170426';
    const params = {
        applicationId: RAKUTEN_APP_ID,
        accessKey: 'pk_5MWJwVdIjLhdoj7Zg1RriahaHY2JahwsKyl6c3KDRkG',
        affiliateId: RAKUTEN_AFFILIATE_ID,
        format: 'json',
        largeClassCode: 'japan',
        middleClassCode: cityCode.middle,
        smallClassCode: cityCode.small,
        keyword: searchParams.keyword
    };

    let retries = 3;
    while (retries > 0) {
        try {
            await sleep(1500);
            const response = await axios.get(url, {
                params,
                headers: { 'Referer': 'https://tabi-plan.org/', 'Origin': 'https://tabi-plan.org' }
            });
            let hotels = response.data.hotels;
            
            hotels = hotels.filter(h => {
                const info = h.hotel[0].hotelBasicInfo;
                if (filters.minReview && (info.reviewAverage || 0) < filters.minReview) return false;
                if (filters.maxPrice && (info.hotelMinCharge || 999999) > filters.maxPrice) return false;
                return true;
            });
            
            hotels.sort((a, b) => b.hotel[0].hotelBasicInfo.reviewAverage - a.hotel[0].hotelBasicInfo.reviewAverage);
            return hotels.slice(0, maxResults);
        } catch (e) {
            console.error(`API Error: ${e.message}. Retries remaining: ${retries - 1}`);
            retries--;
            if (retries === 0) return [];
            await sleep(3000);
        }
    }
}

function generateHotelCardHtml(hotel) {
    const info = hotel.hotel[0].hotelBasicInfo;
    const rating = info.reviewAverage ? info.reviewAverage.toFixed(1) : 'N/A';
    const price = info.hotelMinCharge ? `${Number(info.hotelMinCharge).toLocaleString()}円〜` : '価格設定なし';
    const link = `https://hb.afl.rakuten.co.jp/hgc/${RAKUTEN_AFFILIATE_ID}/?pc=https%3A%2F%2Ftravel.rakuten.co.jp%2FHOTEL%2F${info.hotelNo}%2F${info.hotelNo}.html`;

    return `
    <div class="hotel-card" style="margin-bottom: 2rem; background: #FFF; border-radius: 12px; overflow: hidden; display: flex; flex-direction: row; flex-wrap: wrap; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid rgba(144, 180, 206, 0.3); max-width: 100%; box-sizing: border-box;">
        <div class="hotel-image" style="flex: 1 1 250px; min-width: 0; background-image: url('${info.hotelImageUrl}'); background-size: cover; background-position: center; min-height: 250px; position: relative;">
            <div class="rakuten-credit">Rakuten Travel</div>
        </div>
        <div class="hotel-info" style="flex: 2 1 250px; min-width: 0; padding: 1.5rem; max-width: 100%; box-sizing: border-box;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
                <h3 class="hotel-title" style="font-size: 1.5rem; color: #1a1a2e; margin: 0; max-width: 100%; word-break: break-word; overflow-wrap: anywhere;">${info.hotelName}</h3>
                <span style="background: #eef2f5; color: #555577; padding: 0.3rem 0.8rem; border-radius: 20px; font-weight: bold; font-size: 0.9rem;">
                    <i class="fa-solid fa-star" style="color: #fbbf24;"></i> ${rating}
                </span>
            </div>
            <p style="color: #666; font-size: 0.95rem; line-height: 1.6; margin-bottom: 1.5rem;">${info.hotelSpecial}</p>
            <div style="display: flex; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap;">
                <span style="font-size: 0.85rem; color: #555577;"><i class="fa-solid fa-map-location-dot"></i> ${info.address1}${info.address2}</span>
                <span style="font-size: 0.85rem; color: #e11d48; font-weight: bold;"><i class="fa-solid fa-yen-sign"></i> 最安 ${price}</span>
            </div>
            <a href="${link}" target="_blank" rel="noopener noreferrer" class="booking-button" style="display: block; text-align: center; background: #90B4CE; color: #FFF; padding: 1rem; border-radius: 8px; text-decoration: none; font-weight: bold; transition: background 0.3s; max-width: 100%; box-sizing: border-box; white-space: normal; word-break: break-all;">
                空室状況と最安値をチェック <i class="fa-solid fa-arrow-up-right-from-square"></i>
            </a>
        </div>
    </div>`;
}

async function run() {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');
    
    console.log('Starting features pages generation...');
    
    const baseDir = path.join(__dirname, '../features');
    if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });
    
    for (const [key, data] of Object.entries(config)) {
        console.log(`Processing: ${key}`);
        
        let outHtml = template;
        
        const isCluster = data.type === 'cluster';
        const assetDepth = isCluster ? '../../../' : '../../';
        
        let breadcrumbs = '';
        let navLinks = '';
        if (isCluster) {
            const parent = config[data.parent];
            breadcrumbs = `<a href="../../">${parent.title}</a> <i class="fa-solid fa-chevron-right" style="font-size: 0.6rem; margin: 0 0.5rem;"></i> <span style="color: #666666;">${data.title}</span>`;
            navLinks = `<a href="../../">${parent.title}</a>`;
        } else {
            breadcrumbs = `<span style="color: #666666;">${data.title}</span>`;
            navLinks = ``;
        }
        
        let sectionBHtml = '';
        if (data.type === 'pillar') {
            const clusterLinks = data.clusters.map(clusterKey => {
                const cData = config[clusterKey];
                return `<a href="${cData.city}/" class="cluster-link-card">
                    <h3>${cData.title}</h3>
                    <p>${cData.metaDescription}</p>
                </a>`;
            }).join('');
            sectionBHtml = `<div class="cluster-links">${clusterLinks}</div>`;
        } else if (data.type === 'cluster') {
            const hotels = await fetchHotels(data.searchParams, data.filters, data.city);
            if (hotels.length === 0) {
                sectionBHtml = '<p style="text-align: center;">ただいま、対象のプランがございません。時間をおいて再度お試しください。</p>';
            } else {
                sectionBHtml = hotels.map(h => generateHotelCardHtml(h)).join('');
            }
        }

        const bgImage = data.city && CITY_BG_FILENAME[data.city] 
            ? `url('${assetDepth}${CITY_BG_FILENAME[data.city]}')`
            : `url('${assetDepth}hero-bg.jpg')`;

        outHtml = outHtml
            .replace(/{{PAGE_TITLE}}/g, data.title)
            .replace(/{{META_DESCRIPTION}}/g, data.metaDescription)
            .replace(/{{FEATURE_PATH}}/g, `features/${data.slug}`)
            .replace(/{{OG_IMAGE}}/g, `https://tabi-plan.org/hero-bg.jpg`)
            .replace(/{{ASSET_DEPTH}}/g, assetDepth)
            .replace(/{{HERO_BG_IMAGE}}/g, bgImage)
            .replace(/{{NAV_LINKS}}/g, navLinks)
            .replace(/{{BREADCRUMBS_HTML}}/g, breadcrumbs)
            .replace(/{{HERO_TITLE}}/g, data.heroTitle || data.title)
            .replace(/{{SECTION_A_TITLE}}/g, data.sectionATitle)
            .replace(/{{SECTION_A_CONTENT}}/g, data.sectionAContent)
            .replace(/{{FEATURE_CLUSTERS_OR_HOTELS}}/g, sectionBHtml);
            
        const outDir = path.join(baseDir, data.slug);
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
        fs.writeFileSync(path.join(outDir, 'index.html'), outHtml, 'utf8');
        
        console.log(`-> Generated ${data.slug}/index.html`);
    }
    
    console.log('Done generating features pages.');
}

run();
