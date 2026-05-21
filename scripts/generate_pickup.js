const axios = require('axios');
const fs = require('fs');
const path = require('path');
const Kuroshiro = require('kuroshiro').default;
const KuromojiAnalyzer = require('kuroshiro-analyzer-kuromoji');

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
        const response = await axios.get(url, { params, headers: { 'Referer': 'https://tabi-plan.org/' } });
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
        const response = await axios.get(url, { params, headers: { 'Referer': 'https://tabi-plan.org/' } });
        const hotels = response.data.hotels.filter(h => h.hotel[0].hotelBasicInfo.reviewAverage >= 4.0);
        // 評価が高い順にソート
        return hotels.sort((a, b) => b.hotel[0].hotelBasicInfo.reviewAverage - a.hotel[0].hotelBasicInfo.reviewAverage);
    } catch (error) {
        console.error('Error finding hotels:', error.message);
        return [];
    }
}

// cityEn: 都市の英語名（スラグに使用）
async function generateArticle(hotelNo, category = '今週のピックアップ', cityEn = '') {
    const hotel = await getHotelDetail(hotelNo);
    if (!hotel) return;

    const info = hotel.hotelBasicInfo;
    const rating = info.reviewAverage || '4.0';
    
    let html = fs.readFileSync(TEMPLATE_PATH, 'utf8');

    // 置換処理
    // 日本時間（JST）で今日の日付を取得するヘルパー
    const now = new Date();
    const jstDate = new Intl.DateTimeFormat('ja-JP', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        timeZone: 'Asia/Tokyo'
    }).format(now).replace(/\//g, '-');

    const data = {
        '{{HOTEL_NAME}}': info.hotelName,
        '{{CATEGORY_NAME}}': category,
        '{{HERO_IMAGE}}': info.hotelImageUrl,
        '{{CATCHCOPY}}': info.hotelSpecial || '非日常を楽しむ、極上の滞在を。',
        '{{SMART_POINT}}': `評価${rating}の高水準でありながら、周辺相場と比較しても納得のプライス。`,
        '{{BEAUTIFUL_POINT}}': info.hotelSpecial || '洗練された空間デザインと、細やかなおもてなし。',
        '{{LOCATION_POINT}}': info.access || '主要駅からのアクセスも良好で、観光の拠点に最適。',
        '{{DETAILED_DESCRIPTION}}': `<p>${info.hotelInformationEmail || '詳しい情報は予約ページをご確認ください。'}</p><p>旅の疲れを癒やす心地よい空間。モダンなインテリアと落ち着いた照明が、上質なひとときを演出します。</p>`,
        '{{ADDRESS}}': `${info.address1}${info.address2}`,
        '{{MIN_CHARGE}}': `${Number(info.hotelMinCharge).toLocaleString()}円〜`,
        '{{RATING}}': rating,
        '{{FACILITIES}}': 'Wi-Fi, レストラン, 大浴場, ルームサービス等',
        '{{AFFILIATE_URL}}': `https://hb.afl.rakuten.co.jp/hgc/${RAKUTEN_AFFILIATE_ID}/?pc=https%3A%2F%2Ftravel.rakuten.co.jp%2FHOTEL%2F${hotelNo}%2F${hotelNo}.html`,
        '{{PUBLISH_DATE}}': jstDate
    };

    for (const [key, value] of Object.entries(data)) {
        html = html.split(key).join(value);
    }

    // ホテル名を英語スラグに変換してURLに含める（都市名付き）
    const slug = await toSlug(info.hotelName, cityEn) || `hotel-${hotelNo}`;
    const fileName = `${jstDate}-${slug}.html`;
    const outputPath = path.join(__dirname, '../pickup/', fileName);
    
    // 上書き防止：既にファイルが存在する場合はエラー（例外）を出す
    if (fs.existsSync(outputPath)) {
        console.error(`Error: Article for ${jstDate} already exists at ${fileName}. Skipping to prevent overwrite.`);
        return null;
    }
    
    fs.writeFileSync(outputPath, html);
    console.log(`Successfully generated article: ${fileName}`);
    return { fileName, info, data };
}

// 実行例（もしホテルIDが分かればここに入れる）
// generateArticle(12345);

module.exports = { generateArticle, findPremiumHotels };
