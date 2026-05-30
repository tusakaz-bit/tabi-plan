const axios = require('axios');
const { GoogleGenAI } = require('@google/genai');

const RAKUTEN_APP_ID = 'ecc263bd-2573-4a88-933e-159e08ff4fff';
const RAKUTEN_AFFILIATE_ID = '047ad0f1.183c70cf.047ad0f2.1e4c3769';

const CITIES = [
    { name: '東京', id: 'tokyo', middle: 'tokyo', small: 'tokyo', detail: 'A', keyword: '東京駅' },
    { name: '大阪', id: 'osaka', middle: 'osaka', small: 'shi', detail: 'D', keyword: '大阪駅' },
    { name: '京都', id: 'kyoto', middle: 'kyoto', small: 'shi', detail: 'B', keyword: '京都駅' },
    { name: '札幌', id: 'sapporo', middle: 'hokkaido', small: 'sapporo', detail: 'B', keyword: '札幌駅' },
    { name: '沖縄', id: 'okinawa', middle: 'okinawa', small: 'nahashi', detail: '', keyword: '国際通り' },
    { name: '福岡', id: 'fukuoka', middle: 'hukuoka', small: 'fukuoka', detail: '', keyword: '博多駅' }
];

async function fetchRakutenApi(url, params, minReviewScore = 3.5, sortType = 'cheap', count = 3) {
    try {
        const response = await axios.get(url, { params, headers: { 'Referer': 'https://tabi-plan.org/', 'Origin': 'https://tabi-plan.org' } });
        if (response.data && response.data.hotels && response.data.hotels.length > 0) {
            let filteredHotels = response.data.hotels
                .map(h => h.hotel[0].hotelBasicInfo)
                .filter(h => h.hotelMinCharge); // 料金が設定されているもののみ

            // レビュー点数での足切り
            if (minReviewScore > 0) {
                filteredHotels = filteredHotels.filter(h => h.reviewAverage && h.reviewAverage >= minReviewScore);
            }

            // ソート
            if (sortType === 'review') {
                // レビュー評価が高い順（同点なら件数順）
                filteredHotels.sort((a, b) => {
                    if (b.reviewAverage !== a.reviewAverage) return b.reviewAverage - a.reviewAverage;
                    return (b.reviewCount || 0) - (a.reviewCount || 0);
                });
            } else {
                // 最安値順 (cheap)
                filteredHotels.sort((a, b) => a.hotelMinCharge - b.hotelMinCharge);
            }
            
            if (filteredHotels.length > 0) {
                // 上位 count 件を返す
                return filteredHotels.slice(0, count).map(hotel => {
                    const hotelNo = hotel.hotelNo;
                    const affiliateUrl = `https://hb.afl.rakuten.co.jp/hgc/047ad0f1.183c70cf.047ad0f2.1e4c3769/?pc=https%3A%2F%2Ftravel.rakuten.co.jp%2FHOTEL%2F${hotelNo}%2F${hotelNo}.html&m=https%3A%2F%2Ftravel.rakuten.co.jp%2FHOTEL%2F${hotelNo}%2F${hotelNo}.html`;
                    return {
                        name: hotel.hotelName,
                        price: hotel.hotelMinCharge,
                        url: affiliateUrl,
                        imageUrl: hotel.hotelImageUrl,
                        special: hotel.hotelSpecial,
                        reviewAverage: hotel.reviewAverage,
                        reviewCount: hotel.reviewCount
                    };
                });
            }
        }
    } catch (error) {
        console.error('Rakuten API Error:', error.message);
    }
    return [];
}

// Gemini APIを使用して、はてなブログ用のCVR特化型オリジナル紹介文と評価短評を生成する
async function generateHatenaAIContent(hotelInfo) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;

    try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `
以下のホテル情報をもとに、下記2つのテキストをJSON形式で生成してください。
楽天APIの元の説明文のコピペは禁止です。

【ホテル情報】
ホテル名: ${hotelInfo.name}
キャッチコピー: ${hotelInfo.special || 'なし'}
最安料金目安: ${hotelInfo.price ? hotelInfo.price + '円〜' : '不明'}
クチコミ評価: ${hotelInfo.reviewAverage || '4.0'} / 5.0（${hotelInfo.reviewCount || 0}件）

【出力フォーマット（必ずこのJSONのみを出力すること）】
{
  "summary": "クチコミ評価と価格帯をもとに、このホテルの最大の魅力や強みを読者視点で端的にまとめた50〜60文字の評価短評。体言止めや感嘆表現でリズムよく。",
  "description": "「客観的ロジック（なぜ安い・お得なのか）」と「緊急性・限定性（なぜ今すぐ予約すべきか）」を含んだ、読者を強烈に惹きつける日本語のオリジナル紹介文（約150〜200文字）。プレーンテキスト（HTMLタグ不要）。"
}
`;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        // JSON部分のみを抽出してパース
        const rawText = response.text.trim();
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                summary: (parsed.summary || '').substring(0, 65),  // 最大65文字に安全制限
                description: parsed.description || ''
            };
        }
        // JSONパース失敗時はフォールバックとして本文のみ返す
        return { summary: null, description: rawText };
    } catch (e) {
        console.error("Error generating AI content for Hatena:", e);
        return null;
    }
}

