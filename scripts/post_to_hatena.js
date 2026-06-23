const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { getDateString, fetchRakutenApi, RAKUTEN_APP_ID, RAKUTEN_AFFILIATE_ID } = require('./utils');
const { GoogleGenAI } = require('@google/genai');

const HATENA_ID = (process.env.HATENA_ID || '').trim();
const HATENA_BLOG_ID = (process.env.HATENA_BLOG_ID || '').trim();
const HATENA_API_KEY = (process.env.HATENA_API_KEY || '').trim();

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
    if (!HATENA_ID || !HATENA_BLOG_ID || !HATENA_API_KEY) {
        console.log('Hatena credentials missing. Skipping actual API post.');
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
        console.log(`Successfully posted to Hatena Blog (Published): ${title} (Status: ${response.status})`);
    } catch (error) {
        console.error(`Error posting to Hatena Blog [${title}]:`, error.response ? error.response.status : '', error.response ? error.response.data : error.message);
    }
}

async function generateHatenaArticle(niche, hotel) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `
あなたはプロの旅行系Webライター兼SEOマーケターです。
自社サイト（Tabi Plan）の特設ページへユーザーを誘導するための、はてなブログ用記事（HTML形式）を作成してください。

【対象の特設ページ（ニッチ条件）】
都市: ${niche.cityName}
ターゲットキーワード: ${niche.keyword}
URL: https://tabi-plan.org/${niche.city}/${niche.slug}/

【ピックアップホテル例】
ホテル名: ${hotel.name}
料金目安: ${Number(hotel.price).toLocaleString()}円〜
クチコミ評価: ${hotel.reviewAverage || '-'}

【出力要件】
1. HTML形式で出力してください（<body>タグの中身のみ。<style>や<html>タグは不要）。見出しには<h2>や<h3>を使用してください。
2. 記事構成:
   - 読者の悩みへの共感（例：「${niche.cityName}で${niche.keyword.replace(/ /g, '')}を探すのって意外と大変ですよね...」）
   - 条件に合うホテル選びのコツ
   - ピックアップホテルの簡単な紹介（${hotel.name}）
   - 「すべての厳選ホテルランキングと詳細な解説はこちら！」という形で、対象URLへの強力な誘導（クリックしたくなるボタン風のリンクや太字リンク）
3. 文字数は800文字程度で、自然で読みやすいブログ文体にしてください。

出力はHTMLのみを行ってください。Markdownのバッククォート(\`\`\`html)などは含めないでください。
`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: prompt,
        });
        return response.text.replace(/\`\`\`html/g, '').replace(/\`\`\`/g, '').trim();
    } catch (e) {
        console.error("Gemini API Error:", e.message);
        return null;
    }
}

async function run() {
    console.log('Starting Hatena Blog auto-post (V2 Niche Focus)...');

    const configPath = path.join(__dirname, 'niche_config.json');
    const niches = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const nicheKeys = Object.keys(niches);

    // 毎日ローテーションでニッチを選ぶ
    const now = new Date();
    const jstDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
    const msInDay = 24 * 60 * 60 * 1000;
    const epochDays = Math.floor((jstDate.getTime() + 9 * 60 * 60 * 1000) / msInDay);
    
    const selectedKey = nicheKeys[epochDays % nicheKeys.length];
    const niche = niches[selectedKey];

    console.log(`Selected Niche for today: ${niche.keyword}`);

    // 代表的なホテルを1件取得して記事のフックにする
    const url = 'https://openapi.rakuten.co.jp/engine/api/Travel/KeywordHotelSearch/20170426';
    const params = {
        applicationId: RAKUTEN_APP_ID,
        accessKey: 'pk_5MWJwVdIjLhdoj7Zg1RriahaHY2JahwsKyl6c3KDRkG',
        affiliateId: RAKUTEN_AFFILIATE_ID,
        format: 'json',
        keyword: niche.searchParams.keyword,
        hits: 10
    };

    let hotels = await fetchRakutenApi(url, params, niche.filters.minReview, 'standard', 1);
    if (!hotels || hotels.length === 0) {
        hotels = await fetchRakutenApi(url, params, niche.fallbackFilters.minReview, 'standard', 1);
    }
    
    if (!hotels || hotels.length === 0) {
        console.log('No hotels found. Exiting.');
        return;
    }

    const hotel = hotels[0];
    
    // 記事本文の生成
    let articleBody = await generateHatenaArticle(niche, hotel);
    if (!articleBody) {
        console.log('Falling back to static template for Hatena Blog.');
        articleBody = `
<h2>${niche.cityName}で「${niche.keyword}」をお探しの皆様へ</h2>
<p>${niche.cityName}のホテル探し、条件が細かくなると意外と苦労しますよね。今回は、アクセスも良く設備も充実している話題の厳選ホテルをご紹介します。</p>

<h3>🏨 本日のピックアップ：${hotel.name}</h3>
<ul>
  <li><strong>最安料金目安：</strong> ${Number(hotel.price).toLocaleString()}円〜</li>
  <li><strong>クチコミ評価：</strong> ${hotel.reviewAverage || '-'}</li>
  <li><strong>ホテルの特徴：</strong> ${hotel.special || '詳細は公式サイトでご確認ください'}</li>
</ul>

<p>こちらのホテルをはじめ、Tabi Planでは「<strong>${niche.keyword}</strong>」という条件にぴったり合うコスパ最強ホテルを独自にランキング化しています。</p>

<p style="text-align: center; margin: 30px 0;">
  <a href="https://tabi-plan.org/${niche.city}/${niche.slug}/" style="background-color: #D4AF37; color: #fff; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 1.2em; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">すべての厳選ホテルランキングと詳細を見る</a>
</p>
<p>賢く安く、ワンランク上の旅行を実現するために、ぜひチェックしてみてくださいね！</p>
        `;
    }

    const title = `【${getDateString()}】${niche.cityName}の宿選び：${niche.keyword.replace(/ /g, '・')}の厳選ホテル`;
    const tags = [niche.cityName, "ホテル選び", "国内旅行", "TabiPlan"];

    console.log(`Posting article: ${title}`);
    await postToHatena(title, articleBody, tags);
    console.log('Done.');
}

run();
