/**
 * tabi-plan.org SEO自動分析・AIリライト提案スクリプト（OAuth 2.0認証 + Gemini API版）
 * 
 * 使い方:
 * node scripts/seo_analyzer.js
 * 
 * 初回実行時: ブラウザが自動で開き、Googleアカウントでのログインを求めます。
 * 2回目以降: 保存されたトークンを使って自動認証されます（ブラウザ不要）。
 * 
 * Gemini APIキーの設定:
 * scripts/seo_analyzer.js の GEMINI_API_KEY 変数に、取得したAPIキーを貼り付けてください。
 * (取得先: https://aistudio.google.com/app/apikey)
 */

const { google } = require('googleapis');
const { GoogleGenAI } = require('@google/genai');
const http = require('http');
const url = require('url');
const path = require('path');
const fs = require('fs');

// ============================================================
// ★ 設定エリア（Gemini APIキーをここに入力してください）
// ============================================================
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''; // 環境変数から安全に読み込む（セキュリティ漏洩対策のため直書き禁止）
// ============================================================

// ファイルパスの定義
const OAUTH_CREDENTIALS_PATH = path.join(__dirname, 'oauth_credentials.json');
const TOKEN_PATH = path.join(__dirname, 'token.json');
const REPORT_OUTPUT_PATH = path.join(__dirname, 'seo_report.md');

// Search ConsoleのAPIスコープ（読み取り専用）
const SCOPES = ['https://www.googleapis.com/auth/webmasters.readonly'];

// tabi-plan.orgのSearch Consoleプロパティ（自動でどちらかを試す）
const SITE_URLS_TO_TRY = [
  'sc-domain:tabi-plan.org',
  'https://tabi-plan.org/',
];

// AI提案を生成する最大キーワード数（APIコスト削減のため上限を設定）
const AI_SUGGESTION_LIMIT = 5;

/**
 * メイン処理の起動
 */
async function main() {
  console.log('==================================================');
  console.log('   tabi-plan.org SEO自動分析 + AIリライト提案');
  console.log('==================================================\n');

  // oauth_credentials.json の存在確認
  if (!fs.existsSync(OAUTH_CREDENTIALS_PATH)) {
    console.error('❌ エラー: oauth_credentials.json が見つかりません。');
    console.error(`   配置場所: ${OAUTH_CREDENTIALS_PATH}`);
    return;
  }

  // Gemini APIキーの確認
  const useAI = GEMINI_API_KEY && GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY';
  if (!useAI) {
    console.log('ℹ️  Gemini APIキーが未設定のため、AIリライト提案はスキップされます。');
    console.log('   seo_analyzer.js の GEMINI_API_KEY を設定するとAI提案が有効になります。\n');
  }

  // 1. 認証クライアントを取得（初回はブラウザ認証、2回目以降はトークン自動利用）
  const authClient = await getAuthenticatedClient();
  if (!authClient) return;

  // 2. Search Console APIクライアントの作成
  const searchconsole = google.searchconsole({ version: 'v1', auth: authClient });

  // 3. アクセス可能なプロパティを確認
  const siteUrl = await detectSiteUrl(searchconsole);
  if (!siteUrl) {
    console.error('\n❌ tabi-plan.org のデータにアクセスできませんでした。');
    console.error('   Google Search Consoleに対象サイトが登録されているか確認してください。');
    return;
  }

  // 4. パフォーマンスデータを取得
  const rows = await fetchSearchAnalyticsData(searchconsole, siteUrl);
  if (!rows) return;

  // 5. SEO分析
  const analysisResults = analyzeSEOData(rows);

  // 6. Gemini APIでAIリライト提案を生成
  let aiSuggestions = null;
  if (useAI) {
    aiSuggestions = await generateAISuggestions(analysisResults);
  }

  // 7. Markdownレポートを生成・保存
  generateMarkdownReport(analysisResults, siteUrl, aiSuggestions);

  // 8. AI提案からオーバーライド用JSONの抽出と適用 (★新規追加)
  if (aiSuggestions) {
    await applySeoOverrides(aiSuggestions);
  }

  console.log('\n==================================================');
  console.log('🎉 分析完了！レポートが生成されました。');
  console.log(`   レポート保存先: ${REPORT_OUTPUT_PATH}`);
  console.log('==================================================');
}

