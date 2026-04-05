document.addEventListener('DOMContentLoaded', () => {
    const APP_ID = '2d0fb5d11e725c9ab3b42cf9f5bca085';
    const AFFILIATE_ID = '047ad0f1.183c70cf.047ad0f2.1e4c3769';
    
    // API Request parameters
    const API_URL = 'https://app.rakuten.co.jp/services/api/Travel/SimpleHotelSearch/20170426';
    const PARAMS = new URLSearchParams({
        applicationId: APP_ID,
        affiliateId: AFFILIATE_ID,
        format: 'json',
        largeClassCode: 'japan',
        middleClassCode: 'hukuoka', // APIではhukuoka
        smallClassCode: 'fukuoka', // 博多・福岡市周辺を中心とする
        sort: '+roomCharge' // 最安値順
    });

    const loadingEl = document.getElementById('loading');
    const containerEl = document.getElementById('hotels-container');
    const errorEl = document.getElementById('error-message');

    const ladiesLoadingEl = document.getElementById('ladies-loading');
    const ladiesContainerEl = document.getElementById('ladies-hotels-container');
    const ladiesErrorEl = document.getElementById('ladies-error-message');

    // Fetch Regular Deals (Top 5)
    fetch(`${API_URL}?${PARAMS.toString()}`)
        .then(response => {
            if (!response.ok) throw new Error('ネットワークエラー');
            return response.json();
        })
        .then(data => {
            loadingEl.style.display = 'none';
            if (data.hotels && data.hotels.length > 0) {
                const top5Hotels = data.hotels.slice(0, 5);
                renderHotels(top5Hotels, containerEl);
            } else {
                showError(errorEl, '条件に一致するホテルが見つかりませんでした。');
            }
        })
        .catch(error => {
            console.error('Fetch error:', error);
            loadingEl.style.display = 'none';
            showError(errorEl);
        });

    // Fetch Ladies Plan (Top 5)
    const LADIES_API_URL = 'https://app.rakuten.co.jp/services/api/Travel/KeywordHotelSearch/20170426';
    const LADIES_PARAMS = new URLSearchParams({
        applicationId: APP_ID,
        affiliateId: AFFILIATE_ID,
        format: 'json',
        keyword: 'レディース',
        middleClassCode: 'hukuoka', // 福岡県
        smallClassCode: 'fukuoka' // 福岡市周辺を優先
    });

    fetch(`${LADIES_API_URL}?${LADIES_PARAMS.toString()}`)
        .then(response => {
            if (!response.ok) throw new Error('ネットワークエラー');
            return response.json();
        })
        .then(data => {
            ladiesLoadingEl.style.display = 'none';
            if (data.hotels && data.hotels.length > 0) {
                renderHotels(data.hotels.slice(0, 5), ladiesContainerEl);
            } else {
                showError(ladiesErrorEl, '条件に一致するホテルが見つかりませんでした。');
            }
        })
        .catch(error => {
            console.error('Fetch error:', error);
            ladiesLoadingEl.style.display = 'none';
            showError(ladiesErrorEl);
        });

    function showError(element, msg = '情報の取得に失敗しました。後でもう一度お試しください。') {
        const p = element.querySelector('p');
        if (p) p.textContent = msg;
        element.style.display = 'block';
    }

    function renderHotels(hotels, container) {
        hotels.forEach((hotelData, index) => {
            const info = hotelData.hotel[0].hotelBasicInfo;
            
            const card = document.createElement('div');
            card.className = 'hotel-card';
            
            const priceLabel = info.hotelMinCharge 
                ? Number(info.hotelMinCharge).toLocaleString() 
                : '---';

            const targetUrl = info.affiliateUrl || info.hotelInformationUrl;
            const imageUrl = info.hotelImageUrl || 'https://via.placeholder.com/400x300/1e293b/94a3b8?text=No+Image';

            // Review Info
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
                    <div class="hotel-address">
                        <i class="fa-solid fa-location-dot"></i>
                        <span>${info.address1}${info.address2}</span>
                    </div>

                    <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 0.8rem;">
                        <span class="transit-badge" title="博多駅からの移動時間"><i class="fa-regular fa-clock"></i> 博多から${transit.time}</span>
                        <span class="fare-badge" title="博多からの交通費目安"><i class="fa-solid fa-yen-sign"></i> ${transit.fare}</span>
                    </div>
                    
                    <div class="hotel-price">
                        <span style="font-size: 0.9rem">最安料金:</span> 
                        <span class="price-amount">¥${priceLabel}</span>
                        <span style="font-size: 0.9rem">~ /泊</span>
                    </div>

                    <div class="review-widget">
                        <div class="review-stars">${starsHtml}</div>
                        <div class="review-score">${reviewAvg !== '---' ? reviewAvg : ''}</div>
                        <div class="review-count">(${reviewCount}件の口コミ)</div>
                    </div>
                    
                    <a href="${targetUrl}" target="_blank" rel="noopener noreferrer" class="booking-button">
                        詳細・予約を見る
                    </a>
                </div>
            `;
            
            container.appendChild(card);
        });
    }

    function getTransitInfo(station) {
        if (!station) return { time: '不明', fare: '不明' };
        
        const s = station.toLowerCase();
        if (s.includes('博多')) {
            return { time: '徒歩 5分', fare: '0円' };
        } else if (s.includes('中洲') || s.includes('中洲川端')) {
            return { time: '地下鉄 5分 + 徒歩5分', fare: '210円' };
        } else if (s.includes('天神')) {
            return { time: '地下鉄 6分 + 徒歩3分', fare: '210円' };
        } else if (s.includes('祇園')) {
             return { time: '徒歩 12分 (地下鉄1分)', fare: '0円 / 210円' };
        } else if (s.includes('呉服町')) {
            return { time: 'バス 10分', fare: '150円' };
        } else if (s.includes('渡辺通') || s.includes('薬院')) {
            return { time: 'バス 15分', fare: '150円' };
        } else {
            return { time: 'バス/電車 約15分〜', fare: '210円〜' };
        }
    }

    // Smooth scroll behavior for internal links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
});
