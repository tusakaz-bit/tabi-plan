document.addEventListener('DOMContentLoaded', () => {
    const APP_ID = '2d0fb5d11e725c9ab3b42cf9f5bca085';
    const AFFILIATE_ID = '047ad0f1.183c70cf.047ad0f2.1e4c3769';
    
    const isOsaka = window.location.pathname.includes('osaka');

    // API Request parameters
    const API_URL = 'https://app.rakuten.co.jp/services/api/Travel/SimpleHotelSearch/20170426';
    const parsedParams = {
        applicationId: APP_ID,
        affiliateId: AFFILIATE_ID,
        format: 'json',
        largeClassCode: 'japan',
        middleClassCode: isOsaka ? 'osaka' : 'hukuoka', // 大阪か福岡か
        smallClassCode: isOsaka ? 'shi' : 'fukuoka',    // 大阪市または福岡市
        sort: '+roomCharge' // 最安値順
    };
    if (isOsaka) {
        parsedParams.detailClassCode = 'D'; // なんば・天王寺・心斎橋（尼崎を除外し、取得エラーを防ぐ）
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
            middleClassCode: isOsaka ? 'osaka' : 'hukuoka',
            smallClassCode: isOsaka ? 'shi' : 'fukuoka'
        };
        if (isOsaka) p.detailClassCode = 'D';
        return new URLSearchParams(p).toString();
    }

    // 都市名プレフィックス
    const cityPrefix = isOsaka ? '大阪' : '博多';

    // 住所フィルタ
    const cityName = isOsaka ? '大阪市' : '福岡市';
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
        middleClassCode: isOsaka ? 'osaka' : 'hukuoka',
        smallClassCode: isOsaka ? 'shi' : 'fukuoka',
        sort: '-roomCharge'
    });
    if (isOsaka) luxuryParams.append('detailClassCode', 'D');

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
        const baseStation = isOsaka ? '大阪・梅田' : '博多';
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
    }

    function getTransitInfo(station) {
        if (!station) return { time: '不明', fare: '不明' };
        const s = station.toLowerCase();
        if (isOsaka) {
            if (s.includes('大阪') || s.includes('梅田')) return { time: '徒歩 5分', fare: '0円' };
            if (s.includes('なんば') || s.includes('難波') || s.includes('心斎橋')) return { time: '地下鉄 約10分', fare: '240円' };
            if (s.includes('天王寺')) return { time: '電車 約15分', fare: '200円' };
            if (s.includes('新大阪')) return { time: '電車 約5分', fare: '170円' };
            return { time: '電車/地下鉄 約15分〜', fare: '200円〜' };
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
});
