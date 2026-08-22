const fs = require('fs');
const path = require('path');
const dirs = ['.', 'fukuoka', 'tokyo', 'osaka', 'sapporo', 'okinawa', 'kyoto', 'pickup'];
const nicheDirs = [];

const newPR = '<div class="pr-notation">PR：本ページはプロモーションが含まれています</div>';

function walk(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (file === 'node_modules' || file.startsWith('.')) continue;
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walk(fullPath);
        } else if (fullPath.endsWith('.html')) {
            let c = fs.readFileSync(fullPath, 'utf8');
            let modified = false;

            // Remove all existing PR notations
            const regex = /<div class="pr-notation">.*?<\/div>\n?/g;
            if (c.match(regex)) {
                c = c.replace(regex, '');
                // Also clean up any extra spaces left behind
                c = c.replace(/\s+<div class="pr-notation">.*?<\/div>/g, '');
                modified = true;
            }

            // Also remove old PR
            const oldPR = '<div style="position: absolute; top: 4px; right: 12px; font-size: 0.65rem; color: #94a3b8;">※当サイトはアフィリエイト広告を利用しています</div>';
            if (c.includes(oldPR)) {
                c = c.replace(oldPR + '\n    ', '');
                c = c.replace(oldPR + '\n', '');
                c = c.replace(oldPR, '');
                modified = true;
            }

            // Insert new PR
            if (fullPath.includes('pickup') && !fullPath.includes('index.html') && !fullPath.includes('template.html')) {
                c = c.replace(/<h1 class="hotel-title">([^<]+)<\/h1>/, '<h1 class="hotel-title"></h1>\n            ' + newPR);
            } else if (fullPath.includes('pickup') && fullPath.includes('index.html')) {
                c = c.replace(/<h2 class="section-title"[^>]*>([^<]+)<\/h2>/, '<h2 class="section-title" style="font-size: 3rem; font-weight: 900; margin-bottom: 1rem; color: #1a1a2e;"></h2>\n                    ' + newPR);
            } else if (fullPath.includes('pickup') && fullPath.includes('template.html')) {
                c = c.replace('</h1>', '</h1>\n            ' + newPR);
            } else if (fullPath === 'index.html' || fullPath === '.\\index.html') {
                c = c.replace(/<\/h2>/, '</h2>\n                    ' + newPR);
            } else {
                // City page or niche page or template
                if (c.includes('niche-title')) {
                    c = c.replace(/<h1 class="niche-title">([^<]+)<\/h1>/, '<h1 class="niche-title"></h1>\n                ' + newPR);
                } else if (c.includes('class="title"')) {
                    // This matches city template and city index.html
                    c = c.replace(/<h2 class="title"[^>]*>([\s\S]*?)<\/h2>/, '<h2 class="title" style="font-family: \'Noto Sans JP\', sans-serif;"></h2>\n                    ' + newPR);
                }
            }

            fs.writeFileSync(fullPath, c);
            console.log('Fixed:', fullPath);
        }
    }
}

walk(__dirname);
