const fs = require('fs');
const { RAKUTEN_APP_ID, RAKUTEN_AFFILIATE_ID, CITIES, fetchRakutenApi } = require('./utils');

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
    // 翌日の日付を計算（準備して翌朝投稿することを想定）
    const tomorrow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const dayOfWeek = tomorrow.getDay(); // 投稿日の曜日 (0=日, 1=月, ..., 6=土)

    // X用のテーマ定義（はてなと連動）
    const themes = [
        { name: "長期滞在・連泊向き", sort: 'cheap', minReview: 3.5, keywordSuffix: ' 連泊', hashtag: '#ワーケーション' }, // 0:日
        { name: "格安・コスパ最強", sort: 'cheap', minReview: 3.5, keywordSuffix: '', hashtag: '#格安旅行' }, // 1:月
        { name: "レディースプラン", sort: 'review', minReview: 4.0, keywordSuffix: ' レディース', hashtag: '#女子旅' }, // 2:火
        { name: "カップル・記念日", sort: 'review', minReview: 4.0, keywordSuffix: ' 記念日', hashtag: '#記念日旅行' }, // 3:水
        { name: "アクセス抜群（駅チカなど）", sort: 'review', minReview: 3.8, keywordSuffix: ' 駅チカ', hashtag: '#便利' }, // 4:木
        { name: "露天風呂・温泉付き", sort: 'review', minReview: 4.0, keywordSuffix: ' 露天風呂', hashtag: '#温泉旅行' }, // 5:金
        { name: "朝食が美味しい", sort: 'review', minReview: 4.0, keywordSuffix: ' 朝食', hashtag: '#ホテル朝食' } // 6:土
    ];

    // 都市のローテーション（曜日ベースで日替わり: 0=東京, 1=大阪, ... 5=福岡, 6=東京に戻る）
    const city = CITIES[dayOfWeek % CITIES.length];
    const t = themes[dayOfWeek];

    console.log(`Target City: ${city.name}, Theme: ${t.name}`);

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

    // Xの全角140文字（半角280文字）制限に収まるようにPR文を抽出
    // 固定テキストが約80〜90文字あるため、PR文は最大45文字に制限
    const prText = truncateString(hotel.special, 45);

    // 親ツイート（フック）
    const tweet1 = `【〇〇ホテルが凄すぎる…】
本日の${city.name}エリア、「${t.name}」の宿を発見しました✨
楽天トラベルで★${hotel.reviewAverage || '-'}の高評価！

「${prText}」

これでお値段${Number(hotel.price).toLocaleString()}円〜は破格です😭
旅行予定の方、絶対にチェックしてください👇
#${city.name}旅行 ${t.hashtag}`;

    // 子ツイート（送客・リンク）
    const tweet2 = `🏨 ${hotel.name}

▼空室状況・詳細（楽天ポイントも貯まります！）
${hotel.url}

▼${city.name}の絶景スポットや格安グルメ、穴場情報はTabi Plan公式サイトへ！
${BASE_URL}/${city.id}/`;

    // --- Generate GitHub Actions Summary (Markdown) ---
    let summaryMarkdown = `
# 📝 本日のX投稿用原稿 (Buffer用)
最新の高評価・コスパデータに基づいた「スレッド形式」の投稿原稿です。

---

## 1. 【親ツイート】（興味付け・フック）
以下の文章をコピーし、**${city.name}の美しい風景画像（公式サイト背景など）**を1枚添付して投稿してください。

\`\`\`text
${tweet1}
\`\`\`

*(文字数目安: 約 ${tweet1.length} 文字 / 140文字以内)*

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
