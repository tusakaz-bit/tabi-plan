const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://tabi-plan.org';
const PUBLIC_ROOT = path.resolve(__dirname, '..');
const EN_OUTPUT_ROOT = path.join(PUBLIC_ROOT, 'en');
const SITEMAP_PATH = path.join(PUBLIC_ROOT, 'sitemap.xml');
const EN_HOTELS_PATH = path.join(__dirname, 'en_hotels.json');
const EN_GUIDES_PATH = path.join(__dirname, 'en_guides_config.json');
const EN_GUIDE_TEMPLATE_PATH = path.join(__dirname, 'themes/en_guide_template.html');
const HEADER_EN_PATH = path.join(__dirname, 'themes/partials/header_en.html');
const FOOTER_EN_PATH = path.join(__dirname, 'themes/partials/footer_en.html');

/**
 * 外資OTAボタンのブランドカラー・表示ラベル定義
 */
const OTA_BUTTON_STYLES = {
    booking: {
        label: 'Check Booking.com',
        bgColor: '#003580',
        textColor: '#ffffff',
        icon: 'fa-solid fa-hotel'
    },
    agoda: {
        label: 'Check Agoda',
        bgColor: '#E12D2D',
        textColor: '#ffffff',
        icon: 'fa-solid fa-tag'
    },
    expedia: {
        label: 'Check Expedia',
        bgColor: '#00355F',
        textColor: '#FFCB00',
        icon: 'fa-solid fa-plane-departure'
    },
    tripcom: {
        label: 'Check Trip.com',
        bgColor: '#287DFA',
        textColor: '#ffffff',
        icon: 'fa-solid fa-suitcase-rolling'
    }
};

/**
 * URLパスを正規化する（先頭と末尾のスラッシュを保証、二重スラッシュを除去）
 */
function normalizeUrlPath(rawPath) {
    if (!rawPath || typeof rawPath !== 'string') return '/';
    const trimmed = rawPath.trim().replace(/^\/+|\/+$/g, '');
    return trimmed ? `/${trimmed}/` : '/';
}

/**
 * 英語専用の共通パーツ（header_en.html / footer_en.html）を読み込む
 */
function loadEnPartials() {
    if (!fs.existsSync(HEADER_EN_PATH) || !fs.existsSync(FOOTER_EN_PATH)) {
        throw new Error('[Partial Error] header_en.html または footer_en.html が見つかりません。');
    }
    return {
        headerTemplate: fs.readFileSync(HEADER_EN_PATH, 'utf8'),
        footerHtml: fs.readFileSync(FOOTER_EN_PATH, 'utf8')
    };
}

/**
 * 英語ページ用の canonical および hreflang メタタグを生成する
 * - jaEquivalentPath が存在する場合: hreflang="ja", hreflang="en", canonical を出力
 * - jaEquivalentPath が null または空の場合: 自己参照 canonical のみを出力（hreflangは出力しない）
 */
function buildEnSeoMetaTags(enPath, jaEquivalentPath) {
    const normalizedEnPath = normalizeUrlPath(enPath);
    const canonicalUrl = `${BASE_URL}${normalizedEnPath}`;

    const tags = [
        `<link rel="canonical" href="${canonicalUrl}">`
    ];

    if (jaEquivalentPath && typeof jaEquivalentPath === 'string' && jaEquivalentPath.trim() !== '') {
        const normalizedJaPath = normalizeUrlPath(jaEquivalentPath);
        const jaUrl = `${BASE_URL}${normalizedJaPath}`;

        tags.push(`<link rel="alternate" hreflang="ja" href="${jaUrl}">`);
        tags.push(`<link rel="alternate" hreflang="en" href="${canonicalUrl}">`);
    }

    return {
        canonicalUrl,
        metaTagsHtml: tags.join('\n    ')
    };
}

/**
 * 出力先が必ず /en/ 配下であることを保証してHTMLファイルを書き出す（日本語ページの上書き防止ガード）
 */
function writeEnHtmlSafely(relativeEnPath, htmlContent) {
    const cleanRelPath = (relativeEnPath || '').replace(/^\/+|\/+$/g, '');
    const targetDir = cleanRelPath ? path.resolve(EN_OUTPUT_ROOT, cleanRelPath) : EN_OUTPUT_ROOT;

    if (targetDir !== EN_OUTPUT_ROOT && !targetDir.startsWith(EN_OUTPUT_ROOT + path.sep)) {
        throw new Error(`[Security/SEO Guard] 出力先が /en/ 配下ではありません: ${targetDir}`);
    }

    if (!/<html\b[^>]*\blang=["']en["'][^>]*>/i.test(htmlContent)) {
        throw new Error(`[SEO Guard] 英語ページに <html lang="en"> が設定されていません: ${cleanRelPath || '/'}`);
    }

    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }

    const outputFile = path.join(targetDir, 'index.html');
    fs.writeFileSync(outputFile, htmlContent, 'utf8');
    console.log(`✅ Generated EN page -> /en/${cleanRelPath ? cleanRelPath + '/' : ''}index.html`);
}

