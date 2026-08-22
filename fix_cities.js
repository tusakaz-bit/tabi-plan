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

            // Remove it if it's near the logo in the header
            const logoMatch = /<h1 class="logo"([^>]*)>(.*?)<\/h1>\s*<div class="pr-notation">.*?<\/div>\s*/;
            if (c.match(logoMatch)) {
                c = c.replace(logoMatch, '<h1 class="logo"></h1>\n            ');
                modified = true;
            }
            
            // Also remove ANY other stray pr-notations just in case
            c = c.replace(/<div class="pr-notation">.*?<\/div>\n?/g, '');
            
            // Insert cleanly
            if (c.includes('niche-title')) {
                // Niche page
                // Match <h1 class="niche-title">...</h1> and insert PR below it
                c = c.replace(/(<h1 class="niche-title">[^<]*<\/h1>)/, '$1\n                ' + newPR);
                modified = true;
            } else if (c.includes('city-hero')) {
                // City page
                // Match the <h2> block cleanly. We find <h2 class="title"...>...</h2>
                // Let's use a function replacer so we don't mess up  etc.
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
