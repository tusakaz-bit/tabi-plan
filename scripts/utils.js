const axios = require('axios');

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

function generateHtmlBody(city, intro, hotels) {
    let body = `<p>${intro}</p>\n<hr />\n`;

    hotels.forEach((hotel, index) => {
        // レビューの星表示を作成
        let reviewHtml = '';
        if (hotel.reviewAverage) {
            reviewHtml = `<p style="font-size: 0.95rem; color: #f39c12; margin: 5px 0; font-weight: bold;">★ ${hotel.reviewAverage} <span style="color: #666; font-size: 0.8rem; font-weight: normal;">(${hotel.reviewCount}件の評価)</span></p>`;
        }

        // 自然な推薦文の抽出（ぶつ切りを防ぐ）
        let specialText = hotel.special || '';
        // 最初の文（。！？まで）、またはある程度キリの良いところで切る
        let match = specialText.match(/^([^。！？]{10,120}[。！？])/);
        let naturalDesc = match ? match[1] : (specialText.length > 120 ? specialText.substring(0, 120) + '...' : specialText);

        body += `
<h3 style="border-left: 5px solid #D4AF37; padding-left: 15px; margin-top: 30px; margin-bottom: 15px;">${index + 1}. ${hotel.name}</h3>
<div style="display: flex; flex-wrap: wrap; gap: 20px; align-items: flex-start; background: #f9f9f9; padding: 20px; border-radius: 8px;">
    <div style="flex: 1; min-width: 200px; position: relative;">
        <img src="${hotel.imageUrl}" alt="${hotel.name}" style="width: 100%; border-radius: 4px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); display: block;" />
        <div style="position: absolute; bottom: 8px; left: 8px; background: rgba(0, 0, 0, 0.6); color: white; padding: 2px 8px; font-size: 0.7rem; border-radius: 3px; font-weight: bold; pointer-events: none; z-index: 5;">Rakuten Travel</div>
    </div>
    <div style="flex: 2; min-width: 250px;">
        ${reviewHtml}
        <p style="font-size: 0.95rem; color: #444; margin-bottom: 15px; line-height: 1.6; background: #fff; padding: 12px; border-radius: 4px; border: 1px solid #e2e8f0;">${naturalDesc}</p>
        <p style="font-size: 1.2rem; color: #d32f2f; font-weight: bold; margin-bottom: 15px;">最安料金：${Number(hotel.price).toLocaleString()}円〜</p>
        <p><a href="${hotel.url}" target="_blank" style="display: block; background: #D4AF37; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; text-align: center; box-sizing: border-box;">楽天トラベルで空室状況・詳細を見る</a></p>
    </div>
</div>
`;
    });

    body += `
<hr style="margin-top: 40px;" />
<div style="background: #e2e8f0; padding: 25px; border-radius: 8px; text-align: center;">
    <h4 style="margin-top: 0; color: #334155; font-size: 1.2rem;">✨ ${city.name}の観光をもっと楽しむなら ✨</h4>
    <p style="font-size: 0.95rem; color: #475569; margin-bottom: 20px; line-height: 1.6;">
        周辺の絶景スポットや格安グルメ、知る人ぞ知る穴場情報は、公式サイトの特設ページで詳しく解説しています！
    </p>
    <a href="https://tabi-plan.org/${city.id}/" style="display: inline-block; background: #334155; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        Tabi Plan ${city.name}ガイドを見る
    </a>
</div>
<p style="font-size: 0.8rem; color: #94a3b8; text-align: right; margin-top: 15px;">※表示価格や評価は投稿時点のものです。最新の情報はリンク先をご確認ください。</p>`;
    
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
