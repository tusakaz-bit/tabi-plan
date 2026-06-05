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
    for (const f of files) {
        console.log(`Processing: ${f}`);
        let html = fs.readFileSync(path.join(dir, f), 'utf8');
        let modified = false;

        // 1. {{FILENAME}} 修正
        if (html.includes('{{FILENAME}}')) {
            html = html.replace(/\{\{FILENAME\}\}/g, f);
            modified = true;
        }

        const hotelName = extract(html, /<h1 class="hotel-title">(.*?)<\/h1>/);
        const heroImageMatch = html.match(/background:\s*url\('([^']+)'\)/);
        const heroImage = heroImageMatch ? heroImageMatch[1].replace('?v=2', '') : '';
        const publishDateMatch = html.match(/<span class="publish-date"[^>]*>(.*?)\s*掲載<\/span>/) || f.match(/^(\d{4}-\d{2}-\d{2})/);
        const publishDate = publishDateMatch ? publishDateMatch[1] : '';
        
        let cityRoma = 'tokyo';
        for (const c of Object.keys(cityMap)) {
            if (f.includes(c)) cityRoma = c;
        }

        // 2. 定型文のAIリライト
        const descStart = html.indexOf('<section class="description">');
        const descEnd = html.indexOf('</section>', descStart);
        const currentDesc = descStart >= 0 ? html.substring(descStart, descEnd).replace(/<[^>]+>/g, '') : '';
        let metaDescStr = extract(html, /<meta name="description" content="(.*?)">/);

        if (currentDesc.includes('詳しい情報は予約ページをご確認ください') || currentDesc.includes('旅の疲れを癒やす心地よい空間')) {
            console.log(`  -> AI Rewriting...`);
            const aiData = await rewriteFallback(hotelName, cityRoma);
            if (aiData) {
                const descHtml = aiData.detailedDescription.split('\n\n').filter(p=>p.trim().length>0).map(p=>`<p>${p.trim()}</p>`).join('\n                ');
                html = html.substring(0, descStart) + `<section class="description">\n                ${descHtml}\n            ` + html.substring(descEnd);
                html = html.replace(/(<p style="color: rgba\(255,255,255,0\.7\);[^>]*>)[^<]*/, `$1${aiData.catchcopy}`);
                html = html.replace(/(<h3>賢い選択<\/h3>\s*<p>)[^<]*/, `$1${aiData.smartPoint}`);
                html = html.replace(/(<h3>美しき滞在<\/h3>\s*<p>)[^<]*/, `$1${aiData.beautifulPoint}`);
                html = html.replace(/(<h3>最高の立地<\/h3>\s*<p>)[^<]*/, `$1${aiData.locationPoint}`);
                metaDescStr = aiData.metaDescription;
                modified = true;
                await new Promise(r => setTimeout(r, 2000));
            }
        }

        // 3. {{META_DESCRIPTION}} 修正
        if (html.includes('{{META_DESCRIPTION}}')) {
            html = html.replace(/\{\{META_DESCRIPTION\}\}/g, metaDescStr || currentDesc.substring(0, 100));
            modified = true;
        }

        // 4. JSON-LD追加
        if (!html.includes('application/ld+json') && !html.includes('{{JSON_LD}}')) {
            const jsonLd = `
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "${hotelName} | 本日の注目宿 - Tabi Plan",
      "image": "${heroImage}",
      "datePublished": "${publishDate}T08:00:00+09:00",
      "author": {
        "@type": "Organization",
        "name": "Tabi Plan"
      }
    }
    </script>`;
            if (html.includes('<!-- OGP -->')) {
                html = html.replace('<!-- OGP -->', `${jsonLd}\n    <!-- OGP -->`);
                modified = true;
            }
        }
        if (html.includes('{{JSON_LD}}')) {
            html = html.replace('{{JSON_LD}}', '');
            modified = true;
        }

        // 5. パンくずリスト追加
        if (!html.includes('class="breadcrumbs"')) {
            const breadcrumbs = `
        <nav class="breadcrumbs" aria-label="breadcrumb">
            <a href="../"><i class="fas fa-home"></i> Home</a>
            <i class="fas fa-chevron-right" style="font-size: 0.6rem;"></i>
            <a href="../${cityRoma}/">${cityMap[cityRoma]}</a>
            <i class="fas fa-chevron-right" style="font-size: 0.6rem;"></i>
            <a href="./">ピックアップ</a>
            <i class="fas fa-chevron-right" style="font-size: 0.6rem;"></i>
            <span style="color: rgba(255,255,255,0.9);">${hotelName}</span>
        </nav>`;
            html = html.replace('<div class="glass-card">', `${breadcrumbs}\n        <div class="glass-card">`);
            modified = true;
        }

        // 6. GA4追加
        if (!html.includes('G-4PERSW1V95')) {
            const ga4 = `
    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-4PERSW1V95"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-4PERSW1V95');
    </script>`;
            html = html.replace('<meta name="viewport" content="width=device-width, initial-scale=1.0">', `<meta name="viewport" content="width=device-width, initial-scale=1.0">\n${ga4}`);
            modified = true;
        }

        // 7. h1重複解消
        if (html.includes('<h1 class="logo"')) {
            html = html.replace('<h1 class="logo"', '<div class="logo"');
            html = html.replace('</h1>\n    </nav>', '</div>\n    </nav>');
            modified = true;
        }

        // 8. preconnect追加
        if (!html.includes('images.travel.rakuten.co.jp')) {
            html = html.replace('<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>', '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n    <link rel="preconnect" href="https://images.travel.rakuten.co.jp">');
            modified = true;
        }

        if (modified) {
            fs.writeFileSync(path.join(dir, f), html, 'utf8');
            console.log(`  -> Saved.`);
        }
    }
    console.log('Bulk fix completed!');
}
run();
