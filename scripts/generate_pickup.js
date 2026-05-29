const axios = require('axios');
const fs = require('fs');
const path = require('path');
const Kuroshiro = require('kuroshiro').default;
const KuromojiAnalyzer = require('kuroshiro-analyzer-kuromoji');
const { GoogleGenAI } = require('@google/genai');

const RAKUTEN_APP_ID = 'ecc263bd-2573-4a88-933e-159e08ff4fff';
const RAKUTEN_AFFILIATE_ID = '047ad0f1.183c70cf.047ad0f2.1e4c3769';

const TEMPLATE_PATH = path.join(__dirname, '../pickup/template.html');

// kuroshiroのインスタンスを初期化（一度だけ）
const kuroshiro = new Kuroshiro();
let kuroshiroReady = false;

async function initKuroshiro() {
    if (!kuroshiroReady) {
        await kuroshiro.init(new KuromojiAnalyzer());
        kuroshiroReady = true;
    }
}

// ホテル名スラグ生成用：よく使われる用語を先に英語に置換してから変換
const HOTEL_WORD_MAP = [
    [/ホテル/g, 'hotel'],
    [/リゾート/g, 'resort'],
    [/グランド/g, 'grand'],
    [/ロイヤル/g, 'royal'],
    [/パレス/g, 'palace'],
    [/タワー/g, 'tower'],
    [/ガーデン/g, 'garden'],
    [/プラザ/g, 'plaza'],
    [/ウィング|ウイング/g, 'wing'],
    [/ザ・|ザ /g, 'the '],
    [/オークラ/g, 'okura'],
    [/ニッコウ|ニッコー|ニッコ/g, 'nikko'],
    [/ヒルトン/g, 'hilton'],
    [/マリオット/g, 'marriott'],
    [/シェラトン/g, 'sheraton'],
    [/ハイアット/g, 'hyatt'],
    [/インターコンチネンタル/g, 'intercontinental'],
    [/コンラッド/g, 'conrad'],
    [/フォーシーズンズ|フォー・シーズンズ/g, 'four-seasons'],
    [/リッツ・カールトン|リッツカールトン/g, 'ritz-carlton'],
    [/ウェスティン/g, 'westin'],
    [/セントレジス/g, 'st-regis'],
    [/ワシントン/g, 'washington'],
    [/プリンス/g, 'prince'],
    [/センチュリー/g, 'century'],
    [/インターナショナル/g, 'intl'],
    [/東急/g, 'tokyu'],
    [/京王/g, 'keio'],
    [/近鉄/g, 'kintetsu'],
    [/アネックス/g, 'annex'],
    [/ビジネス/g, 'business'],
    [/スイート/g, 'suite'],
    [/クラブ/g, 'club'],
    [/エグゼクティブ/g, 'executive'],
    [/レジデンス/g, 'residence'],
    [/コート/g, 'court'],
    [/フロント/g, 'front'],
    [/ステーション/g, 'station'],
    [/オリエンタル/g, 'oriental'],
    [/パシフィック/g, 'pacific'],
    [/メトロポリタン/g, 'metropolitan'],
    [/セレナーデ|セレーネ/g, 'serene'],
    [/ブロッサム/g, 'blossom'],
    [/グレース/g, 'grace'],
    [/ハレクラニ/g, 'halekulani'],
    [/セントラル/g, 'central'],
    [/大阪/g, 'osaka'],
    [/東京/g, 'tokyo'],
    [/京都/g, 'kyoto'],
    [/札幌/g, 'sapporo'],
    [/福岡/g, 'fukuoka'],
    [/沖縄/g, 'okinawa'],
    [/神戸/g, 'kobe'],
    [/横浜/g, 'yokohama'],
    [/名古屋/g, 'nagoya'],
    [/博多/g, 'hakata'],
    [/新宿/g, 'shinjuku'],
    [/渋谷/g, 'shibuya'],
    [/銀座/g, 'ginza'],
    [/梅田/g, 'umeda'],
    [/難波|なんば/g, 'namba'],
    [/祇園/g, 'gion'],
    [/四条|四條/g, 'shijo'],
    [/河原町/g, 'kawaramachi'],
    [/中央/g, 'chuo'],
    [/湯縁|由縁/g, 'yuen'],
    [/温泉旅館/g, 'onsen-ryokan'],
    [/温泉/g, 'onsen'],
    [/旅館/g, 'ryokan'],
    [/　/g, ' '],  // 全角スペース→半角
];

