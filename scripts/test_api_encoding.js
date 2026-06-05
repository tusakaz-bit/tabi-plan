// 楽天APIのレスポンスデータと文字コードを確認するテストスクリプト
const axios = require('axios');

const RAKUTEN_APP_ID = 'ecc263bd-2573-4a88-933e-159e08ff4fff';
const RAKUTEN_AFFILIATE_ID = '047ad0f1.183c70cf.047ad0f2.1e4c3769';

async function test() {
    // generate_pickup.jsと同じパラメータ・ヘッダーで呼び出す
    const res = await axios.get('https://openapi.rakuten.co.jp/engine/api/Travel/SimpleHotelSearch/20170426', {
        params: {
            applicationId: RAKUTEN_APP_ID,
            accessKey: 'pk_5MWJwVdIjLhdoj7Zg1RriahaHY2JahwsKyl6c3KDRkG',
            affiliateId: RAKUTEN_AFFILIATE_ID,
            format: 'json',
            largeClassCode: 'japan',
            middleClassCode: 'tokyo',
            smallClassCode: 'tokyo',
            detailClassCode: 'A'
        },
        headers: { 'Referer': 'https://tabi-plan.org/', 'Origin': 'https://tabi-plan.org' }
    });

    process.stdout.write('Content-Type: ' + res.headers['content-type'] + '\n');
    
    const hotel = res.data.hotels[0].hotel[0].hotelBasicInfo;
    process.stdout.write('ホテル名: ' + hotel.hotelName + '\n');
    process.stdout.write('hotelNo: ' + hotel.hotelNo + '\n');
    const info = hotel.hotelInformationEmail;
    process.stdout.write('hotelInformationEmail長さ: ' + (info ? info.length : 'null') + '\n');
    process.stdout.write('hotelInformationEmail（先頭300文字）:\n' + (info ? info.substring(0, 300) : 'null') + '\n');
    process.stdout.write('hotelSpecial: ' + (hotel.hotelSpecial || 'null').substring(0, 200) + '\n');
    process.stdout.write('access: ' + (hotel.access || 'null').substring(0, 200) + '\n');
}

test().catch(e => {
    if (e.response) {
        process.stderr.write('APIエラー Status: ' + e.response.status + '\n');
        process.stderr.write('レスポンス: ' + JSON.stringify(e.response.data).substring(0, 500) + '\n');
    } else {
        process.stderr.write('エラー: ' + e.message + '\n');
    }
});
