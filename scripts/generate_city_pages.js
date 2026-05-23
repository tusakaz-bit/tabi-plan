const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

const RAKUTEN_APP_ID = 'ecc263bd-2573-4a88-933e-159e08ff4fff';
const RAKUTEN_AFFILIATE_ID = '047ad0f1.183c70cf.047ad0f2.1e4c3769';

const TEMPLATE_PATH = path.join(__dirname, 'themes/city_template.html');

const CITIES = [
    { name: '東京', en: 'tokyo',   middle: 'tokyo',   small: 'tokyo',   detail: 'A', baseStation: '東京', bgImage: "url('../bg_tokyo_1776258940200.png'), url('../bg_tokyo.png')" },
    { name: '大阪', en: 'osaka',   middle: 'osaka',   small: 'shi',     detail: 'D', baseStation: '大阪・梅田', bgImage: "url('../bg_osaka_1775740031415.png'), url('../bg_osaka.png')" },
    { name: '京都', en: 'kyoto',   middle: 'kyoto',   small: 'shi',     detail: 'B', baseStation: '京都', bgImage: "url('../bg_kyoto_night_1776398726246.png'), url('../bg_kyoto.png')" },
    { name: '札幌', en: 'sapporo', middle: 'hokkaido', small: 'sapporo', detail: 'B', baseStation: '札幌', bgImage: "url('../bg_sapporo_japanese_dark_hero_1776434374881.png'), url('../bg_sapporo.png')" },
    { name: '沖縄', en: 'okinawa', middle: 'okinawa', small: 'nahashi', detail: '', baseStation: '那覇空港', bgImage: "url('../bg_okinawa_japanese_dark_hero_beach_1776487605725.png'), url('../bg_okinawa.png')" },
    { name: '福岡', en: 'fukuoka', middle: 'hukuoka', small: 'fukuoka', detail: '', baseStation: '博多', bgImage: "url('../bg_fukuoka.png')" }
];

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// 楽天APIの429エラーを回避するためのディレイ付き通信クライアント
async function fetchRakutenAPI(url, params) {
    let retries = 3;
    while (retries > 0) {
        try {
            await sleep(1500); // 1.5秒のウェイトを強制的に挟む（レート制限回避）
            const response = await axios.get(url, {
                params,
                headers: {
                    'Referer': 'https://tabi-plan.org/',
                    'Origin': 'https://tabi-plan.org'
                }
            });
            return response.data;
        } catch (error) {
            console.error(`API Error: ${error.message}. Retries remaining: ${retries - 1}`);
            retries--;
            if (retries === 0) throw error;
            await sleep(3000); // リトライ時は3秒待つ
        }
    }
}