// ホテル名を英語スラグ（URL用）に変換する関数
// cityEn: 都市の英語名（例: 'kyoto', 'tokyo'）
async function toSlug(japaneseName, cityEn) {
    try {
        await initKuroshiro();

        // Step1: 辞書で既知の用語を先に英語に置換
        let name = japaneseName;
        for (const [pattern, replacement] of HOTEL_WORD_MAP) {
            name = name.replace(pattern, ` ${replacement} `);
        }

        // Step2: 残った日本語をkuroshiroでローマ字変換
        const romaji = await kuroshiro.convert(name, { to: 'romaji', mode: 'spaced' });

        // Step3: スラグ形式に整形
        let slug = romaji
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .trim()
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');

        // Step4: 長すぎる場合は最初の4単語（ハイフン区切り）だけ使用
        const parts = slug.split('-').filter(p => p.length > 0);
        if (parts.length > 4) {
            slug = parts.slice(0, 4).join('-');
        }

        // Step5: 都市名が含まれていない場合は末尾に追加
        if (cityEn && !slug.includes(cityEn.toLowerCase())) {
            slug = `${slug}-${cityEn.toLowerCase()}`;
        }

        return slug.substring(0, 45);
    } catch (e) {
        // 変換失敗時はフォールバック
        return null;
    }
}

async function getHotelDetail(hotelNo) {
    const url = 'https://openapi.rakuten.co.jp/engine/api/Travel/HotelDetailSearch/20170426';
    const params = {
        applicationId: RAKUTEN_APP_ID,
        accessKey: 'pk_5MWJwVdIjLhdoj7Zg1RriahaHY2JahwsKyl6c3KDRkG',
        affiliateId: RAKUTEN_AFFILIATE_ID,
        format: 'json',
        hotelNo: hotelNo
    };

    try {
        const response = await axios.get(url, { params, headers: { 'Referer': 'https://tabi-plan.org/', 'Origin': 'https://tabi-plan.org' } });
        if (response.data && response.data.hotels) {
            return response.data.hotels[0].hotel[0];
        }
    } catch (error) {
        console.error('Error fetching hotel detail:', error.message);
    }
    return null;
}

// AIが宿を「選ぶ」ための関数
async function findPremiumHotels(city) {
    const url = 'https://openapi.rakuten.co.jp/engine/api/Travel/SimpleHotelSearch/20170426';
    const params = {
        applicationId: RAKUTEN_APP_ID,
        accessKey: 'pk_5MWJwVdIjLhdoj7Zg1RriahaHY2JahwsKyl6c3KDRkG',
        format: 'json',
        largeClassCode: 'japan',
        middleClassCode: city.middle,
        smallClassCode: city.small
    };
    if (city.detail) {
        params.detailClassCode = city.detail;
    }

    try {
        const response = await axios.get(url, { params, headers: { 'Referer': 'https://tabi-plan.org/', 'Origin': 'https://tabi-plan.org' } });
        const hotels = response.data.hotels.filter(h => h.hotel[0].hotelBasicInfo.reviewAverage >= 4.0);
        // 評価が高い順にソート
        return hotels.sort((a, b) => b.hotel[0].hotelBasicInfo.reviewAverage - a.hotel[0].hotelBasicInfo.reviewAverage);
    } catch (error) {
        console.error('Error finding hotels:', error.message);
        return [];
    }
}

