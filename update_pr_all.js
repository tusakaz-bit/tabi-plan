const fs = require('fs');
const path = require('path');
const dirs = ['fukuoka', 'tokyo', 'osaka', 'sapporo', 'okinawa', 'kyoto', 'pickup'];

const oldPR = '<div style="position: absolute; top: 4px; right: 12px; font-size: 0.65rem; color: #94a3b8;">※当サイトはアフィリエイト広告を利用しています</div>';
const newPR = '<div class="pr-notation">PR：本ページはプロモーションが含まれています</div>';

function walk(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walk(fullPath);
        } else if (fullPath.endsWith('.html')) {
            let c = fs.readFileSync(fullPath, 'utf8');
            let modified = false;

            if (c.includes(oldPR)) {
                c = c.replace(oldPR + '\n    ', '');
                c = c.replace(oldPR + '\n', '');
                c = c.replace(oldPR, '');
                modified = true;
            }

            if (!c.includes(newPR)) {
                if (c.includes('</h1>')) {
                    c = c.replace('</h1>', '</h1>\n                    ' + newPR);
                    modified = true;
                } else if (c.includes('</h2>')) {
                    c = c.replace('</h2>', '</h2>\n                    ' + newPR);
                    modified = true;
                }
            }

            if (modified) {
                fs.writeFileSync(fullPath, c);
                console.log('Updated:', fullPath);
            }
        }
    }
}

dirs.forEach(d => walk(path.join(__dirname, d)));
