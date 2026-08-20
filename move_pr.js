const fs = require('fs');
const path = require('path');

const files = [
  'index.html',
  'pickup/index.html',
  'pickup/template.html',
  'scripts/themes/city_template.html',
  'scripts/themes/niche_template.html'
];

const oldHeroPR = '<div style="font-size: 0.75rem; color: #fff; background: rgba(0,0,0,0.4); display: inline-block; padding: 4px 12px; border-radius: 4px; margin-bottom: 1rem; backdrop-filter: blur(4px);">※当サイトはアフィリエイト広告を利用しています</div>';
const oldMainPR = '<div style="font-size: 0.75rem; color: #64748b; text-align: right; padding: 4px 16px; background: rgba(248, 250, 252, 0.8); border-bottom: 1px solid #e2e8f0; margin-bottom: 2rem; border-radius: 4px;">※当サイトはアフィリエイト広告を利用しています</div>';
const newPR = '<div style="position: absolute; top: 4px; right: 12px; font-size: 0.65rem; color: #94a3b8;">※当サイトはアフィリエイト広告を利用しています</div>';

files.forEach(f => {
  const p = path.join(__dirname, f);
  if (!fs.existsSync(p)) return;
  let c = fs.readFileSync(p, 'utf8');
  let changed = false;

  if (c.includes(oldHeroPR)) {
    c = c.replace(oldHeroPR + '\n', '');
    c = c.replace(oldHeroPR, '');
    changed = true;
  }
  if (c.includes(oldMainPR)) {
    c = c.replace(oldMainPR + '\n', '');
    c = c.replace(oldMainPR, '');
    changed = true;
  }
  
  if (!c.includes(newPR)) {
    if (c.includes('<header class="header">')) {
      c = c.replace('<header class="header">', '<header class="header">\n    ' + newPR);
      changed = true;
    } else if (c.includes('<nav>')) {
      c = c.replace('<nav>', '<nav>\n    ' + newPR);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(p, c);
    console.log('Updated PR position in', f);
  }
});
