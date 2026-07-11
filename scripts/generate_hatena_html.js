/**
 * generate_hatena_html.js
 * はてなブログ用ホテル紹介HTML自動生成スクリプト
 *
 * 使い方:
 *   node scripts/generate_hatena_html.js [都市] [件数]
 *
 * 例:
 *   node scripts/generate_hatena_html.js kyoto 5
 *   node scripts/generate_hatena_html.js tokyo 3
 *   node scripts/generate_hatena_html.js osaka 5
 *
 * 対応都市: tokyo / osaka / kyoto / sapporo / okinawa / fukuoka
 */

try { require('dotenv').config(); } catch (e) { /* dotenvが無い環境では無視 */ }
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// ========================================
// 設定
// ========================================
const RAKUTEN_APP_ID = 'ecc263bd-2573-4a88-933e-159e08ff4fff';
const RAKUTEN_AFFILIATE_ID = '047ad0f1.183c70cf.047ad0f2.1e4c3769';

// 公式サイトURL
const TABI_PLAN_URL = 'https://tabi-plan.org';

// 都市設定（楽天APIパラメータ）
const CITY_CONFIG = {
    tokyo:   { name: '東京',   middle: 'tokyo',    small: 'tokyo',   detail: 'A', label: '東京・新宿・渋谷' },
    osaka:   { name: '大阪',   middle: 'osaka',    small: 'shi',     detail: 'D', label: '大阪・なんば・心斎橋' },
    kyoto:   { name: '京都',   middle: 'kyoto',    small: 'shi',     detail: 'B', label: '京都・河原町・四条' },
    sapporo: { name: '札幌',   middle: 'hokkaido', small: 'sapporo', detail: 'B', label: '札幌・すすきの' },
    okinawa: { name: '沖縄',   middle: 'okinawa',  small: 'nahashi', detail: '',  label: '沖縄・那覇・国際通り' },
    fukuoka: { name: '福岡',   middle: 'hukuoka',  small: 'fukuoka', detail: '',  label: '福岡・博多・天神' },
};

// 公式サイトの対応ページURL
const CITY_PAGE_URL = {
    tokyo:   `${TABI_PLAN_URL}/tokyo/`,
    osaka:   `${TABI_PLAN_URL}/osaka/`,
    kyoto:   `${TABI_PLAN_URL}/kyoto/`,
    sapporo: `${TABI_PLAN_URL}/sapporo/`,
    okinawa: `${TABI_PLAN_URL}/okinawa/`,
    fukuoka: `${TABI_PLAN_URL}/fukuoka/`,
};

// ========================================
// コマンドライン引数の処理
// ========================================
const args = process.argv.slice(2);
const cityKey = (args[0] || 'kyoto').toLowerCase();
const maxHotels = parseInt(args[1] || '5', 10);

if (!CITY_CONFIG[cityKey]) {
    console.error(`❌ 都市が見つかりません: ${cityKey}`);
    console.error('対応都市: tokyo / osaka / kyoto / sapporo / okinawa / fukuoka');
    process.exit(1);
}

const city = CITY_CONFIG[cityKey];
console.log(`\n🏨 ${city.name}のホテル情報を取得中... (最大${maxHotels}件)`);

// ========================================
// ユーティリティ関数
// ========================================
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// 楽天APIからホテルデータを取得
async function fetchHotels(cityConfig, limit = 10) {
    await sleep(1000);
    const params = {
        applicationId: RAKUTEN_APP_ID,
        accessKey: 'pk_5MWJwVdIjLhdoj7Zg1RriahaHY2JahwsKyl6c3KDRkG',
        affiliateId: RAKUTEN_AFFILIATE_ID,
        format: 'json',
        hits: Math.min(limit + 5, 30),
        sort: '+roomCharge', // 料金安い順
        largeClassCode: 'japan',
        middleClassCode: cityConfig.middle,
        smallClassCode: cityConfig.small,
    };
    if (cityConfig.detail) params.detailClassCode = cityConfig.detail;

    try {
        const response = await axios.get('https://openapi.rakuten.co.jp/engine/api/Travel/SimpleHotelSearch/20170426', {
            params,
            headers: {
                'Referer': 'https://tabi-plan.org/',
                'Origin': 'https://tabi-plan.org'
            }
        });
        return response.data.hotels || [];
    } catch (error) {
        console.error(`API取得エラー: ${error.message}`);
        if (error.response) {
            console.error('APIレスポンス:', JSON.stringify(error.response.data, null, 2));
        }
        return [];
    }
}

// ホテルのフィルタリング（低品質除外）
function filterHotels(hotels) {
    return hotels.filter(h => {
        const info = h.hotel[0].hotelBasicInfo;
        if (!info.hotelMinCharge || info.hotelMinCharge < 1000) return false;
        if (!info.reviewAverage || info.reviewAverage < 3.5) return false;
        if (!info.reviewCount || info.reviewCount < 5) return false;
        const name = (info.hotelName || '').toLowerCase();
        if (name.includes('民泊') || name.includes('キャビン')) return false;
        return true;
    });
}

