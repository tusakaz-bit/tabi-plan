try { require('dotenv').config(); } catch (e) { /* CI環境では無視 */ }
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

const RAKUTEN_APP_ID = 'ecc263bd-2573-4a88-933e-159e08ff4fff';
const RAKUTEN_AFFILIATE_ID = '047ad0f1.183c70cf.047ad0f2.1e4c3769';
const TEMPLATE_PATH = path.join(__dirname, 'themes/niche_template.html');
const CONFIG_PATH = path.join(__dirname, 'niche_config.json');

const CITY_CODES = {
    tokyo:   { middle: 'tokyo', small: 'tokyo' },
    osaka:   { middle: 'osaka', small: 'shi' },
    kyoto:   { middle: 'kyoto', small: 'shi' },
    sapporo: { middle: 'hokkaido', small: 'sapporo' },
    okinawa: { middle: 'okinawa', small: 'nahashi' },
    fukuoka: { middle: 'hukuoka', small: 'fukuoka' }
};

const CITY_BG = {
    tokyo: "url('../../bg_tokyo_1776258940200.png')",
    osaka: "url('../../bg_osaka_1775740031415.png')",
    kyoto: "url('../../bg_kyoto_night_1776398726246.png')",
    sapporo: "url('../../bg_sapporo_japanese_dark_hero_1776434374881.png')",
    okinawa: "url('../../bg_okinawa_japanese_dark_hero_beach_1776487605725.png')",
    fukuoka: "url('../../bg_fukuoka.png')"
};

const CITY_BG_FILENAME = {
    tokyo: "bg_tokyo_1776258940200.png",
    osaka: "bg_osaka_1775740031415.png",
    kyoto: "bg_kyoto_night_1776398726246.png",
    sapporo: "bg_sapporo_japanese_dark_hero_1776434374881.png",
    okinawa: "bg_okinawa_japanese_dark_hero_beach_1776487605725.png",
    fukuoka: "bg_fukuoka.png"
};

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function fetchRakutenAPI(url, params) {
    let retries = 3;
    while (retries > 0) {
        try {
            await sleep(1500);
            const response = await axios.get(url, {
                params,
                headers: { 'Referer': 'https://tabi-plan.org/', 'Origin': 'https://tabi-plan.org' }
            });
            return response.data;
        } catch (error) {
            console.error(`API Error: ${error.message}. Retries remaining: ${retries - 1}`);
            retries--;
            if (retries === 0) throw error;
            await sleep(3000);
        }
    }
}

function extractAccessInfo(accessText) {
    if (!accessText) return { text: '好アクセス（詳細はページ内へ）', icon: 'fa-location-dot' };
    const walkMatch = accessText.match(/([^、。]*?駅(?:.*?口)?)[^\d]*徒歩[^\d]*(\d+)分/);
    if (walkMatch) {
        let station = walkMatch[1].replace(/^(?:【.*?】|JR|ＪＲ|地下鉄|私鉄|メトロ)/, '').trim();
        if (station.length > 10) station = station.substring(0, 10) + '...';
        return { text: `${station} 徒歩${walkMatch[2]}分`, icon: 'fa-walking' };
    }
    const carMatch = accessText.match(/([^、。]*?(?:空港|駅|IC|ＩＣ))[^\d]*(?:車|タクシー)[^\d]*(\d+)分/);
    if (carMatch) {
        let place = carMatch[1].trim();
        if (place.length > 10) place = place.substring(0, 10) + '...';
        return { text: `${place} 車で${carMatch[2]}分`, icon: 'fa-car' };
    }
    return { text: '好アクセス（詳細はページ内へ）', icon: 'fa-location-dot' };
}

