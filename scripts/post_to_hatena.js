const axios = require('axios');
const crypto = require('crypto');
const theme1 = require('./themes/theme_1_cheapest');
const theme2 = require('./themes/theme_2_ladies');
const theme3 = require('./themes/theme_3_couple');
const theme4 = require('./themes/theme_4_station');
const theme5 = require('./themes/theme_5_onsen');
const theme6 = require('./themes/theme_6_breakfast');
const theme7 = require('./themes/theme_7_longstay');

// 環境変数から認証情報を取得（前後の余計な空白や改行を自動で取り除く処理を追加）
const HATENA_ID = (process.env.HATENA_ID || '').trim();
const HATENA_BLOG_ID = (process.env.HATENA_BLOG_ID || '').trim();
const HATENA_API_KEY = (process.env.HATENA_API_KEY || '').trim();

// WSSE認証のヘッダーを生成する関数
function getWsseAuthHeaders() {
    const nonceBytes = crypto.randomBytes(20);
    const nonceBase64 = nonceBytes.toString('base64');
    const created = new Date().toISOString();
    const digest = crypto.createHash('sha1')
        .update(Buffer.concat([nonceBytes, Buffer.from(created), Buffer.from(HATENA_API_KEY)]))
        .digest('base64');
    const wsseHeader = `UsernameToken Username="${HATENA_ID}", PasswordDigest="${digest}", Nonce="${nonceBase64}", Created="${created}"`;
    return {
        'X-WSSE': wsseHeader,
        'Authorization': 'WSSE profile="UsernameToken"'
    };
}

async function postToHatena(title, body, tags) {
    const url = `https://blog.hatena.ne.jp/${HATENA_ID}/${HATENA_BLOG_ID}/atom/entry`;
    
    // タグのXML文字列を生成
    const tagsXml = tags.map(tag => `  <category term="${tag}" />`).join('\n');

    // AtomPub用のXMLを作成
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<entry xmlns="http://www.w3.org/2005/Atom"
       xmlns:app="http://www.w3.org/2007/app">
  <title>${title}</title>
  <content type="text/html"><![CDATA[
${body}
  ]]></content>
${tagsXml}
  <app:control>
    <app:draft>no</app:draft>
  </app:control>
</entry>`;

    try {
        const response = await axios.post(url, xml, {
            headers: {
                'Content-Type': 'application/xml',
                ...getWsseAuthHeaders()
            }
        });
        console.log('Successfully posted to Hatena Blog (Published):', response.status);
    } catch (error) {
        console.error('Error posting to Hatena Blog:', error.response ? error.response.status : '', error.response ? error.response.data : error.message);
        process.exit(1);
    }
}

async function run() {
    console.log('Starting Hatena Blog auto-post...');

    // 今日の曜日を取得 (0=日, 1=月, ..., 6=土)
    const now = new Date();
    const jstDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
    const dayOfWeek = jstDate.getDay();

    const themes = [theme7, theme1, theme2, theme3, theme4, theme5, theme6];
    const currentTheme = themes[dayOfWeek];

    console.log(`Today is day ${dayOfWeek}, running theme...`);

    const { title, body, tags } = await currentTheme.generate();

    if (!body || body.indexOf('📍') === -1) {
        console.log('No hotel data found for today\'s theme.');
        return;
    }

    await postToHatena(title, body, tags);
}

run();