/**
 * OAuth 2.0認証クライアントを取得する
 * - token.json が存在すれば保存済みトークンを使用（自動更新あり）
 * - 存在しなければブラウザを開いてログイン認証フローを実行
 */
async function getAuthenticatedClient() {
  const credentials = JSON.parse(fs.readFileSync(OAUTH_CREDENTIALS_PATH, 'utf-8'));
  const { client_id, client_secret } = credentials.installed;

  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    'http://localhost:3000/callback' // ローカルサーバーでコールバックを受け取る
  );

  // 保存済みトークンが存在する場合は再利用する
  if (fs.existsSync(TOKEN_PATH)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'));
    oAuth2Client.setCredentials(token);

    // トークンの自動更新リスナー（有効期限切れ時に自動保存）
    oAuth2Client.on('tokens', (newTokens) => {
      const currentToken = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'));
      const mergedToken = { ...currentToken, ...newTokens };
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(mergedToken, null, 2));
      console.log('🔄 アクセストークンを自動更新しました。');
    });

    console.log('✅ 保存済みの認証トークンを使用します（ブラウザログイン不要）。\n');
    return oAuth2Client;
  }

  // 初回: ブラウザ認証フローを実行
  console.log('🌐 初回認証が必要です。ブラウザが自動で開きます...');
  console.log('   Googleアカウントでログインしてください。\n');

  return new Promise((resolve, reject) => {
    // ローカルサーバーを起動してGoogleからのリダイレクトを受け取る
    const server = http.createServer(async (req, res) => {
      const parsedUrl = new URL(req.url, 'http://localhost:3000');
      if (parsedUrl.pathname !== '/callback') return;

      const code = parsedUrl.searchParams.get('code');
      if (!code) {
        res.end('<h1>認証コードが取得できませんでした。もう一度お試しください。</h1>');
        server.close();
        reject(new Error('認証コードが取得できませんでした。'));
        return;
      }

      // 認証コードをアクセストークンと交換
      try {
        const { tokens } = await oAuth2Client.getToken(code);
        oAuth2Client.setCredentials(tokens);

        // トークンをファイルに保存（次回以降はブラウザ不要）
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
        console.log('✅ 認証成功！トークンを保存しました。次回以降はブラウザログイン不要です。\n');

        // ブラウザに成功メッセージを表示
        res.end(`
          <html><body style="font-family:sans-serif;text-align:center;padding:40px">
            <h1 style="color:#4CAF50">✅ 認証が完了しました！</h1>
            <p>このウィンドウを閉じて、ターミナルに戻ってください。</p>
            <p style="color:#888">tabi-plan.org SEO自動分析スクリプトが引き続き実行されます。</p>
          </body></html>
        `);
        server.close();
        resolve(oAuth2Client);
      } catch (err) {
        res.end('<h1>トークンの取得に失敗しました。</h1>');
        server.close();
        reject(err);
      }
    });

    // ポート3000でローカルサーバー起動
    server.listen(3000, async () => {
      const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline', // リフレッシュトークンを取得（長期利用のため）
        scope: SCOPES,
        prompt: 'consent', // 初回は必ず同意画面を表示
      });

      // ブラウザを自動で開く（Windows用コマンド）
      const { exec } = require('child_process');
      exec(`start "" "${authUrl}"`);
      console.log('ブラウザが開かない場合は、以下のURLをコピーしてブラウザで開いてください:');
      console.log(authUrl);
    });
  });
}

/**
 * アクセス可能なSearch Consoleプロパティを自動検出する
 */
async function detectSiteUrl(searchconsole) {
  console.log('📋 アクセス可能なSearch Consoleプロパティを確認しています...');

  try {
    const res = await searchconsole.sites.list({});
    const sites = res.data.siteEntry || [];

    if (sites.length === 0) {
      return null;
    }

    console.log('以下のプロパティにアクセスできます:');
    sites.forEach(s => console.log(`  - ${s.siteUrl} (権限: ${s.permissionLevel})`));

    // tabi-plan.orgのドメインプロパティを優先検索
    for (const target of SITE_URLS_TO_TRY) {
      const found = sites.find(s => s.siteUrl === target);
      if (found) {
        console.log(`\n✅ 使用するプロパティ: ${found.siteUrl}`);
        return found.siteUrl;
      }
    }

    // 見つからない場合は最初のプロパティを使用
    console.log(`\n⚠️  tabi-plan.orgが見つからないため、最初のプロパティを使用します: ${sites[0].siteUrl}`);
    return sites[0].siteUrl;

  } catch (err) {
    console.error(`❌ プロパティ一覧の取得に失敗しました: ${err.message}`);
    return null;
  }
}

