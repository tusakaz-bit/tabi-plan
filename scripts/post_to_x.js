try { require('dotenv').config(); } catch (e) { /* dotenvが無い環境（CI等）では無視 */ }
const fs = require('fs');
const { RAKUTEN_APP_ID, RAKUTEN_AFFILIATE_ID, CITIES, fetchRakutenApi } = require('./utils');
const { GoogleGenAI } = require('@google/genai');

const BASE_URL = 'https://tabi-plan.org';

function truncateString(str, maxLength) {
    if (!str) return '';
    // 最初の句点までを優先して取得
    let match = str.match(/^([^。！？]{10,50}[。！？])/);
    let naturalDesc = match ? match[1] : str;
    
    // それでも長ければ強制カット
    if (naturalDesc.length > maxLength) {
        naturalDesc = naturalDesc.substring(0, maxLength - 1) + '…';
    }
    return naturalDesc;
}

async function run() {
    console.log('Generating daily X post drafts (1 city focused thread)...');

    const now = new Date();
    // 実行日のJST日付を取得（はてなブログと完全に連動）
    const jstDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
    const dayOfWeek = jstDate.getDay(); // 実行日の曜日 (0=日, 1=月, ..., 6=土)

    // X用のテーマ定義（はてなと完全に連動）
    const themes = [
        { name: "長期滞在・連泊向き", sort: 'cheap', minReview: 3.5, keywordSuffix: ' 連泊', hashtag: '#ワーケーション' }, // 0:日
        { name: "格安・コスパ最強", sort: 'cheap', minReview: 3.5, keywordSuffix: '', hashtag: '#格安旅行' }, // 1:月
        { name: "レディースプラン", sort: 'review', minReview: 4.0, keywordSuffix: ' レディース', hashtag: '#女子旅' }, // 2:火
        { name: "カップル・記念日", sort: 'review', minReview: 4.0, keywordSuffix: ' 記念日', hashtag: '#記念日旅行' }, // 3:水
        { name: "アクセス抜群（駅チカなど）", sort: 'review', minReview: 3.8, keywordSuffix: ' 駅チカ', hashtag: '#便利' }, // 4:木
        { name: "露天風呂・温泉付き", sort: 'review', minReview: 4.0, keywordSuffix: ' 露天風呂', hashtag: '#温泉旅行' }, // 5:金
        { name: "朝食が美味しい", sort: 'review', minReview: 4.0, keywordSuffix: ' 朝食', hashtag: '#ホテル朝食' } // 6:土
    ];

    // エポック日数（JST基準）を用いて、6都市が毎日均等に順次循環するようにローテーションを改善
    const msInDay = 24 * 60 * 60 * 1000;
    const epochDays = Math.floor((jstDate.getTime() + 9 * 60 * 60 * 1000) / msInDay);
    const city = CITIES[epochDays % CITIES.length];
    const t = themes[dayOfWeek];

    console.log(`Target City: ${city.name}, Theme: ${t.name} (dayOfWeek: ${dayOfWeek}, epochDays: ${epochDays})`);

    const url = 'https://openapi.rakuten.co.jp/engine/api/Travel/KeywordHotelSearch/20170426';
    const params = {
        applicationId: RAKUTEN_APP_ID,
        accessKey: 'pk_5MWJwVdIjLhdoj7Zg1RriahaHY2JahwsKyl6c3KDRkG',
        affiliateId: RAKUTEN_AFFILIATE_ID,
        format: 'json',
        keyword: city.keyword + t.keywordSuffix,
        middleClassCode: city.middle,
        smallClassCode: city.small,
        hits: 30
    };
    if (city.detail) params.detailClassCode = city.detail;

    // utilsの関数を使って、ソートと足切りを適用したトップ1件を取得
    const hotels = await fetchRakutenApi(url, params, t.minReview, t.sort, 1);
    const hotel = hotels && hotels.length > 0 ? hotels[0] : null;

    if (!hotel) {
        console.log(`No hotel data found for ${city.name} (${t.name}).`);
        return;
    }

    // X（旧Twitter）の日本語環境における文字数カウント（全角＝2ポイント、半角＝1ポイント）
    // 最大280ポイント（全角140文字）制限
    function countXPoints(str) {
        if (!str) return 0;
        let points = 0;
        for (let i = 0; i < str.length; i++) {
            const code = str.charCodeAt(i);
            if ((code >= 0x0000 && code <= 0x007f) || (code >= 0xff61 && code <= 0xff9f)) {
                points += 1;
            } else {
                points += 2;
            }
        }
        return points;
    }

    // X（旧Twitter）用テキストの自動生成関数
    async function generateXTweets(city, theme, hotel) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.warn("GEMINI_API_KEY is not defined. Using fallback static template.");
            return null;
        }

        try {
            const ai = new GoogleGenAI({ apiKey });
            const prompt = `
以下のホテル情報と今日のテーマをもとに、X（旧Twitter）に投稿する「スレッド投稿（親ツイートと子ツイートの2件）」の文章を日本語で生成してください。
ユーザーの興味を惹きつけ、リンクをクリックして詳細を見たくなるような、洗練されたマーケティング文章（「ポチらせる」文章）を作成してください。

【テーマとホテル情報】
都市名: ${city.name}
今日のテーマ: ${theme.name}
ホテル名: ${hotel.name}
最安料金目安: ${Number(hotel.price).toLocaleString()} 円
クチコミ評価: ${hotel.reviewAverage || '4.0'} / 5.0
ホテルの特徴（楽天APIより）: ${hotel.special || 'なし'}

【作成ルール】
1. **親ツイート（tweet1）の作成ルール**:
   - 旅に行きたくなるエモーショナルな感情や、コスパの良さをアピールするフックとなる魅力的な文章。
   - 文字数はハッシュタグを含めて**厳密に全角130文字以内**（合計260ポイント/バイト以内）に収めてください。
   - 文末に必ず以下のハッシュタグをスペース区切りで含めてください：
     #${city.name}旅行 ${theme.hashtag}
   - 「💡【AI解析】〜」などの機械的な固定文頭は避け、毎回新鮮なフックから書き始めてください。

2. **子ツイート（tweet2）の作成ルール**:
   - ホテル名（${hotel.name}）を明記し、その宿の最大の魅力を端的に紹介する文章。
   - 必ず以下のURLを含めてください（文字数カウントに含まれます）：
     ${BASE_URL}/${city.id}/
   - URLとホテル名を含めて**厳密に全角130文字以内**（合計260ポイント/バイト以内）に収めてください。

3. **表現のルール**:
   - 「〜となっています」「〜が特徴です」「ぜひ訪れてみてください」「〜はいかがでしょうか」といった、ありきたりなAI風・ブログ風の表現は絶対に使わないでください。
   - プロの旅行ライター・インフルエンサーが発信しているような、リアルで魅力あふれる投稿文にしてください。

【出力フォーマット】
以下のJSONフォーマット（プレーンなJSONオブジェクトのみ、Markdownの\`\`\`json等のコードブロック囲みは不要）で出力してください。キー名は必ず一致させてください。

{
  "tweet1": "生成された親ツイートの文章（ハッシュタグを含む、130文字以内）",
  "tweet2": "生成された子ツイートの文章（URLとホテル名を含む、130文字以内）"
}
`;

            const response = await ai.models.generateContent({
                model: 'gemini-3.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: 'application/json'
                }
            });

            const jsonText = response.text;
            const cleanedJson = jsonText.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
            const parsedData = JSON.parse(cleanedJson);
            
            if (parsedData.tweet1 && parsedData.tweet2) {
                return parsedData;
            }
        } catch (e) {
            console.error('Error generating tweets via Gemini:', e.message);
        }
        return null;
    }

    let tweet1 = '';
    let tweet2 = '';
    
    // AIによる生成を実行
    const aiTweets = await generateXTweets(city, t, hotel);
    
    // AI生成成功、かつ文字数制限内に収まっているかチェック
    if (aiTweets && countXPoints(aiTweets.tweet1) <= 280 && countXPoints(aiTweets.tweet2) <= 280) {
        console.log(`[AI] ✅ Dynamic tweets successfully generated by Gemini 3.5 Flash!`);
        tweet1 = aiTweets.tweet1;
        tweet2 = aiTweets.tweet2;
    } else {
        // フォールバック：以前の静的テンプレートロジックで安全に生成
        console.warn(`[AI] ⚠️ Falling back to static templates (AI failed or text exceeded limit).`);
        
        let prTextLength = 20;
        let prText = truncateString(hotel.special, prTextLength);
        
        while (true) {
            tweet1 = `💡【AI解析】コスパバグりの宿を発見！
本日の${city.name}×${t.name}おすすめ✨
楽天★${hotel.reviewAverage || '-'}と高評価なのに、価格が相場以下に崩壊中。

「${prText}」

この質で1泊${Number(hotel.price).toLocaleString()}円〜は賢すぎる選択。
🚨詳細はスレッドへ👇
#${city.name}旅行 ${t.hashtag}`;

            const points = countXPoints(tweet1);
            if (points <= 280) {
                break;
            }

            if (prTextLength > 5) {
                prTextLength -= 2;
                prText = truncateString(hotel.special, prTextLength);
            } else {
                tweet1 = `💡【AI解析】最安コスパ宿を発見！
${city.name}×${t.name}おすすめ✨
評価★${hotel.reviewAverage || '-'}で1泊${Number(hotel.price).toLocaleString()}円〜はバグレベルにお得。
🚨詳細はスレッドへ👇
#${city.name}旅行`;
                break;
            }
        }

        tweet2 = `🏨 ${hotel.name}

▼AI厳選の最安値プラン確認と、賢く贅沢な旅（Smart & Luxury）のプランニングはこちら👇
${BASE_URL}/${city.id}/

宿泊費を賢く抑えた予算で、極上の体験を。Tabi Plan公式サイトで特設ガイド公開中✨`;
    }

    const dateStr = `${jstDate.getMonth() + 1}月${jstDate.getDate()}日投稿分`;

    // --- Generate GitHub Actions Summary (Markdown) ---
    let summaryMarkdown = `
# 📝 X投稿用原稿：${dateStr} (Buffer用)
最新の高評価・コスパデータに基づいた「スレッド形式」の投稿原稿です。

---

## 1. 【親ツイート】（興味付け・フック）
以下の文章をコピーし、**${city.name}の美しい風景画像（公式サイト背景など）**を1枚添付して投稿してください。

\`\`\`text
${tweet1}
\`\`\`

*(文字数目安: 約 ${Math.ceil(countXPoints(tweet1) / 2)} 文字（全角換算）/ 140文字以内)*

---

## 2. 【子ツイート】（詳細・公式サイトへの送客）
上記ツイートの「返信（スレッド追加）」として、以下の文章を繋げてください。

\`\`\`text
${tweet2}
\`\`\`

---
> [!TIP]
> **Bufferでのコツ**: 「Create Post」で1つ目の文章を入力した後、右下の「Add thread item」を押すと連投が作成できます。
`;

    // Write to GitHub Step Summary
    if (process.env.GITHUB_STEP_SUMMARY) {
        fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summaryMarkdown);
    } else {
        console.log(summaryMarkdown);
    }
}

run();
