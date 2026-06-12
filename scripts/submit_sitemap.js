const { google } = require('googleapis');
const path = require('path');

const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');

async function submitSitemap() {
  console.log('Search Console API を使用してサイトマップを送信します...');

  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: CREDENTIALS_PATH,
      scopes: ['https://www.googleapis.com/auth/webmasters'],
    });
    const authClient = await auth.getClient();
    const searchconsole = google.searchconsole({ version: 'v1', auth: authClient });

    const siteUrl = 'sc-domain:tabi-plan.org';
    const sitemapUrl = 'https://tabi-plan.org/sitemap.xml';

    console.log(`送信先プロパティ: ${siteUrl}`);
    console.log(`サイトマップURL: ${sitemapUrl}`);

    await searchconsole.sitemaps.submit({
      siteUrl: siteUrl,
      feedpath: sitemapUrl
    });

    console.log('\n✅ サイトマップの送信リクエストが正常に完了しました！');
    console.log('これにより、Googlebotに対して「新しい記事や修正された記事を見に来てほしい」という強いシグナルが送られます。');

  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error.message);
  }
}

submitSitemap();
