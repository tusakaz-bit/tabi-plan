try { require('dotenv').config(); } catch (e) { /* CI環境では無視 */ }
const fs = require('fs');
const path = require('path');

// node_modules の安全な読み込み
let axios;
try {
    axios = require('axios');
} catch (e) {
    axios = require(path.join(__dirname, 'node_modules/axios'));
}

const RAKUTEN_APP_ID = 'ecc263bd-2573-4a88-933e-159e08ff4fff';
const RAKUTEN_AFFILIATE_ID = '047ad0f1.183c70cf.047ad0f2.1e4c3769';
const ACCESS_KEY = 'pk_5MWJwVdIjLhdoj7Zg1RriahaHY2JahwsKyl6c3KDRkG';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// 対象ホテル定義
const TARGET_HOTELS = [
    {
        keyword: 'ホテルリソルトリニティ博多',
        fallbackNo: 130169,
        badge: '中洲川端駅 徒歩1分 / 女性専用フロア＆展望大浴場',
        subtitle: '【中洲川端駅徒歩1分＆展望大浴場】ReFa完備の女性専用フロアで贅沢ケア',
        text: `地下鉄空港線「中洲川端駅」から徒歩1分という好立地に位置し、ビジネスにも観光にも抜群の利便性を誇ります。
最大の特徴は、13階に設けられた女性専用フロア（レディースフロア）です。こちらのフロアには、大人気のReFa（リファ）製ドライヤーやシャワーヘッドなどの厳選された美容アメニティが完備されており、旅先でもワンランク上のケアを楽しめます。
さらに、女性フロアからは14階の展望大浴場（スカイバス）へダイレクトにアクセス可能。他のフロアの利用者の目を気にすることなく、ゆっくりと大浴場へ向かい、一日の疲れを癒すことができる配慮が施されています。清潔感あふれるインテリアと充実したセキュリティで、女性一人旅に心からおすすめできるホテルです。`
    },
    {
        keyword: 'The BREAKFAST HOTEL 福岡中洲',
        fallbackNo: 167056,
        badge: '中洲川端駅 徒歩2分 / シャンプー＆バスソルトバー',
        subtitle: '【シャンプー＆バスソルトバー】中洲川端駅徒歩2分！セキュリティ充実で癒しの宿',
        text: `疲れた心と体をリフレッシュしたい女性にぴったりなのがこちらのホテル。地下鉄「中洲川端駅」から徒歩2分、すぐ隣には24時間営業のドン・キホーテがあるため、夜遅い時間の買い物も安心です。
1階のアメニティスペースには「シャンプー＆バスソルトバー」があり、好きな香りの入浴剤を選んでお部屋の深めのバスタブでゆったりくつろげます。
エレベーターのカードキー制御はもちろん、深夜1時以降は正面玄関が施錠されるため、セキュリティ面も万全です。`
    },
    {
        keyword: 'ホテル博多プレイス',
        fallbackNo: 76358,
        badge: '全室バス・トイレ別 / マンション型オートロック',
        subtitle: '【全室バス・トイレ別】ワンルームマンション型の完全プライベート空間',
        text: `「自分の家のようにくつろぎたい」という方におすすめなのが、全室バス・トイレ別でミニキッチンや電子レンジが完備されたこちらのホテルです。
マンション一体型構造でオートロックなど集合住宅同等のセキュリティを備えており、常駐フロントもあるため一人でも安心です。
女性スタッフ考案の「11点特典付きレディースプラン」を選べば、ジルスチュアートのバスタイムセットやPOLAのスキンケアキットなど、心躍るアメニティを満喫できます。`
    },
    {
        keyword: 'ホテル天神プレイス',
        fallbackNo: 70206,
        badge: '天神南駅 徒歩5分 / 男子禁制フロア＆24時間常駐警備',
        subtitle: '【男子禁制フロア＆ReFa完備】24時間警備で圧倒的安心感',
        text: `天神南駅から徒歩5分。圧倒的な安心感を誇るのが、24時間365日警備員が常駐し、敷地内に多数の防犯カメラを備えるこちらのホテルです。
6階は男性の立ち入りが一切できない完全な「女性専用フロア」となっており、フロア内や特定のお部屋にはReFaの美容家電や「雪肌精」「コスメデコルテ」などの高級スキンケアが完備。
メイク専用照明つきデスクもあるため、翌日のお出かけ準備も完璧に仕上がります。`
    },
    {
        keyword: '博多グリーンホテル 天神',
        fallbackNo: 17701,
        badge: '赤坂駅 徒歩1分・天神駅 徒歩5分 / 女性専用フロア',
        subtitle: '【駅徒歩1分の超好立地】充実の専用フロアで身軽に泊まれる高コスパ宿',
        text: `地下鉄赤坂駅から徒歩1分、天神駅からも徒歩5分という抜群のアクセス。
重いキャリーケースを持って歩く時間を最小限にできるため、体力的にも防犯的にも一人旅の強い味方です。
プライバシーに配慮した女性専用フロアが用意されており、エレベーターはルームキーをタッチしないと客室階へ上がれない安心設計。
コインランドリーにも暗証番号ロックがついているなど、細部まで女性の安心に配慮されたコスパ最強のホテルです。`
    }
];