/**
 * 共通レイアウト（ヘッダー・フッター・SEOタグ）を適用してHTMLを完成させる汎用レンダラー
 */
function renderEnPage({ enPath, jaEquivalentPath, title, metaDescription, ogImage, heroBgImage, mainContentHtml }) {
    const templateHtml = fs.readFileSync(EN_GUIDE_TEMPLATE_PATH, 'utf8');
    const { headerTemplate, footerHtml } = loadEnPartials();
    const { canonicalUrl, metaTagsHtml } = buildEnSeoMetaTags(enPath, jaEquivalentPath);

    const jaSwitchUrl = (jaEquivalentPath && typeof jaEquivalentPath === 'string' && jaEquivalentPath.trim() !== '')
        ? normalizeUrlPath(jaEquivalentPath)
        : '/';
    const headerHtml = headerTemplate.split('{{JA_SWITCH_URL}}').join(jaSwitchUrl);

    const replacements = {
        '{{SEO_META_TAGS}}': metaTagsHtml,
        '{{CANONICAL_URL}}': canonicalUrl,
        '{{PAGE_TITLE}}': title,
        '{{META_DESCRIPTION}}': metaDescription || '',
        '{{OG_IMAGE}}': ogImage || `${BASE_URL}/bg_tokyo_new.jpg`,
        '{{HERO_BG_IMAGE}}': heroBgImage || "url('/bg_tokyo_new.jpg')",
        '{{HEADER}}': headerHtml,
        '{{MAIN_CONTENT}}': mainContentHtml || '',
        '{{FOOTER}}': footerHtml
    };

    let finalHtml = templateHtml;
    for (const [token, value] of Object.entries(replacements)) {
        finalHtml = finalHtml.split(token).join(value);
    }

    return finalHtml;
}

/**
 * enabled: true かつ有効なURLを持つOTAボタンHTMLを生成する
 */
function renderOtaButtons(otaLinks) {
    if (!otaLinks || typeof otaLinks !== 'object') return '';

    const buttonsHtml = Object.entries(otaLinks)
        .filter(([, config]) => {
            return config && config.enabled === true && typeof config.url === 'string' && config.url.trim() !== '';
        })
        .map(([provider, config]) => {
            const style = OTA_BUTTON_STYLES[provider] || {
                label: `Check ${provider}`,
                bgColor: '#334155',
                textColor: '#ffffff',
                icon: 'fa-solid fa-arrow-up-right-from-square'
            };

            return `
                <a href="${config.url}"
                   target="_blank"
                   rel="sponsored noopener noreferrer"
                   style="flex: 1 1 180px; display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; min-height: 46px; padding: 0.7rem 1rem; background-color: ${style.bgColor}; color: ${style.textColor}; border-radius: 8px; font-weight: 700; font-size: 0.92rem; text-decoration: none; box-shadow: 0 2px 8px rgba(0,0,0,0.12); transition: opacity 0.2s;">
                    <i class="${style.icon}"></i>
                    <span>${style.label}</span>
                    <i class="fa-solid fa-arrow-up-right-from-square" style="font-size: 0.75rem; opacity: 0.85;"></i>
                </a>`;
        })
        .join('');

    if (!buttonsHtml) {
        return `<p style="font-size: 0.85rem; color: #64748b; margin: 1rem 0 0;">Availability links updating soon.</p>`;
    }

    return `
        <div class="en-ota-buttons" style="display: flex; flex-wrap: wrap; gap: 0.75rem; margin-top: 1.25rem;">
            ${buttonsHtml}
        </div>`;
}

/**
 * 1件分の英語ホテルカードHTMLを生成する
 */
