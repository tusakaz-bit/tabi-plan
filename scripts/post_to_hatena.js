const axios = require('axios');
const crypto = require('crypto');
const { getDateString, CITIES } = require('./utils');
const theme1 = require('./themes/theme_1_cheapest');
const theme2 = require('./themes/theme_2_ladies');
const theme3 = require('./themes/theme_3_couple');
const theme4 = require('./themes/theme_4_station');
const theme5 = require('./themes/theme_5_onsen');
const theme6 = require('./themes/theme_6_breakfast');
const theme7 = require('./themes/theme_7_longstay');

// 環境変数から認証情報を取得（前後の余計な空白や改行を自動で取り除く処理を追加）
const HATENA_ID = (process.env.HATENA_ID || '').trim();
const HATENA_BLOG_ID = (process.env.HATENA_BLOG_ID || '').trim();
const HATENA_API_KEY = (process.env.HATENA_API_KEY || '').trim();

// WSSE認証のヘッダーを生成する関数
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

async function postToHatena(title, body, tags) {
    const url = `https://blog.hatena.ne.jp/${HATENA_ID}/${HATENA_BLOG_ID}/atom/entry`;
    
    // タグのXML文字列を生成
    const tagsXml = tags.map(tag => `  <category term="${tag}" />`).join('\n');

    // AtomPub用のXMLを作成
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
        console.log(`Successfully posted to Hatena Blog (Published): ${title} (Status: ${response.status})`);
    } catch (error) {
        console.error(`Error posting to Hatena Blog [${title}]:`, error.response ? error.response.status : '', error.response ? error.response.data : error.message);
        // 全体が止まらないようにエラーをスローしないが、ログは残す
    }
}

// レートリミット回避のためのスリープ関数
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
    console.log('Starting Hatena Blog auto-post (Per-city specialized posts)...');

    // 今日の曜日を取得 (0=日, 1=月, ..., 6=土)
    const now = new Date();
    const jstDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
    const dayOfWeek = jstDate.getDay();

    const themes = [theme7, theme1, theme2, theme3, theme4, theme5, theme6];
    const categoryNames = [
        "長期滞在・連泊向き", // 0: 日
        "格安・コスパ宿",     // 1: 月
        "レディースプラン",   // 2: 火
        "カップル・記念日",   // 3: 水
        "駅チカホテル",       // 4: 木
        "露天風呂付ホテル",   // 5: 金
        "朝食が美味しいホテル" // 6: 土
    ];

    const currentTheme = themes[dayOfWeek];
    const displayCategory = categoryNames[dayOfWeek];

    console.log(`Today is day ${dayOfWeek}, running theme: ${displayCategory}`);

    // 都市ごとの記事配列（6記事分）を取得
    const articles = await currentTheme.generate();

    if (!articles || articles.length === 0) {
        console.log('No hotel data found for today\'s theme across all cities.');
        return;
    }

    console.log(`Found ${articles.length} articles to post. Proceeding with sequential posting...`);

    // 1つの記事にまとめる処理
    const combinedTitle = `【${getDateString()}】失敗しない宿選び！主要6都市の「${displayCategory}」各エリア厳選3施設まとめ`;
    let combinedBody = `<p style="font-size: 1.1rem; line-height: 1.6; margin-bottom: 30px; text-align: center;">本日は国内の主要6都市（東京・大阪・京都・札幌・福岡・沖縄）から、<strong>${displayCategory}</strong>をテーマに、Tabi Plan AIが各エリアごとにおすすめの「厳選3施設」をピックアップしました！<br>ハズレなしの素晴らしいホテルばかりですので、次のご旅行の参考にぜひご覧ください。</p>\n`;
    let combinedTags = new Set([displayCategory, "国内旅行", "ホテルまとめ", "TabiPlan"]);

    for (let i = 0; i < articles.length; i++) {
        const article = articles[i];
        const cityObj = CITIES.find(c => c.id === article.city) || { name: article.city };

        combinedBody += `\n<h2 style="background: #D4AF37; color: white; padding: 12px; margin-top: 50px; text-align: center; border-radius: 5px; font-size: 1.4rem; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">📍 ${cityObj.name}エリアの厳選宿</h2>\n`;
        combinedBody += article.body;

        // 各記事のタグをマージ（都市名なども含まれる）
        if (article.tags) {
            article.tags.forEach(tag => combinedTags.add(tag));
        }
    }

    console.log(`Posting combined article: ${combinedTitle}`);
    await postToHatena(combinedTitle, combinedBody, Array.from(combinedTags));
    
    console.log('All Hatena blog posts completed successfully.');
}

run();