// 基準駅からの交通アクセス情報算出（script.jsのロジックのバックエンド移植）
function getTransitInfo(cityEn, station) {
    if (!station) return { time: '不明', fare: '不明' };
    const s = station.toLowerCase();
    
    if (cityEn === 'tokyo') {
        if (s.includes('東京')) return { time: '徒歩 5分', fare: '0円' };
        if (s.includes('新宿')) return { time: '電車/地下鉄 約15分', fare: '210円' };
        if (s.includes('銀座')) return { time: '徒歩/地下鉄 約5分', fare: '0円 / 180円' };
        if (s.includes('品川')) return { time: '電車 約10分', fare: '170円' };
        if (s.includes('渋谷') || s.includes('池袋')) return { time: '電車 約20分', fare: '210円' };
        return { time: '電車 約10-20分', fare: '200円〜' };
    } else if (cityEn === 'osaka') {
        if (s.includes('大阪') || s.includes('梅田')) return { time: '徒歩 5分', fare: '0円' };
        if (s.includes('なんば') || s.includes('難波') || s.includes('心斎橋')) return { time: '地下鉄 約10分', fare: '240円' };
        if (s.includes('天王寺')) return { time: '電車 約15分', fare: '200円' };
        if (s.includes('新大阪')) return { time: '電車 約5分', fare: '170円' };
        return { time: '電車/地下鉄 約15分〜', fare: '200円〜' };
    } else if (cityEn === 'kyoto') {
        if (s.includes('京都')) return { time: '徒歩 5分', fare: '0円' };
        if (s.includes('烏丸') || s.includes('河原町')) return { time: '地下鉄 約10分', fare: '230円' };
        if (s.includes('嵐山')) return { time: '電車 約20分', fare: '240円' };
        if (s.includes('祇園')) return { time: 'バス/電車 約15分', fare: '230円' };
        return { time: '地下鉄/バス 約15分〜', fare: '230円〜' };
    } else if (cityEn === 'sapporo') {
        if (s.includes('札幌')) return { time: '徒歩 5分', fare: '0円' };
        if (s.includes('大通')) return { time: '地下鉄 約2分', fare: '210円' };
        if (s.includes('すすきの')) return { time: '地下鉄 約3分', fare: '210円' };
        if (s.includes('中島公園')) return { time: '地下鉄 約5分', fare: '210円' };
        return { time: '地下鉄 約5-10分', fare: '210円〜' };
    } else if (cityEn === 'okinawa') {
        if (s.includes('那覇空港')) return { time: 'モノレール 約5分', fare: '230円' };
        if (s.includes('県庁前')) return { time: 'モノレール 約12分', fare: '300円' };
        if (s.includes('旭橋')) return { time: 'モノレール 約11分', fare: '270円' };
        if (s.includes('おもろまち')) return { time: 'モノレール 約19分', fare: '300円' };
        if (s.includes('牧志')) return { time: 'モノレール 約16分', fare: '300円' };
        return { time: 'モノレール 約15-20分', fare: '300円〜' };
    } else {
        if (s.includes('博多')) return { time: '徒歩 5分', fare: '0円' };
        if (s.includes('中洲') || s.includes('中洲川端')) return { time: '地下鉄 5分 + 徒歩5分', fare: '210円' };
        if (s.includes('天神')) return { time: '地下鉄 6分 + 徒歩3分', fare: '210円' };
        if (s.includes('祇園')) return { time: '徒歩 12分 (地下鉄1分)', fare: '0円 / 210円' };
        if (s.includes('呉服町')) return { time: 'バス 10分', fare: '150円' };
        if (s.includes('渡辺通') || s.includes('薬院')) return { time: 'バス 15分', fare: '150円' };
        return { time: 'バス/電車 約15分〜', fare: '210円〜' };
    }
}

// 住所による簡易フィルタ
function filterByCity(hotels, cityName) {
    if (!hotels) return [];
    return hotels.filter(h => {
        const info = h.hotel[0].hotelBasicInfo;
        const addr = (info.address1 || '') + (info.address2 || '');
        return addr.includes(cityName);
    });
}

