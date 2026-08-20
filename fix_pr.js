const fs = require('fs');
const path = require('path');

const filesToFixHero = [
  'index.html',
  'scripts/themes/city_template.html',
  'scripts/themes/niche_template.html',
  'pickup/template.html'
];

filesToFixHero.forEach(f => {
  const p = path.join(__dirname, f);
  if (!fs.existsSync(p)) return;
  let c = fs.readFileSync(p, 'utf8');
  if (!c.includes('アフィリエイト広告を利用')) {
    c = c.replace('<div class="hero-content">', '<div class="hero-content">\n                    <div style="font-size: 0.75rem; color: #fff; background: rgba(0,0,0,0.4); display: inline-block; padding: 4px 12px; border-radius: 4px; margin-bottom: 1rem; backdrop-filter: blur(4px);">※当サイトはアフィリエイト広告を利用しています</div>');
    fs.writeFileSync(p, c);
    console.log('Fixed hero PR in', f);
  }
});

const pickupIndex = path.join(__dirname, 'pickup/index.html');
if (fs.existsSync(pickupIndex)) {
  let c = fs.readFileSync(pickupIndex, 'utf8');
  if (!c.includes('アフィリエイト広告を利用')) {
    c = c.replace('<main class="container" style="padding: 6rem 2rem;">', '<main class="container" style="padding: 6rem 2rem;">\n        <div style="font-size: 0.75rem; color: #64748b; text-align: right; padding: 4px 16px; background: rgba(248, 250, 252, 0.8); border-bottom: 1px solid #e2e8f0; margin-bottom: 2rem; border-radius: 4px;">※当サイトはアフィリエイト広告を利用しています</div>');
    fs.writeFileSync(pickupIndex, c);
    console.log('Fixed main PR in pickup/index.html');
  }
}
