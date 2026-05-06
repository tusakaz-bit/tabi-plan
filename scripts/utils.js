const axios = require('axios');

const RAKUTEN_APP_ID = '2d0fb5d11e725c9ab3b42cf9f5bca085';
const RAKUTEN_AFFILIATE_ID = '047ad0f1.183c70cf.047ad0f2.1e4c3769';

const CITIES = [
    { name: '東京', id: 'tokyo', middle: 'tokyo', small: 'tokyo', detail: 'A' },
    { name: '大阪', id: 'osaka', middle: 'osaka', small: 'shi', detail: 'D' },
    { name: '京都', id: 'kyoto', middle: 'kyoto', small: 'shi', detail: 'B' },
    { name: '札幌', id: 'sapporo', middle: 'hokkaido', small: 'sapporo', detail: 'B' },
    { name: '沖縄', id: 'okinawa', middle: 'okinawa', small: 'nahashi', detail: '' },
    { name: '福岡', id: 'fukuoka', middle: 'hukuoka', small: 'fukuoka', detail: '' }
];

async function fetchRakutenApi(url, params) {
    try {
        const response = await axios.get(url, { params });
        if (response.data && response.data.hotels && response.data.hotels.length > 0) {
            // 最安値で手動ソート（KeywordHotelSearchは自動ソートされないため）
            const sortedHotels = response.data.hotels
                .map(h => h.hotel[0].hotelBasicInfo)
                .filter(h => h.hotelMinCharge) // 料金が設定されているもののみ
                .sort((a, b) => a.hotelMinCharge - b.hotelMinCharge);
            
            if (sortedHotels.length > 0) {
                const hotel = sortedHotels[0];
                return {
                    name: hotel.hotelName,
                    price: hotel.hotelMinCharge,
                    url: hotel.affiliateUrl,
                    imageUrl: hotel.hotelImageUrl,
                    special: hotel.hotelSpecial,
                    reviewAverage: hotel.reviewAverage,
                    reviewCount: hotel.reviewCount
                };
            }
        }
    } catch (error) {
        console.error('Rakuten API Error:', error.message);
    }
    return null;
}

function generateHtmlBody(intro, results) {
    let body = `<p>${intro}</p>
<hr />`;

    results.forEach(r => {
        // レビューの星表示を作成
        let reviewHtml = '';
        if (r.hotel.reviewAverage) {
            reviewHtml = `<p style="font-size: 0.9rem; color: #f39c12; margin: 5px 0;">★ ${r.hotel.reviewAverage} <span style="color: #666; font-size: 0.8rem;">(${r.hotel.reviewCount}件の評価)</span></p>`;
        }

        // PR文の長さを調整（長すぎる場合は省略）
        let specialText = r.hotel.special || '';
        if (specialText.length > 80) {
            specialText = specialText.substring(0, 80) + '...';
        }

        body += `
<h2 style="border-left: 5px solid #D4AF37; padding-left: 15px; margin-top: 30px;">📍 ${r.city.name} エリア</h2>
<div style="display: flex; flex-wrap: wrap; gap: 20px; align-items: flex-start; background: #f9f9f9; padding: 20px; border-radius: 8px;">
    <div style="flex: 1; min-width: 200px;">
        <img src="${r.hotel.imageUrl}" alt="${r.hotel.name}" style="width: 100%; border-radius: 4px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);" />
    </div>
    <div style="flex: 2; min-width: 250px;">
        <h3 style="margin-top: 0; margin-bottom: 5px;">${r.hotel.name}</h3>
        ${reviewHtml}
        <p style="font-size: 0.95rem; color: #444; margin-bottom: 15px; line-height: 1.5;">${specialText}</p>
        <p style="font-size: 1.2rem; color: #d32f2f; font-weight: bold; margin-bottom: 15px;">最安料金：${Number(r.hotel.price).toLocaleString()}円〜</p>
        <p><a href="${r.hotel.url}" target="_blank" style="display: inline-block; background: #D4AF37; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">空室状況・詳細を見る</a></p>
    </div>
</div>
`;
    });

    body += `
<hr />
<p>※表示価格は投稿時点のものです。最新の情報はリンク先をご確認ください。</p>
<p>その他のエリアや観光情報は、<a href="https://tabi-plan.org/">Tabi Plan公式サイト</a>をご覧ください。</p>`;
    
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