/**
 * Search Console APIから検索パフォーマンスデータを取得する
 */
async function fetchSearchAnalyticsData(searchconsole, siteUrl) {
  // データ反映遅延（約3日）を考慮した期間設定
  const startDate = getPastDateString(33);
  const endDate = getPastDateString(3);

  console.log(`\n📊 ターゲットプロパティ: ${siteUrl}`);
  console.log(`📅 分析対象期間: ${startDate} ～ ${endDate} (30日間)`);
  console.log('APIリクエスト送信中...');

  try {
    const response = await searchconsole.searchanalytics.query({
      siteUrl: siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['query', 'page'], // キーワードとページの掛け合わせで取得
        rowLimit: 1000,                // 上位1000件
      }
    });

    const rows = response.data.rows;
    if (!rows || rows.length === 0) {
      console.log('\n⚠️  指定期間内に検索パフォーマンスデータが見つかりませんでした。');
      return null;
    }

    console.log(`✅ ${rows.length} 件の「クエリ × ページ」データを取得しました。分析を開始します...`);
    return rows;

  } catch (err) {
    console.error(`❌ データ取得エラー: ${err.message}`);
    return null;
  }
}

/**
 * 過去日付をYYYY-MM-DD形式で取得するユーティリティ
 */
function getPastDateString(daysAgo) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
}

/**
 * 取得データを独自のSEOロジックで分析・分類する
 */
function analyzeSEOData(rows) {
  const results = {
    summary: {
      totalClicks: 0,
      totalImpressions: 0,
      avgCtr: '0%',
      avgPosition: '0',
      totalCount: rows.length,
      isLowTraffic: false // ロートラフィック判定フラグ
    },
    treasureKeywords: [], // お宝キーワード（順位中位・高需要・低CTR）
    lowCtrHighRank: [],   // 高順位・低CTR（スニペット改善候補）
    generalKeywords: []   // その他の一般キーワード
  };

  let sumCtr = 0;
  let sumPosition = 0;

  // まず総表示回数を計算してトラフィック状況を把握
  rows.forEach(row => {
    results.summary.totalClicks += row.clicks;
    results.summary.totalImpressions += row.impressions;
  });

  // 全体データからトラフィックのレベル（ローンチ初期か、中規模以上か）を判定する
  const totalImpressions = results.summary.totalImpressions;
  const isLowTraffic = totalImpressions < 500; // 30日間の総インプレッション数が500未満なら「初期フェーズ」
  results.summary.isLowTraffic = isLowTraffic;

  // 閾値の動的決定
  const treasureMinImpressions = isLowTraffic ? 1 : 50;
  const treasureMaxCtr = isLowTraffic ? 0.10 : 0.05; // 初期フェーズはCTRの閾値を10%未満まで広げる
  const treasureMinPos = 4.5;
  const treasureMaxPos = isLowTraffic ? 25.0 : 15.0; // 初期フェーズは25位までをカバー

  const lowCtrMinImpressions = isLowTraffic ? 1 : 30;
  const lowCtrMaxCtr = isLowTraffic ? 0.15 : 0.10; // 初期フェーズはCTR15%未満まで広げる
  const lowCtrMinPos = 1.0;
  const lowCtrMaxPos = 4.5;

  if (isLowTraffic) {
    console.log('⚠️ [SEO分析] 直近30日の総表示回数が500回未満のため「ローンチ初期（低トラフィックフェーズ）」と判定しました。');
    console.log('            より多くの「お宝の原石」を抽出するため、分析閾値を自動的に緩和します。');
  }

  rows.forEach(row => {
    const query = row.keys[0];
    const page = row.keys[1];
    const clicks = row.clicks;
    const impressions = row.impressions;
    const ctr = row.ctr;
    const position = row.position;

    sumCtr += ctr;
    sumPosition += position;

    const dataItem = {
      query,
      page,
      clicks,
      impressions,
      ctrPercent: (ctr * 100).toFixed(2) + '%',
      rawCtr: ctr,
      position: parseFloat(position.toFixed(1))
    };

    // 動的閾値による分析ロジック
    if (position >= treasureMinPos && position <= treasureMaxPos && impressions >= treasureMinImpressions && ctr < treasureMaxCtr) {
      results.treasureKeywords.push(dataItem);
    }
    else if (position >= lowCtrMinPos && position < lowCtrMaxPos && ctr < lowCtrMaxCtr && impressions >= lowCtrMinImpressions) {
      results.lowCtrHighRank.push(dataItem);
    } else {
      results.generalKeywords.push(dataItem);
    }
  });

  results.summary.avgCtr = ((sumCtr / rows.length) * 100).toFixed(2) + '%';
  results.summary.avgPosition = (sumPosition / rows.length).toFixed(1);

  // 表示回数の多い順にソート（改善効果が高い順）
  results.treasureKeywords.sort((a, b) => b.impressions - a.impressions);
  results.lowCtrHighRank.sort((a, b) => b.impressions - a.impressions);
  results.generalKeywords.sort((a, b) => b.impressions - a.impressions);

  return results;
}

