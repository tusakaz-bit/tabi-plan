const fs = require('fs');

function enforceLocalFilter(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // For generate_city_pages.js
    if (filePath.includes('generate_city_pages')) {
        // Change `< 1000` to `< 3000` to eliminate 1000-2000 JPY hotels globally
        content = content.replace(
            /if \(!info\.hotelMinCharge \|\| info\.hotelMinCharge < 1000\) return false;/g,
            "if (!info.hotelMinCharge || parseInt(info.hotelMinCharge, 10) < 3000) return false;"
        );
    }
    
    // For generate_niche_pages.js
    if (filePath.includes('generate_niche_pages')) {
        content = content.replace(
            /if \(!info\.hotelMinCharge \|\| info\.hotelMinCharge < 1000\) return false;/g,
            "if (!info.hotelMinCharge || parseInt(info.hotelMinCharge, 10) < 3000) return false;"
        );
        // Also ensure filterRules.minPrice is strictly checked with parseInt
        content = content.replace(
            /if \(filterRules\.minPrice && info\.hotelMinCharge < filterRules\.minPrice\) return false;/g,
            "if (filterRules.minPrice && parseInt(info.hotelMinCharge, 10) < filterRules.minPrice) return false;"
        );
    }

    // For generate_features_pages.js
    if (filePath.includes('generate_features_pages')) {
        content = content.replace(
            /if \(filters\.minPrice && \(info\.hotelMinCharge \|\| 0\) < filters\.minPrice\) return false;/g,
            "if (!info.hotelMinCharge || parseInt(info.hotelMinCharge, 10) < 3000) return false;\n                  if (filters.minPrice && parseInt(info.hotelMinCharge, 10) < filters.minPrice) return false;"
        );
    }

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated local filter in ${filePath}`);
}

enforceLocalFilter('scripts/generate_city_pages.js');
enforceLocalFilter('scripts/generate_niche_pages.js');
enforceLocalFilter('scripts/generate_features_pages.js');
