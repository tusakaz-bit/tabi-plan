try { require('dotenv').config(); } catch (e) { /* dotenvが無い環境では無視 */ }
const fs = require('fs');
const path = require('path');
const { fetchRakutenApi, RAKUTEN_APP_ID, RAKUTEN_AFFILIATE_ID } = require('./utils');
const { GoogleGenAI } = require('@google/genai');

const BASE_URL = 'https://tabi-plan.org';

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

async function generateXTweets(niche, hotel) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;

    try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `
以下の情報をもとに、X（旧Twitter）に投稿する「スレッド投稿（親ツイートと子ツイートの2件）」の文章を日本語で生成してください。
フォーマットの崩れ（エッセイ調、ポエム調など）は厳禁です。必ず以下の【構造固定ルール】に完全に従ってください。

【対象の特設ページ（ニッチ条件）】
都市名: ${niche.cityName}
ターゲット層・キーワード: ${niche.keyword.replace(/安い|格安/g, '高コスパ')}
特設ページURL: ${BASE_URL}/${niche.city}/${niche.slug}/

【ピックアップホテル例】
ホテル名: ${hotel.name}
参考価格: ${Number(hotel.price).toLocaleString()} 円〜
クチコミ評価: ${hotel.reviewAverage || '4.0'} / 5.0
ホテルの特徴（楽天APIより）: ${hotel.special || 'なし'}

【作成ルール（厳守事項）】
1. **親ツイート（tweet1）の構造固定**:
   - 1行目: 「✨ 今日の宿選び」
   - 2行目: 「${niche.cityName}で『絶対に失敗しない・高コスパなホテル』をお探しですか？🌿」のようなターゲットへの魅力的な問いかけ
   - 3行目: 「評価★${hotel.reviewAverage || '4.0'}で参考価格 ${Number(hotel.price).toLocaleString()}円〜と、価格以上の感動が味わえる素晴らしい宿を見つけました。」のように、必ず『評価★〇.〇』と『参考価格 〇,〇〇〇円〜』の具体的な数値をそのまま含めること。
   - 4行目: 「次の旅行の参考に、ぜひブックマーク（保存）推奨です✨」
   - 5行目: 「#${niche.cityName}旅行 #ホテル選び #TABIPLAN」 （必ず含める）

2. **子ツイート（tweet2）の構造固定**:
   - 1行目: 「🏨 ${hotel.name}」
   - 2行目: ホテルの簡潔な魅力（ホテルの特徴から1行程度で抽出。長文禁止）
   - 3行目: 「▼独自の品質基準（清潔感・セキュリティ・コスパ）で厳選した、ハズレなしの宿リストはこちら👇」
   - 4行目: 特設ページのURL（${BASE_URL}/${niche.city}/${niche.slug}/）

3. **禁止事項**:
   - 「秋の連休や年末年始の…」といった時候の挨拶や、エッセイ調の長文ポエムは絶対に書かないでください。
   - 「バグ級」「コスパ崩壊」「最安値」「格安」「安い」「ランキング」などの単語は一切禁止です。
   - フォーマットを崩さず、指定された行構成を必ず守ってください。

【出力フォーマット】
以下のJSONフォーマット（プレーンなJSONオブジェクトのみ、Markdownのコードブロック囲みは不要）で出力してください。

{
  "tweet1": "生成された親ツイートの文章",
  "tweet2": "生成された子ツイートの文章"
}
`;

        const response = await ai.models.generateContent({
            model: 'gemini-3.6-flash',
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

async function run() {
    console.log('Generating daily X post drafts (V2 Niche Focus)...');

    const configPath = path.join(__dirname, 'niche_config.json');
    const niches = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const nicheKeys = Object.keys(niches);

    const now = new Date();
    const jstDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
    const msInDay = 24 * 60 * 60 * 1000;
    const epochDays = Math.floor((jstDate.getTime() + 9 * 60 * 60 * 1000) / msInDay);
    
    const dateStr = `${jstDate.getMonth() + 1}月${jstDate.getDate()}日投稿分`;
    let summaryMarkdown = `# 📝 X投稿用原稿：${dateStr} (Buffer用 - 4件一括生成)\n最新の高評価データに基づいた「特設ページ誘導型」のスレッド形式投稿原稿です。Bufferの4つのキュー（7:00, 8:15, 9:30, 11:00）に順次セットしてください。\n\n`;

    // 1回の実行で4パターンのドラフトを生成する
    for (let i = 0; i < 4; i++) {
        // オフセットを変えて毎回異なるニッチを選択
        const selectedKey = nicheKeys[(epochDays * 4 + i) % nicheKeys.length];
        const niche = niches[selectedKey];

        console.log(`Target Niche [${i+1}/4]: ${niche.cityName} - ${niche.keyword}`);

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
            console.log('No hotels found. Skipping this niche.');
            continue;
        }

        const hotel = hotels[0];
        
        // API制限を回避するために15秒待機（初回以外）
        if (i > 0) {
            console.log('Waiting 15 seconds to avoid rate limits...');
            await new Promise(resolve => setTimeout(resolve, 15000));
        }

        // AIによる生成を実行
        const aiTweets = await generateXTweets(niche, hotel);
        let tweet1 = '', tweet2 = '';
        
        if (aiTweets && countXPoints(aiTweets.tweet1) <= 280 && countXPoints(aiTweets.tweet2) <= 280) {
            console.log(`[AI] ✅ Dynamic tweets successfully generated by Gemini!`);
            tweet1 = aiTweets.tweet1;
            tweet2 = aiTweets.tweet2;
        } else {
            console.log(`[AI] ⚠️ Falling back to static templates.`);
            tweet1 = `✨ 今日の宿選び\n${niche.cityName}で「絶対に失敗しない・高コスパなホテル」をお探しですか？🌿\n評価★${hotel.reviewAverage || '-'}で参考価格 ${Number(hotel.price).toLocaleString()}円〜と、価格以上の感動が味わえる素晴らしい宿を見つけました。\n次の旅行の参考に、ぜひブックマーク（保存）推奨です✨ #${niche.cityName}旅行 #ホテル選び #TABIPLAN`;
            tweet2 = `🏨 ${hotel.name}\n\n▼独自の品質基準（清潔感・セキュリティ・コスパ）で厳選した、ハズレなしの宿リストはこちら👇\n${BASE_URL}/${niche.city}/${niche.slug}/`;
        }

        summaryMarkdown += `---

## 投稿パターン ${i+1} (${niche.cityName})

### 【親ツイート】
以下の文章をコピーし、**${niche.cityName}の美しい昼間の風景画像** または **ホテルの写真** を1枚添付して投稿してください。

\`\`\`text
${tweet1}
\`\`\`
*(文字数目安: 約 ${Math.ceil(countXPoints(tweet1) / 2)} 文字 / 140文字以内)*

### 【子ツイート】（返信としてスレッド追加）
\`\`\`text
${tweet2}
\`\`\`

`;
    }

    summaryMarkdown += `> [!TIP]\n> **Bufferでのコツ**: 「Create Post」で1つ目の文章を入力した後、右下の「Add thread item」を押すと連投が作成できます。\n`;

    if (process.env.GITHUB_STEP_SUMMARY) {
        fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summaryMarkdown);
    } else {
        console.log(summaryMarkdown);
    }
}

run();
