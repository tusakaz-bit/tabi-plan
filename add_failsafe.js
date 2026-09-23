const fs = require('fs');

function addFailsafe(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // For generate_city_pages.js
    if (filePath.includes('generate_city_pages')) {
        content = content.replace(
            /const htmlDeals = renderHotelCards\(hotelsDeals, city\);/,
            `const hotelsDealsFiltered = hotelsDeals.filter(h => parseInt(h.hotel[0].hotelBasicInfo.hotelMinCharge, 10) >= 3000);
        const hotelsLadiesFiltered = hotelsLadies.filter(h => parseInt(h.hotel[0].hotelBasicInfo.hotelMinCharge, 10) >= 3000);
        const hotelsCoupleFiltered = hotelsCouple.filter(h => parseInt(h.hotel[0].hotelBasicInfo.hotelMinCharge, 10) >= 3000);
        const hotelsLuxuryFiltered = hotelsLuxury.filter(h => parseInt(h.hotel[0].hotelBasicInfo.hotelMinCharge, 10) >= 3000);
        const hotelsStationFiltered = hotelsStation.filter(h => parseInt(h.hotel[0].hotelBasicInfo.hotelMinCharge, 10) >= 3000);

        const htmlDeals = renderHotelCards(hotelsDealsFiltered, city);
        const htmlLadies = renderHotelCards(hotelsLadiesFiltered, city);
        const htmlCouple = renderHotelCards(hotelsCoupleFiltered, city);
        const htmlLuxury = renderHotelCards(hotelsLuxuryFiltered, city);
        const htmlStation = renderHotelCards(hotelsStationFiltered, city);`
        );
        // We need to also replace the subsequent calls to renderHotelCards in the original content since we just injected new ones.
        // Wait, the regex only replaces the first line, but the original code had:
        // const htmlDeals = renderHotelCards(hotelsDeals, city);
        // const htmlLadies = renderHotelCards(hotelsLadies, city);
        // ...
        // So I should replace all of them.
        content = content.replace(/const htmlLadies = renderHotelCards\(hotelsLadies, city\);\s*/, '');
        content = content.replace(/const htmlCouple = renderHotelCards\(hotelsCouple, city\);\s*/, '');
        content = content.replace(/const htmlLuxury = renderHotelCards\(hotelsLuxury, city\);\s*/, '');
        content = content.replace(/const htmlStation = renderHotelCards\(hotelsStation, city\);\s*/, '');
        // Update allFeaturedHotels
        content = content.replace(/const allFeaturedHotels = \[\.\.\.hotelsDeals\.slice\(0, 5\), \.\.\.hotelsLuxury\.slice\(0, 5\)\];/, 'const allFeaturedHotels = [...hotelsDealsFiltered.slice(0, 5), ...hotelsLuxuryFiltered.slice(0, 5)];');
    }
    
    // For generate_niche_pages.js
    if (filePath.includes('generate_niche_pages')) {
        content = content.replace(
            /const hotelsHtml = renderHotelCards\(hotels, niche\);/,
            `// フェイルセーフ：設定金額未満の宿を強制排除
          const minPrice = niche.filters.minPrice || 3000;
          hotels = hotels.filter(h => parseInt(h.hotel[0].hotelBasicInfo.hotelMinCharge, 10) >= minPrice);
          const hotelsHtml = renderHotelCards(hotels, niche);`
        );
    }

    // For generate_features_pages.js
    if (filePath.includes('generate_features_pages')) {
        content = content.replace(
            /const hotelsHtml = hotels\.map\(generateHotelCardHtml\)\.join\(''\);/,
            `// フェイルセーフ：設定金額未満の宿を強制排除
    const minPrice = filters.minPrice || 3000;
    const finalHotels = hotels.filter(h => parseInt(h.hotel[0].hotelBasicInfo.hotelMinCharge, 10) >= minPrice);
    const hotelsHtml = finalHotels.map(generateHotelCardHtml).join('');`
        );
    }

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Added failsafe to ${filePath}`);
}

addFailsafe('scripts/generate_city_pages.js');
addFailsafe('scripts/generate_niche_pages.js');
addFailsafe('scripts/generate_features_pages.js');
