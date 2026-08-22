const fs = require('fs');
const path = require('path');
const dirs = ['fukuoka', 'tokyo', 'osaka', 'sapporo', 'okinawa', 'kyoto'];

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

            c = c.replace(/<div class="pr-notation">.*?<\/div>\n?/g, '');
            c = c.replace(/\s*<div class="pr-notation">.*?<\/div>\s*/g, '\n                    ');

            if (c.includes('niche-title')) {
                c = c.replace(/(<h1 class="niche-title">[^<]*<\/h1>)/, '$1\n                ' + newPR);
                modified = true;
            } else if (c.includes('class="hero"')) {
                c = c.replace(/<h2 class="title"[^>]*>[\s\S]*?<\/h2>/, function(match) {
                    return match + '\n                    ' + newPR;
                });
                modified = true;
            }

            if (modified) {
                fs.writeFileSync(fullPath, c);
                console.log('Fixed:', fullPath);
            }
        }
    }
}

dirs.forEach(d => walk(path.join(__dirname, d)));