/**
 * Gemini APIを使って、キーワードごとにSEOリライト提案を自動生成する
 * 
 * 優先順位:
 *   1. お宝キーワード（最優先）
 *   2. 高順位・低CTRキーワード
 *   3. 上記がない場合は表示回数上位のキーワード（サイト初期フェーズ向け）
 */
async function generateAISuggestions(analysisResults) {
  console.log('\n🤖 Gemini AIによるリライト提案を生成中...');

  // AI提案の対象キーワードを選定（優先順位あり）
  let targetKeywords = [
    ...analysisResults.treasureKeywords,
    ...analysisResults.lowCtrHighRank,
  ];

  // お宝・改善候補が不足している場合は、一般キーワードで補完する
  if (targetKeywords.length < AI_SUGGESTION_LIMIT) {
    const remaining = AI_SUGGESTION_LIMIT - targetKeywords.length;
    targetKeywords = [
      ...targetKeywords,
      ...analysisResults.generalKeywords.slice(0, remaining)
    ];
  }

  // 上限件数にカット
  targetKeywords = targetKeywords.slice(0, AI_SUGGESTION_LIMIT);

  if (targetKeywords.length === 0) {
    console.log('⚠️  AI提案を生成するキーワードがありません。');
    return null;
  }

  console.log(`   対象キーワード: ${targetKeywords.length}件（上位${AI_SUGGESTION_LIMIT}件）`);

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  const suggestions = [];

  for (let i = 0; i < targetKeywords.length; i++) {
    const item = targetKeywords[i];
    console.log(`   [${i + 1}/${targetKeywords.length}] "${item.query}" の提案を生成中...`);

    // ページのパス部分を抽出（URLから相対パスを取得）
    const cleanUrl = item.page.replace('sc-domain:', '').replace(/^https?:\/\/tabi-plan\.org/, '') || '/';

    // Gemini APIへのプロンプト（旅行・ホテル検索サイトに特化した指示）
    const prompt = `
あなたはSEOに精通した旅行・ホテル検索サイト「tabi-plan.org」のコンテンツマーケターです。
以下のキーワードと掲載状況を分析し、クリック数を最大化するためのSEO改善提案を日本語で出力してください。

【分析対象キーワード】
- 検索キーワード: ${item.query}
- 対象ページ: ${cleanUrl}
- 現在の掲載順位: ${item.position}位
- 表示回数（月間）: ${item.impressions}回
- クリック率（CTR）: ${item.ctrPercent}

【出力形式】（必ずこの形式で出力してください）
**■ タイトル案（3案）**
1. （32文字以内で、クリックしたくなるタイトル）
2. （32文字以内で、別の切り口のタイトル）
3. （32文字以内で、さらに別の切り口のタイトル）

**■ メタディスクリプション案（2案）**
1. （100〜120文字で、検索ユーザーの課題に共感しベネフィットを伝える説明文）
2. （100〜120文字で、別の訴求ポイントを強調した説明文）

**■ 推奨見出し構成（H2レベル、3〜5個）**
- H2: （見出し案）
- H2: （見出し案）
- H2: （見出し案）

**■ 一言アドバイス**
（このキーワードで順位を上げるための最重要ポイントを1〜2文で）

【制約・注意事項】
- 旅行・ホテル・観光地に関連したコンテンツであることを踏まえて提案してください。
- 誇大表現や根拠のない断定（「日本一」「最安値保証」等）は避けてください。
- 自然な日本語で、読者が思わずクリックしたくなるような訴求力のある文章にしてください。
`.trim();

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const text = response.text;
      suggestions.push({
        query: item.query,
        page: cleanUrl,
        position: item.position,
        impressions: item.impressions,
        ctrPercent: item.ctrPercent,
        category: analysisResults.treasureKeywords.includes(item)
          ? 'treasure'
          : analysisResults.lowCtrHighRank.includes(item)
            ? 'lowctr'
            : 'general',
        aiText: text
      });

      // APIレートリミット対策（無料枠の5回/分制限を回避するため12秒待機）
      await new Promise(r => setTimeout(r, 12000));

    } catch (err) {
      console.error(`   ❌ "${item.query}" の提案生成に失敗しました: ${err.message}`);
      suggestions.push({
        query: item.query,
        page: cleanUrl,
        position: item.position,
        impressions: item.impressions,
        ctrPercent: item.ctrPercent,
        category: 'error',
        aiText: `（エラーにより提案を生成できませんでした: ${err.message}）`
      });
    }
  }

  console.log(`✅ AIリライト提案の生成が完了しました（${suggestions.length}件）`);
  return suggestions;
}

