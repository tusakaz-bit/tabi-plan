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

    // デフォルトのPR文の切り出し（スリムに20文字）
    let prTextLength = 20;
    let prText = truncateString(hotel.special, prTextLength);
    let tweet1 = '';
    
    // 280ポイント（全角140文字）以内に収まるまで、PR文の長さを削りながら自動調整するループ
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
            console.log(`Tweet1 successfully formatted within limits! Points: ${points} (${Math.ceil(points / 2)} chars equivalent)`);
            break;
        }

        // 超過している場合は、PR文をさらに短くする
        if (prTextLength > 5) {
            prTextLength -= 2;
            prText = truncateString(hotel.special, prTextLength);
        } else {
            // PR文を削りきっても収まらない場合は、ハッシュタグなどの一部の文言を削って強制終了
            tweet1 = `💡【AI解析】最安コスパ宿を発見！
${city.name}×${t.name}おすすめ✨
評価★${hotel.reviewAverage || '-'}で1泊${Number(hotel.price).toLocaleString()}円〜はバグレベルにお得。
🚨詳細はスレッドへ👇
#${city.name}旅行`;
            console.log(`Fallback slim tweet applied due to extreme length constraints.`);
            break;
        }
    }

    // 子ツイート（送客・リンク：生のアフィリエイトリンクを廃止し、Tabi Planの各都市ページに一本化）
    const tweet2 = `🏨 ${hotel.name}

▼AI厳選の最安値プラン確認と、賢く贅沢な旅（Smart & Luxury）のプランニングはこちら👇
${BASE_URL}/${city.id}/

宿泊費を賢く抑えた予算で、極上の体験を。Tabi Plan公式サイトで特設ガイド公開中✨`;

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