// Gemini API を使用して、ホテル情報に基づいた完全オリジナルのSEO最適化コンテンツを生成する
async function generateAIContent(info) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.warn("Warning: GEMINI_API_KEY is not defined. Falling back to default static content.");
        return null;
    }

    try {
        const ai = new GoogleGenAI({ apiKey });
        
        const prompt = `
以下のホテル情報をもとに、旅行予約サイトの紹介記事として、魅力的かつSEOに最適化されたオリジナルの文章（日本語）を生成してください。
楽天APIの元の説明文をそのまま使わず、完全オリジナルの文章を作成してください。

【重要ルール：CVR（成約率）を最大化するライティング】
単なるホテルのスペック紹介ではなく、「客観的ロジック（なぜこの宿が今一番お得なのか）」と「緊急性・限定性（なぜ今すぐ予約すべきか）」を必ず含めてください。
「AIが過去の価格やコスパ評価を解析した結果、今が最もお得である」という文脈で説得力を持たせてください。

【ホテル情報】
ホテル名: ${info.hotelName}
キャッチコピー: ${info.hotelSpecial || 'なし'}
特徴・設備・詳細情報: 
${info.hotelInformationEmail || 'なし'}
住所: ${info.address1}${info.address2}
最安料金目安: ${info.hotelMinCharge || '不明'} 円
クチコミ評価: ${info.reviewAverage || '4.0'} / 5.0 (件数: ${info.reviewCount || 0}件)
アクセス: ${info.access || 'なし'}

【出力フォーマット】
以下のJSONフォーマット（プレーンなJSONオブジェクトのみ、Markdownの\`\`\`json等のコードブロック囲みは不要）で出力してください。

{
  "metaDescription": "120文字程度で、検索エンジン向けにホテルの魅力を簡潔にまとめ、クリックしたくなるような紹介文。",
  "catchcopy": "ホテルの魅力を表現した、キャッチーで短い一行のキャッチコピー。",
  "smartPoint": "【AI価格解析】等の言葉を使い、コスパ評価や相場と比較して『なぜ今この価格がバグっている（お得）なのか』を客観的・論理的に解説する文章(100文字)。",
  "beautifulPoint": "空間の情緒的な魅力と、『浮いた予算でこんな贅沢ができる』という賢いラグジュアリー（Smart & Luxury）の提案(100文字)。",
  "locationPoint": "立地の良さと、それを活かした旅のメリット(100文字)。",
  "detailedDescription": "プレーンなテキスト（段落タグ不要）で出力してください。全体で400〜600文字程度。内容は以下の順で構成してください。①AIによる厳選理由（客観的ロジック）、②滞在のエモーショナルな情景、③『空室が埋まる前に本日中の予約推奨』など、今すぐポチらないと損をする緊急性を煽るクロージング文。"
}
`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json'
            }
        });

        const jsonText = response.text;
        // マークダウンのコードブロックなどで囲まれていた場合を取り除く
        const cleanedJson = jsonText.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
        const parsedData = JSON.parse(cleanedJson);
        
        // detailedDescriptionの句点「。」ごとに空行（\n\n）を入れて極限まで読みやすくする
        if (parsedData.detailedDescription) {
            parsedData.detailedDescription = parsedData.detailedDescription.replace(/。/g, '。\n\n').trim();
        }
        
        return parsedData;
    } catch (e) {
        console.error("Error generating AI content:", e);
        return null;
    }
}