/**
 * 日本語のMarkdownレポートファイルを生成・保存する
 */
function generateMarkdownReport(results, siteUrl, aiSuggestions) {
  const currentDate = new Date().toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  const hasAI = aiSuggestions && aiSuggestions.length > 0;
  const isLowTraffic = results.summary.isLowTraffic;

  let md = `# tabi-plan.org SEO自動分析レポート${hasAI ? '（AI提案付き）' : ''}\n\n`;

  if (isLowTraffic) {
    md += `> [!WARNING]\n`;
    md += `> ⚠️ **低トラフィック自動判定モードが適用されています（分析閾値を緩和中）**\n`;
    md += `> 直近30日間の総表示回数は **${results.summary.totalImpressions.toLocaleString()}回** です。\n`;
    md += `> サイト立ち上げ初期段階であるため、データ蓄積を待たずにお宝の原石キーワードを抽出できるよう、判定しきい値を自動的に緩和して分析を実行しました。\n\n`;
  }

  md += `本レポートはGoogle Search Console APIから取得した直近30日間のデータを分析し、SEO改善ポイントを自動抽出したものです。${hasAI ? 'さらにGemini AIが各キーワードに対するリライト提案を自動生成しています。' : ''}

- **レポート生成日**: ${currentDate}
- **対象プロパティ**: \`${siteUrl}\`
- **分析期間**: 直近30日間（直近3日の反映遅延を除く）
${hasAI ? '- **AI提案モデル**: Gemini 2.5 Flash' : ''}

---

## 📈 1. サイトパフォーマンス全体サマリー

| 指標 | 数値 | 説明 |
| :--- | :--- | :--- |
| **総クリック数** | ${results.summary.totalClicks.toLocaleString()} 回 | 検索結果から実際にサイトに流入した回数 |
| **総表示回数** | ${results.summary.totalImpressions.toLocaleString()} 回 | 検索結果にサイトが表示された回数 |
| **平均クリック率 (CTR)** | ${results.summary.avgCtr} | クリック数 ÷ 表示回数 |
| **平均掲載順位** | ${results.summary.avgPosition} 位 | 全キーワードの平均順位 |
| **計測対象キーワード数** | ${results.summary.totalCount.toLocaleString()} 個 | ユニークな「クエリ×ページ」の数 |

---

## 💎 2. 【最優先リライト対象】お宝キーワード

**掲載順位が5位〜25位**で、表示回数が多いのにクリックされていないキーワードです。リライトで上位に入れば**アクセスが爆発的に増加する可能性大**です。

`;

  if (results.treasureKeywords.length === 0) {
    md += `*現在、該当するお宝キーワードはありません。継続してコンテンツを強化しましょう。*\n\n`;
  } else {
    md += `| # | キーワード | 順位 | 表示回数 | クリック | CTR | 対象ページ |\n`;
    md += `| :---: | :--- | :---: | :---: | :---: | :---: | :--- |\n`;
    results.treasureKeywords.slice(0, 20).forEach((item, i) => {
      const cleanUrl = item.page.replace('sc-domain:', '').replace('https://tabi-plan.org', '') || '/';
      md += `| ${i + 1} | **${item.query}** | ${item.position}位 | ${item.impressions} | ${item.clicks} | ${item.ctrPercent} | [${cleanUrl}](${item.page}) |\n`;
    });
    md += `
> [!TIP]
> **💡 リライトのヒント**: 1〜3位の競合ページを調査し、不足している情報（最新データ・FAQ・独自情報）を追加してください。見出し（H2/H3）にキーワードを自然に含めることも効果的です。

`;
  }

  md += `---

## ⚡ 3. 【タイトル・スニペット改善候補】高順位・低CTR

**掲載順位が1〜4位**の上位表示なのに、クリック率が低いキーワードです。コンテンツではなく**タイトルやメタディスクリプションの改善**だけで大幅にクリックを増やせます。

`;

  if (results.lowCtrHighRank.length === 0) {
    md += `*現在、該当するキーワードはありません。良好なCTRを維持しています！*\n\n`;
  } else {
    md += `| # | キーワード | 順位 | 表示回数 | クリック | CTR | 改善対象ページ |\n`;
    md += `| :---: | :--- | :---: | :---: | :---: | :---: | :--- |\n`;
    results.lowCtrHighRank.slice(0, 20).forEach((item, i) => {
      const cleanUrl = item.page.replace('sc-domain:', '').replace('https://tabi-plan.org', '') || '/';
      md += `| ${i + 1} | **${item.query}** | ${item.position}位 | ${item.impressions} | ${item.clicks} | ${item.ctrPercent} | [${cleanUrl}](${item.page}) |\n`;
    });
    md += `
> [!IMPORTANT]
> **💡 ポチらせるコツ**: タイトルは「2026年最新」「おすすめ○選」などの具体的なワードを入れ、読者が「これだ！」と感じる訴求を30文字以内で。メタディスクリプションは課題への共感から始め、解決策を100〜120文字で簡潔に伝えます。

`;
  }

  // AIリライト提案セクション
  if (hasAI) {
    md += `---

## 🤖 4. 【Gemini AI自動生成】キーワード別リライト提案

Gemini AIが各キーワードに対して、**新タイトル案・メタディスクリプション案・推奨見出し構成**を自動生成しました。そのままコピーしてお使いいただけます。

`;

    aiSuggestions.forEach((suggestion, i) => {
      // カテゴリラベルの決定
      const categoryLabel = suggestion.category === 'treasure'
        ? '💎 お宝キーワード'
        : suggestion.category === 'lowctr'
          ? '⚡ スニペット改善候補'
          : '📋 注目キーワード';

      md += `### ${i + 1}. 「${suggestion.query}」${categoryLabel}

| 項目 | 内容 |
| :--- | :--- |
| **対象ページ** | \`${suggestion.page}\` |
| **現在の順位** | ${suggestion.position}位 |
| **表示回数** | ${suggestion.impressions}回/月 |
| **現在のCTR** | ${suggestion.ctrPercent} |

${suggestion.aiText}

---
`;
    });

  } else {
    md += `---

## 🤖 4. AIリライト提案（未設定）

\`seo_analyzer.js\` の \`GEMINI_API_KEY\` にAPIキーを設定すると、Gemini AIが各キーワードに対して**新タイトル案・見出し構成・メタディスクリプション案**を自動生成します。

**APIキー of 取得**: [Google AI Studio](https://aistudio.google.com/app/apikey)（無料枠あり）

---
`;
  }

  md += `*本レポートはGoogle Search Console APIから自動生成されました。週1回〜月1回の定期実行でSEO改善の成果を継続的に追跡できます。*
`;

  fs.writeFileSync(REPORT_OUTPUT_PATH, md, 'utf-8');
}

