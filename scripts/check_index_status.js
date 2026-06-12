const { google } = require('googleapis');
const path = require('path');

const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');

async function checkIndexStatus() {
  console.log('Search Console API (URL Inspection) によるインデックス状況の確認を開始します...\n');

  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: CREDENTIALS_PATH,
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
    });
    const authClient = await auth.getClient();
    const searchconsole = google.searchconsole({ version: 'v1', auth: authClient });

    const siteUrl = 'sc-domain:tabi-plan.org';
    
    // チェックしたいURLのリスト
    const urlsToInspect = [
      'https://tabi-plan.org/',
      'https://tabi-plan.org/pickup/',
      'https://tabi-plan.org/pickup/2026-05-13-hotel-irukure-namba-osaka.html', // 以前定型文だった記事
      'https://tabi-plan.org/pickup/2026-06-06-ritchimondo-hotel-sapporo-daits.html' // 6/6の新着記事
    ];

    for (const url of urlsToInspect) {
      console.log(`🔍 検査中: ${url}`);
      try {
        const response = await searchconsole.urlInspection.index.inspect({
          requestBody: {
            inspectionUrl: url,
            siteUrl: siteUrl,
            languageCode: 'ja-JP'
          }
        });
        
        const result = response.data.inspectionResult.indexStatusResult;
        console.log(`   状態: ${result.coverageState}`);
        console.log(`   Googlebotのクロール時間: ${result.lastCrawlTime || '未クロール'}`);
        console.log(`   インデックス登録: ${result.verdict === 'PASS' ? '✅ 登録済み' : '❌ 未登録 (' + result.verdict + ')'}`);
        console.log('--------------------------------------------------');
        
        // APIのレート制限回避のため少し待機
        await new Promise(r => setTimeout(r, 2000));
      } catch (err) {
        console.error(`   ❌ APIエラー: ${err.message}`);
      }
    }
    
    console.log('\n✅ 検証完了しました。');

  } catch (error) {
    console.error('エラー内容:', error.message);
  }
}

checkIndexStatus();