// ホテルの静的HTMLカードレンダリング
function renderHotelCards(hotels, city) {
    if (!hotels || hotels.length === 0) {
        return '<p class="error-message">ただいま、対象のプランがございません。時間をおいて再度お試しください。</p>';
    }

    let html = '';
    const baseStation = city.baseStation;
    const limit = Math.min(hotels.length, 10); // 各タブ最大10件静的書き出し

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

        const transit = getTransitInfo(city.en, info.nearestStation);

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
                            <span class="transit-badge"><i class="fa-regular fa-clock"></i> ${baseStation}から${transit.time}</span>
                            <span class="fare-badge"><i class="fa-solid fa-yen-sign"></i> ${transit.fare}</span>
                        </div>
                        <div class="hotel-price"><span style="font-size: 0.9rem">最安料金:</span> <span class="price-amount">¥${priceLabel}</span><span style="font-size: 0.9rem">~ /泊</span></div>
                        <div class="review-widget"><div class="review-stars">${starsHtml}</div><div class="review-score">${reviewAvg !== '---' ? reviewAvg : ''}</div><div class="review-count">(${reviewCount}件の口コミ)</div></div>
                        <a href="${targetUrl}" target="_blank" rel="noopener noreferrer" class="booking-button">詳細・予約を見る</a>
                    </div>
                </div>`;
    }
    return html;
}

// Gemini API を使用して、都市ごとのオリジナルコラムを生成する
async function generateCityAIContent(city) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.warn("Warning: GEMINI_API_KEY is not defined. Using fallback metadata.");
        return {
            metaDescription: `${city.name}の格安プラン・おすすめホテルと観光地情報を毎日自動更新！旅費を節約してお得に楽しむためのトラベルガイド。`,
            heroTitle: `次の旅を、\n${city.name}の中心から。`,
            heroSubtitle: `日本の魅力的な都市、${city.name}。最安プランから高級ホテルまで、本日の注目情報を網羅。`,
            articleHtml: `<h3>${city.name}の魅力溢れる旅</h3><p>${city.name}は、観光・グルメ・文化などあらゆる魅力が詰まった都市です。本ガイドではおすすめの厳選宿と、コストを抑えて楽しむための観光情報を紹介します。</p>`
        };
    }

    try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `
以下の都市に関する旅行予約・観光ガイド用の、魅力的かつSEOに最適化されたオリジナルの大長編解説コラム（日本語）を生成してください。
競合サイトを圧倒する、圧倒的な網羅性と専門的な視点を持つコラムにしてください。

都市名: ${city.name} (英語名: ${city.en})

【出力フォーマット】
以下のJSONフォーマット（プレーンなJSONオブジェクトのみ、Markdownの\`\`\`json等のコードブロック囲みは不要）で出力してください。

{
  "metaDescription": "120文字〜140文字程度で、検索エンジン向けに都市の魅力を要約し、検索結果でクリックしたくなるような紹介文。",
  "heroTitle": "次の旅を、\\n${city.name}の中心から。",
  "heroSubtitle": "ヒーローセクションに表示する、その都市を表現した魅力的で洗練された紹介文（2〜3文程度）。",
  "articleHtml": "<h3>${city.name}の魅力と旅のコンセプト（魅力的な見出しに変更可）</h3><p>【ここに200文字以上の魅力的な導入文】</p><h3>予算を抑えて楽しむ、賢い${city.name}滞在プラン（見出し変更可）</h3><p>【ここに300文字以上の具体的な旅のスタイル、予算の節約と楽しみ方のコツ】</p><h3>エリア別の特徴とおすすめの滞在拠点（見出し変更可）</h3><p>【ここに500文字以上の主要エリアの解説と、それぞれの移動の利便性や宿選びのポイント】</p><h3>${city.name}で味わうべき絶品ローカルグルメ（見出し変更可）</h3><p>【ここに400文字以上の地元ならではの食文化やおすすめグルメエリアの解説】</p><h3>旅をより豊かにする、非日常の体験（見出し変更可）</h3><p>【ここに300文字以上の滞在体験を想起させる結びの文章】</p>"
}

※articleHtmlは必ず上記構成の通り、複数の<h3>と<p>でマークアップされた合計1,500〜2,000文字の非常にボリュームのある素晴らしい内容にしてください。
`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json'
            }
        });

        const jsonText = response.text;
        const cleanedJson = jsonText.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
        return JSON.parse(cleanedJson);
    } catch (e) {
        console.error(`Error generating AI content for ${city.name}:`, e);
        return null;
    }
}

// 既存の index.html から特定の静的セクション（Budget Guide、Gateways）をスクレイプして再利用する関数
function parseExistingStaticSections(cityEn) {
    const filePath = path.join(__dirname, `../${cityEn}/index.html`);
    if (!fs.existsSync(filePath)) {
        return { budgetGuide: '', gateways: '' };
    }

    const html = fs.readFileSync(filePath, 'utf8');

    // 1. Budget Guide Contentの抽出
    let budgetGuide = '';
    const budgetRegex = /<section[^>]*id="budget-guide"[^>]*>[\s\S]*?<div[^>]*class="section-header"[^>]*>[\s\S]*?<\/div>([\s\S]*?)<\/section>/i;
    const budgetMatch = html.match(budgetRegex);
    if (budgetMatch && budgetMatch[1]) {
        budgetGuide = budgetMatch[1].trim();
    }

    // 2. Gateways (Access) Contentの抽出
    let gateways = '';
    const destRegex = /<section[^>]*id="destinations"[^>]*>[\s\S]*?<div[^>]*class="section-header"[^>]*>[\s\S]*?<\/div>([\s\S]*?)<\/section>/i;
    const destMatch = html.match(destRegex);
    if (destMatch && destMatch[1]) {
        gateways = destMatch[1].trim();
    }

    // フォールバック
    if (!budgetGuide) {
        console.warn(`Warning: Could not parse Budget Guide for ${cityEn}. Using default placeholder.`);
        budgetGuide = '<p>観光・お食事情報は現在準備中です。</p>';
    }
    if (!gateways) {
        console.warn(`Warning: Could not parse Gateways for ${cityEn}. Using default placeholder.`);
        gateways = '<p>アクセス情報は現在準備中です。</p>';
    }

    return { budgetGuide, gateways };
}