function filterHotels(hotels, filterRules) {
    if (!hotels) return [];
    return hotels.filter(h => {
        const info = h.hotel[0].hotelBasicInfo;
        
        // 1. ¥1 バグや異常な低価格を除外 (1000円未満を除外)
        if (!info.hotelMinCharge || info.hotelMinCharge < 1000) return false;

        // 2. 設定された価格上限
        if (filterRules.maxPrice && info.hotelMinCharge > filterRules.maxPrice) return false;

        // 3. 設定されたレビュー下限
        if (filterRules.minReview && (!info.reviewAverage || info.reviewAverage < filterRules.minReview)) return false;
        if (!info.reviewCount || info.reviewCount < 5) return false;

        // 4. 民泊等の除外
        const name = (info.hotelName || '').toLowerCase();
        if (name.includes('民泊') || name.includes('ホステル') || name.includes('ゲストハウス') || name.includes('キャビン') || name.includes('bnb')) {
            return false;
        }

        return true;
    });
}

function renderHotelCards(hotels) {
    if (!hotels || hotels.length === 0) {
        return '<p class="error-message">本日は条件に完全に合致するプランが見つかりませんでした。別の条件もお試しください。</p>';
    }

    let html = '';
    const limit = Math.min(hotels.length, 10);

    for (let i = 0; i < limit; i++) {
        const info = hotels[i].hotel[0].hotelBasicInfo;
        const priceLabel = info.hotelMinCharge ? Number(info.hotelMinCharge).toLocaleString() : '---';
        const targetUrl = `https://hb.afl.rakuten.co.jp/hgc/${RAKUTEN_AFFILIATE_ID}/?pc=https%3A%2F%2Ftravel.rakuten.co.jp%2FHOTEL%2F${info.hotelNo}%2F${info.hotelNo}.html`;
        const imageUrl = info.hotelImageUrl || 'https://via.placeholder.com/400x300/1e293b/94a3b8?text=No+Image';
        const reviewAvg = info.reviewAverage ? Number(info.reviewAverage).toFixed(2) : '---';
        const reviewCount = info.reviewCount || 0;

        let starsHtml = '';
        if (info.reviewAverage) {
            const score = parseFloat(info.reviewAverage);
            for (let s = 1; s <= 5; s++) {
                if (score >= s) starsHtml += '<i class="fa-solid fa-star" style="color: #fbbf24;"></i>';
                else if (score >= s - 0.5) starsHtml += '<i class="fa-solid fa-star-half-stroke" style="color: #fbbf24;"></i>';
                else starsHtml += '<i class="fa-regular fa-star" style="color: #94a3b8;"></i>';
            }
        } else {
            starsHtml = '<span style="color: #94a3b8; font-size: 0.85rem;">評価なし</span>';
        }

        const transit = extractAccessInfo(info.access);

        html += `
                <div class="hotel-card">
                    <div class="rank-badge">${i + 1}</div>
                    <div class="hotel-image-wrapper">
                        <img src="${imageUrl}" alt="${info.hotelName}" class="hotel-image" loading="lazy">
                        <div class="rakuten-credit">Rakuten Travel</div>
                    </div>
                    <div class="hotel-content">
                        <h4 class="hotel-title">${info.hotelName}</h4>
                        <div class="hotel-address"><i class="fa-solid fa-location-dot"></i> <span>${info.address1}${info.address2}</span></div>
                        <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 0.8rem;">
                            <span class="transit-badge"><i class="fas ${transit.icon}"></i> ${transit.text}</span>
                        </div>
                        <div class="hotel-price"><span style="font-size: 0.9rem">最安料金:</span> <span class="price-amount">¥${priceLabel}</span><span style="font-size: 0.9rem">~ /泊</span></div>
                        <div class="review-widget"><div class="review-stars">${starsHtml}</div><div class="review-score">${reviewAvg !== '---' ? reviewAvg : ''}</div><div class="review-count">(${reviewCount}件の口コミ)</div></div>
                        <a href="${targetUrl}" target="_blank" rel="noopener noreferrer" class="booking-button">詳細・予約を見る</a>
                    </div>
                </div>`;
    }
    return html;
}

