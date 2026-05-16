const axios = require('axios');
const crypto = require('crypto');
const xml2js = require('xml2js');

const HATENA_ID = (process.env.HATENA_ID || '').trim();
const HATENA_BLOG_ID = (process.env.HATENA_BLOG_ID || '').trim();
const HATENA_API_KEY = (process.env.HATENA_API_KEY || '').trim();

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

async function updateEntryCategory(entryUrl, title, currentContent, currentCategories) {
    let newCategory = '';
    if (title.includes('露天風呂')) newCategory = '露天風呂付ホテル';
    else if (title.includes('駅チカ')) newCategory = '駅チカホテル';
    else if (title.includes('朝食')) newCategory = '朝食が美味しいホテル';
    else if (title.includes('格安') || title.includes('安')) newCategory = '格安・コスパ宿';
    else if (title.includes('レディース')) newCategory = 'レディースプラン';
    else if (title.includes('カップル') || title.includes('記念日')) newCategory = 'カップル・記念日';
    else if (title.includes('長期滞在') || title.includes('連泊')) newCategory = '長期滞在・連泊向き';

    if (!newCategory) return;

    // 既にそのカテゴリーがある場合はスキップ
    if (currentCategories.includes(newCategory)) return;

    const allCategories = Array.from(new Set([newCategory, ...currentCategories]));
    const tagsXml = allCategories.map(tag => `  <category term="${tag}" />`).join('\n');

    const xml = `<?xml version="1.0" encoding="utf-8"?>
<entry xmlns="http://www.w3.org/2005/Atom">
  <title>${title}</title>
  <content type="text/html"><![CDATA[${currentContent}]]></content>
  ${tagsXml}
</entry>`;

    try {
        await axios.put(entryUrl, xml, {
            headers: { 'Content-Type': 'application/xml', ...getWsseAuthHeaders() }
        });
        console.log(`Updated: ${title} -> ${newCategory}`);
    } catch (e) {
        console.error(`Failed to update ${title}:`, e.message);
    }
}

async function fetchAndFix() {
    let url = `https://blog.hatena.ne.jp/${HATENA_ID}/${HATENA_BLOG_ID}/atom/entry`;
    
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
                
                await updateEntryCategory(editLink, title, content, categories);
            }

            // 次のページがあるか確認
            const nextLink = result.feed.link.find(l => l.$.rel === 'next');
            url = nextLink ? nextLink.$.href : null;
        }
        console.log('Finished updating all entries.');
    } catch (e) {
        console.error('Error fetching entries:', e.message);
    }
}

fetchAndFix();