function renderHotelCard(hotel) {
    const en = hotel.en || {};
    const rating = hotel.rating || {};
    const media = hotel.media || {};
    const priceEst = en.priceEstimate || {};

    const highlightsHtml = Array.isArray(en.highlights) && en.highlights.length > 0
        ? `<div style="display: flex; flex-wrap: wrap; gap: 0.45rem; margin: 0.75rem 0;">
            ${en.highlights.map(tag => `<span style="background: rgba(144, 180, 206, 0.18); color: #1e293b; font-size: 0.78rem; font-weight: 600; padding: 0.25rem 0.6rem; border-radius: 999px;">${tag}</span>`).join('')}
           </div>`
        : '';

    const priceHtml = priceEst.minJpy
        ? `<div style="font-size: 0.95rem; font-weight: 700; color: #dc2626;">
            From ¥${Number(priceEst.minJpy).toLocaleString()}
            ${priceEst.approxUsd ? `<span style="font-size: 0.82rem; color: #475569; font-weight: 500;"> (approx. $${priceEst.approxUsd}/night)</span>` : ''}
           </div>`
        : '';

    const ratingHtml = rating.score
        ? `<div style="font-size: 0.88rem; font-weight: 700; color: #d97706;">
            <i class="fa-solid fa-star"></i> ${rating.score}
            ${rating.reviewCount ? `<span style="color: #64748b; font-weight: 400;">(${Number(rating.reviewCount).toLocaleString()} reviews)</span>` : ''}
           </div>`
        : '';

    const imageHtml = media.imagePath
        ? `<div style="width: 100%; height: 220px; overflow: hidden; border-radius: 12px 12px 0 0; background: #e2e8f0;">
            <img src="${media.imagePath}" alt="${media.imageAlt || en.name || 'Hotel photo'}" loading="lazy" style="width: 100%; height: 100%; object-fit: cover; display: block;">
           </div>`
        : '';

    const otaButtonsHtml = renderOtaButtons(hotel.otaLinks);

    return `
        <article class="glass-container en-hotel-card" style="padding: 0; overflow: hidden; display: flex; flex-direction: column; text-align: left;">
            ${imageHtml}
            <div style="padding: 1.5rem; display: flex; flex-direction: column; flex: 1;">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.5rem;">
                    <span style="font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #3b82f6;">
                        <i class="fa-solid fa-location-dot"></i> ${hotel.area || hotel.city || 'Japan'}
                    </span>
                    ${ratingHtml}
                </div>

                <h3 style="font-size: 1.25rem; font-weight: 800; color: #0f172a; margin: 0 0 0.4rem; line-height: 1.35;">
                    ${en.name || hotel.id}
                </h3>

                ${en.catchcopy ? `<p style="font-size: 0.9rem; font-weight: 600; color: #334155; margin: 0 0 0.75rem; line-height: 1.5;">${en.catchcopy}</p>` : ''}

                ${en.access ? `<p style="font-size: 0.85rem; color: #475569; margin: 0 0 0.5rem;"><i class="fa-solid fa-train" style="color: #90B4CE;"></i> ${en.access}</p>` : ''}

                ${priceHtml}
                ${highlightsHtml}

                <p style="font-size: 0.95rem; color: #334155; line-height: 1.7; margin: 0.75rem 0 0; flex: 1;">
                    ${en.description || ''}
                </p>

                ${otaButtonsHtml}
            </div>
        </article>`;
}

/**
 * トップページ（/en/）に表示する公開済みガイド一覧カードHTMLを生成する
 */
function buildEnGuidesGridHtml() {
    if (!fs.existsSync(EN_GUIDES_PATH)) return '';
    const guidesConfig = JSON.parse(fs.readFileSync(EN_GUIDES_PATH, 'utf8'));

    const cards = Object.entries(guidesConfig).map(([key, guide]) => {
        const slug = guide.slug || key;
        const title = guide.hero?.h1 || guide.seo?.title || slug;
        const subtitle = guide.hero?.subtitle || guide.seo?.metaDescription || '';
        const cityLabel = (guide.city || 'Japan').toUpperCase();

        return `
            <a href="/en/guides/${slug}/" class="glass-container" style="display: block; padding: 1.5rem; text-decoration: none; color: inherit; text-align: left; transition: transform 0.2s;">
                <span style="display: inline-block; font-size: 0.75rem; font-weight: 700; color: #3b82f6; letter-spacing: 0.06em; margin-bottom: 0.5rem;">
                    ${cityLabel} GUIDE
                </span>
                <h3 style="font-size: 1.15rem; font-weight: 800; color: #0f172a; margin: 0 0 0.5rem; line-height: 1.4;">${title}</h3>
                <p style="font-size: 0.9rem; color: #475569; line-height: 1.6; margin: 0 0 1rem;">${subtitle}</p>
                <span style="font-size: 0.88rem; font-weight: 700; color: #0284c7;">
                    Read Guide <i class="fa-solid fa-arrow-right"></i>
                </span>
            </a>`;
    }).join('');

    return cards || '<p style="color: #475569;">New city hotel guides are coming soon.</p>';
}

/**
 * 英語固定ページ（/en/, /en/about/, /en/privacy/）の定義一覧
 */