// cityEn: 都市の英語名（スラグに使用）
async function generateArticle(hotelNo, category = '今週のピックアップ', cityEn = '') {
    const hotel = await getHotelDetail(hotelNo);
    if (!hotel) return null;

    const info = hotel.hotelBasicInfo;
    const rating = info.reviewAverage || '4.0';
    
    // 日本時間（JST）で今日の日付を取得するヘルパー
    const now = new Date();
    const jstDate = new Intl.DateTimeFormat('ja-JP', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        timeZone: 'Asia/Tokyo'
    }).format(now).replace(/\//g, '-');

    // ホテル名を英語スラグに変換してURLに含める（都市名付き）
    const slug = await toSlug(info.hotelName, cityEn) || `hotel-${hotelNo}`;
    const fileName = `${jstDate}-${slug}.html`;
    const outputPath = path.join(__dirname, '../pickup/', fileName);
    
    // 上書き防止：既にファイルが存在する場合はエラーを出す
    if (fs.existsSync(outputPath)) {
        console.error(`Error: Article for ${jstDate} already exists at ${fileName}. Skipping to prevent overwrite.`);
        return null;
    }

    // Gemini APIでオリジナルコンテンツを生成
    console.log(`Generating AI content for ${info.hotelName}...`);
    const aiData = await generateAIContent(info);
    if (aiData) {
        console.log("Successfully generated AI content.");
    } else {
        console.warn("AI generation failed or skipped. Using fallback content.");
    }

    // JSON-LDを生成
    const hotelJsonLd = {
        "@context": "https://schema.org",
        "@type": "Hotel",
        "name": info.hotelName,
        "description": aiData?.metaDescription || info.hotelSpecial || '',
        "image": info.hotelImageUrl,
        "address": {
            "@type": "PostalAddress",
            "postalCode": info.postalCode || "",
            "addressRegion": info.address1 || "",
            "streetAddress": info.address2 || "",
            "addressCountry": "JP"
        },
        "telephone": info.telephoneNo || "",
        "url": `https://tabi-plan.org/pickup/${fileName}`
    };
    if (info.reviewAverage && Number(info.reviewCount) > 0) {
        hotelJsonLd.aggregateRating = {
            "@type": "AggregateRating",
            "ratingValue": String(info.reviewAverage),
            "reviewCount": String(info.reviewCount),
            "bestRating": "5",
            "worstRating": "1"
        };
    }

    const articleJsonLd = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": `${info.hotelName} - 本日の注目宿`,
        "image": info.hotelImageUrl,
        "datePublished": `${now.toISOString().split('T')[0]}T00:00:00+09:00`,
        "author": {
            "@type": "Person",
            "name": "タビト",
            "jobTitle": "編集長 / AIデータサイエンティスト×元企画会社社員",
            "url": "https://tabi-plan.org/"
        },
        "publisher": {
            "@type": "Organization",
            "name": "Tabi Plan",
            "logo": {
                "@type": "ImageObject",
                "url": "https://tabi-plan.org/favicon.svg"
            }
        }
    };

    const jsonLdString = `<script type="application/ld+json">\n${JSON.stringify([hotelJsonLd, articleJsonLd], null, 2)}\n</script>`;

    let html = fs.readFileSync(TEMPLATE_PATH, 'utf8');

    const defaultDesc = `<p>${info.hotelInformationEmail || '詳しい情報は予約ページをご確認ください。'}</p><p>旅の疲れを癒やす心地よい空間。モダンなインテリアと落ち着いた照明が、上質なひとときを演出します。</p>`;

    const data = {
        '{{HOTEL_NAME}}': info.hotelName,
        '{{CATEGORY_NAME}}': category,
        '{{HERO_IMAGE}}': info.hotelImageUrl,
        '{{CATCHCOPY}}': aiData?.catchcopy || info.hotelSpecial || '非日常を楽しむ、極上の滞在を。',
        '{{SMART_POINT}}': aiData?.smartPoint || `評価${rating}の高水準でありながら、周辺相場と比較しても納得のプライス。`,
        '{{BEAUTIFUL_POINT}}': aiData?.beautifulPoint || info.hotelSpecial || '洗練された空間デザインと、細やかなおもてなし。',
        '{{LOCATION_POINT}}': aiData?.locationPoint || info.access || '主要駅からのアクセスも良好で、観光の拠点に最適。',
        '{{DETAILED_DESCRIPTION}}': aiData?.detailedDescription || defaultDesc,
        '{{ADDRESS}}': `${info.address1}${info.address2}`,
        '{{MIN_CHARGE}}': info.hotelMinCharge ? `${Number(info.hotelMinCharge).toLocaleString()}円〜` : '設定なし',
        '{{RATING}}': rating,
        '{{FACILITIES}}': 'Wi-Fi, レストラン, 大浴場, ルームサービス等',
        '{{AFFILIATE_URL}}': `https://hb.afl.rakuten.co.jp/hgc/${RAKUTEN_AFFILIATE_ID}/?pc=https%3A%2F%2Ftravel.rakuten.co.jp%2FHOTEL%2F${hotelNo}%2F${hotelNo}.html`,
        '{{PUBLISH_DATE}}': jstDate,
        '{{FILENAME}}': fileName,
        '{{META_DESCRIPTION}}': aiData?.metaDescription || `${info.hotelName}の紹介。${info.hotelSpecial || ''}`.substring(0, 140),
        '{{JSON_LD}}': jsonLdString
    };

    for (const [key, value] of Object.entries(data)) {
        html = html.split(key).join(value);
    }
    
    fs.writeFileSync(outputPath, html);
    console.log(`Successfully generated article: ${fileName}`);
    return { fileName, info, data };
}

module.exports = { generateArticle, findPremiumHotels };