/**
 * AI提案からタイトル・ディスクリプションを抽出し、seo_overrides.json に保存
 * さらに、トップページ（/）用の提案があれば index.html に自動適用する
 */
async function applySeoOverrides(suggestions) {
  const overridesPath = path.join(__dirname, 'seo_overrides.json');
  let currentOverrides = {};

  if (fs.existsSync(overridesPath)) {
    try {
      currentOverrides = JSON.parse(fs.readFileSync(overridesPath, 'utf-8'));
    } catch (e) {
      console.error(`❌ seo_overrides.json の読み込みエラー: ${e.message}`);
    }
  }

  let updated = false;

  for (const item of suggestions) {
    if (item.bestTitle && item.bestDescription) {
      // ページパスのキーの書式を統一（/ で終わるようにする。例：/tokyo/ や /）
      let pageKey = item.page;
      if (pageKey !== '/') {
        if (!pageKey.startsWith('/')) pageKey = '/' + pageKey;
        if (!pageKey.endsWith('/')) pageKey = pageKey + '/';
      }

      console.log(`💾 「${item.query}」用のSEOメタデータを登録します:`);
      console.log(`   ページ: ${pageKey}`);
      console.log(`   タイトル: ${item.bestTitle}`);
      console.log(`   説明: ${item.bestDescription}`);

      currentOverrides[pageKey] = {
        title: item.bestTitle,
        metaDescription: item.bestDescription,
        query: item.query,
        updatedAt: new Date().toISOString()
      };
      updated = true;

      // トップページ（/）の場合は、ルートにある index.html を直接書き換える
      if (pageKey === '/') {
        await applyTopPageSeo(item.bestTitle, item.bestDescription);
      }
    }
  }

  if (updated) {
    fs.writeFileSync(overridesPath, JSON.stringify(currentOverrides, null, 2), 'utf-8');
    console.log(`\n✅ SEOオーバーライド設定を保存しました: ${overridesPath}`);
  }
}

