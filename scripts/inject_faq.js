const fs = require('fs');
const path = require('path');
const { CITIES } = require('./utils');
const nicheConfig = require('./niche_config.json');

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

function injectFAQ(filePath) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    
    // すでにFAQがある場合はスキップ
    if (content.includes('faq-section')) return;
    
    // </main> の直前に挿入
    content = content.replace('</main>', FAQ_HTML + '\n    </main>');
    fs.writeFileSync(filePath, content);
    console.log(`Injected FAQ into ${filePath}`);
}

// 1. 各都市トップページへの適用
for (const city of CITIES) {
    const filePath = path.join(__dirname, '..', city.id, 'index.html');
    injectFAQ(filePath);
}

// 2. ニッチページへの適用
for (const key in nicheConfig) {
    const niche = nicheConfig[key];
    const filePath = path.join(__dirname, '..', niche.city, niche.slug, 'index.html');
    injectFAQ(filePath);
}

// 3. Pickup は古いので今回はスキップしてもOKだが、一応やっておく
const pickupDir = path.join(__dirname, '..', 'pickup');
if (fs.existsSync(pickupDir)) {
    const files = fs.readdirSync(pickupDir);
    for (const file of files) {
        if (file.endsWith('.html')) {
            injectFAQ(path.join(pickupDir, file));
        }
    }
}

console.log('FAQ injection completed.');
