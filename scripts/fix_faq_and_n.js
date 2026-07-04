const fs = require('fs');
const path = require('path');

const NEW_FAQ_HTML = `
    <!-- FAQ Section (Rakuten Card Promotion) -->
    <section class="faq-section">
        <div class="container faq-container">
            <h3 class="faq-title"><i class="fa-solid fa-circle-question"></i> よくある質問</h3>
            
            <div class="faq-item">
                <h4 class="faq-q">
                    <span class="faq-q-icon">Q.</span> 楽天の会員じゃなくても予約できますか？
                </h4>
                <div class="faq-a">
                    <p><span class="faq-a-icon">A.</span> はい、会員登録なし（ゲスト予約）でも問題なくご予約いただけます。</p>
                    <p>ただし、楽天会員になって「楽天カード」でお支払いいただくと、宿泊代金に対してザクザクとポイントが貯まるため非常にお得です。</p>
                    <div class="faq-hint">
                        💡 <strong>さらにお得なヒント：</strong><br>
                        今なら、楽天カードの新規入会キャンペーンで<strong style="color: #fbbf24;">数千円分のポイント還元</strong>を実施中です。もらったポイントを使えば、今回のホテル代が実質タダになるかも？<br>
                        <a href="https://hb.afl.rakuten.co.jp/hgc/047ad0f1.183c70cf.047ad0f2.1e4c3769/tabiplan-web/?pc=https%3A%2F%2Fwww.rakuten-card.co.jp%2F&m=https%3A%2F%2Fwww.rakuten-card.co.jp%2F" target="_blank" rel="noopener noreferrer" class="faq-hint-link"><i class="fa-solid fa-arrow-up-right-from-square"></i> 楽天カードの新規入会キャンペーンを確認する</a>
                    </div>
                </div>
            </div>
        </div>
    </section>
`;

const FAQ_CSS = `
/* FAQ Section */
.faq-section {
    padding: 3rem 1rem;
    background: rgba(15, 15, 18, 0.9);
    border-top: 1px solid rgba(255,255,255,0.05);
}
.faq-container {
    max-width: 800px;
    margin: 0 auto;
}
.faq-title {
    font-size: 1.5rem;
    color: #fbbf24;
    margin-bottom: 1.5rem;
    text-align: center;
}
.faq-item {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 1rem;
}
.faq-q {
    color: #fff;
    margin-bottom: 1rem;
    font-size: 1.1rem;
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    line-height: 1.4;
}
.faq-q-icon {
    color: #fbbf24;
    font-weight: 900;
}
.faq-a {
    color: #94a3b8;
    line-height: 1.6;
    padding-left: 1.5rem;
}
.faq-a-icon {
    color: #ec4899;
    font-weight: bold;
}
.faq-a p {
    margin-bottom: 1rem;
}
.faq-hint {
    background: rgba(251, 191, 36, 0.1);
    padding: 1rem;
    border-radius: 6px;
    border-left: 3px solid #fbbf24;
    font-size: 0.95rem;
}
.faq-hint-link {
    display: inline-block;
    margin-top: 0.8rem;
    color: #fbbf24;
    text-decoration: underline;
}

@media (max-width: 768px) {
    .faq-section {
        padding: 2rem 1rem;
    }
    .faq-item {
        padding: 1rem;
    }
    .faq-a {
        padding-left: 0;
    }
    .faq-q {
        font-size: 1rem;
    }
}
`;

// Append CSS if not exists
const stylePath = path.join(__dirname, '../style.css');
let styleContent = fs.readFileSync(stylePath, 'utf8');
if (!styleContent.includes('.faq-section {')) {
    fs.appendFileSync(stylePath, '\\n' + FAQ_CSS);
    console.log('Appended FAQ CSS to style.css');
}

// フォルダを再帰的に走査してHTMLファイルを探す
function walkSync(dir, filelist = []) {
    fs.readdirSync(dir).forEach(file => {
        const dirFile = path.join(dir, file);
        if (fs.statSync(dirFile).isDirectory()) {
            if (!dirFile.includes('node_modules') && !dirFile.includes('.git')) {
                filelist = walkSync(dirFile, filelist);
            }
        } else if (file.endsWith('.html')) {
            filelist.push(dirFile);
        }
    });
    return filelist;
}

const rootDir = path.join(__dirname, '..');
const htmlFiles = walkSync(rootDir);

for (const filePath of htmlFiles) {
    let html = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Remove literal '\n'
    if (html.includes('\\n')) {
        // replace all occurrences of literal \n with an empty string or actual newline
        // Specifically, it usually appears before <section id="budget-guide" or </section>
        html = html.replace(/\\n/g, '');
        modified = true;
    }

    // Replace old FAQ with new FAQ
    const oldFaqStart = html.indexOf('    <!-- FAQ Section (Rakuten Card Promotion) -->');
    if (oldFaqStart !== -1) {
        // 既存のFAQブロックを特定して置換
        const searchEndStr = '    </section>';
        const startToSearchEnd = html.indexOf(searchEndStr, oldFaqStart);
        if (startToSearchEnd !== -1) {
            const oldFaqEnd = startToSearchEnd + searchEndStr.length;
            const before = html.substring(0, oldFaqStart);
            const after = html.substring(oldFaqEnd);
            
            // すでに新しいFAQになっているかチェック (class="faq-section" だけなら新しい方)
            const currentFaq = html.substring(oldFaqStart, oldFaqEnd);
            if (currentFaq.includes('style="padding: 4rem 2rem;')) {
                html = before + NEW_FAQ_HTML.trimEnd() + after;
                modified = true;
            }
        }
    }

    if (modified) {
        fs.writeFileSync(filePath, html);
        console.log('Fixed:', filePath.replace(rootDir, ''));
    }
}

// move_faq.js も修正しておく（今後のために）
const moveFaqPath = path.join(__dirname, 'move_faq.js');
if (fs.existsSync(moveFaqPath)) {
    let moveFaqHtml = fs.readFileSync(moveFaqPath, 'utf8');
    if (moveFaqHtml.includes('\\\\n')) {
        moveFaqHtml = moveFaqHtml.replace(/\\\\n/g, '\\n');
        fs.writeFileSync(moveFaqPath, moveFaqHtml);
        console.log('Fixed \\n in move_faq.js');
    }
}

console.log('All done!');