async function generateHtmlBody(city, intro, hotels) {
    let body = `<p>${intro}</p>\n<hr />\n`;

    for (let index = 0; index < hotels.length; index++) {
        const hotel = hotels[index];
        // レビューの星表示を作成
        let reviewHtml = '';
        if (hotel.reviewAverage) {
            reviewHtml = `<p style="font-size: 0.95rem; color: #f39c12; margin: 5px 0; font-weight: bold;">★ ${hotel.reviewAverage} <span style="color: #666; font-size: 0.8rem; font-weight: normal;">(${hotel.reviewCount}件の評価)</span></p>`;
        }

        // Gemini AIでCVR特化のオリジナル紹介文＋評価短評を生成
        console.log(`Generating AI intro for Hatena: ${hotel.name}...`);
        const aiResult = await generateHatenaAIContent(hotel);

        let aiSummary = null;
        let aiDescription = '';

        if (aiResult) {
            aiSummary = aiResult.summary || null;
            aiDescription = aiResult.description || '';
        }

        // AI生成に失敗した場合は従来のテキスト抽出にフォールバック
        if (!aiDescription) {
            let specialText = hotel.special || '';
            let match = specialText.match(/^([^。！？]{10,120}[。！？])/);
            aiDescription = match ? match[1] : (specialText.length > 120 ? specialText.substring(0, 120) + '...' : specialText);
        }

        // スマホでの読みやすさを究極にするため、句点「。」ごとに1行（2回の改行）空ける処理
        aiDescription = aiDescription.replace(/。/g, '。\n\n').trim();

        // AIが生成したホテルごとの評価短評バッジ（失敗時は非表示）
        const aiBadgeHtml = aiSummary
            ? `<span style="background: #e2e8f0; color: #334155; font-size: 0.75rem; padding: 2px 6px; border-radius: 3px; font-weight: bold; margin-bottom: 5px; display: inline-block;">${aiSummary}</span><br>`
            : '';

        body += `
<h3 style="border-left: 5px solid #D4AF37; padding-left: 15px; margin-top: 30px; margin-bottom: 15px;">${index + 1}. ${hotel.name}</h3>
<div style="display: flex; flex-wrap: wrap; gap: 20px; align-items: flex-start; background: #f9f9f9; padding: 20px; border-radius: 8px;">
    <div style="flex: 1; min-width: 200px; position: relative;">
        <img src="${hotel.imageUrl}" alt="${hotel.name}" style="width: 100%; border-radius: 4px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); display: block;" />
        <div style="position: absolute; bottom: 8px; left: 8px; background: rgba(0, 0, 0, 0.6); color: white; padding: 2px 8px; font-size: 0.7rem; border-radius: 3px; font-weight: bold; pointer-events: none; z-index: 5;">Rakuten Travel</div>
    </div>
    <div style="flex: 2; min-width: 250px;">
        ${reviewHtml}
        <p style="font-size: 0.95rem; color: #444; margin-bottom: 15px; line-height: 1.8; background: #fff; padding: 15px; border-radius: 4px; border: 1px solid #e2e8f0; white-space: pre-wrap;">${aiBadgeHtml}${aiBadgeHtml ? '<br>' : ''}${aiDescription}</p>
        <p style="font-size: 1.2rem; color: #d32f2f; font-weight: bold; margin-bottom: 15px;">最安料金目安：${Number(hotel.price).toLocaleString()}円〜</p>
        <p><a href="${hotel.url}" target="_blank" style="display: block; background: #D4AF37; color: white; padding: 12px 10px; text-decoration: none; border-radius: 4px; font-weight: bold; text-align: center; box-sizing: border-box; font-size: 0.95rem;">最安値プランを楽天トラベルで確認する</a></p>
    </div>
</div>
`;
    }

    body += `
<hr style="margin-top: 40px;" />
<div style="background: #e2e8f0; padding: 25px; border-radius: 8px; text-align: center;">
    <h4 style="margin-top: 0; color: #334155; font-size: 1.2rem;">✨ ${city.name}の観光をもっと楽しむなら ✨</h4>
    <p style="font-size: 0.95rem; color: #475569; margin-bottom: 20px; line-height: 1.6;">
        宿泊費を賢く抑えた予算で、旅先でしかできない極上の体験を。地元民しか知らない隠れ家スポットや、賢く贅沢な旅（Smart & Luxury）のプランニングは、Tabi Plan公式サイトで！
    </p>
    <a href="https://tabi-plan.org/${city.id}/" style="display: inline-block; background: #334155; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        Tabi Plan ${city.name}特設ガイドを見る
    </a>
</div>
<p style="font-size: 0.8rem; color: #94a3b8; text-align: right; margin-top: 15px;">
    ※表示価格や評価はAI解析時点のものです。最新の情報はリンク先で必ずご確認ください。<br />
    運営者情報・お問い合わせは、<a href="https://docs.google.com/forms/d/e/1FAIpQLSet-9B7CK7vMy61OyLAEJCCJfftV-VoUGM1OIB_tULGeglcHw/viewform?usp=pp_url" target="_blank" style="color: #64748b; text-decoration: underline;">お問い合わせフォーム</a>よりご連絡ください。
</p>`;
    
    return body;
}

function getDateString() {
    const now = new Date();
    const jstDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
    return `${jstDate.getFullYear()}年${jstDate.getMonth() + 1}月${jstDate.getDate()}日`;
}

module.exports = {
    RAKUTEN_APP_ID,
    RAKUTEN_AFFILIATE_ID,
    CITIES,
    fetchRakutenApi,
    generateHtmlBody,
    getDateString
};
