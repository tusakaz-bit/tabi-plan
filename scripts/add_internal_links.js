const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '../');
const cities = ['tokyo', 'osaka', 'kyoto', 'sapporo', 'fukuoka', 'okinawa'];

// 1. トップページのナビゲーション更新
let indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
if (!indexHtml.includes('<a href="pickup/">Pickup</a>')) {
    indexHtml = indexHtml.replace('<a href="#cities">Destinations</a>', '<a href="pickup/">Pickup</a>\n                <a href="#cities">Destinations</a>');
    fs.writeFileSync(path.join(rootDir, 'index.html'), indexHtml, 'utf8');
    console.log('Updated index.html nav');
}

// 2. 各都市ページのナビ更新とピックアップセクションの追加
for (const city of cities) {
    const filePath = path.join(rootDir, city, 'index.html');
    let html = fs.readFileSync(filePath, 'utf8');
    
    // ナビゲーションの更新
    if (!html.includes('<a href="../pickup/">Pickup</a>')) {
        html = html.replace('<a href="#hotels">Top Deals</a>', '<a href="../pickup/">Pickup</a>\n                <a href="#hotels">Top Deals</a>');
    }

    // トップディールズの前にピックアップセクションを挿入
    if (!html.includes('pickup-section')) {
        const cityNameMap = {tokyo: '東京', osaka: '大阪', kyoto: '京都', sapporo: '札幌', fukuoka: '福岡', okinawa: '沖縄'};
        const jpName = cityNameMap[city];
        
        const pickupSection = `
    <section class="section pickup-section" id="pickup" style="background: var(--bg-dark); padding: 4rem 5%; border-bottom: 1px solid rgba(255,255,255,0.05);">
        <div class="container" style="max-width: 1200px; margin: 0 auto; text-align: center;">
            <span class="badge" style="background: #D4AF37; color: black; padding: 0.2rem 0.8rem; border-radius: 2px; font-weight: 800; font-size: 0.7rem; margin-bottom: 0.5rem; display: inline-block;">Premium</span>
            <h2 class="section-title" style="font-size: 2.5rem; font-weight: 900; margin-bottom: 1rem;">${jpName}のピックアップ宿</h2>
            <p class="section-subtitle" style="color: rgba(255,255,255,0.6); margin-bottom: 2rem;">Tabi Plan AIが厳選した、特別な滞在体験</p>
            <div>
                <a href="../pickup/?city=${city}" class="btn-primary" style="display: inline-block; background: #D4AF37; color: #000; padding: 1rem 3rem; border-radius: 50px; text-decoration: none; font-weight: 800; transition: all 0.3s;">ピックアップ一覧を見る <i class="fas fa-arrow-right"></i></a>
            </div>
        </div>
    </section>`;
        
        html = html.replace('<section id="hotels" class="section">', `${pickupSection}\n\n    <section id="hotels" class="section">`);
    }

    fs.writeFileSync(filePath, html, 'utf8');
    console.log(`Updated ${city}/index.html`);
}

// 3. pickup/index.html にURLパラメータでタブを切り替えるJSを追加
let pickupHtml = fs.readFileSync(path.join(rootDir, 'pickup/index.html'), 'utf8');
if (!pickupHtml.includes('URLSearchParams')) {
    const jsUpdate = `
        document.addEventListener('DOMContentLoaded', () => {
            const tabs = document.querySelectorAll('.filter-tab');
            const cards = document.querySelectorAll('.archive-card');

            function filterCards(selectedCity) {
                cards.forEach(card => {
                    if (selectedCity === 'all') {
                        card.style.display = 'block';
                    } else {
                        if (card.getAttribute('data-city') === selectedCity) {
                            card.style.display = 'block';
                        } else {
                            card.style.display = 'none';
                        }
                    }
                });
            }

            tabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    tabs.forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    filterCards(tab.getAttribute('data-filter'));
                    
                    // URLを更新
                    const url = new URL(window.location);
                    url.searchParams.set('city', tab.getAttribute('data-filter'));
                    window.history.pushState({}, '', url);
                });
            });

            // 初期ロード時のURLパラメータチェック
            const params = new URLSearchParams(window.location.search);
            const cityParam = params.get('city');
            if (cityParam) {
                const targetTab = document.querySelector(\`.filter-tab[data-filter="\${cityParam}"]\`);
                if (targetTab) {
                    tabs.forEach(t => t.classList.remove('active'));
                    targetTab.classList.add('active');
                    filterCards(cityParam);
                }
            }
        });
    </script>
</body>`;
    
    pickupHtml = pickupHtml.replace(/<script>[\s\S]*?<\/script>\n<\/body>/, jsUpdate);
    fs.writeFileSync(path.join(rootDir, 'pickup/index.html'), pickupHtml, 'utf8');
    console.log('Updated pickup/index.html with URL param support');
}
