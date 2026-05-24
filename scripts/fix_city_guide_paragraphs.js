/**
 * 都市ページの観光コラム段落構造を修正するスクリプト
 * - <br><br> で区切られた1つの大きな<p>を複数の<p>に分割
 * - <b>タグを<strong>タグに統一
 * 対象: fukuoka, kyoto, okinawa（Gemini生成コンテンツ）
 */
const fs = require('fs');
const path = require('path');

const CITIES = ['fukuoka', 'kyoto', 'okinawa'];
const ROOT = path.join(__dirname, '..');

for (const city of CITIES) {
    const filePath = path.join(ROOT, city, 'index.html');
    if (!fs.existsSync(filePath)) {
        console.log(`Skipping ${city}: file not found`);
        continue;
    }

    let html = fs.readFileSync(filePath, 'utf8');

    // city-guide-column の div 内のコンテンツ部分を対象に処理
    // <div class="glass-container city-guide-column" ...> から </div> の間を置換
    html = html.replace(
        /(<div class="glass-container city-guide-column"[^>]*>)([\s\S]*?)(<\/div>\s*<\/div>\s*<\/section>)/,
        (match, open, content, close) => {
            let fixed = content;

            // 1. <b>タグを<strong>タグに統一
            fixed = fixed.replace(/<b>/g, '<strong>').replace(/<\/b>/g, '</strong>');

            // 2. <br><br> で分割されたブロックを複数の <p> に変換
            //    パターン: <p>....<br><br>次のブロック<br><br>...</p>
            //    これを <p>...</p><p>...</p> に分割
            fixed = fixed.replace(/<p>([\s\S]*?)<\/p>/g, (pMatch, pContent) => {
                // <br><br> で分割（前後の空白も除去）
                const parts = pContent.split(/<br\s*\/?>\s*<br\s*\/?>/i);
                if (parts.length <= 1) return pMatch; // 分割不要
                // 各パートを<p>で包む（空白のみのパートはスキップ）
                return parts
                    .map(part => part.trim())
                    .filter(part => part.length > 0)
                    .map(part => `<p>${part}</p>`)
                    .join('\n                    ');
            });

            // 3. 単独の<br>（<br><br>でない）も<br>のままにしておく
            //    （必要ならここで追加処理）

            return open + fixed + close;
        }
    );

    fs.writeFileSync(filePath, html, 'utf8');
    console.log(`✅ Fixed: ${city}/index.html`);
}

console.log('\nDone! All city guide paragraphs have been restructured.');
