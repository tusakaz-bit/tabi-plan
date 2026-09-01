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
ユーザーの興味を惹きつけ、リンクをクリックして詳細を見たくなるような、洗練されたマーケティング文章（「ポチらせる」文章）を作成してください。

【対象の特設ページ（ニッチ条件）】
都市名: ${niche.cityName}
ターゲット層・キーワード: ${niche.keyword}
特設ページURL: ${BASE_URL}/${niche.city}/${niche.slug}/

【ピックアップホテル例】
ホテル名: ${hotel.name}
最安料金目安: ${Number(hotel.price).toLocaleString()} 円〜
クチコミ評価: ${hotel.reviewAverage || '4.0'} / 5.0
ホテルの特徴（楽天APIより）: ${hotel.special || 'なし'}

4. 【作成ルール】
1. **親ツイート（tweet1）の作成ルール（厳守事項）**:
   - ターゲット層（女性、カップル、コスパ重視でも質を求める層）に刺さるよう、プロの旅行ライターのような洗練されたトーンで記述してください。
   - 【季節の訴求】「秋の連休（シルバーウィーク・紅葉）や年末年始の旅行に向けた早めの予約」を促すトーンを追加してください。
   - 「バグ級」「コスパ崩壊」などの品のない煽りワードは一切禁止です。
   - 「心地よい風」「朝の光」「洗練された空間」など、五感や旅行中の感情に訴えかける美しい情景描写を必ず1つ以上入れてください。
   - **【重要】**サイトのOGP画像（昼間のパウダーブルーの空）と統一するため、夜景など夜や暗さを連想させる情景描写は一切使用せず、朝〜昼の明るい情景描写に限定してください。
   - **【重要】**Pinterest等のOGP画像も含め、万一人物像やファッションに言及する場合（またはAIが画像を自動生成するシステムと連動する場合）は、常に「どの季節で見ても違和感がない」通年仕様（seasonless）のルールを厳格に維持してください。
   - 「💡【AI解析】〜」といった機械的な固定構文は避け、毎回新鮮な切り口で書き出してください。
   - 行動喚起（CTA）は**親ツイートの末尾のみ**とし、「次の旅行のために保存推奨です」「見返せるようにブックマークを」など、保存を促す一言を自然に添えてください。
   - 文字数は**厳密に全角130文字以内**（合計260ポイント/バイト以内）に収めてください。
   - 文末に必ず以下のハッシュタグをスペース区切りで含めてください：
     #${niche.cityName}旅行 #ホテル選び

2. **子ツイート（tweet2）の作成ルール**:
   - こちらには**保存を促すCTAは含めず**、純粋に「今回ピックアップした『${hotel.name}』の魅力1文 ＋ 特設ページへの案内 ＋ URL」のみで構成してください。
   - 「この他にも条件に合う厳選宿をランキングでまとめています👇」などの短い案内フレーズを使用してください。
   - 必ず以下の特設ページURLを含めてください（文字数カウントに含まれます）：
     ${BASE_URL}/${niche.city}/${niche.slug}/
   - URLを含めて**厳密に全角130文字以内**（合計260ポイント/バイト以内）に収めてください。

【出力フォーマット】
以下のJSONフォーマット（プレーンなJSONオブジェクトのみ、Markdownの\`\`\`json等のコードブロック囲みは不要）で出力してください。

{
  "tweet1": "生成された親ツイートの文章（ハッシュタグを含む、130文字以内）",
  "tweet2": "生成された子ツイートの文章（URLとホテル名を含む、130文字以内）"
}
`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
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
            tweet1 = `✨ 今日の宿選び\n${niche.cityName}で「${niche.keyword}」をお探しですか？\n評価★${hotel.reviewAverage || '-'}で1泊${Number(hotel.price).toLocaleString()}円〜と、非常に満足度の高い宿泊プランを見つけました。\n次の旅行のために保存推奨です✨ #${niche.cityName}旅行 #ホテル選び`;
            tweet2 = `🏨 ${hotel.name}\n\n▼条件に合う厳選宿をランキングでまとめています👇\n${BASE_URL}/${niche.city}/${niche.slug}/`;
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
