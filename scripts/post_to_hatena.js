/**
 * post_to_hatena.js
 * はてなブログへ毎日自動投稿するスクリプト（画像付きホテルカード版）
 *
 * ■ 投稿内容
 *   - 楽天APIから取得した最新ホテル情報（画像付き）
 *   - Gemini AIによるオリジナル紹介文
 *   - tabi-plan.org 公式サイトへの誘導ボタン
 *
 * ■ 毎日ローテーション
 *   niche_config.json に定義されたニッチページを日替わりで選択
 */

const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { getDateString, fetchRakutenApi, generateHtmlBody, RAKUTEN_APP_ID, RAKUTEN_AFFILIATE_ID } = require('./utils');

// ========================================
// はてなブログ認証設定
// ========================================
const HATENA_ID = (process.env.HATENA_ID || '').trim();
const HATENA_BLOG_ID = (process.env.HATENA_BLOG_ID || '').trim();
const HATENA_API_KEY = (process.env.HATENA_API_KEY || '').trim();

/**
 * WSSE認証ヘッダーを生成する
 */
function getWsseAuthHeaders() {
    const nonceBytes = crypto.randomBytes(20);
    const nonceBase64 = nonceBytes.toString('base64');
    const created = new Date().toISOString();
    const digest = crypto.createHash('sha1')
        .update(Buffer.concat([nonceBytes, Buffer.from(created), Buffer.from(HATENA_API_KEY)]))
        .digest('base64');
    const wsseHeader = `UsernameToken Username="${HATENA_ID}", PasswordDigest="${digest}", Nonce="${nonceBase64}", Created="${created}"`;
    return {
        'X-WSSE': wsseHeader,
        'Authorization': 'WSSE profile="UsernameToken"'
    };
}

/**
 * はてなブログへ記事を投稿する
 * @param {string} title - 記事タイトル
 * @param {string} body - 記事本文（HTML）
 * @param {string[]} tags - カテゴリタグの配列
 */
async function postToHatena(title, body, tags) {
    if (!HATENA_ID || !HATENA_BLOG_ID || !HATENA_API_KEY) {
        console.log('⚠️ Hatenaの認証情報が未設定です。投稿をスキップします。');
        console.log('  → GitHub Secrets に HATENA_ID / HATENA_BLOG_ID / HATENA_API_KEY を設定してください。');
        return;
    }

    const url = `https://blog.hatena.ne.jp/${HATENA_ID}/${HATENA_BLOG_ID}/atom/entry`;
    const tagsXml = tags.map(tag => `  <category term="${tag}" />`).join('\n');

    const xml = `<?xml version="1.0" encoding="utf-8"?>
<entry xmlns="http://www.w3.org/2005/Atom"
       xmlns:app="http://www.w3.org/2007/app">
  <title>${title}</title>
  <content type="text/html"><![CDATA[
${body}
  ]]></content>
${tagsXml}
  <app:control>
    <app:draft>no</app:draft>
  </app:control>
</entry>`;

    try {
        const response = await axios.post(url, xml, {
            headers: {
                'Content-Type': 'application/xml',
                ...getWsseAuthHeaders()
            }
        });
        console.log(`✅ はてなブログに投稿しました: ${title} (Status: ${response.status})`);
    } catch (error) {
        console.error(`❌ はてなブログ投稿エラー [${title}]:`,
            error.response ? error.response.status : '',
            error.response ? error.response.data : error.message
        );
    }
}

// ========================================
// メイン処理
// ========================================
async function run() {
    console.log('🚀 はてなブログ自動投稿スクリプトを開始します...');

    // ---- ① niche_config.json からニッチページを日替わりで選択 ----
    const configPath = path.join(__dirname, 'niche_config.json');
    const niches = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const nicheKeys = Object.keys(niches);

    const now = new Date();
    const jstDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
    const epochDays = Math.floor(jstDate.getTime() / (24 * 60 * 60 * 1000));
    const selectedKey = nicheKeys[epochDays % nicheKeys.length];
    const niche = niches[selectedKey];

    console.log(`📌 本日のニッチページ: ${niche.cityName} / ${niche.keyword}`);

    // ---- ② 楽天APIからホテルを複数件取得 ----
    const apiUrl = 'https://openapi.rakuten.co.jp/engine/api/Travel/KeywordHotelSearch/20170426';
    const params = {
        applicationId: RAKUTEN_APP_ID,
        accessKey: 'pk_5MWJwVdIjLhdoj7Zg1RriahaHY2JahwsKyl6c3KDRkG',
        affiliateId: RAKUTEN_AFFILIATE_ID,
        format: 'json',
        keyword: niche.searchParams.keyword,
        hits: 20,
    };

    // 最大3件のホテルを取得（フィルタ→フォールバック）
    let hotels = await fetchRakutenApi(apiUrl, params, niche.filters.minReview, 'cheap', 3);
    if (!hotels || hotels.length === 0) {
        console.log('⚠️ 通常フィルタでホテルが見つかりません。フォールバックフィルタで再試行...');
        hotels = await fetchRakutenApi(apiUrl, params, niche.fallbackFilters.minReview, 'cheap', 3);
    }

    if (!hotels || hotels.length === 0) {
        console.log('❌ ホテルが見つかりませんでした。投稿をスキップします。');
        return;
    }

    console.log(`✅ ${hotels.length}件のホテルを取得しました。`);

    // ---- ③ 記事タイトルと本文を生成 ----
    const dateStr = getDateString();
    const title = `【${dateStr}】${niche.cityName}おすすめホテル｜${niche.keyword.replace(/ /g, '・')}の最安値ランキング`;

    // 導入文（イントロ）
    const intro = `${niche.cityName}で「${niche.keyword}」を探しているあなたへ。毎朝自動更新している <a href="https://tabi-plan.org/${niche.city}/${niche.slug}/" style="color: #D4AF37; font-weight: bold;">Tabi Plan ${niche.cityName}特設ページ</a> から、本日の注目ホテルをピックアップしてご紹介します！`;

    // 都市オブジェクト（generateHtmlBody用）
    const cityObj = { name: niche.cityName, id: niche.city };

    // 画像付きホテルカードHTMLを生成（utils.js の generateHtmlBody を使用）
    console.log('🤖 Gemini AIでホテル紹介文を生成中...');
    const body = await generateHtmlBody(cityObj, intro, hotels);

    // ---- ④ はてなブログへ投稿 ----
    const tags = [niche.cityName, 'ホテル', '旅行', '格安ホテル', 'TabiPlan'];
    console.log(`📝 投稿タイトル: ${title}`);
    await postToHatena(title, body, tags);

    console.log('✅ 完了しました。');
}

run().catch(err => {
    console.error('予期しないエラー:', err);
    process.exit(1);
});