async function run() {
    console.log('Starting static generation for city pages...');

    let templateHtml = fs.readFileSync(TEMPLATE_PATH, 'utf8');

    for (const city of CITIES) {
        console.log(`\n========================================\nProcessing city: ${city.name} (${city.en})\n========================================`);

        // 1. 既存の静的観光地ガイド等のコンテンツを抽出
        const { budgetGuide, gateways } = parseExistingStaticSections(city.en);

        // 2. 楽天APIから5カテゴリの宿情報を取得
        console.log('Fetching hotel data from Rakuten API...');
        
        // パラメータ
        const baseParams = {
            applicationId: RAKUTEN_APP_ID,
            accessKey: 'pk_5MWJwVdIjLhdoj7Zg1RriahaHY2JahwsKyl6c3KDRkG',
            affiliateId: RAKUTEN_AFFILIATE_ID,
            format: 'json',
            largeClassCode: 'japan',
            middleClassCode: city.middle,
            smallClassCode: city.small
        };
        if (city.detail) {
            baseParams.detailClassCode = city.detail;
        }

        // A. 最安値
        console.log('- Fetching deals...');
        const dealsData = await fetchRakutenAPI('https://openapi.rakuten.co.jp/engine/api/Travel/SimpleHotelSearch/20170426', {
            ...baseParams,
            sort: '+roomCharge'
        });

        // B. レディース
        console.log('- Fetching ladies...');
        const ladiesData = await fetchRakutenAPI('https://openapi.rakuten.co.jp/engine/api/Travel/KeywordHotelSearch/20170426', {
            ...baseParams,
            keyword: 'レディース'
        });

        // C. カップル
        console.log('- Fetching couple...');
        const coupleData = await fetchRakutenAPI('https://openapi.rakuten.co.jp/engine/api/Travel/KeywordHotelSearch/20170426', {
            ...baseParams,
            keyword: `${city.name} カップル`
        });

        // D. 高級宿
        console.log('- Fetching luxury...');
        const luxuryData = await fetchRakutenAPI('https://openapi.rakuten.co.jp/engine/api/Travel/SimpleHotelSearch/20170426', {
            ...baseParams,
            sort: '-roomCharge'
        });

        // E. 駅チカ
        console.log('- Fetching station...');
        const stationData = await fetchRakutenAPI('https://openapi.rakuten.co.jp/engine/api/Travel/KeywordHotelSearch/20170426', {
            ...baseParams,
            keyword: '駅近'
        });

        // フィルタ処理
        const filterName = city.en === 'okinawa' ? '那覇市' : (city.en === 'sapporo' ? '札幌市' : (city.en === 'kyoto' ? '京都市' : (city.en === 'osaka' ? '大阪市' : (city.en === 'tokyo' ? '東京都' : '福岡市'))));

        const hotelsDeals = dealsData?.hotels || [];
        const hotelsLadies = filterByCity(ladiesData?.hotels, filterName);
        const hotelsCouple = filterByCity(coupleData?.hotels, filterName);
        const hotelsLuxury = filterByCity(luxuryData?.hotels, filterName);
        const hotelsStation = filterByCity(stationData?.hotels, filterName);

        // カードHTML組み立て
        const htmlDeals = renderHotelCards(hotelsDeals, city);
        const htmlLadies = renderHotelCards(hotelsLadies, city);
        const htmlCouple = renderHotelCards(hotelsCouple, city);
        const htmlLuxury = renderHotelCards(hotelsLuxury, city);
        const htmlStation = renderHotelCards(hotelsStation, city);

        // 3. Gemini APIでコラムやメタタグ生成
        console.log('Generating AI Guide Content from Gemini...');
        const aiContent = await generateCityAIContent(city);

        // 4. JSON-LD（観光地＆ホテルリスト構造化データ）の構築
        const allFeaturedHotels = [...hotelsDeals.slice(0, 5), ...hotelsLuxury.slice(0, 5)];
        const itemListElement = allFeaturedHotels.map((h, index) => {
            const info = h.hotel[0].hotelBasicInfo;
            const targetUrl = `https://hb.afl.rakuten.co.jp/hgc/${RAKUTEN_AFFILIATE_ID}/?pc=https%3A%2F%2Ftravel.rakuten.co.jp%2FHOTEL%2F${info.hotelNo}%2F${info.hotelNo}.html`;
            return {
                "@type": "ListItem",
                "position": index + 1,
                "item": {
                    "@type": "Hotel",
                    "name": info.hotelName,
                    "image": info.hotelImageUrl,
                    "address": {
                        "@type": "PostalAddress",
                        "addressRegion": info.address1 || "",
                        "streetAddress": info.address2 || "",
                        "addressCountry": "JP"
                    },
                    "url": targetUrl
                }
            };
        });

        const jsonLd = {
            "@context": "https://schema.org",
            "@graph": [
                {
                    "@type": "TouristDestination",
                    "name": `${city.name} / ${city.en.toUpperCase()}`,
                    "description": aiContent?.metaDescription || "",
                    "touristType": ["Sightseeing", "Gourmet", "Hotels"],
                    "url": `https://tabi-plan.org/${city.en}/`
                },
                {
                    "@type": "ItemList",
                    "name": `${city.name}の厳選・格安おすすめホテル一覧`,
                    "numberOfItems": itemListElement.length,
                    "itemListElement": itemListElement
                }
            ]
        };
        const jsonLdString = `<script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n</script>`;

        // 5. テンプレートへマージ
        const now = new Date();
        const jstDate = new Intl.DateTimeFormat('ja-JP', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit',
            timeZone: 'Asia/Tokyo'
        }).format(now);

        let finalHtml = templateHtml;

        const data = {
            '{{CITY_NAME}}': city.name,
            '{{CITY_EN}}': city.en,
            '{{HERO_BG_IMAGE}}': city.bgImage,
            '{{META_DESCRIPTION}}': aiContent?.metaDescription || '',
            '{{JSON_LD}}': jsonLdString,
            '{{HERO_TITLE}}': (aiContent?.heroTitle || `次の旅を、\n${city.name}の中心から。`).replace(/\n/g, '<br>'),
            '{{HERO_SUBTITLE}}': aiContent?.heroSubtitle || '',
            '{{CITY_GUIDE_CONTENT}}': aiContent?.articleHtml || '',
            '{{HOTELS_DEALS}}': htmlDeals,
            '{{HOTELS_LADIES}}': htmlLadies,
            '{{HOTELS_COUPLE}}': htmlCouple,
            '{{HOTELS_LUXURY}}': htmlLuxury,
            '{{HOTELS_STATION}}': htmlStation,
            '{{BUDGET_GUIDE_CONTENT}}': budgetGuide,
            '{{GATEWAY_CONTENT}}': gateways,
            '{{UPDATE_TIME}}': jstDate
        };

        for (const [key, value] of Object.entries(data)) {
            finalHtml = finalHtml.split(key).join(value);
        }

        // 保存ディレクトリの存在確認
        const outputDir = path.join(__dirname, `../${city.en}`);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const outputPath = path.join(outputDir, 'index.html');
        fs.writeFileSync(outputPath, finalHtml);
        console.log(`SUCCESS: Generated city page for ${city.name} at: ${city.en}/index.html`);
    }

    console.log('\n========================================\nALL CITY PAGES GENERATED SUCCESSFULLY!\n========================================');
}

run().catch(err => {
    console.error('Fatal Error during city page generation:', err);
    process.exit(1);
});
