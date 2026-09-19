const fs = require('fs');
let config = JSON.parse(fs.readFileSync('scripts/features_config.json', 'utf8'));

config['anniversary'].heroTitle = '<span style="display: inline-block;">記念日旅行 - </span><wbr><span style="display: inline-block;">コスパ重視で失敗しない宿</span>';
config['solotravel-women'].heroTitle = '<span style="display: inline-block;">女子一人旅 - </span><wbr><span style="display: inline-block;">セキュリティと癒やしを両立する宿</span>';

config['anniversary-kyoto'].heroTitle = '<span style="display: inline-block;">【京都】記念日におすすめの</span><wbr><span style="display: inline-block;">コスパ最強ホテル</span>';
config['anniversary-fukuoka'].heroTitle = '<span style="display: inline-block;">【福岡】記念日ステイにおすすめの</span><wbr><span style="display: inline-block;">おしゃれで安いホテル</span>';
config['solotravel-women-sapporo'].heroTitle = '<span style="display: inline-block;">【札幌】女子一人旅におすすめ！</span><wbr><span style="display: inline-block;">大浴場付き・高コスパなホテル</span>';
config['solotravel-women-tokyo'].heroTitle = '<span style="display: inline-block;">【東京】女子一人旅・ご褒美ステイにおすすめの</span><wbr><span style="display: inline-block;">綺麗でおしゃれなホテル</span>';

fs.writeFileSync('scripts/features_config.json', JSON.stringify(config, null, 2), 'utf8');
console.log('Added heroTitle to config');
