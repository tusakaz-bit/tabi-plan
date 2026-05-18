document.addEventListener('DOMContentLoaded', () => {
    const APP_ID = '2d0fb5d11e725c9ab3b42cf9f5bca085';
    const AFFILIATE_ID = '047ad0f1.183c70cf.047ad0f2.1e4c3769';

    // ==========================================
    // 楽天トラベル「5と0のつく日」＆「スーパーSALE」プロモーション設定（最新構造版）
    // ==========================================
    const PROMO_CONFIG = {
        // ユーザー毎のトラッキングID (アフィリエイトID)
        rakutenAffiliateId: AFFILIATE_ID,

        // 5と0のつく日用の設定
        promo50: {
            url: `https://hb.afl.rakuten.co.jp/hgc/${AFFILIATE_ID}/?pc=https%3A%2F%2Ftravel.rakuten.co.jp%2Fcamp%2F50luxday%2F`,
            // Tabi Planオリジナルの5と0のつく日用バナー画像（imagesフォルダに配置済み）
            bannerUrl: "../images/promo-50-banner.png",
            // 前日フライング用の文言
            pre: {
                title: "＼まもなく開催！／ 本日20時からクーポン事前配布中！（※対象ホテルは要確認）",
                micro: "＼まもなく開催！／ 5と0のつく日クーポン配布中！（※対象施設限定）"
            },
            // 当日開催用の文言
            active: {
                title: "＼本日は5と0のつく日！／ 高級宿・温泉宿が最大20%OFF！（※対象施設限定）",
                micro: "＼本日は5と0のつく日！／ 対象の高級宿・温泉宿が最大20%OFF！"
            }
        },

        // スーパーSALE用の設定
        superSale: {
            active: false, // 手動で一括ONにする場合は true
            startDate: "2026-06-04T20:00:00+09:00", // 開始JST
            endDate: "2026-06-15T23:59:59+09:00",   // 終了JST
            title: "＼年に数回のビッグチャンス！／ 楽天トラベル スーパーSALE 開催中！半額プラン＆限定クーポン多数！",
            micro: "＼年に数回のビッグチャンス！／ 楽天トラベル スーパーSALE 開催中！半額プラン＆限定クーポン多数！",
            url: `https://hb.afl.rakuten.co.jp/hgc/${AFFILIATE_ID}/?pc=https%3A%2F%2Ftravel.rakuten.co.jp%2Fspecial%2Fsupersale%2F`,
            // Tabi PlanオリジナルのスーパーSALE用バナー画像（imagesフォルダに配置済み）
            bannerUrl: "../images/promo-supersale-banner.png"
        }
    };
    
    const isOsaka = window.location.pathname.includes('osaka');
    const isTokyo = window.location.pathname.includes('tokyo');
    const isKyoto = window.location.pathname.includes('kyoto');
    const isSapporo = window.location.pathname.includes('sapporo');
    const isOkinawa = window.location.pathname.includes('okinawa');

    // API Request parameters
    const API_URL = 'https://app.rakuten.co.jp/services/api/Travel/SimpleHotelSearch/20170426';
    const parsedParams = {
        applicationId: APP_ID,
        affiliateId: AFFILIATE_ID,
        format: 'json',
        largeClassCode: 'japan',
        middleClassCode: isOkinawa ? 'okinawa' : (isSapporo ? 'hokkaido' : (isKyoto ? 'kyoto' : (isOsaka ? 'osaka' : (isTokyo ? 'tokyo' : 'hukuoka')))),
        smallClassCode: isOkinawa ? 'nahashi' : (isSapporo ? 'sapporo' : (isKyoto ? 'shi' : (isOsaka ? 'shi' : (isTokyo ? 'tokyo' : 'fukuoka')))),
        sort: '+roomCharge' // 最安値順
    };
    if (isOsaka) {
        parsedParams.detailClassCode = 'D'; // なんば・天王寺・心斎橋
    } else if (isTokyo) {
        parsedParams.detailClassCode = 'A'; // 東京駅・銀座・日本橋エリア
    } else if (isKyoto) {
        parsedParams.detailClassCode = 'B'; // 河原町・四条烏丸
    } else if (isSapporo) {
        parsedParams.detailClassCode = 'B'; // 大通公園・時計台・狸小路
    }
    const PARAMS = new URLSearchParams(parsedParams);

    const KEYWORD_API_URL = 'https://app.rakuten.co.jp/services/api/Travel/KeywordHotelSearch/20170426';

    const loadingEl = document.getElementById('loading');
    const containerEl = document.getElementById('hotels-container');
    const errorEl = document.getElementById('error-message');
    const loadMoreContainer = document.querySelector('.load-more-container');
    const loadMoreBtn = document.getElementById('load-more-btn');

    // State management
    const hotelData = {
        deals: [],
        ladies: [],
        couple: [],
        luxury: [],
        station: []
    };
    const displayCounts = {
        deals: 5,
        ladies: 5,
        couple: 5,
        luxury: 5,
        station: 5
    };
    let currentTab = 'deals';

    function buildKeywordParams(keyword) {
        const p = {
            applicationId: APP_ID,
            affiliateId: AFFILIATE_ID,
            format: 'json',
            keyword: keyword,
            largeClassCode: 'japan',
            middleClassCode: isOkinawa ? 'okinawa' : (isSapporo ? 'hokkaido' : (isKyoto ? 'kyoto' : (isOsaka ? 'osaka' : (isTokyo ? 'tokyo' : 'hukuoka')))),
            smallClassCode: isOkinawa ? 'nahashi' : (isSapporo ? 'sapporo' : (isKyoto ? 'shi' : (isOsaka ? 'shi' : (isTokyo ? 'tokyo' : 'fukuoka'))))
        };
        if (isOsaka) p.detailClassCode = 'D';
        if (isTokyo) p.detailClassCode = 'A';
        if (isKyoto) p.detailClassCode = 'B';
        if (isSapporo) p.detailClassCode = 'B';
        return new URLSearchParams(p).toString();
    }

    // 都市名プレフィックス
    const cityPrefix = isOkinawa ? '沖縄' : (isSapporo ? '札幌' : (isKyoto ? '京都' : (isOsaka ? '大阪' : (isTokyo ? '東京' : '博多'))));

    // 住所フィルタ
    const cityName = isOkinawa ? '那覇市' : (isSapporo ? '札幌市' : (isKyoto ? '京都市' : (isOsaka ? '大阪市' : (isTokyo ? '東京都' : '福岡市'))));
    function filterByCity(hotels) {
        if (!hotels) return [];
        return hotels.filter(h => {
            const info = h.hotel[0].hotelBasicInfo;
            const addr = (info.address1 || '') + (info.address2 || '');
            return addr.includes(cityName);
        });
    }

    // 高級ホテル用：SimpleHotelSearchで料金の高い順
    const luxuryParams = new URLSearchParams({
        applicationId: APP_ID,
        affiliateId: AFFILIATE_ID,
        format: 'json',
        largeClassCode: 'japan',
        middleClassCode: isOkinawa ? 'okinawa' : (isSapporo ? 'hokkaido' : (isKyoto ? 'kyoto' : (isOsaka ? 'osaka' : (isTokyo ? 'tokyo' : 'hukuoka')))),
        smallClassCode: isOkinawa ? 'nahashi' : (isSapporo ? 'sapporo' : (isKyoto ? 'shi' : (isOsaka ? 'shi' : (isTokyo ? 'tokyo' : 'fukuoka')))),
        sort: '-roomCharge'
    });
    if (isOsaka) luxuryParams.append('detailClassCode', 'D');
    if (isTokyo) luxuryParams.append('detailClassCode', 'A');
    if (isKyoto) luxuryParams.append('detailClassCode', 'B');
    if (isSapporo) luxuryParams.append('detailClassCode', 'B');

    // 5カテゴリ同時取得
    Promise.all([
        fetch(`${API_URL}?${PARAMS.toString()}`).then(res => res.json()).catch(() => null),
        fetch(`${KEYWORD_API_URL}?${buildKeywordParams('レディース')}`).then(res => res.json()).catch(() => null),
        fetch(`${KEYWORD_API_URL}?${buildKeywordParams(cityPrefix + ' カップル')}`).then(res => res.json()).catch(() => null),
        fetch(`${API_URL}?${luxuryParams.toString()}`).then(res => res.json()).catch(() => null),
        fetch(`${KEYWORD_API_URL}?${buildKeywordParams('駅近')}`).then(res => res.json()).catch(() => null)
    ]).then(([dealsData, ladiesData, coupleData, luxuryData, stationData]) => {
        if (loadingEl) loadingEl.style.display = 'none';

        if (dealsData && dealsData.hotels)   hotelData.deals  = dealsData.hotels;
        if (luxuryData && luxuryData.hotels) hotelData.luxury = filterByCity(luxuryData.hotels);
        if (ladiesData && ladiesData.hotels)  hotelData.ladies  = filterByCity(ladiesData.hotels);
        if (coupleData && coupleData.hotels)  hotelData.couple  = filterByCity(coupleData.hotels);
        if (stationData && stationData.hotels) hotelData.station = filterByCity(stationData.hotels);

        renderCurrentTab();
    });

    // Tab switching logic
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const selectedTab = e.target.getAttribute('data-tab');
            if (currentTab === selectedTab) return;
            tabButtons.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentTab = selectedTab;
            displayCounts[currentTab] = 5; 
            renderCurrentTab();
        });
    });

    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            displayCounts[currentTab] += 5;
            renderCurrentTab();
        });
    }

    document.querySelectorAll('.hero-cat-tag').forEach(tag => {
        tag.addEventListener('click', () => {
            const selectedTab = tag.getAttribute('data-tab');
            tabButtons.forEach(b => b.classList.remove('active'));
            const matchingTab = document.querySelector(`.tab-button[data-tab="${selectedTab}"]`);
            if (matchingTab) matchingTab.classList.add('active');
            currentTab = selectedTab;
            displayCounts[currentTab] = 5;
            renderCurrentTab();
            const hotelsSection = document.getElementById('hotels');
            if (hotelsSection) {
                hotelsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    function renderCurrentTab() {
        if (!containerEl) return;
        containerEl.innerHTML = '';
        if (errorEl) errorEl.style.display = 'none';

        const data = hotelData[currentTab];
        
        if (!data || data.length === 0) {
            showError(errorEl, '条件に一致するホテルが見つかりませんでした。');
            if(loadMoreContainer) loadMoreContainer.style.display = 'none';
            return;
        }

        const count = displayCounts[currentTab];
        const hotelsToShow = data.slice(0, count);
        renderHotels(hotelsToShow, containerEl);

        if (loadMoreContainer) {
            if (count < data.length) {
                loadMoreContainer.style.display = 'block';
            } else {
                loadMoreContainer.style.display = 'none';
            }
        }
    }

    function showError(element, msg = '情報の取得に失敗しました。後でもう一度お試しください。') {
        if (!element) return;
        const p = element.querySelector('p');
        if (p) p.textContent = msg;
        element.style.display = 'block';
    }

    function updateTimestamp() {
        const now = new Date();
        const dateStr = now.getFullYear() + '年' + (now.getMonth() + 1) + '月' + now.getDate() + '日 ' + String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0') + ' 現在';
        const updateElements = document.querySelectorAll('.update-time');
        updateElements.forEach(el => el.textContent = `最終更新: ${dateStr}`);
    }

    function renderHotels(hotels, container) {
        updateTimestamp();
        const baseStation = isSapporo ? '札幌' : (isKyoto ? '京都' : (isOsaka ? '大阪・梅田' : (isTokyo ? '東京' : '博多')));
        hotels.forEach((hotelData, index) => {
            const info = hotelData.hotel[0].hotelBasicInfo;
            const card = document.createElement('div');
            card.className = 'hotel-card';
            const priceLabel = info.hotelMinCharge ? Number(info.hotelMinCharge).toLocaleString() : '---';
            const targetUrl = info.affiliateUrl || info.hotelInformationUrl;
            const imageUrl = info.hotelImageUrl || 'https://via.placeholder.com/400x300/1e293b/94a3b8?text=No+Image';
            const reviewAvg = info.reviewAverage ? Number(info.reviewAverage).toFixed(2) : '---';
            const reviewCount = info.reviewCount || 0;
            let starsHtml = '';
            if (info.reviewAverage) {
                const score = parseFloat(info.reviewAverage);
                for (let i = 1; i <= 5; i++) {
                    if (score >= i) starsHtml += '<i class="fa-solid fa-star" style="color: #fbbf24;"></i>';
                    else if (score >= i - 0.5) starsHtml += '<i class="fa-solid fa-star-half-stroke" style="color: #fbbf24;"></i>';
                    else starsHtml += '<i class="fa-regular fa-star" style="color: #94a3b8;"></i>';
                }
            } else {
                starsHtml = '<span style="color: #94a3b8; font-size: 0.85rem;">評価なし</span>';
            }
            const transit = getTransitInfo(info.nearestStation);
            card.innerHTML = `
                <div class="rank-badge">${index + 1}</div>
                <div class="hotel-image-wrapper">
                    <img src="${imageUrl}" alt="${info.hotelName}" class="hotel-image" loading="lazy">
                    <div class="rakuten-credit">Rakuten Travel</div>
                </div>
                <div class="hotel-content">
                    <h4 class="hotel-title">${info.hotelName}</h4>
                    <div class="hotel-address"><i class="fa-solid fa-location-dot"></i> <span>${info.address1}${info.address2}</span></div>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 0.8rem;">
                        <span class="transit-badge"><i class="fa-regular fa-clock"></i> ${baseStation}から${transit.time}</span>
                        <span class="fare-badge"><i class="fa-solid fa-yen-sign"></i> ${transit.fare}</span>
                    </div>
                    <div class="hotel-price"><span style="font-size: 0.9rem">最安料金:</span> <span class="price-amount">¥${priceLabel}</span><span style="font-size: 0.9rem">~ /泊</span></div>
                    <div class="review-widget"><div class="review-stars">${starsHtml}</div><div class="review-score">${reviewAvg !== '---' ? reviewAvg : ''}</div><div class="review-count">(${reviewCount}件の口コミ)</div></div>
                    <a href="${targetUrl}" target="_blank" rel="noopener noreferrer" class="booking-button">詳細・予約を見る</a>
                </div>`;
            container.appendChild(card);
        });
        // 動的ロード完了後にもプロモーションのマイクロコピーを再スキャンして適用
        if (typeof applyDynamicPromotions === 'function') {
            applyDynamicPromotions();
        }
    }

    function getTransitInfo(station) {
        if (!station) return { time: '不明', fare: '不明' };
        const s = station.toLowerCase();
        if (isTokyo) {
            if (s.includes('東京')) return { time: '徒歩 5分', fare: '0円' };
            if (s.includes('新宿')) return { time: '電車/地下鉄 約15分', fare: '210円' };
            if (s.includes('銀座')) return { time: '徒歩/地下鉄 約5分', fare: '0円 / 180円' };
            if (s.includes('品川')) return { time: '電車 約10分', fare: '170円' };
            if (s.includes('渋谷') || s.includes('池袋')) return { time: '電車 約20分', fare: '210円' };
            return { time: '電車 約10-20分', fare: '200円〜' };
        } else if (isOsaka) {
            if (s.includes('大阪') || s.includes('梅田')) return { time: '徒歩 5分', fare: '0円' };
            if (s.includes('なんば') || s.includes('難波') || s.includes('心斎橋')) return { time: '地下鉄 約10分', fare: '240円' };
            if (s.includes('天王寺')) return { time: '電車 約15分', fare: '200円' };
            if (s.includes('新大阪')) return { time: '電車 約5分', fare: '170円' };
            return { time: '電車/地下鉄 約15分〜', fare: '200円〜' };
        } else if (isKyoto) {
            if (s.includes('京都')) return { time: '徒歩 5分', fare: '0円' };
            if (s.includes('烏丸') || s.includes('河原町')) return { time: '地下鉄 約10分', fare: '230円' };
            if (s.includes('嵐山')) return { time: '電車 約20分', fare: '240円' };
            if (s.includes('祇園')) return { time: 'バス/電車 約15分', fare: '230円' };
            return { time: '地下鉄/バス 約15分〜', fare: '230円〜' };
        } else if (isSapporo) {
            if (s.includes('札幌')) return { time: '徒歩 5分', fare: '0円' };
            if (s.includes('大通')) return { time: '地下鉄 約2分', fare: '210円' };
            if (s.includes('すすきの')) return { time: '地下鉄 約3分', fare: '210円' };
            if (s.includes('中島公園')) return { time: '地下鉄 約5分', fare: '210円' };
            return { time: '地下鉄 約5-10分', fare: '210円〜' };
        } else if (isOkinawa) {
            if (s.includes('那覇空港')) return { time: 'モノレール 約5分', fare: '230円' };
            if (s.includes('県庁前')) return { time: 'モノレール 約12分', fare: '300円' };
            if (s.includes('旭橋')) return { time: 'モノレール 約11分', fare: '270円' };
            if (s.includes('おもろまち')) return { time: 'モノレール 約19分', fare: '300円' };
            if (s.includes('牧志')) return { time: 'モノレール 約16分', fare: '300円' };
            return { time: 'モノレール 約15-20分', fare: '300円〜' };
        } else {
            if (s.includes('博多')) return { time: '徒歩 5分', fare: '0円' };
            if (s.includes('中洲') || s.includes('中洲川端')) return { time: '地下鉄 5分 + 徒歩5分', fare: '210円' };
            if (s.includes('天神')) return { time: '地下鉄 6分 + 徒歩3分', fare: '210円' };
            if (s.includes('祇園')) return { time: '徒歩 12分 (地下鉄1分)', fare: '0円 / 210円' };
            if (s.includes('呉服町')) return { time: 'バス 10分', fare: '150円' };
            if (s.includes('渡辺通') || s.includes('薬院')) return { time: 'バス 15分', fare: '150円' };
            return { time: 'バス/電車 約15分〜', fare: '210円〜' };
        }
    }

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });

    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const nav = document.querySelector('.nav');
    if (mobileMenuBtn && nav) {
        mobileMenuBtn.addEventListener('click', () => {
            nav.classList.toggle('active');
            const icon = mobileMenuBtn.querySelector('i');
            if (nav.classList.contains('active')) {
                icon.classList.remove('fa-bars'); icon.classList.add('fa-xmark');
            } else {
                icon.classList.remove('fa-xmark'); icon.classList.add('fa-bars');
            }
        });
        nav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                nav.classList.remove('active');
                const icon = mobileMenuBtn.querySelector('i');
                if (icon) { icon.classList.remove('fa-xmark'); icon.classList.add('fa-bars'); }
            });
        });
    }

    // ==========================================
    // 楽天プロモーション判定・適用コアロジック
    // ==========================================

    /**
     * 端末のタイムゾーンに依存せず、確実に日本標準時 (Asia/Tokyo) の要素を取得する
     */
    function getJSTDateTime() {
        const now = new Date();
        
        // 日本時間用のフォーマッター
        const formatter = new Intl.DateTimeFormat('ja-JP', {
            timeZone: 'Asia/Tokyo',
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: false
        });
        
        const dateObj = {};
        formatter.formatToParts(now).forEach(part => {
            if (part.type !== 'literal') {
                dateObj[part.type] = parseInt(part.value, 10);
            }
        });

        // 「明日の日本時間の日付」を安全に取得（現在の絶対時間に24時間を足してフォーマット）
        const tomorrow = new Date(now.getTime() + 24 * 3600000);
        const tomorrowDay = parseInt(new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', day: '2-digit' }).format(tomorrow), 10);

        return {
            year: dateObj.year,
            month: dateObj.month,
            day: dateObj.day,
            hour: dateObj.hour,
            tomorrowDay: tomorrowDay,
            absoluteMs: now.getTime() // 期間比較には絶対的なタイムスタンプを使用
        };
    }

    /**
     * スーパーSALEが期間中（アクティブ）か判定する
     */
    function isSuperSaleJST(jst) {
        if (PROMO_CONFIG.superSale.active) {
            return true;
        }
        // どちらも絶対時間（UTC基準のミリ秒）で比較するため100%安全
        const currentMs = jst.absoluteMs;
        const startMs = new Date(PROMO_CONFIG.superSale.startDate).getTime();
        const endMs = new Date(PROMO_CONFIG.superSale.endDate).getTime();

        return (currentMs >= startMs && currentMs <= endMs);
    }

    /**
     * 5と0のつく日の判定およびステータス（pre / active / none）の取得
     */
    function check50DayStatus(jst) {
        const targetDays = [5, 10, 15, 20, 25, 30];
        
        // 1. 当日判定
        if (targetDays.includes(jst.day)) {
            return { active: true, phase: 'active' };
        }
        
        // 2. 前日フライング判定 (前日の20:00 〜 23:59)
        if (targetDays.includes(jst.tomorrowDay) && jst.hour >= 20) {
            return { active: true, phase: 'pre' };
        }
        
        return { active: false, phase: 'none' };
    }

    /**
     * 現在適用すべきプロモーション種別を決定する（デバッグURLパラメータ対応）
     */
    function getActivePromotion() {
        const urlParams = new URLSearchParams(window.location.search);
        const testPromo = urlParams.get('test_promo');

        // URLパラメータによる強制テストモード
        if (testPromo) {
            if (testPromo === '50' || testPromo === '50_active') return { type: '50', phase: 'active' };
            if (testPromo === '50_pre') return { type: '50', phase: 'pre' };
            if (testPromo === 'supersale') return { type: 'supersale', phase: 'active' };
            if (testPromo === 'normal') return { type: null, phase: null };
        }

        const jst = getJSTDateTime();

        // 1. スーパーSALE
        if (isSuperSaleJST(jst)) {
            return { type: 'supersale', phase: 'active' };
        }

        // 2. 5と0のつく日
        const status50 = check50DayStatus(jst);
        if (status50.active) {
            return { type: '50', phase: status50.phase };
        }

        return { type: null, phase: null };
    }

    /**
     * 現在アクティブなプロモーションに基づき、UI/UXを動的に書き換える
     */
    function applyDynamicPromotions() {
        const promo = getActivePromotion();
        const noticeBarEl = document.getElementById('promo-notice-bar');

        // ----------------------------------------
        // 1. グローバルヘッダー「お知らせプロモーションバー」の描画
        // ----------------------------------------
        if (noticeBarEl) {
            if (!promo.type) {
                noticeBarEl.innerHTML = '';
                noticeBarEl.style.display = 'none';
                document.body.classList.remove('has-promo-bar'); // ボディと固定ヘッダーの押し下げを解除
            } else {
                let titleText = '';
                let linkUrl = '';
                let bannerClass = '';

                if (promo.type === 'supersale') {
                    titleText = PROMO_CONFIG.superSale.title;
                    linkUrl = PROMO_CONFIG.superSale.url;
                    bannerClass = 'promo-banner-supersale';
                } else if (promo.type === '50') {
                    titleText = promo.phase === 'pre' ? PROMO_CONFIG.promo50.pre.title : PROMO_CONFIG.promo50.active.title;
                    linkUrl = PROMO_CONFIG.promo50.url;
                    bannerClass = promo.phase === 'pre' ? 'promo-banner-50-pre' : 'promo-banner-50-active';
                }

                noticeBarEl.innerHTML = `
                    <a href="${linkUrl}" target="_blank" rel="noopener noreferrer" class="promo-banner-bar ${bannerClass}">
                        <i class="fa-solid fa-gift"></i>
                        <span>${titleText}</span>
                        <i class="fa-solid fa-chevron-right" style="font-size: 0.8rem; margin-left: 5px;"></i>
                    </a>`;
                noticeBarEl.style.display = 'block';
                document.body.classList.add('has-promo-bar'); // ボディと固定ヘッダーを綺麗に押し下げる
            }
        }

        // ----------------------------------------
        // 2. 予約ボタン・詳細ボタン上部へのマイクロコピーの動的挿入
        // ----------------------------------------
        if (promo.type) {
            let microcopyText = '';
            let microcopyClass = '';
            let targetUrl = '';

            if (promo.type === 'supersale') {
                microcopyText = PROMO_CONFIG.superSale.micro;
                microcopyClass = 'promo-micro-supersale';
                targetUrl = PROMO_CONFIG.superSale.url;
            } else if (promo.type === '50') {
                microcopyText = promo.phase === 'pre' ? PROMO_CONFIG.promo50.pre.micro : PROMO_CONFIG.promo50.active.micro;
                microcopyClass = promo.phase === 'pre' ? 'promo-micro-50-pre' : 'promo-micro-50-active';
                targetUrl = PROMO_CONFIG.promo50.url;
            }

            // ページ内のすべての予約・詳細アクションボタンを自動検知
            const bookingButtons = document.querySelectorAll('.booking-button, .btn-booking, .cta-button');

            bookingButtons.forEach(btn => {
                // 既にマイクロコピーが挿入済みならスキップ（多重挿入の防止）
                if (btn.previousElementSibling && btn.previousElementSibling.classList.contains('promo-micro-copy')) {
                    return;
                }

                // マイクロコピー要素の作成（クリック可能なリンクに変更してコンバージョン率を最大化）
                const microCopyContainer = document.createElement('a');
                microCopyContainer.className = `promo-micro-copy ${microcopyClass}`;
                microCopyContainer.href = targetUrl;
                microCopyContainer.target = "_blank";
                microCopyContainer.rel = "noopener noreferrer";
                
                // 強調したい箇所のマークアップ（文言調整）
                let formattedText = microcopyText.replace(
                    /(最大20%OFF|半額プラン＆限定クーポン|5と0のつく日クーポン|対象の高級宿・温泉宿|対象施設限定|対象ホテルは要確認)/g, 
                    '<strong>$1</strong>'
                );

                microCopyContainer.innerHTML = `
                    <i class="fa-solid fa-tags"></i>
                    <span>${formattedText}</span>`;
                
                // ボタンの直前に挿入
                btn.parentNode.insertBefore(microCopyContainer, btn);

                // もしスーパーSALE中の場合、アフィリエイトカード自体に特別ボーダーとバッジを適用
                if (promo.type === 'supersale') {
                    const card = btn.closest('.hotel-card');
                    if (card) {
                        card.classList.add('promo-sale-eligible');
                    }
                }
            });

            // ----------------------------------------
            // 3. CTAエリア（.cta-section）直前への巨大プロモーションバナーの挿入
            // ----------------------------------------
            let bannerImgUrl = '';
            let bannerTopMicro = '';
            let bannerTopClass = '';

            if (promo.type === 'supersale') {
                bannerImgUrl = PROMO_CONFIG.superSale.bannerUrl || '';
                bannerTopMicro = '＼ 今すぐ取得してお得に予約！ ／';
                bannerTopClass = 'promo-large-banner-supersale';
            } else if (promo.type === '50') {
                bannerImgUrl = PROMO_CONFIG.promo50.bannerUrl || '';
                bannerTopMicro = promo.phase === 'pre' ? '＼ まもなくクーポン配布！対象施設かチェック ／' : '＼ 5と0のつく日クーポン！（※対象施設限定） ／';
                bannerTopClass = 'promo-large-banner-50';
            }

            if (bannerImgUrl) {
                const ctaSections = document.querySelectorAll('.cta-section');
                ctaSections.forEach(cta => {
                    // 既にバナーが挿入済みならスキップ
                    if (cta.previousElementSibling && cta.previousElementSibling.classList.contains('promo-large-banner-container')) {
                        return;
                    }

                    const bannerContainer = document.createElement('div');
                    bannerContainer.className = `promo-large-banner-container ${bannerTopClass}`;
                    bannerContainer.innerHTML = `
                        <div class="promo-large-banner-micro">${bannerTopMicro}</div>
                        <a href="${targetUrl}" target="_blank" rel="noopener noreferrer" class="promo-large-banner-link">
                            <img src="${bannerImgUrl}" alt="楽天トラベル キャンペーンバナー" class="promo-large-banner-img">
                        </a>
                    `;

                    // .cta-section の直前に挿入
                    cta.parentNode.insertBefore(bannerContainer, cta);
                });
            }
        }
    }

    // 初回読み込み完了時にプロモーションを動的適用
    applyDynamicPromotions();

    // ブラウザの開発者コンソール等から手動でテスト・実行できるようにグローバルスコープへ露出
    window.applyDynamicPromotions = applyDynamicPromotions;
});
