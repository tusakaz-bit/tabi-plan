try { require('dotenv').config(); } catch (e) {}
const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

const dir = path.join(__dirname, '../pickup');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html') && f !== 'index.html' && f !== 'template.html');

const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

function extract(html, regex, fallback = '') {
    const m = html.match(regex);
    return m ? m[1].trim() : fallback;
}

const cityMap = {
    'tokyo': '東京', 'osaka': '大阪', 'kyoto': '京都', 'sapporo': '札幌', 'fukuoka': '福岡', 'okinawa': '沖縄'
};

async function rewriteFallback(hotelName, cityRoma) {
    if (!ai) return null;
    const city = cityMap[cityRoma] || '日本';
    const prompt = `あなたは旅行サイトのプロライターです。
ホテル名: ${hotelName} (エリア: ${city})
このホテルについて、SEOに最適化された魅力的な紹介記事を作成してください。
以下のJSONフォーマットで出力してください。
{
  "metaDescription": "120文字程度の紹介文",
  "catchcopy": "魅力的な1行のキャッチコピー",
  "smartPoint": "コスパやお得さの解説(100文字)",
  "beautifulPoint": "空間の魅力や贅沢な体験(100文字)",
  "locationPoint": "立地の良さ(100文字)",
  "detailedDescription": "400〜600文字の詳細説明。段落分けせず、プレーンテキストで出力してください。内容はAIによる厳選理由、滞在の情景、今すぐ予約すべき理由を含めてください。"
}`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });
        const cleanedJson = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(cleanedJson);
        if (data.detailedDescription) {
            data.detailedDescription = data.detailedDescription.replace(/。/g, '。\n\n').trim();
        }
        return data;
    } catch (e) {
        console.error('AI Error:', e.message);
        return null;
    }
}

async function run() {
    console.log('AI Rewrite Retry Starting...');
    let rewriteCount = 0;
    
    for (const f of files) {
        let html = fs.readFileSync(path.join(dir, f), 'utf8');
        const descStart = html.indexOf('<section class="description">');
        const descEnd = html.indexOf('</section>', descStart);
        const currentDesc = descStart >= 0 ? html.substring(descStart, descEnd).replace(/<[^>]+>/g, '') : '';
        
        // 定型文が残っているかチェック
        if (currentDesc.includes('詳しい情報は予約ページをご確認ください') || currentDesc.includes('旅の疲れを癒やす心地よい空間')) {
            const hotelName = extract(html, /<h1 class="hotel-title">(.*?)<\/h1>/);
            let cityRoma = 'tokyo';
            for (const c of Object.keys(cityMap)) {
                if (f.includes(c)) cityRoma = c;
            }
            
            console.log(`Rewriting: ${hotelName} (${f})`);
            const aiData = await rewriteFallback(hotelName, cityRoma);
            if (aiData) {
                const descHtml = aiData.detailedDescription.split('\n\n').filter(p=>p.trim().length>0).map(p=>`<p>${p.trim()}</p>`).join('\n                ');
                html = html.substring(0, descStart) + `<section class="description">\n                ${descHtml}\n            ` + html.substring(descEnd);
                html = html.replace(/(<p style="color: rgba\(255,255,255,0\.7\);[^>]*>)[^<]*/, `$1${aiData.catchcopy}`);
                html = html.replace(/(<h3>賢い選択<\/h3>\s*<p>)[^<]*/, `$1${aiData.smartPoint}`);
                html = html.replace(/(<h3>美しき滞在<\/h3>\s*<p>)[^<]*/, `$1${aiData.beautifulPoint}`);
                html = html.replace(/(<h3>最高の立地<\/h3>\s*<p>)[^<]*/, `$1${aiData.locationPoint}`);
                
                // meta descriptionの更新
                if (html.includes('<meta name="description"')) {
                    html = html.replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${aiData.metaDescription}">`);
                }
                if (html.includes('<meta property="og:description"')) {
                    html = html.replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${aiData.metaDescription}">`);
                }
                if (html.includes('<meta name="twitter:description"')) {
                    html = html.replace(/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${aiData.metaDescription}">`);
                }
                
                fs.writeFileSync(path.join(dir, f), html, 'utf8');
                console.log(`  -> Success!`);
                rewriteCount++;
                
                // 1分間に15リクエストを回避するため16秒待機（約4リクエスト/分）
                console.log(`  Waiting 16 seconds to respect rate limit...`);
                await new Promise(r => setTimeout(r, 16000));
            } else {
                console.log(`  -> Failed due to API error. Will wait 30 seconds...`);
                await new Promise(r => setTimeout(r, 30000));
            }
        }
    }
    console.log(`All done! Rewrote ${rewriteCount} articles.`);
}
run();
