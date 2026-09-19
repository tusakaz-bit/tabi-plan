const fs = require('fs');
const config = JSON.parse(fs.readFileSync('scripts/features_config.json', 'utf8'));

function wrapText(chunks) {
    return chunks.map(chunk => `<span style="display: inline-block;">${chunk}</span>`).join('');
}

config['anniversary'].heroTitle = wrapText(['記念日旅行 - ', 'コスパ重視で', '失敗しない宿']);
config['solotravel-women'].heroTitle = wrapText(['女子一人旅 - ', 'セキュリティと', '癒やしを', '両立する宿']);

config['anniversary-kyoto'].heroTitle = wrapText(['【京都】', '記念日におすすめの', 'コスパ最強ホテル']);
config['anniversary-fukuoka'].heroTitle = wrapText(['【福岡】', '記念日ステイにおすすめの', 'おしゃれで安いホテル']);
config['solotravel-women-sapporo'].heroTitle = wrapText(['【札幌】', '女子一人旅におすすめ！', '大浴場付き・', '高コスパなホテル']);
config['solotravel-women-tokyo'].heroTitle = wrapText(['【東京】', '女子一人旅・', 'ご褒美ステイにおすすめの', '綺麗でおしゃれなホテル']);

fs.writeFileSync('scripts/features_config.json', JSON.stringify(config, null, 2), 'utf8');
console.log('Updated heroTitles');