// 楽天APIからホテル情報を取得
async function fetchHotelFromRakuten(keyword) {
    const url = 'https://openapi.rakuten.co.jp/engine/api/Travel/KeywordHotelSearch/20170426';
    const params = {
        applicationId: RAKUTEN_APP_ID,
        accessKey: ACCESS_KEY,
        affiliateId: RAKUTEN_AFFILIATE_ID,
        format: 'json',
        keyword
    };

    let retries = 3;
    while (retries > 0) {
        try {
            await sleep(1200);
            const response = await axios.get(url, {
                params,
                headers: {
                    'Referer': 'https://tabi-plan.org/',
                    'Origin': 'https://tabi-plan.org'
                }
            });
            if (response.data && response.data.hotels && response.data.hotels.length > 0) {
                return response.data.hotels[0].hotel[0].hotelBasicInfo;
            }
            return null;
        } catch (error) {
            console.error(`API Error for ${keyword}: ${error.message}. Retries: ${retries - 1}`);
            retries--;
            if (retries === 0) return null;
            await sleep(2500);
        }
    }
}

// アクセス情報を短縮抽出（全角半角正規化対応）
function extractShortAccess(accessText) {
    if (!accessText) return '駅近・好アクセス';
    // 全角数字を半角に正規化
    const normalized = accessText.replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
    
    // パターン1: 〇〇駅...徒歩〇分
    const walkMatch = normalized.match(/([^\s、。]*?駅(?:[^\s、。]*?口)?)[^\d]*徒歩(?:で)?[^\d]*(\d+)分/);
    if (walkMatch) {
        let st = walkMatch[1].replace(/^(?:【.*?】|■|JR|ＪＲ|地下鉄|私鉄|メトロ|福岡市営地下鉄|空港線)/, '').replace(/から$/, '').trim();
        if (st.length > 10) st = st.substring(0, 10);
        return `${st} 徒歩${walkMatch[2]}分`;
    }
    // パターン2: 〇〇駅...より約〇分
    const walkAltMatch = normalized.match(/([^\s、。]*?駅(?:[^\s、。]*?出口)?)[^\d]*より(?:約)?(\d+)分/);
    if (walkAltMatch) {
        let st = walkAltMatch[1].replace(/^(?:【.*?】|■|JR|ＪＲ|地下鉄|私鉄|メトロ)/, '').trim();
        if (st.length > 10) st = st.substring(0, 10);
        return `${st} 徒歩${walkAltMatch[2]}分`;
    }
    // パターン3: バス
    const busMatch = normalized.match(/([^\s、。]*?駅)[^\d]*バス(?:約)?(\d+)分/);
    if (busMatch) {
        let st = busMatch[1].replace(/^(?:【.*?】|■|JR|ＪＲ)/, '').trim();
        return `${st} バス${busMatch[2]}分`;
    }
    return '駅近・好アクセス';
}

// 句点改行フォーマッター（文末には余分な<br><br>を付けず、文間のみ適度な余白を挿入）
function formatSentenceBreaks(text) {
    if (!text) return '';
    return text
        .trim()
        .replace(/([。！？][」』]?)(?!$)(?![\s\n]*$)(?!<br)/g, '$1<br><br>');
}

// 星評価HTMLの生成
function renderStarsHtml(reviewAvg) {
    if (!reviewAvg) return '<span style="color: #94a3b8; font-size: 0.85rem;">評価なし</span>';
    const score = parseFloat(reviewAvg);
    let stars = '';
    for (let s = 1; s <= 5; s++) {
        if (score >= s) stars += '<i class="fa-solid fa-star" style="color: #fbbf24;"></i>';
        else if (score >= s - 0.5) stars += '<i class="fa-solid fa-star-half-stroke" style="color: #fbbf24;"></i>';
        else stars += '<i class="fa-regular fa-star" style="color: #94a3b8;"></i>';
    }
    return stars;
}