// 星評価HTMLを生成
function buildStars(score) {
    let html = '';
    const s = parseFloat(score);
    for (let i = 1; i <= 5; i++) {
        if (s >= i) html += '★';
        else if (s >= i - 0.5) html += '★';
        else html += '☆';
    }
    return html;
}

// ========================================
// HTML生成関数
// ========================================
function buildHatenaHTML(hotels, city, cityKey, limit) {
    const cityPageUrl = CITY_PAGE_URL[cityKey];
    const today = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
    const hotelList = hotels.slice(0, limit);

    // ---- ヘッダーセクション ----
    let html = `<!-- ===============================================
  はてなブログ用ホテル紹介HTML
  生成日時: ${today}
  都市: ${city.name}（${city.label}）
  ※ 楽天トラベル規約に基づきAPIから取得した画像を使用
  ※ 各画像には「Rakuten Travel」クレジットを表示
=============================================== -->

<div style="font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', 'Hiragino Sans', 'Noto Sans JP', sans-serif; max-width: 680px; margin: 0 auto; color: #1a1a2e;">

<!-- 🔷 タイトルバナー -->
<div style="background: linear-gradient(135deg, #1e3a5f 0%, #0f2044 100%); border-radius: 12px; padding: 24px 20px; margin-bottom: 24px; text-align: center;">
  <p style="color: #fbbf24; font-size: 0.8rem; font-weight: bold; margin: 0 0 6px; letter-spacing: 2px;">📍 ${city.label}</p>
  <h2 style="color: #ffffff; font-size: 1.4rem; font-weight: 900; margin: 0 0 8px; line-height: 1.4;">【${today}更新】<br>${city.name}の格安ホテル TOP${hotelList.length}選</h2>
  <p style="color: #94a3b8; font-size: 0.85rem; margin: 0;">楽天トラベル最安値データを毎朝自動更新中</p>
</div>

<!-- 🔷 公式サイト誘導バナー（上部） -->
<div style="background: #fff8e1; border: 2px solid #fbbf24; border-radius: 10px; padding: 14px 16px; margin-bottom: 24px; text-align: center;">
  <p style="margin: 0 0 6px; font-size: 0.85rem; color: #555;">📌 より多くのホテルを比較したい方はこちら</p>
  <a href="${cityPageUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: #e63946; color: #fff; font-weight: bold; font-size: 0.95rem; padding: 10px 24px; border-radius: 8px; text-decoration: none;">
    🏨 【毎朝更新】${city.name}の格安ホテルランキングを見る →
  </a>
  <p style="margin: 8px 0 0; font-size: 0.75rem; color: #888;">Tabi Plan（tabi-plan.org）| 楽天トラベル公式APIデータ使用</p>
</div>

<!-- 🔷 ホテルリスト -->
`;

    // ---- ホテルカード ----
    hotelList.forEach((h, index) => {
        const info = h.hotel[0].hotelBasicInfo;
        const price = info.hotelMinCharge ? `¥${Number(info.hotelMinCharge).toLocaleString()}〜` : '要確認';
        const review = info.reviewAverage ? `${Number(info.reviewAverage).toFixed(1)}点` : '評価なし';
        const reviewCount = info.reviewCount ? `（${info.reviewCount}件）` : '';
        const stars = info.reviewAverage ? buildStars(info.reviewAverage) : '☆☆☆☆☆';
        const imageUrl = info.hotelImageUrl || '';
        const hotelUrl = `https://hb.afl.rakuten.co.jp/hgc/${RAKUTEN_AFFILIATE_ID}/?pc=https%3A%2F%2Ftravel.rakuten.co.jp%2FHOTEL%2F${info.hotelNo}%2F${info.hotelNo}.html`;
        const address = `${info.address1 || ''}${info.address2 || ''}`;
        const rankLabel = ['🥇', '🥈', '🥉'][index] || `${index + 1}位`;

        html += `
<!-- ホテル ${index + 1}: ${info.hotelName} -->
<div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">

  <!-- ランクバッジ＋ホテル名 -->
  <div style="background: #1e3a5f; padding: 10px 16px; display: flex; align-items: center; gap: 10px;">
    <span style="font-size: 1.4rem;">${rankLabel}</span>
    <span style="color: #fff; font-weight: 700; font-size: 0.95rem; line-height: 1.3;">${info.hotelName}</span>
  </div>

  <!-- 画像（楽天トラベル規約：クレジット表記必須） -->
  <div style="position: relative; line-height: 0;">
    <a href="${hotelUrl}" target="_blank" rel="noopener noreferrer">
      <img src="${imageUrl}" alt="${info.hotelName} の外観・客室イメージ（楽天トラベル提供）" style="width: 100%; height: auto; display: block;" loading="lazy">
    </a>
    <!-- ✅ 楽天トラベル規約必須：クレジット表記 -->
    <span style="position: absolute; bottom: 6px; left: 6px; background: rgba(0,0,0,0.6); color: #fff; font-size: 0.65rem; padding: 2px 6px; border-radius: 4px;">© Rakuten Travel</span>
  </div>

  <!-- ホテル情報 -->
  <div style="padding: 14px 16px;">

    <!-- 住所 -->
    <p style="font-size: 0.8rem; color: #666; margin: 0 0 8px;">📍 ${address}</p>

    <!-- 評価 -->
    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
      <span style="color: #f59e0b; font-size: 1rem; letter-spacing: 1px;">${stars}</span>
      <span style="font-weight: 700; color: #1e3a5f;">${review}</span>
      <span style="font-size: 0.8rem; color: #888;">${reviewCount}</span>
    </div>

    <!-- 料金 -->
    <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 8px 12px; border-radius: 0 6px 6px 0; margin-bottom: 14px;">
      <p style="margin: 0; font-size: 0.8rem; color: #555;">最安料金（1泊あたり）</p>
      <p style="margin: 0; font-size: 1.4rem; font-weight: 900; color: #e63946;">${price} <span style="font-size: 0.75rem; font-weight: normal; color: #555;">/泊</span></p>
    </div>

    <!-- 予約ボタン（楽天規約：テキストリンク必須） -->
    <a href="${hotelUrl}" target="_blank" rel="noopener noreferrer" style="display: block; background: linear-gradient(135deg, #e63946, #c1121f); color: #fff; text-align: center; font-weight: 700; font-size: 0.95rem; padding: 13px; border-radius: 8px; text-decoration: none;">
      🛎️ 空室・料金を楽天トラベルで確認する
    </a>

  </div>
</div>
`;
    });

    // ---- フッターセクション ----
    html += `
<!-- 🔷 公式サイト誘導バナー（下部） -->
<div style="background: linear-gradient(135deg, #1e3a5f 0%, #0f2044 100%); border-radius: 12px; padding: 20px; margin-top: 8px; text-align: center;">
  <p style="color: #fbbf24; font-weight: bold; font-size: 0.9rem; margin: 0 0 6px;">📊 さらに多くのホテルを比較したい方へ</p>
  <p style="color: rgba(255,255,255,0.8); font-size: 0.82rem; margin: 0 0 14px;">「Tabi Plan」では${city.name}の格安ホテルを<br>毎朝自動で最安値に更新してランキング掲載しています</p>
  <a href="${cityPageUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: #fbbf24; color: #1e3a5f; font-weight: 900; font-size: 0.95rem; padding: 12px 28px; border-radius: 8px; text-decoration: none;">
    ▶ ${city.name}の格安ホテルランキングへ（無料）
  </a>
  <p style="color: rgba(255,255,255,0.5); font-size: 0.7rem; margin: 10px 0 0;">※ 画像は楽天ウェブサービスAPIより取得。楽天トラベルへの誘導のみに使用しています。</p>
</div>

<!-- 🔷 免責・クレジット表記 -->
<div style="border-top: 1px solid #e2e8f0; margin-top: 16px; padding-top: 12px; text-align: center;">
  <p style="font-size: 0.7rem; color: #aaa; margin: 0;">
    ホテル情報・画像は <a href="https://webservice.rakuten.co.jp/" target="_blank" rel="noopener noreferrer" style="color: #888;">楽天ウェブサービス</a> より取得。料金は変動する場合があります。最新情報は楽天トラベル公式ページでご確認ください。
  </p>
</div>

</div>
<!-- =============== HTML ここまで =============== -->`;

    return html;
}

