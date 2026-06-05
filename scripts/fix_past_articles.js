// 既存の pickup 記事の description セクションをAIで再生成するスクリプト
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

const ARTICLES_TO_FIX = [
    {
        file: '2026-06-01-sapporo-daits-ky-fno.html',
        hotelName: 'ダイワロイネットホテル札幌PREMIER',
        hotelSpecial: '大通公園の北側に位置し、観光・ビジネスに最適',
        access: 'JR札幌駅から徒歩約10分、地下鉄大通駅から徒歩約2分',
        address: '北海道札幌市中央区南1条西6丁目8番1号',
        reviewAverage: '4.34',
        reviewCount: '663',
        hotelMinCharge: '2278',
        city: '札幌',
    },
    {
        file: '2026-06-02-hotel-front-in-fukuoka.html',
        hotelName: 'ホテルフロントイン福岡空港',
        hotelSpecial: '福岡空港から徒歩12分。ビジネス・観光・イベントに最適',
        access: '福岡空港より徒歩12分。博多駅より地下鉄約5分',
        address: '福岡県福岡市博多区大字下臼井近辺',
        reviewAverage: '4.1',
        reviewCount: '663',
        hotelMinCharge: '7040',
        city: '福岡',
    }
];

// Gemini APIでオリジナルの詳細説明文を生成する
async function generateDetailedDescription(hotelInfo) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('GEMINI_API_KEY が設定されていません');
        return null;
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
以下のホテル情報をもとに、旅行予約サイトの紹介記事として、魅力的かつSEOに最適化されたオリジナルの文章（日本語）を生成してください。

【重要ルール：CVR（成約率）を最大化するライティング】
単なるホテルのスペック紹介ではなく、「客観的ロジック（なぜこの宿が今一番お得なのか）」と「緊急性・限定性（なぜ今すぐ予約すべきか）」を必ず含めてください。
「AIが過去の価格やコスパ評価を解析した結果、今が最もお得である」という文脈で説得力を持たせてください。

【ホテル情報】
ホテル名: ${hotelInfo.hotelName}
キャッチコピー: ${hotelInfo.hotelSpecial}
住所: ${hotelInfo.address}
最安料金目安: ${hotelInfo.hotelMinCharge} 円
クチコミ評価: ${hotelInfo.reviewAverage} / 5.0 (件数: ${hotelInfo.reviewCount}件)
アクセス: ${hotelInfo.access}
都市: ${hotelInfo.city}

【出力フォーマット】
以下のJSONフォーマット（プレーンなJSONオブジェクトのみ）で出力してください。

{
  "metaDescription": "120文字程度で、検索エンジン向けにホテルの魅力を簡潔にまとめ、クリックしたくなるような紹介文。",
  "catchcopy": "ホテルの魅力を表現した、キャッチーで短い一行のキャッチコピー。",
  "smartPoint": "【AI価格解析】等の言葉を使い、コスパ評価や相場と比較して『なぜ今この価格がバグっている（お得）なのか』を客観的・論理的に解説する文章(100文字)。",
  "beautifulPoint": "空間の情緒的な魅力と、『浮いた予算でこんな贅沢ができる』という賢いラグジュアリー（Smart & Luxury）の提案(100文字)。",
  "locationPoint": "立地の良さと、それを活かした旅のメリット(100文字)。",
  "detailedDescription": "プレーンなテキスト（段落タグ不要）で出力してください。全体で400〜600文字程度。内容は以下の順で構成してください。①AIによる厳選理由（客観的ロジック）、②滞在のエモーショナルな情景、③『空室が埋まる前に本日中の予約推奨』など、今すぐポチらないと損をする緊急性を煽るクロージング文。"
}
`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });

        const jsonText = response.text;
        const cleanedJson = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsedData = JSON.parse(cleanedJson);

        // 句点「。」ごとに改行を入れて読みやすくする
        if (parsedData.detailedDescription) {
            parsedData.detailedDescription = parsedData.detailedDescription.replace(/。/g, '。\n\n').trim();
        }

        return parsedData;
    } catch (e) {
        console.error('AI生成エラー:', e.message);
        return null;
    }
}

// HTMLファイルの各セクションをAI生成コンテンツで上書きする
function patchArticle(filePath, aiData) {
    let html = fs.readFileSync(filePath, 'utf8');

    // description セクションを置換
    const descStart = html.indexOf('<section class="description">');
    const descEnd = html.indexOf('</section>', descStart) + 10;
    if (descStart === -1) {
        console.error('description セクションが見つかりません:', filePath);
        return false;
    }

    // detailedDescription を段落タグで包む
    const descHtml = aiData.detailedDescription
        .split('\n\n')
        .filter(p => p.trim().length > 0)
        .map(p => `<p>${p.trim()}</p>`)
        .join('\n                ');

    const newDescSection = `<section class="description">\n                ${descHtml}\n            </section>`;
    html = html.substring(0, descStart) + newDescSection + html.substring(descEnd);

    // キャッチコピー・各ポイントも更新
    if (aiData.catchcopy) {
        html = html.replace(/(<p style="color: rgba\(255,255,255,0\.7\); font-size: 1\.2rem;">)[^<]*/,
            `$1${aiData.catchcopy}`);
    }
    if (aiData.smartPoint) {
        html = html.replace(/(<div class="highlight-item">[\s\S]*?<h3>賢い選択<\/h3>\s*<p>)[^<]*/,
            (m, prefix) => `${prefix}${aiData.smartPoint}`);
    }
    if (aiData.beautifulPoint) {
        html = html.replace(/(<div class="highlight-item">[\s\S]*?<h3>美しき滞在<\/h3>\s*<p>)[^<]*/,
            (m, prefix) => `${prefix}${aiData.beautifulPoint}`);
    }
    if (aiData.locationPoint) {
        html = html.replace(/(<div class="highlight-item">[\s\S]*?<h3>最高の立地<\/h3>\s*<p>)[^<]*/,
            (m, prefix) => `${prefix}${aiData.locationPoint}`);
    }
    // meta description も更新
    if (aiData.metaDescription) {
        html = html.replace(/(<meta name="description" content=")[^"]*(")/,
            `$1${aiData.metaDescription}$2`);
    }

    fs.writeFileSync(filePath, html, 'utf8');
    return true;
}

async function run() {
    for (const hotelInfo of ARTICLES_TO_FIX) {
        const filePath = path.join(__dirname, '../pickup', hotelInfo.file);

        if (!fs.existsSync(filePath)) {
            console.warn(`ファイルが見つかりません: ${hotelInfo.file}`);
            continue;
        }

        console.log(`\n--- ${hotelInfo.hotelName} (${hotelInfo.file}) ---`);
        console.log('AI文章を生成中...');
        const aiData = await generateDetailedDescription(hotelInfo);

        if (!aiData) {
            console.error('AI生成に失敗しました。スキップします。');
            continue;
        }

        console.log('生成成功！記事を更新中...');
        console.log('キャッチコピー:', aiData.catchcopy);
        console.log('詳細説明（先頭100文字）:', aiData.detailedDescription.substring(0, 100));

        const success = patchArticle(filePath, aiData);
        if (success) {
            console.log(`✅ ${hotelInfo.file} を更新しました`);
        } else {
            console.error(`❌ ${hotelInfo.file} の更新に失敗しました`);
        }

        // 次のAI呼び出しまで少し待機（レートリミット対策）
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log('\n✅ 全記事の修正が完了しました');
}

run();
