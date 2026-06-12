document.addEventListener('DOMContentLoaded', () => {
    const APP_ID = 'ecc263bd-2573-4a88-933e-159e08ff4fff';
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
            endDate: "2026-06-11T23:59:59+09:00",   // 終了JST
            title: "＼年に数回のビッグチャンス！／ 楽天トラベル スーパーSALE 開催中！半額プラン＆限定クーポン多数！",
            micro: "＼年に数回のビッグチャンス！／ 楽天トラベル スーパーSALE 開催中！半額プラン＆限定クーポン多数！",
            url: `https://hb.afl.rakuten.co.jp/hgc/${AFFILIATE_ID}/?pc=https%3A%2F%2Ftravel.rakuten.co.jp%2Fspecial%2Fsupersale%2F`,
            // Tabi PlanオリジナルのスーパーSALE用バナー画像（imagesフォルダに配置済み）
            bannerUrl: "../images/promo-supersale-banner.png"
        }
    };

    // ==========================================
    // 静的表示切り替えロジック (SSG移行に伴う軽量化)
    // ==========================================
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContainers = {
        deals: document.getElementById('hotels-container-deals'),
        ladies: document.getElementById('hotels-container-ladies'),
        couple: document.getElementById('hotels-container-couple'),
        luxury: document.getElementById('hotels-container-luxury'),
        station: document.getElementById('hotels-container-station')
    };

    function switchTab(selectedTab) {
        if (!selectedTab) return;
        
        // タブボタンのアクティブ状態切り替え
        tabButtons.forEach(btn => {
            if (btn.getAttribute('data-tab') === selectedTab) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // ホテルコンテナの表示/非表示切り替え
        for (const [tabKey, container] of Object.entries(tabContainers)) {
            if (container) {
                if (tabKey === selectedTab) {
                    container.style.display = 'grid';
                } else {
                    container.style.display = 'none';
                }
            }
        }
    }

    tabButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const selectedTab = e.currentTarget.getAttribute('data-tab');
            switchTab(selectedTab);
        });
    });

    document.querySelectorAll('.hero-cat-tag').forEach(tag => {
        tag.addEventListener('click', () => {
            const selectedTab = tag.getAttribute('data-tab');
            switchTab(selectedTab);
            const hotelsSection = document.getElementById('hotels');
            if (hotelsSection) {
                hotelsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // ==========================================
    // スムーススクロール & ナビゲーション
    // ==========================================
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
        // クーポン表示非アクティブ時の余白・固定位置の完全リセット処理
        const resetPromoSpacing = () => {
            if (noticeBarEl) {
                noticeBarEl.innerHTML = '';
                noticeBarEl.style.display = 'none';
            }
            document.body.classList.remove('has-promo-bar');
            document.body.style.removeProperty('padding-top');
            
            const fixedElements = document.querySelectorAll('.header, header, .fixed-top, .sticky-header, .nav-container');
            fixedElements.forEach(el => {
                el.style.removeProperty('top');
            });
        };

        // ----------------------------------------
        // 1. グローバルヘッダー「お知らせプロモーションバー」の描画
        // ----------------------------------------
        if (noticeBarEl && promo.type) {
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
                    <i class="fa-solid fa-chevron-right" style="font-size: 0.8rem; margin-left: 5px; flex-shrink: 0;"></i>
                </a>`;
            noticeBarEl.style.display = 'block';
            document.body.classList.add('has-promo-bar');
            
            // バーの高さをリアルタイムに計測して他の要素を押し下げる関数
            const adjustSpacing = () => {
                if (!document.body.classList.contains('has-promo-bar')) return;
                const barHeight = noticeBarEl.offsetHeight;
                document.body.style.setProperty('padding-top', `${barHeight}px`, 'important');
                
                // 固定配置されたヘッダー要素を自動検知して押し下げる
                const fixedElements = document.querySelectorAll('.header, header, .fixed-top, .sticky-header, .nav-container');
                fixedElements.forEach(el => {
                    el.style.setProperty('top', `${barHeight}px`, 'important');
                });
            };
            
            // DOMへの反映と画像のロード時間などを考慮して少し待って実行
            setTimeout(adjustSpacing, 50);
            window.addEventListener('resize', adjustSpacing);
            window.addEventListener('orientationchange', adjustSpacing);
        } else {
            resetPromoSpacing();
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