const STATIC_EN_PAGES = [
    {
        outputDir: '',
        enPath: '/en/',
        sitemapPriority: '0.9',
        sitemapChangefreq: 'weekly',
        title: 'TABI-PLAN | Curated Clean & High-Value Hotels Across Japan',
        metaDescription: 'Discover handpicked, clean, and well-located hotels in Tokyo, Kyoto, Osaka, Fukuoka, and Sapporo. Independent travel guides for international visitors to Japan.',
        jaEquivalentPath: null,
        heroBgImage: "url('/bg_tokyo_new.jpg')",
        getMainContentHtml: () => {
            const guidesGridHtml = buildEnGuidesGridHtml();
            return `
            <section class="niche-hero" style="padding: 8rem 5% 3.5rem; text-align: center;">
                <div class="container">
                    <h1 class="niche-title" style="margin-bottom: 1rem;">Find Your Ideal Stay in Japan</h1>
                    <p style="color: rgba(255,255,255,0.9); max-width: 720px; margin: 0 auto 2rem; font-size: 1.05rem; line-height: 1.7;">
                        Handpicked clean, safe, and station-adjacent hotels across Japan—curated with local insight for international travelers.
                    </p>
                    <div style="display: flex; justify-content: center; flex-wrap: wrap; gap: 0.75rem;">
                        <a href="#guides" style="background: #ffffff; color: #0f172a; padding: 0.75rem 1.5rem; border-radius: 999px; font-weight: 700; text-decoration: none;">
                            Explore Hotel Guides
                        </a>
                        <a href="/en/about/" style="background: rgba(255,255,255,0.18); color: #ffffff; border: 1px solid rgba(255,255,255,0.4); padding: 0.75rem 1.5rem; border-radius: 999px; font-weight: 600; text-decoration: none;">
                            How We Curate
                        </a>
                    </div>
                </div>
            </section>

            <section id="areas" style="padding: 1rem 0 2rem;">
                <div class="container" style="max-width: 1100px; padding: 0 15px;">
                    <h2 style="font-size: 1.4rem; color: #0f172a; margin-bottom: 1.25rem; text-align: left;">Popular Destinations in Japan</h2>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem;">
                        <a href="#guides" class="glass-container" style="padding: 1.25rem; text-decoration: none; color: inherit; text-align: left;">
                            <h3 style="margin: 0 0 0.35rem; color: #0f172a;">Tokyo</h3>
                            <p style="margin: 0; font-size: 0.88rem; color: #475569;">Shinjuku, Shibuya, Tokyo Station &amp; Asakusa</p>
                        </a>
                        <a href="#guides" class="glass-container" style="padding: 1.25rem; text-decoration: none; color: inherit; text-align: left;">
                            <h3 style="margin: 0 0 0.35rem; color: #0f172a;">Kyoto</h3>
                            <p style="margin: 0; font-size: 0.88rem; color: #475569;">Kyoto Station, Kawaramachi &amp; Gion</p>
                        </a>
                        <a href="#guides" class="glass-container" style="padding: 1.25rem; text-decoration: none; color: inherit; text-align: left;">
                            <h3 style="margin: 0 0 0.35rem; color: #0f172a;">Osaka</h3>
                            <p style="margin: 0; font-size: 0.88rem; color: #475569;">Namba, Shinsaibashi &amp; Shin-Osaka</p>
                        </a>
                        <a href="#guides" class="glass-container" style="padding: 1.25rem; text-decoration: none; color: inherit; text-align: left;">
                            <h3 style="margin: 0 0 0.35rem; color: #0f172a;">Fukuoka</h3>
                            <p style="margin: 0; font-size: 0.88rem; color: #475569;">Hakata &amp; Tenjin</p>
                        </a>
                        <a href="#guides" class="glass-container" style="padding: 1.25rem; text-decoration: none; color: inherit; text-align: left;">
                            <h3 style="margin: 0 0 0.35rem; color: #0f172a;">Sapporo</h3>
                            <p style="margin: 0; font-size: 0.88rem; color: #475569;">Sapporo Station &amp; Susukino</p>
                        </a>
                    </div>
                </div>
            </section>

            <section id="guides" style="padding: 1.5rem 0 4rem;">
                <div class="container" style="max-width: 1100px; padding: 0 15px;">
                    <h2 style="font-size: 1.4rem; color: #0f172a; margin-bottom: 1.25rem; text-align: left;">Featured Hotel Guides</h2>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(290px, 1fr)); gap: 1.25rem;">
                        ${guidesGridHtml}
                    </div>
                </div>
            </section>`;
        }
    },
    {
        outputDir: 'about',
        enPath: '/en/about/',
        sitemapPriority: '0.5',
        sitemapChangefreq: 'monthly',
        title: 'About Us | TABI-PLAN',
        metaDescription: 'About TABI-PLAN, an independent travel and hotel curation guide for visitors to Japan.',
        jaEquivalentPath: null,
        heroBgImage: "url('/bg_tokyo_new.jpg')",
        mainContentHtml: `
        <section class="niche-hero" style="padding: 7rem 5% 2.5rem; text-align: center;">
            <div class="container">
                <div class="breadcrumbs" style="max-width: 900px; margin: 0 auto 1.5rem; text-align: left; font-size: 0.85rem;">
                    <a href="/en/">Home</a> <i class="fa-solid fa-chevron-right" style="font-size: 0.6rem; margin: 0 0.5rem;"></i>
                    <span>About Us</span>
                </div>
                <h1 class="niche-title" style="margin-bottom: 0.75rem;">About TABI-PLAN</h1>
                <p style="color: rgba(255,255,255,0.85); max-width: 720px; margin: 0 auto;">Independent Japan Hotel &amp; Travel Curation Guide</p>
            </div>
        </section>

        <section style="padding: 1rem 0 4rem;">
            <div class="container" style="max-width: 900px; padding: 0 15px;">
                <article class="glass-container" style="padding: 2rem; text-align: left; line-height: 1.75; font-size: 16px; color: #334155;">
                    <p style="margin-bottom: 1.5rem;">
                        Welcome to <strong>TABI-PLAN</strong> (<a href="https://tabi-plan.org/" style="color: #0284c7; text-decoration: none;">https://tabi-plan.org/</a>), an independent travel and hotel curation guide dedicated to helping travelers discover comfortable, convenient, and well-located accommodations across Japan.
                    </p>

                    <h2 style="font-size: 1.3rem; font-weight: 700; color: #0f172a; margin: 1.75rem 0 0.75rem;">Our Mission</h2>
                    <p style="margin-bottom: 1.5rem;">
                        Planning a trip to Japan involves navigating thousands of hotel options, complex transit hubs, and varying local amenities. Our mission is to simplify accommodation research by curating reliable hotels based on practical criteria that matter most to travelers—such as station proximity, cleanliness, security, luggage convenience, and overall value.
                    </p>

                    <h2 style="font-size: 1.3rem; font-weight: 700; color: #0f172a; margin: 1.75rem 0 0.75rem;">What We Cover</h2>
                    <ul style="padding-left: 1.5rem; margin: 0 0 1.5rem;">
                        <li style="margin-bottom: 0.6rem;"><strong>Station-Front &amp; Transit-Friendly Hotels:</strong> Carefully selected accommodations near major bullet train (Shinkansen) hubs and subway stations in cities like Tokyo, Kyoto, Osaka, Fukuoka, and Sapporo.</li>
                        <li style="margin-bottom: 0.6rem;"><strong>Curated Area Guides:</strong> Neighborhood breakdowns designed for solo travelers, couples, families, and business visitors.</li>
                        <li style="margin-bottom: 0.6rem;"><strong>Practical Travel Insights:</strong> Clear highlights on room amenities, nearby dining and convenience stores, and access from major airports.</li>
                    </ul>

                    <h2 style="font-size: 1.3rem; font-weight: 700; color: #0f172a; margin: 1.75rem 0 0.75rem;">Editorial Independence</h2>
                    <p style="margin-bottom: 1.5rem;">
                        All hotel selections and travel guides on TABI-PLAN are researched and compiled from a local perspective in Japan. While we participate in affiliate marketing programs to support the ongoing operation of this website, our editorial recommendations are based on location utility, guest convenience, and verified facility features.
                    </p>

                    <h2 style="font-size: 1.3rem; font-weight: 700; color: #0f172a; margin: 1.75rem 0 0.75rem;">Contact Us</h2>
                    <p style="margin-bottom: 0.75rem;">
                        If you have questions regarding our travel guides, partnership inquiries, or website feedback, please reach out to us at:
                    </p>
                    <ul style="padding-left: 1.5rem; margin: 0;">
                        <li style="margin-bottom: 0.4rem;"><strong>Website:</strong> <a href="https://tabi-plan.org/" style="color: #0284c7; text-decoration: none;">https://tabi-plan.org/</a></li>
                        <li><strong>Email:</strong> <a href="mailto:tusakaz+tabi@gmail.com" style="color: #0284c7; text-decoration: none;">tusakaz+tabi@gmail.com</a></li>
                    </ul>
                </article>
            </div>
        </section>`
    },
    {
        outputDir: 'privacy',
        enPath: '/en/privacy/',
        sitemapPriority: '0.3',
        sitemapChangefreq: 'monthly',
        title: 'Privacy Policy & Affiliate Disclosure | TABI-PLAN',
        metaDescription: 'Privacy policy and affiliate disclosure for TABI-PLAN.',
        jaEquivalentPath: null,
        heroBgImage: "url('/bg_tokyo_new.jpg')",
        mainContentHtml: `
        <section class="niche-hero" style="padding: 7rem 5% 2.5rem; text-align: center;">
            <div class="container">
                <div class="breadcrumbs" style="max-width: 900px; margin: 0 auto 1.5rem; text-align: left; font-size: 0.85rem;">
                    <a href="/en/">Home</a> <i class="fa-solid fa-chevron-right" style="font-size: 0.6rem; margin: 0 0.5rem;"></i>
                    <span>Privacy Policy &amp; Affiliate Disclosure</span>
                </div>
                <h1 class="niche-title" style="margin-bottom: 0.75rem;">Privacy Policy &amp; Affiliate Disclosure</h1>
                <p style="color: rgba(255,255,255,0.85); max-width: 720px; margin: 0 auto;">Transparency, Data Usage, and Partner Disclosures</p>
            </div>
        </section>

        <section style="padding: 1rem 0 4rem;">
            <div class="container" style="max-width: 900px; padding: 0 15px;">
                <article class="glass-container" style="padding: 2rem; text-align: left; line-height: 1.75; font-size: 16px; color: #334155;">
                    <p style="margin-bottom: 1rem;"><strong>Last Updated:</strong> November 2026</p>
                    <p style="margin-bottom: 1.5rem;">
                        At <strong>TABI-PLAN</strong> (<a href="https://tabi-plan.org/" style="color: #0284c7; text-decoration: none;">https://tabi-plan.org/</a>), we respect your privacy and are committed to transparency regarding how information is collected and how this website is funded.
                    </p>

                    <h2 style="font-size: 1.3rem; font-weight: 700; color: #0f172a; margin: 1.75rem 0 0.75rem;">1. Affiliate Disclosure</h2>
                    <p style="margin-bottom: 1rem;">
                        TABI-PLAN participates in various affiliate marketing programs, including <strong>Impact.com, Booking.com, Agoda, Expedia, Trip.com, Awin</strong>, and other travel partner networks.
                    </p>
                    <p style="margin-bottom: 1.5rem;">
                        This means that some of the links to hotels, travel services, and booking platforms on this website are affiliate links. If you click on an affiliate link and complete a reservation or purchase, we may earn a small commission <strong>at no additional cost to you</strong>. These commissions help us maintain the site and continue providing free travel guides.
                    </p>

                    <h2 style="font-size: 1.3rem; font-weight: 700; color: #0f172a; margin: 1.75rem 0 0.75rem;">2. Information We Collect</h2>
                    <p style="margin-bottom: 0.75rem;">
                        We do not require visitors to create an account or submit personal data to browse our guides. However, like most websites, we automatically collect certain non-personal technical data when you visit:
                    </p>
                    <ul style="padding-left: 1.5rem; margin: 0 0 1.5rem;">
                        <li style="margin-bottom: 0.5rem;">Browser type, device category, and operating system</li>
                        <li style="margin-bottom: 0.5rem;">Referring URLs, pages visited, and time spent on the site</li>
                        <li style="margin-bottom: 0.5rem;">General geographic location (country/city level) and IP address (anonymized where applicable)</li>
                    </ul>

                    <h2 style="font-size: 1.3rem; font-weight: 700; color: #0f172a; margin: 1.75rem 0 0.75rem;">3. Cookies and Analytics</h2>
                    <p style="margin-bottom: 0.75rem;">
                        We use cookies and third-party analytics tools, such as <strong>Google Analytics</strong> and <strong>Google Search Console</strong>, to understand how visitors interact with our content and to improve site performance.
                    </p>
                    <ul style="padding-left: 1.5rem; margin: 0 0 1.5rem;">
                        <li style="margin-bottom: 0.5rem;"><strong>Affiliate Tracking Cookies:</strong> When you click an outbound booking link, our affiliate partners may place a cookie on your browser solely to attribute the referral if you make a booking within their tracking window.</li>
                        <li style="margin-bottom: 0.5rem;">You can disable or clear cookies at any time through your browser settings.</li>
                    </ul>

                    <h2 style="font-size: 1.3rem; font-weight: 700; color: #0f172a; margin: 1.75rem 0 0.75rem;">4. Third-Party Websites</h2>
                    <p style="margin-bottom: 1.5rem;">
                        Our website contains links to external hotel booking platforms and travel service providers. Once you leave <code>tabi-plan.org</code>, your interactions and transactions are governed by the privacy policies and terms of service of those third-party websites. We do not collect or store any payment or reservation details.
                    </p>

                    <h2 style="font-size: 1.3rem; font-weight: 700; color: #0f172a; margin: 1.75rem 0 0.75rem;">5. Your Privacy Rights</h2>
                    <p style="margin-bottom: 1.5rem;">
                        Depending on your region (including the EEA, UK, or California), you may have rights to request access to, correction of, or deletion of personal data collected via cookies. For any privacy-related inquiries, please contact us using the details below.
                    </p>

                    <h2 style="font-size: 1.3rem; font-weight: 700; color: #0f172a; margin: 1.75rem 0 0.75rem;">6. Contact Information</h2>
                    <p style="margin-bottom: 0.75rem;">
                        For questions regarding this Privacy Policy or our affiliate partnerships, please contact:
                    </p>
                    <ul style="padding-left: 1.5rem; margin: 0;">
                        <li style="margin-bottom: 0.4rem;"><strong>Site Name:</strong> TABI-PLAN</li>
                        <li style="margin-bottom: 0.4rem;"><strong>URL:</strong> <a href="https://tabi-plan.org/" style="color: #0284c7; text-decoration: none;">https://tabi-plan.org/</a></li>
                        <li><strong>Email:</strong> <a href="mailto:tusakaz+tabi@gmail.com" style="color: #0284c7; text-decoration: none;">tusakaz+tabi@gmail.com</a></li>
                    </ul>
                </article>
            </div>
        </section>`
    }
];

