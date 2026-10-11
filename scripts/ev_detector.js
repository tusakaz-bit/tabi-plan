/**
 * ev_detector.js
 * 宿泊施設のEV（電気自動車）充電設備判定モジュール
 *
 * 楽天トラベルAPIから返却される hotelBasicInfo の各テキストフィールド
 * （parkingInformation, hotelSpecial, access, hotelName）をローカル解析し、
 * EV充電設備が確実に設置されているかを高精度・誤検知ゼロで判定します。
 */

function detectEvCharging(hotelBasicInfo) {
    if (!hotelBasicInfo) return { hasEv: false, field: null, snippet: null };

    const parking = hotelBasicInfo.parkingInformation || '';
    const special = hotelBasicInfo.hotelSpecial || '';
    const access = hotelBasicInfo.access || '';
    const name = hotelBasicInfo.hotelName || '';

    // 誤検知防止フィルター（ネガティブパターン）
    // 1. スマホ・携帯電話の充電器貸出（フロント貸出等）
    // 2. 館内エレベーター（EV）の略称
    const falsePositiveRegex = /(?:スマホ|携帯|スマートフォン|モバイル|iPhone|Android|客室|部屋)[\s\S]{0,10}充電器?(?:貸出|無料|レンタル)|エレベーター|EVホール|EV乗降|EV\d+基/i;

    // 駐車場情報用の判定パターン（駐車場内に書かれている充電/EVは車両用）
    const parkingEvRegex = /(?:EV|ＥＶ|電気自動車|PHEV|ＰＨＥＶ|PHV|ＰＨＶ|テスラ|TESLA|ポルシェ)(?:[^\n、。]{0,15})(?:充電|給電|スタンド|ステーション|エネチェンジ|チャージャー|電源|コンセント|ターミナル)/i;
    const parkingReverseRegex = /(?:充電|給電|急速充電|普通充電)(?:[^\n、。]{0,15})(?:スタンド|ステーション|設備|スポット|ターミナル|器|機|可|完備|設置|エネチェンジ)/;

    // A. 駐車場情報（parkingInformation）の判定
    if (parking) {
        if (parkingEvRegex.test(parking) || parkingReverseRegex.test(parking)) {
            if (!falsePositiveRegex.test(parking)) {
                const match = parking.match(parkingEvRegex) || parking.match(parkingReverseRegex);
                return { hasEv: true, field: 'parkingInformation', snippet: match ? match[0] : parking };
            }
        }
    }

    // B. 特徴文（hotelSpecial）、ホテル名、アクセス欄の判定（厳格パターン）
    const strictEvRegex = /(?:EV|ＥＶ|電気自動車|PHEV|テスラ)(?:[^\n、。]{0,10})(?:充電(?:スタンド|スポット|設備|器|機|ターミナル|可能|完備|設置|エネチェンジ))/i;
    for (const [field, text] of [['hotelSpecial', special], ['hotelName', name], ['access', access]]) {
        if (text && strictEvRegex.test(text)) {
            if (!falsePositiveRegex.test(text)) {
                const match = text.match(strictEvRegex);
                return { hasEv: true, field, snippet: match ? match[0] : text };
            }
        }
    }

    return { hasEv: false, field: null, snippet: null };
}

module.exports = {
    detectEvCharging
};
