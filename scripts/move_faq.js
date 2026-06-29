const fs = require('fs');
const path = require('path');

const FAQ_HTML = `
    <!-- FAQ Section (Rakuten Card Promotion) -->
    <section class="faq-section" style="padding: 4rem 2rem; background: rgba(15, 15, 18, 0.9); border-top: 1px solid rgba(255,255,255,0.05);">
        <div class="container" style="max-width: 800px; margin: 0 auto;">
            <h3 style="font-size: 1.5rem; color: #fbbf24; margin-bottom: 2rem; text-align: center;"><i class="fa-solid fa-circle-question"></i> よくある質問</h3>
            
            <div class="faq-item" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 1.5rem; margin-bottom: 1rem;">
                <h4 style="color: #fff; margin-bottom: 1rem; font-size: 1.1rem; display: flex; align-items: flex-start; gap: 0.5rem;">
                    <span style="color: #fbbf24; font-weight: 900;">Q.</span> 楽天の会員じゃなくても予約できますか？
                </h4>
                <div style="color: #94a3b8; line-height: 1.6; padding-left: 1.5rem;">
                    <p style="margin-bottom: 1rem;"><span style="color: #ec4899; font-weight: bold;">A.</span> はい、会員登録なし（ゲスト予約）でも問題なくご予約いただけます。</p>
                    <p style="margin-bottom: 1rem;">ただし、楽天会員になって「楽天カード」でお支払いいただくと、宿泊代金に対してザクザクとポイントが貯まるため非常にお得です。</p>
                    <p style="background: rgba(251, 191, 36, 0.1); padding: 1rem; border-radius: 6px; border-left: 3px solid #fbbf24;">
                        💡 <strong>さらにお得なヒント：</strong><br>
                        今なら、楽天カードの新規入会キャンペーンで<strong style="color: #fbbf24;">数千円分のポイント還元</strong>を実施中です。もらったポイントを使えば、今回のホテル代が実質タダになるかも？<br>
                        <a href="https://hb.afl.rakuten.co.jp/hgc/047ad0f1.183c70cf.047ad0f2.1e4c3769/tabiplan-web/?pc=https%3A%2F%2Fwww.rakuten-card.co.jp%2F&m=https%3A%2F%2Fwww.rakuten-card.co.jp%2F" target="_blank" rel="noopener noreferrer" style="display: inline-block; margin-top: 0.8rem; color: #fbbf24; text-decoration: underline;"><i class="fa-solid fa-arrow-up-right-from-square"></i> 楽天カードの新規入会キャンペーンを確認する</a>
                    </p>
                </div>
            </div>
        </div>
    </section>
`;

function processFile(filePath, mode) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');

    // 1. まず既存のFAQを削除
    const faqStart = content.indexOf('    <!-- FAQ Section (Rakuten Card Promotion) -->');
    if (faqStart !== -1) {
        const faqEnd = content.indexOf('    </section>', faqStart) + '    </section>'.length;
        // 改行を含めて削除
        const part1 = content.slice(0, faqStart);
        let part2 = content.slice(faqEnd);
        if (part2.startsWith('\\n')) part2 = part2.slice(1);
        if (part2.startsWith('\\n')) part2 = part2.slice(1);
        content = part1 + part2;
    }

    // 2. 新しい位置に挿入
    if (mode === 'city') {
        // cityページ： {{CITY_GUIDE_SECTION}} または </section>\\n\\n        <section id="budget-guide" の直前
        const target = '<section id="budget-guide"';
        content = content.replace(target, FAQ_HTML + '\\n        ' + target);
    } else if (mode === 'niche') {
        // nicheページ： hotels section の終わり (つまり </section> の直後で、</main>の前)
        // {{NICHE_GUIDE_HTML}} または fallbackMessage の直前が望ましいが、確実なのは hotels セクションの終わり
        const target = '        </section>\\n\\n    </main>';
        if (content.includes(target)) {
            content = content.replace(target, '        </section>\\n' + FAQ_HTML + '\\n    </main>');
        } else {
            // template用
            content = content.replace('        </section>\\n    </main>', '        </section>\\n' + FAQ_HTML + '\\n    </main>');
        }
    }

    fs.writeFileSync(filePath, content);
    console.log(`Processed: ${filePath}`);
}

// Templates
processFile(path.join(__dirname, 'themes', 'city_template.html'), 'city');
processFile(path.join(__dirname, 'themes', 'niche_template.html'), 'niche');

// Generated pages
const { CITIES } = require('./utils');
const nicheConfig = require('./niche_config.json');

for (const city of CITIES) {
    processFile(path.join(__dirname, '..', city.id, 'index.html'), 'city');
}

for (const key in nicheConfig) {
    const niche = nicheConfig[key];
    processFile(path.join(__dirname, '..', niche.city, niche.slug, 'index.html'), 'niche');
}

console.log('FAQ Repositioning completed.');
