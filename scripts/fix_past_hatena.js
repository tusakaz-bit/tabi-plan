require('dotenv').config({ path: '../.env' });
const axios = require('axios');
const crypto = require('crypto');
const xml2js = require('xml2js');

const HATENA_ID = process.env.HATENA_ID;
const HATENA_BLOG_ID = process.env.HATENA_BLOG_ID;
const HATENA_API_KEY = process.env.HATENA_API_KEY;

function getWsseAuthHeaders() {
    const nonceBytes = crypto.randomBytes(20);
    const nonceBase64 = nonceBytes.toString('base64');
    const created = new Date().toISOString();
    const digest = crypto.createHash('sha1')
        .update(Buffer.concat([nonceBytes, Buffer.from(created), Buffer.from(HATENA_API_KEY)]))
        .digest('base64');
    const wsseHeader = 'UsernameToken Username="' + HATENA_ID + '", PasswordDigest="' + digest + '", Nonce="' + nonceBase64 + '", Created="' + created + '"';
    return {
        'X-WSSE': wsseHeader,
        'Authorization': 'WSSE profile="UsernameToken"'
    };
}

async function fixEntry(editLink, title, originalContent, categories) {
    let content = originalContent;
    let modified = false;

    if (!content.includes('アフィリエイト広告を利用')) {
        content = '<p style="font-size: 0.75rem; color: #64748b; text-align: right; margin: 0 0 10px 0;">PR：本ページはプロモーションが含まれています</p>\n' + content;
        modified = true;
    }

    const rakutenRegex = /https:\/\/hb\.afl\.rakuten\.co\.jp\/hgc\/([^\/]+)\/\?pc=https%3A%2F%2Ftravel\.rakuten\.co\.jp%2FHOTEL%2F(\d+)%2F\2\.html(?!&m=)/g;
    if (rakutenRegex.test(content)) {
        content = content.replace(rakutenRegex, 'https://hb.afl.rakuten.co.jp/hgc/$1/?pc=https%3A%2F%2Ftravel.rakuten.co.jp%2FHOTEL%2F$2%2F$2.html&m=https%3A%2F%2Ftravel.rakuten.co.jp%2FHOTEL%2F$2%2F$2.html');
        modified = true;
    }

    if (content.includes('rel="noopener noreferrer"')) {
        content = content.replace(/rel="noopener noreferrer"/g, 'rel="sponsored noopener noreferrer"');
        modified = true;
    }

    if (!modified) return;

    const tagsXml = categories.map(tag => '  <category term="' + tag + '" />').join('\n');
    const xml = '<?xml version="1.0" encoding="utf-8"?>\n<entry xmlns="http://www.w3.org/2005/Atom">\n  <title>' + title + '</title>\n  <content type="text/html"><![CDATA[' + content + ']]></content>\n  ' + tagsXml + '\n</entry>';

    try {
        await axios.put(editLink, xml, {
            headers: { 'Content-Type': 'application/xml', ...getWsseAuthHeaders() }
        });
        console.log('Fixed Hatena post: ' + title);
    } catch (e) {
        console.error('Failed to update ' + title + ':', e.response ? e.response.data : e.message);
    }
}

async function fetchAndFixAll() {
    if (!HATENA_ID || !HATENA_BLOG_ID || !HATENA_API_KEY) {
        console.error('Hatena API credentials not found in .env');
        return;
    }

    let url = 'https://blog.hatena.ne.jp/' + HATENA_ID + '/' + HATENA_BLOG_ID + '/atom/entry';
    let count = 0;
    
    try {
        while (url) {
            const response = await axios.get(url, { headers: getWsseAuthHeaders() });
            const result = await xml2js.parseStringPromise(response.data);
            const entries = result.feed.entry || [];

            for (const entry of entries) {
                const title = entry.title[0];
                const editLink = entry.link.find(l => l.$.rel === 'edit').$.href;
                const content = entry.content[0]._;
                const categories = (entry.category || []).map(c => c.$.term);
                
                await fixEntry(editLink, title, content, categories);
                count++;
            }

            const nextLink = result.feed.link ? result.feed.link.find(l => l.$.rel === 'next') : null;
            url = nextLink ? nextLink.$.href : null;
            if (url) console.log('Fetching next page...');
        }
        console.log('Finished checking ' + count + ' posts.');
    } catch (e) {
        console.error('Error fetching entries:', e.response ? e.response.data : e.message);
    }
}

fetchAndFixAll();