/**
 * 英語ページを sitemap.xml へ安全に追記または lastmod 更新する（既存日本語URLは変更しない）
 * @param {Array<{url: string, lastmod: string, changefreq: string, priority: string}>} entries
 */
function updateSitemapForEnPages(entries) {
    if (!fs.existsSync(SITEMAP_PATH)) {
        console.warn('⚠️ sitemap.xml が見つからないため、サイトマップ更新をスキップします。');
        return;
    }

    let sitemapXml = fs.readFileSync(SITEMAP_PATH, 'utf8');
    let addedCount = 0;
    let updatedCount = 0;

    for (const entry of entries) {
        const escapedUrl = entry.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const locRegex = new RegExp(`(<url>\\s*<loc>${escapedUrl}</loc>\\s*<lastmod>)[^<]+(</lastmod>)`);

        if (sitemapXml.includes(`<loc>${entry.url}</loc>`)) {
            if (locRegex.test(sitemapXml)) {
                sitemapXml = sitemapXml.replace(locRegex, `$1${entry.lastmod}$2`);
                updatedCount++;
            }
        } else {
            const newUrlBlock = `  <url>\n    <loc>${entry.url}</loc>\n    <lastmod>${entry.lastmod}</lastmod>\n    <changefreq>${entry.changefreq}</changefreq>\n    <priority>${entry.priority}</priority>\n  </url>`;
            sitemapXml = sitemapXml.replace('</urlset>', `${newUrlBlock}\n</urlset>`);
            addedCount++;
        }
    }

    fs.writeFileSync(SITEMAP_PATH, sitemapXml, 'utf8');
    console.log(`🗺️ Updated sitemap.xml (Added: ${addedCount}, Updated: ${updatedCount})`);
}

