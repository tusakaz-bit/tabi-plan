const fs = require('fs');
const path = require('path');

const targets = [
  {
    city: 'tokyo',
    html: `        <section id="niche-links" class="hotels-section" style="background: rgba(15, 15, 18, 0.9);">
            <div class="container">
                <div class="section-header">
                    <h3 class="section-title">Niche Collections</h3>
                    <p class="section-subtitle">東京の条件別おすすめホテル特集</p>
                </div>
                <div style="text-align: center;">
                    <a href="eki-kirei-yasui/" class="booking-button" style="display:inline-block; margin: 0.5rem; background: #1e293b; color: #fbbf24; border: 1px solid #fbbf24;">東京駅 近く 綺麗で安い ホテル <i class="fa-solid fa-chevron-right" style="font-size: 0.8rem;"></i></a>
                    <a href="shinjuku-joshitabi/" class="booking-button" style="display:inline-block; margin: 0.5rem; background: #1e293b; color: #fbbf24; border: 1px solid #fbbf24;">新宿 女子旅 かわいい ホテル 安い <i class="fa-solid fa-chevron-right" style="font-size: 0.8rem;"></i></a>
                </div>
            </div>
        </section>`
  },
  {
    city: 'kyoto',
    html: `        <section id="niche-links" class="hotels-section" style="background: rgba(15, 15, 18, 0.9);">
            <div class="container">
                <div class="section-header">
                    <h3 class="section-title">Niche Collections</h3>
                    <p class="section-subtitle">京都の条件別おすすめホテル特集</p>
                </div>
                <div style="text-align: center;">
                    <a href="eki-daiyokujo/" class="booking-button" style="display:inline-block; margin: 0.5rem; background: #1e293b; color: #fbbf24; border: 1px solid #fbbf24;">京都駅 近く 大浴場 安い ホテル <i class="fa-solid fa-chevron-right" style="font-size: 0.8rem;"></i></a>
                    <a href="kawaramachi-couple/" class="booking-button" style="display:inline-block; margin: 0.5rem; background: #1e293b; color: #fbbf24; border: 1px solid #fbbf24;">河原町 カップル おしゃれ 安い ホテル <i class="fa-solid fa-chevron-right" style="font-size: 0.8rem;"></i></a>
                </div>
            </div>
        </section>`
  },
  {
    city: 'sapporo',
    html: `        <section id="niche-links" class="hotels-section" style="background: rgba(15, 15, 18, 0.9);">
            <div class="container">
                <div class="section-header">
                    <h3 class="section-title">Niche Collections</h3>
                    <p class="section-subtitle">札幌の条件別おすすめホテル特集</p>
                </div>
                <div style="text-align: center;">
                    <a href="eki-breakfast/" class="booking-button" style="display:inline-block; margin: 0.5rem; background: #1e293b; color: #fbbf24; border: 1px solid #fbbf24;">札幌駅 近く 朝食が美味しい ホテル 安い <i class="fa-solid fa-chevron-right" style="font-size: 0.8rem;"></i></a>
                    <a href="susukino-sudomari/" class="booking-button" style="display:inline-block; margin: 0.5rem; background: #1e293b; color: #fbbf24; border: 1px solid #fbbf24;">すすきの 素泊まり 格安 3000円台 <i class="fa-solid fa-chevron-right" style="font-size: 0.8rem;"></i></a>
                </div>
            </div>
        </section>`
  },
  {
    city: 'okinawa',
    html: `        <section id="niche-links" class="hotels-section" style="background: rgba(15, 15, 18, 0.9);">
            <div class="container">
                <div class="section-header">
                    <h3 class="section-title">Niche Collections</h3>
                    <p class="section-subtitle">沖縄の条件別おすすめホテル特集</p>
                </div>
                <div style="text-align: center;">
                    <a href="naha-kokusaidori/" class="booking-button" style="display:inline-block; margin: 0.5rem; background: #1e293b; color: #fbbf24; border: 1px solid #fbbf24;">那覇 国際通り 近く 安い ホテル <i class="fa-solid fa-chevron-right" style="font-size: 0.8rem;"></i></a>
                    <a href="naha-airport-sogei/" class="booking-button" style="display:inline-block; margin: 0.5rem; background: #1e293b; color: #fbbf24; border: 1px solid #fbbf24;">那覇空港 近く 送迎あり 安い ホテル <i class="fa-solid fa-chevron-right" style="font-size: 0.8rem;"></i></a>
                </div>
            </div>
        </section>`
  }
];

for (const target of targets) {
  const filePath = path.join(__dirname, '..', target.city, 'index.html');
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (!content.includes('id="niche-links"')) {
      content = content.replace('    </main>', target.html + '\n    </main>');
      fs.writeFileSync(filePath, content);
      console.log(`Injected niche links into ${target.city}/index.html`);
    } else {
      console.log(`Niche links already exist in ${target.city}/index.html`);
    }
  }
}