// ========================================
// メイン処理
// ========================================
async function main() {
    // APIからホテルデータを取得
    const rawHotels = await fetchHotels(city, maxHotels * 3);

    if (rawHotels.length === 0) {
        console.error('❌ ホテルデータの取得に失敗しました。APIキーやパラメータを確認してください。');
        process.exit(1);
    }

    // フィルタリング
    const hotels = filterHotels(rawHotels);

    if (hotels.length === 0) {
        console.error('❌ 条件に合うホテルが見つかりませんでした。');
        process.exit(1);
    }

    console.log(`✅ ${hotels.length}件のホテルを取得しました。上位${Math.min(hotels.length, maxHotels)}件を使用します。`);

    // HTML生成
    const htmlContent = buildHatenaHTML(hotels, city, cityKey, maxHotels);

    // ファイル出力
    const outputDir = path.join(__dirname, '..', 'hatena_output');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const outputFile = path.join(outputDir, `${dateStr}_${cityKey}_top${maxHotels}.html`);

    fs.writeFileSync(outputFile, htmlContent, 'utf8');

    console.log('\n========================================');
    console.log('✅ HTMLファイルを生成しました！');
    console.log(`📄 出力先: ${outputFile}`);
    console.log('');
    console.log('【はてなブログへの貼り付け手順】');
    console.log('1. 上記ファイルをテキストエディタで開く');
    console.log('2. 全選択してコピー（Ctrl+A → Ctrl+C）');
    console.log('3. はてなブログの編集画面を「HTML編集」モードに切り替え');
    console.log('4. ペースト（Ctrl+V）して保存');
    console.log('========================================\n');

    // コンソールにもプレビューを表示
    console.log('--- HTMLプレビュー（最初の500文字） ---');
    console.log(htmlContent.substring(0, 500) + '...');
    console.log('--------------------------------------');
}

main().catch(err => {
    console.error('予期しないエラーが発生しました:', err);
    process.exit(1);
});