async function generateStaticGuideHtml(niche) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return '<p>準備中</p>';

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `
旅行サイトの特集ページ用に、「${niche.keyword}」という条件でホテルを探しているユーザーに向けた独自の解説コラム（SEO対策用）を生成してください。
【必須ルール】
- <div>タグで囲み、内部は<h3>と<p>で構成すること
- 文字数は400〜600文字程度
- 以下3つの内容を含める：
  1. なぜ「${niche.keyword}」がおすすめなのか？（メリット）
  2. このエリアでこの条件のホテルを選ぶ際の注意点やコツ
  3. 予算目安と相場感
- プレーンなHTMLのみ出力してください（Markdownの\`\`\`html等は不要）
`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: prompt
        });
        return response.text.replace(/\`\`\`html/g, '').replace(/\`\`\`/g, '').trim();
    } catch (e) {
        console.error('AI generation failed:', e);
        return '';
    }
}

async function run() {
    console.log('Starting Niche Pages generation...');
    const templateHtml = fs.readFileSync(TEMPLATE_PATH, 'utf8');
    const configData = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    let configUpdated = false;

    for (const [key, niche] of Object.entries(configData)) {
        console.log(`\nProcessing niche: ${key}`);

        // 1. 静的コンテンツ（解説）の生成とキャッシュ
        if (!niche.staticContent || !niche.staticContent.guideHtml) {
            console.log(`- Generating static guide HTML via AI...`);
            const guideHtml = await generateStaticGuideHtml(niche);
            if (guideHtml) {
                if (!niche.staticContent) niche.staticContent = {};
                niche.staticContent.guideHtml = guideHtml;
                configUpdated = true;
                console.log(`- Saved static guide HTML to config.`);
            }
        }

        // 2. 楽天APIからホテル取得
        const cityCode = CITY_CODES[niche.city];
        const params = {
            applicationId: RAKUTEN_APP_ID,
            accessKey: 'pk_5MWJwVdIjLhdoj7Zg1RriahaHY2JahwsKyl6c3KDRkG',
            affiliateId: RAKUTEN_AFFILIATE_ID,
            format: 'json',
            largeClassCode: 'japan',
            middleClassCode: cityCode.middle,
            smallClassCode: cityCode.small,
            keyword: niche.searchParams.keyword
        };

        console.log(`- Fetching hotels from Rakuten API...`);
        const data = await fetchRakutenAPI('https://openapi.rakuten.co.jp/engine/api/Travel/KeywordHotelSearch/20170426', params);
        
        let hotels = filterHotels(data?.hotels, niche.filters);
        let fallbackMessage = '';

        // 3. フォールバック判定（0件の場合、条件緩和）
        if (hotels.length === 0 && niche.fallbackFilters) {
            console.warn(`- No hotels found with strict filters. Applying fallback filters...`);
            hotels = filterHotels(data?.hotels, niche.fallbackFilters);
            if (hotels.length > 0) {
                fallbackMessage = `<div class="fallback-alert"><i class="fa-solid fa-circle-info"></i> 本日は繁忙期または空室が少ないため、ご希望の条件を一部緩和（価格上限引き上げ等）して、おすすめのホテルを表示しています。</div>`;
            }
        }

        if (hotels.length > 0) {
             // 料金の安い順にソート（コスパ特化）
             hotels.sort((a, b) => a.hotel[0].hotelBasicInfo.hotelMinCharge - b.hotel[0].hotelBasicInfo.hotelMinCharge);
        }

        const hotelsHtml = renderHotelCards(hotels);

        // 4. HTMLのレンダリングと保存
        const now = new Date();
        const jstDate = new Intl.DateTimeFormat('ja-JP', {
            year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo'
        }).format(now);

        const pageTitle = `${niche.title} | Tabi Plan`;
        const metaDesc = `【毎朝自動更新】${niche.keyword}に合致するコスパ最強ホテルを厳選。料金順に毎日更新しています。`;
        const breadcrumbCity = `${niche.cityName}のホテル`;
        const breadcrumbNiche = niche.keyword;
        
        // 独自解説セクションをラップ
        const guideHtmlWrapper = niche.staticContent.guideHtml ? `
        <section id="niche-guide" style="background: rgba(15, 15, 18, 0.9); padding: 3rem 0; border-top: 1px solid rgba(255,255,255,0.05); border-bottom: 1px solid rgba(255,255,255,0.05);">
            <div class="container">
                <div class="glass-container" style="padding: 2.5rem;">
                    <h2 style="font-size: 1.4rem; color: #fbbf24; margin-bottom: 1.5rem; border-bottom: 1px solid rgba(251, 191, 36, 0.3); padding-bottom: 0.8rem;"><i class="fa-solid fa-book-open"></i> ${niche.cityName}スタッフの独自解説</h2>
                    <div style="line-height: 1.8; color: rgba(255,255,255,0.85);">
                        ${niche.staticContent.guideHtml}
                    </div>
                </div>
            </div>
        </section>` : '';

        let finalHtml = templateHtml;
        const replacements = {
            '{{PAGE_TITLE}}': pageTitle,
            '{{META_DESCRIPTION}}': metaDesc,
            '{{HERO_BG_IMAGE}}': CITY_BG[niche.city],
            '{{OG_IMAGE}}': `https://tabi-plan.org/${CITY_BG_FILENAME[niche.city]}`,
            '{{BREADCRUMB_CITY_NAME}}': breadcrumbCity,
            '{{BREADCRUMB_NICHE_NAME}}': breadcrumbNiche,
            '{{HERO_TITLE}}': niche.title,
            '{{NICHE_GUIDE_HTML}}': guideHtmlWrapper,
            '{{FALLBACK_MESSAGE}}': fallbackMessage,
            '{{HOTELS_HTML}}': hotelsHtml,
            '{{UPDATE_TIME}}': jstDate
        };

        for (const [k, v] of Object.entries(replacements)) {
            finalHtml = finalHtml.split(k).join(v);
        }

        const outputDir = path.join(__dirname, `../${niche.city}/${niche.slug}`);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        fs.writeFileSync(path.join(outputDir, 'index.html'), finalHtml);
        console.log(`SUCCESS: Generated niche page -> ${niche.city}/${niche.slug}/index.html`);

        // 5. サイトマップへの登録・更新
        const urlStr = `https://tabi-plan.org/${niche.city}/${niche.slug}/`;
        const sitemapPath = path.join(__dirname, '../sitemap.xml');
        if (fs.existsSync(sitemapPath)) {
            let sitemapHtml = fs.readFileSync(sitemapPath, 'utf8');
            const todayStr = jstDate.split(' ')[0].replace(/\//g, '-');
            
            if (!sitemapHtml.includes(urlStr)) {
                const newSitemapUrl = `  <url>\n    <loc>${urlStr}</loc>\n    <lastmod>${todayStr}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.7</priority>\n  </url>`;
                sitemapHtml = sitemapHtml.replace('</urlset>', `${newSitemapUrl}\n</urlset>`);
                fs.writeFileSync(sitemapPath, sitemapHtml);
                console.log(`- Added ${urlStr} to sitemap.xml`);
            } else {
                // すでに存在する場合はlastmodのみ更新
                const regex = new RegExp(`(<loc>${urlStr}</loc>\\s*<lastmod>)[^<]+(</lastmod>)`);
                sitemapHtml = sitemapHtml.replace(regex, `$1${todayStr}$2`);
                fs.writeFileSync(sitemapPath, sitemapHtml);
                console.log(`- Updated lastmod in sitemap.xml for ${urlStr}`);
            }
        }
    }

    if (configUpdated) {
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(configData, null, 2));
        console.log('\nUpdated niche_config.json with newly generated static content.');
    }

    console.log('\n========================================\nALL NICHE PAGES GENERATED SUCCESSFULLY!\n========================================');
}

run().catch(err => {
    console.error('Fatal Error:', err);
    process.exit(1);
});
