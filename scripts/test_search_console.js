/**
 * Google Search Console API 疎通テストスクリプト
 * 
 * 使い方:
 * node scripts/test_search_console.js
 */

const { google } = require('googleapis');
const path = require('path');

// 認証情報のパス（scriptsフォルダ内のcredentials.json）
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');

async function testConnection() {
  console.log('Google Search Console API への接続テストを開始します...');

  try {
    // 1. Google Auth の初期化（credentials.json から自動的に認証オブジェクトを作成）
    const auth = new google.auth.GoogleAuth({
      keyFile: CREDENTIALS_PATH,
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
    });

    // 認証クライアントを取得
    const authClient = await auth.getClient();

    // 2. Search Console API クライアントの作成
    const searchconsole = google.searchconsole({
      version: 'v1',
      auth: authClient
    });

    console.log('認証情報を読み込みました。API に接続しています...');

    // 3. アクセス可能なサイト（プロパティ）一覧の取得
    // ※古いWebmasters APIの仕様を引き継いでいるため、実質的にSearch Consoleのプロパティ一覧が返ります
    const response = await searchconsole.sites.list({});
    const sites = response.data.siteEntry;

    if (!sites || sites.length === 0) {
      console.log('\n⚠️ 警告: 接続に成功しましたが、アクセス可能なサイト（プロパティ）が見つかりません。');
      console.log('Google Search Consoleの管理画面で、以下のサービスアカウントのメールアドレスを追加しているか確認してください：');
      
      // credentials.json からメールアドレスを読み込んで表示
      const creds = require(CREDENTIALS_PATH);
      console.log(`メールアドレス: ${creds.client_email}`);
      console.log('権限の付与手順については、implementation_plan.md を参照してください。');
      return;
    }

    console.log('\n✅ 接続成功！以下のサイト（プロパティ）にアクセスできます:');
    sites.forEach(site => {
      console.log(`- サイトURL/ドメイン: ${site.siteUrl} (権限: ${site.permissionLevel})`);
    });

  } catch (error) {
    console.error('\n❌ エラーが発生しました。接続に失敗しました。');
    console.error('エラー内容:', error.message);
  }
}

testConnection();