// ホテルカードUIの生成
function renderCuratedHotelCard(target, info) {
    const hotelNo = info ? info.hotelNo : target.fallbackNo;
    const hotelName = info ? info.hotelName : target.keyword;
    const imageUrl = (info && info.hotelImageUrl) 
        ? info.hotelImageUrl 
        : `https://img.travel.rakuten.co.jp/share/HOTEL/${hotelNo}/${hotelNo}.jpg`;
    const rating = (info && info.reviewAverage) ? Number(info.reviewAverage).toFixed(2) : '4.30';
    const reviewCount = (info && info.reviewCount) ? Number(info.reviewCount).toLocaleString() : '1,000+';
    const priceAmount = (info && info.hotelMinCharge) ? Number(info.hotelMinCharge).toLocaleString() : '5,000';
    const address = (info && info.address1) ? `${info.address1}${info.address2}` : '福岡県福岡市';
    const accessText = info ? extractShortAccess(info.access) : '駅徒歩圏内';

    const affiliateUrl = `https://hb.afl.rakuten.co.jp/hgc/${RAKUTEN_AFFILIATE_ID}/?pc=https%3A%2F%2Ftravel.rakuten.co.jp%2FHOTEL%2F${hotelNo}%2F${hotelNo}.html&m=https%3A%2F%2Ftravel.rakuten.co.jp%2FHOTEL%2F${hotelNo}%2F${hotelNo}.html`;

    const formattedText = formatSentenceBreaks(target.text);

    return `
    <div class="solotravel-card">
        <div class="solotravel-card-header">
            <div class="solotravel-card-img-wrap">
                <img src="${imageUrl}" alt="${hotelName}" loading="lazy">
                <div class="rakuten-credit" style="position: absolute; bottom: 8px; right: 8px; background: rgba(0,0,0,0.65); color: #fff; font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; z-index: 2;">Rakuten Travel</div>
            </div>
            <div class="solotravel-card-info">
                <div>
                    <div style="font-size: 0.8rem; font-weight: 700; color: #0284c7; margin-bottom: 0.4rem; display: flex; align-items: center; gap: 6px;">
                        <i class="fa-solid fa-shield-halved"></i> ${target.badge}
                    </div>
                    <h4 style="font-size: 1.3rem; font-weight: 800; color: #1e293b; margin: 0 0 0.5rem; line-height: 1.4;">${hotelName}</h4>
                    <div style="font-size: 0.85rem; font-weight: 600; color: #475569; margin-bottom: 0.8rem; line-height: 1.4;">${target.subtitle}</div>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-bottom: 0.8rem;">
                        <span class="transit-badge" style="font-size: 0.8rem; padding: 0.25rem 0.75rem;"><i class="fa-solid fa-walking"></i> ${accessText}</span>
                        <span style="font-size: 0.8rem; color: #64748b;"><i class="fa-solid fa-location-dot"></i> ${address}</span>
                    </div>
                </div>
                <div style="display: flex; flex-wrap: wrap; gap: 1.2rem; align-items: baseline; padding-top: 0.8rem; border-top: 1px dashed rgba(144, 180, 206, 0.35);">
                    <div class="review-widget" style="margin-bottom: 0; padding: 0.35rem 0.7rem; background: #f8fafc;">
                        <div class="review-stars">${renderStarsHtml(rating)}</div>
                        <div class="review-score">${rating}</div>
                        <div class="review-count">(${reviewCount}件)</div>
                    </div>
                    <div style="display: flex; flex-direction: column;">
                        <span style="font-size: 0.85rem; color: #e11d48; font-weight: 800;">
                            参考価格: <span class="price-amount" style="font-size: 1.4rem; font-weight: 900; color: #e11d48;">¥${priceAmount}</span>〜/泊
                        </span>
                        <span style="font-size: 0.7rem; color: #888; line-height: 1.2;">（※日程やプランにより変動します）</span>
                    </div>
                </div>
            </div>
        </div>
        <div class="solotravel-card-body">
            <div style="font-size: 0.95rem; font-weight: 700; color: #0f766e; margin-bottom: 0.8rem; display: flex; align-items: center; gap: 6px;">
                <i class="fa-solid fa-heart" style="color: #f43f5e;"></i> 女性一人旅におすすめの理由・ポイント
            </div>
            <div class="solotravel-card-desc">
                ${formattedText}
            </div>
            <div class="solotravel-card-footer">
                <div class="booking-microcopy" style="font-size: 0.8rem; font-weight: 600; color: #0284c7; margin-bottom: 6px;">＼ 楽天ポイントが貯まる・使える ／</div>
                <a href="${affiliateUrl}" target="_blank" rel="sponsored noopener noreferrer" class="booking-button" style="display: block; text-align: center; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #FFF !important; padding: 1rem 1.8rem; border-radius: 12px; font-weight: 800; font-size: 1.05rem; text-decoration: none; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35); transition: all 0.3s ease; max-width: 480px; width: 100%; box-sizing: border-box;">
                    楽天トラベルで空室と料金をチェック <i class="fa-solid fa-arrow-up-right-from-square" style="margin-left: 6px;"></i>
                </a>
            </div>
        </div>
    </div>`;
}

