const fs = require('fs');

function update(file) {
    if (!fs.existsSync(file)) return;
    let c = fs.readFileSync(file, 'utf8');
    c = c.replace('※当サイトはアフィリエイト広告を利用しています', 'PR：本ページはプロモーションが含まれています');
    fs.writeFileSync(file, c);
}
update('scripts/generate_hatena_html.js');
update('scripts/fix_past_hatena.js');
