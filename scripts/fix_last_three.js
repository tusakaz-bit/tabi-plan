const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../pickup');

const dataMap = {
    '2026-05-15-naha-okinawa.html': {
        metaDescription: "沖縄の魅力が詰まった「THE NEST那覇」。国際通り近くの好立地にありながら、静寂で洗練されたデザイナーズ空間が広がります。コストパフォーマンスに優れた上質なリゾート体験をお楽しみください。",
        catchcopy: "那覇の中心に潜む、洗練された大人のリゾート空間。",
        smartPoint: "国際通りまで徒歩圏内という絶好のアクセスでありながら、驚くほどリーズナブルな価格設定。機能性とデザイン性を両立した賢い選択です。",
        beautifulPoint: "木の温もりとモダンなインテリアが調和するデザイナーズ空間。南国の日差しが差し込む開放的な客室で、極上のリラックスタイムを。",
        locationPoint: "モノレール旭橋駅から徒歩数分。那覇空港からのアクセスも抜群で、観光やビジネスの拠点としてこれ以上ない快適さを提供します。",
        detailedDescription: "沖縄の玄関口・那覇の中心エリアにありながら、一歩足を踏み入れるとそこは喧騒を忘れるような洗練されたリゾート空間。「THE NEST那覇」は、機能的な都市型ホテルとリゾートの心地よさを融合させた、まったく新しい滞在スタイルを提案します。<br><br>客室は木の質感を生かした温かみのあるモダンデザインで統一され、旅の疲れを優しく癒してくれます。特筆すべきはそのコストパフォーマンス。国際通りなどの主要観光スポットへ徒歩圏内という最高の立地条件を備えながらも、驚くほどリーズナブルな価格で上質なサービスを体験できます。<br><br>初めての沖縄旅行からリピーターの方まで、すべての旅行者に自信を持っておすすめできる、まさに「賢く美しい」那覇滞在の最適解です。"
    },
    '2026-05-17-ky-ky-in-tokyo.html': {
        metaDescription: "東京駅から徒歩圏内、日本橋エリアに位置する「京急EXイン 東京・日本橋」。洗練された和モダン空間と上質なベッドマットレスが、都会の喧騒を忘れる極上の眠りと快適な滞在をお約束します。",
        catchcopy: "伝統と革新が交差する日本橋で、上質な眠りと快適な朝を。",
        smartPoint: "複数路線が利用可能な抜群の交通アクセス。高品質なアメニティとシモンズ社製ベッドを完備し、価格以上の価値を実感できるハイコスパホテルです。",
        beautifulPoint: "江戸の風情と現代的なデザインが融合した「和モダン」なインテリア。落ち着いた色調の客室が、心安らぐ静かな時間をもたらします。",
        locationPoint: "東京メトロ茅場町駅・日本橋駅からすぐ。東京駅や銀座エリアへもアクセス至便で、ビジネスにも観光にも最適なロケーションです。",
        detailedDescription: "伝統的な江戸の情緒と近代的なビジネス街の顔を併せ持つ日本橋エリア。その中心に位置する「京急EXイン 東京・日本橋」は、都会の喧騒を忘れさせる洗練された和モダン空間が魅力のホテルです。<br><br>最大のこだわりは「良質な眠り」。全室に導入されたシモンズ社製ベッドと、オリジナルの快眠枕が、旅やビジネスの疲れを深く癒やしてくれます。東京駅や銀座、浅草といった主要な観光エリアへのアクセスが抜群であるにも関わらず、静かで落ち着いた環境が整っているのも大きなポイント。<br><br>充実した無料アメニティバイキングなど、細部まで行き届いたおもてなしが、あなたの東京滞在をより豊かで快適なものに昇華させます。"
    },
    '2026-05-29-hotel-torasuti-osaka-abeno.html': {
        metaDescription: "天王寺駅直結の「ホテルトラスティ大阪阿倍野」。エレガントでクラシカルなヨーロッパ調の空間が広がる上質なホテルです。大阪一望の美しい夜景とともに、ワンランク上の優雅な滞在をお楽しみください。",
        catchcopy: "大阪の空に浮かぶ、クラシカルで優雅なヨーロッパの邸宅。",
        smartPoint: "主要駅直結という圧倒的な利便性。ハイクラスな雰囲気と行き届いたホスピタリティでありながら、手の届きやすい価格設定が魅力です。",
        beautifulPoint: "ヨーロピアン・エレガンスを基調とした上質なインテリア。高層階から見下ろす大阪のダイナミックな夜景は、まさに非日常の美しさです。",
        locationPoint: "各線天王寺駅・大阪阿部野橋駅に直結。あべのハルカスや通天閣など、ディープな大阪観光の拠点としてパーフェクトな立地です。",
        detailedDescription: "大阪・キタやミナミとは一味違う、歴史と新しさが混在するディープな魅力を持つ天王寺・阿倍野エリア。そのランドマークの一つに構える「ホテルトラスティ大阪阿倍野」は、一歩足を踏み入れるとヨーロッパの瀟洒な邸宅のようなエレガントな空間が広がります。<br><br>ロビーや客室はクラシカルで洗練されたデザインで統一され、ラグジュアリーな非日常感を演出。高層階から見下ろす美しい夜景は、一日の終わりをロマンチックに彩ります。これだけの高いクオリティと、駅直結という圧倒的なフットワークの軽さを兼ね備えながら、非常にリーズナブルな価格で宿泊できるコストパフォーマンスの高さは驚異的。<br><br>関西空港からのアクセスも良く、大阪観光の拠点をワンランク上の体験にしたい方に最適なホテルです。"
    }
};

for (const [filename, data] of Object.entries(dataMap)) {
    const filePath = path.join(dir, filename);
    if (fs.existsSync(filePath)) {
        let html = fs.readFileSync(filePath, 'utf8');
        
        const descStart = html.indexOf('<section class="description">');
        const descEnd = html.indexOf('</section>', descStart);
        
        if (descStart >= 0) {
            const descHtml = data.detailedDescription.split('<br><br>').map(p=>`<p>${p}</p>`).join('\n                ');
            html = html.substring(0, descStart) + `<section class="description">\n                ${descHtml}\n            ` + html.substring(descEnd);
            html = html.replace(/(<p style="color: rgba\(255,255,255,0\.7\);[^>]*>)[^<]*/, `$1${data.catchcopy}`);
            html = html.replace(/(<h3>賢い選択<\/h3>\s*<p>)[^<]*/, `$1${data.smartPoint}`);
            html = html.replace(/(<h3>美しき滞在<\/h3>\s*<p>)[^<]*/, `$1${data.beautifulPoint}`);
            html = html.replace(/(<h3>最高の立地<\/h3>\s*<p>)[^<]*/, `$1${data.locationPoint}`);
            
            if (html.includes('<meta name="description"')) {
                html = html.replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${data.metaDescription}">`);
            }
            if (html.includes('<meta property="og:description"')) {
                html = html.replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${data.metaDescription}">`);
            }
            if (html.includes('<meta name="twitter:description"')) {
                html = html.replace(/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${data.metaDescription}">`);
            }
            
            fs.writeFileSync(filePath, html, 'utf8');
            console.log(`Updated manually: ${filename}`);
        }
    }
}