async function generateSolotravelFukuoka() {
    console.log('=== Generating /features/solotravel-women/fukuoka/ ===');
    
    // 楽天APIから各ホテル情報を並行/順次取得
    const hotelDataMap = {};
    for (const target of TARGET_HOTELS) {
        console.log(`- Fetching Rakuten API for: ${target.keyword}...`);
        const info = await fetchHotelFromRakuten(target.keyword);
        if (info) {
            console.log(`  ✓ Got: ${info.hotelName} (¥${info.hotelMinCharge || '---'}, ★${info.reviewAverage})`);
            hotelDataMap[target.keyword] = info;
        } else {
            console.warn(`  ⚠️ Could not fetch API for ${target.keyword}. Using fallback definition.`);
        }
    }

    // 各ホテルのカードをレンダリング
    const cards = {};
    for (const target of TARGET_HOTELS) {
        cards[target.keyword] = renderCuratedHotelCard(target, hotelDataMap[target.keyword]);
    }

    // ページのメタデータ
    const pageTitle = '【福岡・博多/天神】女性一人旅でも安心！駅近・きれいでコスパ抜群な格安ホテル特集';
    const metaDescription = '福岡への女性一人旅で治安や清潔感が不安な方へ。博多・天神エリアで駅近、高セキュリティ、水回りが綺麗でコスパ抜群の厳選ホテルを紹介します。';
    const canonicalUrl = 'https://tabi-plan.org/features/solotravel-women/fukuoka/';
    const ogImage = 'https://tabi-plan.org/bg_fukuoka_new.jpg';

    // 句点改行済み本文パーツ
    const introPart1 = formatSentenceBreaks('「美味しいものをたくさん食べに福岡へ一人旅したいけれど、安全面やホテルのきれいさが心配…」');
    const introPart2 = formatSentenceBreaks('「格安で泊まりたいけれど、古くて清潔感のない部屋やセキュリティが不十分な宿は避けたい…」');
    const introPart3 = formatSentenceBreaks('そんな悩みをお持ちの女性に向けて、福岡（博多・天神エリア）で女性一人旅でも安心して快適に過ごせる、コスパ最強の厳選ホテルをご紹介します。');

    const selectGuideIntro = formatSentenceBreaks('初めての女性一人旅や、慣れない土地での滞在では、単に価格が安いという理由だけでホテルを選んでしまうと後悔することがあります。快適で安全な旅行にするために、押さえておきたい3つのポイントを解説します。');
    const point1 = formatSentenceBreaks('駅から遠いホテルや、細い路地裏にあるホテルは夜間の移動に不安が残ります。特に一人旅の場合は、最寄り駅から徒歩5分圏内であり、街灯が多く人通りのある大通り沿いに位置するホテルを選ぶのが賢明です。');
    const point2 = formatSentenceBreaks('快適な滞在に欠かせないのが「お部屋と水回りの清潔さ」です。新築・リニューアル済みのホテルや、清掃が行き届いていると口コミ評価が高いホテルを選ぶことで、疲れた体をしっかり休めることができます。');
    const point3 = formatSentenceBreaks('エレベーターの起動にカードキーが必要なシステムや、女性専用フロア・レディースルームが用意されているホテルはセキュリティ面で非常に優れています。部外者の侵入を防ぐ仕組みが整っている宿を選びましょう。');

    const hakataIntro = formatSentenceBreaks('新幹線や空港からのアクセスが抜群の博多駅周辺エリア。観光の拠点としても非常に便利で、周辺には飲食店やショッピングスポットも充実しています。');
    const tenjinIntro = formatSentenceBreaks('おしゃれなカフェやショップが集まる天神エリア。夜遅くまで屋台やグルメを楽しみたい方にもぴったりの立地です。');

    const cautionIntro = formatSentenceBreaks('予算を抑えたいからといって、極端に安いホテルを選んでしまうと思わぬトラブルやストレスの原因になります。特に注意すべきポイントを2つ紹介します。');
    const caution1 = formatSentenceBreaks('格安ホテルの中には、夜間の雰囲気が一変する歓楽街の只中や、暗い路地裏にあるケースも少なくありません。女性一人での夜間の出入りに危険が伴う可能性があるため、立地の事前確認は不可欠です。');
    const caution2 = formatSentenceBreaks('防犯カメラの未設置や、外部の人が簡単に客室フロアへ立ち入れる構造のホテルは、防犯面で大きなリスクがあります。安心して就寝するためにも、セキュリティ体制が提示されているホテルを選びましょう。');

    const endingText = formatSentenceBreaks('今回ご紹介したような、安心・清潔で人気の高いホテルでも、早めの予約（早割）や旅行サイトの割引クーポン・ポイント還元を利用することで、思いのほかリーズナブルに宿泊することができます。宿泊費を賢く抑えて、浮いた予算で美味しい「博多もつ鍋」や「水炊き」、天神のカフェ巡りを存分に楽しんでくださいね！');

    const htmlContent = `<!DOCTYPE html>
<html lang="ja">
<head>
    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-4PERSW1V95"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-4PERSW1V95');
    </script>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="canonical" href="${canonicalUrl}">
    <title>${pageTitle}</title>
    <meta name="description" content="${metaDescription}">
    <!-- OGP Settings -->
    <meta property="og:title" content="${pageTitle}">
    <meta property="og:description" content="${metaDescription}">
    <meta property="og:type" content="article">
    <meta property="og:url" content="${canonicalUrl}">
    <meta property="og:image" content="${ogImage}">
    <meta name="twitter:card" content="summary_large_image">
    <link rel="icon" type="image/jpeg" href="../../../icon.jpg">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&family=Noto+Sans+JP:wght@300;400;700;900&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="../../../style.css?v=20261012-solo">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <!-- JSON-LD 構造化データ -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "BreadcrumbList",
          "itemListElement": [
            {
              "@type": "ListItem",
              "position": 1,
              "name": "ホーム",
              "item": "https://tabi-plan.org/"
            },
            {
              "@type": "ListItem",
              "position": 2,
              "name": "女子一人旅特集",
              "item": "https://tabi-plan.org/features/solotravel-women/"
            },
            {
              "@type": "ListItem",
              "position": 3,
              "name": "福岡・博多/天神特集",
              "item": "${canonicalUrl}"
            }
          ]
        },
        {
          "@type": "Article",
          "headline": "${pageTitle}",
          "description": "${metaDescription}",
          "image": "${ogImage}",
          "author": {
            "@type": "Organization",
            "name": "TABI PLAN 編集部"
          },
          "publisher": {
            "@type": "Organization",
            "name": "TABI PLAN",
            "logo": {
              "@type": "ImageObject",
              "url": "https://tabi-plan.org/icon.jpg"
            }
          },
          "datePublished": "2026-09-23",
          "dateModified": "2026-10-12"
        }
      ]
    }
    </script>

    <style>
        .niche-hero {
            padding: 7rem 5% 3.5rem;
            text-align: center;
            position: relative;
        }
        .breadcrumbs {
            max-width: 1200px;
            margin: 0 auto 1.5rem;
            text-align: left;
            font-size: 0.85rem;
            color: rgba(255,255,255,0.85);
        }
        .breadcrumbs a {
            color: #FFFFFF;
            text-decoration: none;
            font-weight: 600;
        }
        .breadcrumbs a:hover {
            text-decoration: underline;
        }
        .niche-title {
            font-size: clamp(1.6rem, 3.5vw, 2.6rem);
            font-family: 'Noto Sans JP', sans-serif;
            font-weight: 900;
            margin-bottom: 1rem;
            line-height: 1.35;
            color: #FFFFFF;
            text-shadow: 0 2px 8px rgba(0,0,0,0.4);
        }
        .pr-notation {
            color: rgba(255, 255, 255, 0.8);
            font-size: 0.8rem;
            margin-bottom: 1rem;
        }
        /* 独自解説コラムのスタイル（PC / スマホ両対応・可読性最適化） */
        #niche-guide {
            background-color: var(--bg-color, #F0F5F9);
            padding: 3rem 0;
            border-top: 1px solid rgba(144, 180, 206, 0.2);
            border-bottom: 1px solid rgba(144, 180, 206, 0.2);
        }
        #niche-guide .glass-container {
            text-align: left;
            padding: 2.5rem;
            box-shadow: 0 8px 32px rgba(144, 180, 206, 0.08);
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(144, 180, 206, 0.3);
            border-radius: 20px;
        }
        #niche-guide h2 {
            font-size: 1.45rem;
            color: #1e293b;
            margin-top: 3rem;
            margin-bottom: 1.2rem;
            border-bottom: 2px solid #90B4CE;
            padding-bottom: 0.6rem;
            text-align: left;
            font-weight: 800;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        #niche-guide h2:first-of-type {
            margin-top: 1.5rem;
        }
        #niche-guide h3 {
            font-size: 1.2rem;
            font-weight: 700;
            color: #1e40af;
            margin-top: 1.8rem;
            margin-bottom: 0.8rem;
            line-height: 1.5;
            text-align: left;
            border-left: 4px solid #3b82f6;
            padding-left: 0.75rem;
        }
        #niche-guide p {
            font-size: 16px;
            color: #334155;
            line-height: 1.8;
            margin-bottom: 1.2rem;
            text-align: left !important;
        }
        .lead-quote-box {
            background: #ffffff;
            border-left: 4px solid #90B4CE;
            padding: 1.5rem;
            border-radius: 12px;
            margin-bottom: 2.5rem;
            box-shadow: 0 2px 10px rgba(0,0,0,0.04);
            border: 1px solid rgba(144, 180, 206, 0.25);
        }
        /* ホテルカードのスタイル（高品質・レスポンシブ） */
        .solotravel-card {
            background: #ffffff;
            border: 1px solid rgba(144, 180, 206, 0.35);
            border-radius: 16px;
            margin: 1.5rem 0 3rem;
            overflow: hidden;
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.05);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .solotravel-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 28px rgba(144, 180, 206, 0.18);
            border-color: #90B4CE;
        }
        .solotravel-card-header {
            display: flex;
            flex-direction: row;
            background: #f8fafc;
            border-bottom: 1px solid rgba(144, 180, 206, 0.2);
        }
        .solotravel-card-img-wrap {
            flex: 0 0 320px;
            position: relative;
            min-height: 240px;
            overflow: hidden;
        }
        .solotravel-card-img-wrap img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
            transition: transform 0.5s ease;
        }
        .solotravel-card:hover .solotravel-card-img-wrap img {
            transform: scale(1.04);
        }
        .solotravel-card-info {
            flex: 1;
            padding: 1.5rem;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }
        .solotravel-card-body {
            padding: 1.8rem;
            background: #ffffff;
        }
        .solotravel-card-desc {
            font-size: 15.5px;
            line-height: 1.8;
            color: #334155;
            margin-bottom: 1.5rem;
            text-align: left !important;
        }
        .solotravel-card-footer {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding-top: 1.2rem;
            border-top: 1px dashed rgba(144, 180, 206, 0.3);
        }
        @media (max-width: 768px) {
            #niche-guide {
                padding: 1.8rem 0 !important;
            }
            #niche-guide .container {
                padding: 0 15px !important;
            }
            #niche-guide .glass-container {
                padding: 1.4rem 15px !important;
                border-radius: 16px !important;
                margin-top: 0.5rem !important;
                text-align: left !important;
            }
            #niche-guide h2 {
                font-size: 1.2rem !important;
                margin-top: 2rem !important;
                margin-bottom: 1rem !important;
                padding-bottom: 0.5rem !important;
                text-align: left !important;
            }
            #niche-guide h3 {
                font-size: 1.05rem !important;
                margin-top: 1.4rem !important;
                margin-bottom: 0.6rem !important;
                text-align: left !important;
                line-height: 1.45 !important;
                padding-left: 0.5rem !important;
            }
            #niche-guide p {
                font-size: 15px !important;
                line-height: 1.75 !important;
                margin-bottom: 1.1rem !important;
                text-align: left !important;
            }
            .lead-quote-box {
                padding: 1rem !important;
                margin-bottom: 1.5rem !important;
            }
            .solotravel-card-header {
                flex-direction: column !important;
            }
            .solotravel-card-img-wrap {
                flex: none !important;
                width: 100% !important;
                height: 200px !important;
            }
            .solotravel-card-info {
                padding: 1.2rem 1rem !important;
            }
            .solotravel-card-body {
                padding: 1.2rem 1rem !important;
            }
            .solotravel-card-desc {
                font-size: 14.5px !important;
                line-height: 1.75 !important;
            }
        }
    </style>
</head>
<body>
    <div class="background-animation" style="background-image: url('../../../bg_fukuoka_new.jpg'); background-size: cover; background-position: center;">
        <div class="glow glow-1"></div>
        <div class="glow glow-2"></div>
        <div class="glow glow-3"></div>
    </div>

    <header class="header">
        <div class="container">
            <h1 class="logo" style="cursor: pointer;" onclick="window.location.href='/'">TABI <span>PLAN</span></h1>
            <nav class="nav">
                <a href="../../../">Home</a>
                <a href="../../">女子一人旅特集</a>
            </nav>
        </div>
    </header>

    <main>
        <section class="niche-hero">
            <div class="container">
                <div class="breadcrumbs">
                    <a href="../../../">Home</a> 
                    <i class="fa-solid fa-chevron-right" style="font-size: 0.6rem; margin: 0 0.5rem;"></i>
                    <a href="../../">女子一人旅特集</a> 
                    <i class="fa-solid fa-chevron-right" style="font-size: 0.6rem; margin: 0 0.5rem;"></i>
                    <span style="color: rgba(255,255,255,0.95); font-weight: 600;">福岡・博多/天神</span>
                </div>
                
                <h1 class="niche-title">${pageTitle}</h1>
                <div class="pr-notation">PR：本ページはプロモーションが含まれています</div>
                <p style="color: rgba(255,255,255,0.9); font-size: 0.95rem;">女性目線の厳しいセキュリティ・清潔感基準をクリアした高コスパ厳選宿</p>
            </div>
        </section>

        <!-- 独自解説＆ホテル紹介記事 -->
        <section id="niche-guide">
            <div class="container">
                <div class="glass-container niche-guide-box">
                    
                    <!-- 導入 -->
                    <div class="lead-quote-box">
                        <p style="margin-bottom: 0.8rem; font-style: italic; color: #475569;">${introPart1}</p>
                        <p style="margin-bottom: 0.8rem; font-style: italic; color: #475569;">${introPart2}</p>
                        <p style="margin-bottom: 0; font-weight: 700; color: #1e293b;">${introPart3}</p>
                    </div>

                    <!-- 選び方セクション -->
                    <h2><i class="fa-solid fa-compass" style="color: #90B4CE;"></i> 失敗しない！女性の一人旅向け「安心＆格安ホテル」3つの選び方</h2>
                    <p>${selectGuideIntro}</p>

                    <h3>1. 夜道も安心！駅徒歩5分圏内・大通り沿いの立地を選ぶ</h3>
                    <p>${point1}</p>

                    <h3>2. 清潔感＆水回りの評判をチェック</h3>
                    <p>${point2}</p>

                    <h3>3. カードキー制御や女性専用フロアなどセキュリティを重視</h3>
                    <p>${point3}</p>

                    <!-- 博多エリアセクション -->
                    <h2><i class="fa-solid fa-train-subway" style="color: #90B4CE;"></i> 【博多駅周辺】アクセス重視！女性に嬉しい綺麗＆高セキュリティな格安ホテル3選</h2>
                    <p>${hakataIntro}</p>

                    <!-- ホテル1 -->
                    <h3>ホテルリソルトリニティ博多</h3>
                    ${cards['ホテルリソルトリニティ博多']}

                    <!-- ホテル2 -->
                    <h3>■ The BREAKFAST HOTEL 福岡中洲</h3>
                    ${cards['The BREAKFAST HOTEL 福岡中洲']}

                    <!-- ホテル3 -->
                    <h3>■ ホテル博多プレイス</h3>
                    ${cards['ホテル博多プレイス']}

                    <!-- 天神エリアセクション -->
                    <h2><i class="fa-solid fa-mug-saucer" style="color: #90B4CE;"></i> 【天神周辺】グルメやカフェ巡りに便利！おしゃれでコスパ最強なホテル2選</h2>
                    <p>${tenjinIntro}</p>

                    <!-- ホテル4 -->
                    <h3>■ ホテル天神プレイス</h3>
                    ${cards['ホテル天神プレイス']}

                    <!-- ホテル5 -->
                    <h3>■ 博多グリーンホテル 天神</h3>
                    ${cards['博多グリーンホテル 天神']}

                    <!-- 注意点セクション -->
                    <h2><i class="fa-solid fa-triangle-exclamation" style="color: #eab308;"></i> 要注意！女性一人旅で「安さだけ」でホテルを選ぶと後悔する理由</h2>
                    <p>${cautionIntro}</p>

                    <h3>1. 繁華街の深部や街灯が少ないエリアはトラブルの元</h3>
                    <p>${caution1}</p>

                    <h3>2. セキュリティが不十分で落ち着かない</h3>
                    <p>${caution2}</p>

                    <!-- まとめセクション -->
                    <h2><i class="fa-solid fa-utensils" style="color: #90B4CE;"></i> 福岡の安心・綺麗なホテルをお得に予約して、浮いたお金でもつ鍋を楽しもう！</h2>
                    <h3>早割プランや割引クーポンの活用がコツ</h3>
                    <p>${endingText}</p>

                </div>
            </div>
        </section>

        <!-- FAQ Section -->
        <section class="faq-section" style="padding: 3rem 0;">
            <div class="container faq-container">
                <h3 class="faq-title" style="text-align: center; margin-bottom: 2rem;"><i class="fa-solid fa-circle-question"></i> よくある質問（FAQ）</h3>
                
                <div class="faq-item" style="background: #ffffff; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; border: 1px solid rgba(144, 180, 206, 0.25);">
                    <h4 class="faq-q" style="color: #1e293b; margin-bottom: 0.8rem; font-size: 1.05rem;">
                        <span class="faq-q-icon" style="color: #0284c7; font-weight: 800;">Q.</span> 楽天の会員じゃなくても予約できますか？
                    </h4>
                    <div class="faq-a" style="color: #475569; font-size: 0.95rem; line-height: 1.7;">
                        <p style="margin-bottom: 0.8rem;"><span class="faq-a-icon" style="color: #10b981; font-weight: 800;">A.</span> はい、楽天会員登録を行わずに「ゲスト予約」として予約を完了することも可能です。</p>
                        <p style="margin-bottom: 0.8rem;">ただし、楽天会員（無料）として予約すると、宿泊金額に応じて楽天ポイントが還元され、次回の旅行や楽天市場のお買い物でお使いいただけます。</p>
                        <div class="faq-hint" style="background: #f0fdf4; border: 1px solid #86efac; padding: 1rem; border-radius: 8px; margin-top: 1rem;">
                            💡 <strong>さらにお得なヒント：</strong><br>
                            「楽天カード」をお持ちの場合、毎月「5と0のつく日」はホテル・温泉宿が最大20%OFFになる特別キャンペーンが開催されています。<br>
                            <a href="https://hb.afl.rakuten.co.jp/hgc/047ad0f1.183c70cf.047ad0f2.1e4c3769/tabiplan-web/?pc=https%3A%2F%2Fwww.rakuten-card.co.jp%2F&m=https%3A%2F%2Fwww.rakuten-card.co.jp%2F" target="_blank" rel="sponsored noopener noreferrer" class="faq-hint-link" style="color: #059669; font-weight: 700; text-decoration: underline;"><i class="fa-solid fa-arrow-up-right-from-square"></i> 楽天カードの特典・入会キャンペーンを確認する</a>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    </main>

    <footer class="footer">
        <div class="container footer-content">
            <div class="footer-left">
                <h2 style="cursor: pointer;" onclick="window.location.href='/'">TABI <span>PLAN</span></h2>
                <p>Find your perfect stay.</p>
            </div>
            <div class="footer-right">
                <p>&copy; 2026 Tabi Plan. Powered by Rakuten Travel API & Editor Curation.</p>
                <div style="margin-top: 10px;">
                    <a href="../../../privacy.html" style="color: #6b7280; text-decoration: none; font-size: 0.85rem;" onmouseover="this.style.color='#90B4CE'" onmouseout="this.style.color='#6b7280'">プライバシーポリシー</a>
                    <span style="color: #6b7280; margin: 0 5px;">|</span>
                    <a href="../../../contact.html" style="color: #6b7280; text-decoration: none; font-size: 0.85rem;" onmouseover="this.style.color='#90B4CE'" onmouseout="this.style.color='#6b7280'">お問い合わせ</a>
                </div>
            </div>
        </div>
    </footer>
</body>
</html>`;

    const outDir = path.join(__dirname, '../features/solotravel-women/fukuoka');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const targetFile = path.join(outDir, 'index.html');
    fs.writeFileSync(targetFile, htmlContent, 'utf8');
    console.log(`✅ Successfully generated: ${targetFile}`);
}

// 他のジェネレーターから呼び出せるようにエクスポート
module.exports = { generateSolotravelFukuoka };

if (require.main === module) {
    generateSolotravelFukuoka().catch(err => {
        console.error('Generation failed:', err);
        process.exit(1);
    });
}