/**
 * 英語固定ページ（/en/, /en/about/, /en/privacy/）をビルドして安全に書き出す
 * @returns {Array} サイトマップ登録用エントリ配列
 */
function buildEnStaticPages() {
    console.log('\nBuilding English static pages (Top / About / Privacy)...');
    const todayStr = new Date().toISOString().split('T')[0];
    const sitemapEntries = [];

    for (const page of STATIC_EN_PAGES) {
        const contentHtml = typeof page.getMainContentHtml === 'function'
            ? page.getMainContentHtml()
            : page.mainContentHtml;

        const html = renderEnPage({
            enPath: page.enPath,
            jaEquivalentPath: page.jaEquivalentPath,
            title: page.title,
            metaDescription: page.metaDescription,
            ogImage: `${BASE_URL}/bg_tokyo_new.jpg`,
            heroBgImage: page.heroBgImage,
            mainContentHtml: contentHtml
        });

        writeEnHtmlSafely(page.outputDir, html);

        sitemapEntries.push({
            url: `${BASE_URL}${normalizeUrlPath(page.enPath)}`,
            lastmod: todayStr,
            changefreq: page.sitemapChangefreq || 'monthly',
            priority: page.sitemapPriority || '0.5'
        });
    }

    return sitemapEntries;
}