/**
 * ルートにある index.html のタイトルとディスクリプションを直接書き換える
 */
async function applyTopPageSeo(bestTitle, bestDescription) {
  const indexPath = path.join(__dirname, '../index.html');
  if (!fs.existsSync(indexPath)) {
    console.error(`❌ エラー: index.html が見つかりません: ${indexPath}`);
    return;
  }

  console.log(`🏠 トップページ（index.html）のSEOメタデータを直接アップデートします...`);

  try {
    let html = fs.readFileSync(indexPath, 'utf-8');

    // 1. タイトルタグの置換
    const fullTitle = `${bestTitle} | Tabi Plan`;
    const titleRegex = /<title>([\s\S]*?)<\/title>/i;
    if (titleRegex.test(html)) {
      html = html.replace(titleRegex, `<title>${fullTitle}</title>`);
      console.log(`   - タイトルを更新: "${fullTitle}"`);
    }

    // 2. メタディスクリプションの置換
    const descRegex = /<meta\s+name="description"\s+content="([\s\S]*?)"\s*\/?>/i;
    if (descRegex.test(html)) {
      html = html.replace(descRegex, `<meta name="description" content="${bestDescription}">`);
      console.log(`   - ディスクリプションを更新: "${bestDescription}"`);
    }

    // 3. OGPタイトルの置換 (ポチらせるためのOGP連動)
    const ogTitleRegex = /<meta\s+property="og:title"\s+content="([\s\S]*?)"\s*\/?>/i;
    if (ogTitleRegex.test(html)) {
      html = html.replace(ogTitleRegex, `<meta property="og:title" content="${fullTitle}">`);
    }

    // 4. OGPディスクリプションの置換
    const ogDescRegex = /<meta\s+property="og:description"\s+content="([\s\S]*?)"\s*\/?>/i;
    if (ogDescRegex.test(html)) {
      html = html.replace(ogDescRegex, `<meta property="og:description" content="${bestDescription}">`);
    }

    // 5. Twitterタイトル・ディスクリプションの置換
    const twTitleRegex = /<meta\s+name="twitter:title"\s+content="([\s\S]*?)"\s*\/?>/i;
    if (twTitleRegex.test(html)) {
      html = html.replace(twTitleRegex, `<meta name="twitter:title" content="${fullTitle}">`);
    }
    const twDescRegex = /<meta\s+name="twitter:description"\s+content="([\s\S]*?)"\s*\/?>/i;
    if (twDescRegex.test(html)) {
      html = html.replace(twDescRegex, `<meta name="twitter:description" content="${bestDescription}">`);
    }

    fs.writeFileSync(indexPath, html, 'utf-8');
    console.log(`✅ index.html のSEO置換が完了しました。`);
  } catch (err) {
    console.error(`❌ index.html の書き換え中にエラーが発生しました: ${err.message}`);
  }
}

// スクリプト実行
main();