/**
 * 英語特集ガイドページ（/en/guides/[slug]/）をビルドする
 * @returns {Array} サイトマップ登録用エントリ配列
 */
function buildEnGuidePages() {
    if (!fs.existsSync(EN_GUIDES_PATH) || !fs.existsSync(EN_HOTELS_PATH)) {
        console.log('⚠️ 英語用設定JSONが見つからないためスキップします。');
        return [];
    }

    console.log('\nBuilding English guide pages (/en/guides/[slug]/)...');
    const guidesConfig = JSON.parse(fs.readFileSync(EN_GUIDES_PATH, 'utf8'));
    const hotelsData = JSON.parse(fs.readFileSync(EN_HOTELS_PATH, 'utf8'));
    const todayStr = new Date().toISOString().split('T')[0];
    const sitemapEntries = [];

    for (const [key, guide] of Object.entries(guidesConfig)) {
        const slug = guide.slug || key;
        const enPagePath = `/en/guides/${slug}/`;

        // 1. 解説コラム（guideSections）のHTML生成
        const sectionsHtml = (guide.guideSections || [])
            .map(sec => `
                <div style="margin-bottom: 1.75rem;">
                    <h2 style="font-size: 1.3rem; font-weight: 700; color: #0f172a; margin-bottom: 0.75rem; text-align: left;">${sec.heading}</h2>
                    <div style="font-size: 1rem; line-height: 1.75; color: #334155; text-align: left;">${sec.bodyHtml}</div>
                </div>`)
            .join('');

        const guideColumnWrapper = sectionsHtml ? `
            <section id="niche-guide" style="padding: 1.5rem 0;">
                <div class="container" style="max-width: 1000px; padding: 0 15px;">
                    <div class="glass-container" style="padding: 1.75rem; text-align: left;">
                        ${sectionsHtml}
                    </div>
                </div>
            </section>` : '';

        // 2. 紐づくホテルカードのHTML生成
        const targetHotels = (guide.hotelIds || [])
            .map(id => hotelsData[id])
            .filter(Boolean);

        const hotelsGridHtml = targetHotels.length > 0
            ? targetHotels.map(hotel => renderHotelCard(hotel)).join('')
            : `<p style="color: #475569;">Curated hotel recommendations for this area are being updated.</p>`;

        // 3. ページ本文全体の組み立て
        const mainContentHtml = `
            <section class="niche-hero" style="padding: 7rem 5% 2.5rem; text-align: center;">
                <div class="container">
                    <div class="breadcrumbs" style="max-width: 1000px; margin: 0 auto 1.5rem; text-align: left; font-size: 0.85rem;">
                        <a href="/en/">Home</a> <i class="fa-solid fa-chevron-right" style="font-size: 0.6rem; margin: 0 0.5rem;"></i>
                        <span>${guide.hero?.h1 || slug}</span>
                    </div>
                    <h1 class="niche-title" style="margin-bottom: 0.75rem;">${guide.hero?.h1 || slug}</h1>
                    ${guide.hero?.subtitle ? `<p style="color: rgba(255,255,255,0.9); max-width: 760px; margin: 0 auto 0.75rem;">${guide.hero.subtitle}</p>` : ''}
                    <p style="font-size: 0.8rem; color: rgba(255,255,255,0.75);">Disclosure: This guide contains affiliate links. We may earn a commission at no extra cost to you.</p>
                </div>
            </section>

            ${guideColumnWrapper}

            <section id="hotels" class="hotels-section" style="padding: 2rem 0 4rem;">
                <div class="container" style="max-width: 1100px; padding: 0 15px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 0.75rem;">
                        <h2 class="section-title" style="margin-bottom: 0; text-align: left;">Recommended Hotels</h2>
                        ${guide.updatedAt ? `<p style="font-size: 0.85rem; color: #64748b; margin: 0;">Last Updated: ${guide.updatedAt}</p>` : ''}
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem;">
                        ${hotelsGridHtml}
                    </div>
                </div>
            </section>`;

        // 4. 共通レンダラーでHTML化＆/en/guides/[slug]/index.html へ安全に出力
        const finalHtml = renderEnPage({
            enPath: enPagePath,
            jaEquivalentPath: guide.jaEquivalentPath,
            title: guide.seo?.title || `${guide.hero?.h1 || slug} | Tabi Plan`,
            metaDescription: guide.seo?.metaDescription || '',
            ogImage: guide.seo?.ogImage || `${BASE_URL}/bg_tokyo_new.jpg`,
            heroBgImage: guide.hero?.bgImage ? `url('${guide.hero.bgImage}')` : "url('/bg_tokyo_new.jpg')",
            mainContentHtml
        });

        writeEnHtmlSafely(`guides/${slug}`, finalHtml);

        sitemapEntries.push({
            url: `${BASE_URL}${normalizeUrlPath(enPagePath)}`,
            lastmod: guide.updatedAt || todayStr,
            changefreq: 'weekly',
            priority: '0.8'
        });
    }

    return sitemapEntries;
}

/**
 * 英語ディレクトリ（/en/）全体のビルドを実行する統括関数
 */
function runEnBuild() {
    console.log('========================================');
    console.log('Starting English (/en/) Static Build...');
    console.log('========================================');

    const staticEntries = buildEnStaticPages();
    const guideEntries = buildEnGuidePages();
    updateSitemapForEnPages([...staticEntries, ...guideEntries]);

    console.log('========================================');
    console.log('English (/en/) Build Completed!');
    console.log('========================================');
}

if (require.main === module) {
    runEnBuild();
}

module.exports = {
    normalizeUrlPath,
    loadEnPartials,
    buildEnSeoMetaTags,
    writeEnHtmlSafely,
    renderEnPage,
    renderOtaButtons,
    renderHotelCard,
    buildEnGuidesGridHtml,
    updateSitemapForEnPages,
    buildEnStaticPages,
    buildEnGuidePages,
    runEnBuild
};
