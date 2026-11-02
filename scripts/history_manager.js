const fs = require('fs');
const path = require('path');

const DEFAULT_HISTORY_PATH = path.join(__dirname, 'post_history.json');

/**
 * ホテル投稿履歴管理クラス
 * - ホテルの投稿履歴を記録・永続化（post_history.json）
 * - 直近N日（デフォルト30日）以内の重複を判定・除外
 * - 全候補が重複している場合の最古履歴選択フォールバック
 */
class HistoryManager {
    constructor(filePath = DEFAULT_HISTORY_PATH) {
        this.filePath = filePath;
        this.history = this.load();
    }

    /**
     * 履歴ファイルを読み込む（存在しない場合は過去のpickup記事から初期シード）
     */
    load() {
        if (fs.existsSync(this.filePath)) {
            try {
                const data = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
                if (Array.isArray(data)) return data;
                if (data && Array.isArray(data.posts)) return data.posts;
            } catch (e) {
                console.error(`⚠️ [HistoryManager] Failed to parse ${this.filePath}:`, e.message);
            }
        }
        // ファイル未作成時は過去のpickup記事から自動生成
        return this.initFromPastPickups();
    }

    /**
     * 過去の pickup/*.html から過去の投稿履歴を自動抽出して初期化
     */
    initFromPastPickups() {
        console.log('🔄 [HistoryManager] Initializing post_history.json from existing pickup articles...');
        const posts = [];
        const pickupDir = path.join(__dirname, '../pickup');
        if (fs.existsSync(pickupDir)) {
            const files = fs.readdirSync(pickupDir).filter(f => f.endsWith('.html') && f !== 'index.html' && f !== 'template.html');
            for (const file of files) {
                try {
                    const content = fs.readFileSync(path.join(pickupDir, file), 'utf8');
                    const titleMatch = content.match(/<title>(.*?) \|/);
                    const hotelNoMatch = content.match(/HOTEL\/(\d+)\//);
                    const dateMatch = file.match(/^(\d{4}-\d{2}-\d{2})/);
                    if (titleMatch && hotelNoMatch && dateMatch) {
                        posts.push({
                            hotelNo: parseInt(hotelNoMatch[1], 10),
                            hotelName: titleMatch[1].trim(),
                            postedAt: `${dateMatch[1]}T09:00:00+09:00`,
                            category: 'pickup'
                        });
                    }
                } catch (e) {}
            }
        }
        // 日時降順（新しい順）でソート
        posts.sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt));
        this.savePosts(posts);
        console.log(`✅ [HistoryManager] Successfully initialized with ${posts.length} past records.`);
        return posts;
    }

    /**
     * 履歴をファイルに保存
     */
    save() {
        this.savePosts(this.history);
    }

    savePosts(posts) {
        try {
            fs.writeFileSync(this.filePath, JSON.stringify(posts, null, 2), 'utf8');
        } catch (e) {
            console.error(`⚠️ [HistoryManager] Failed to save ${this.filePath}:`, e.message);
        }
    }

    /**
     * 新たな投稿履歴を記録
     * @param {Object} entry { hotelNo, hotelName, category, postedAt }
     */
    recordPost({ hotelNo, hotelName, category = 'pickup', postedAt = null }) {
        const now = postedAt || new Date().toISOString();
        const entry = {
            hotelNo: hotelNo ? parseInt(hotelNo, 10) : null,
            hotelName: (hotelName || '').trim(),
            postedAt: now,
            category
        };
        this.history.unshift(entry); // 先頭に追加
        this.save();
        console.log(`📝 [HistoryManager] Recorded post: ${entry.hotelName} (hotelNo: ${entry.hotelNo}) [${category}] at ${entry.postedAt}`);
        return entry;
    }

    /**
     * 指定されたホテルの直近の投稿履歴を取得
     * @param {Object|number|string} identifier
     * @param {string|null} category カテゴリ指定（nullなら全カテゴリ対象）
     */
    getLastPost(identifier, category = null) {
        const targetNo = typeof identifier === 'object' && identifier ? identifier.hotelNo : (typeof identifier === 'number' ? identifier : null);
        const targetName = typeof identifier === 'object' && identifier ? identifier.hotelName : (typeof identifier === 'string' ? identifier : null);

        for (const post of this.history) {
            if (category && post.category !== category) continue;

            const noMatch = targetNo && post.hotelNo && parseInt(post.hotelNo, 10) === parseInt(targetNo, 10);
            const nameMatch = targetName && post.hotelName && (
                post.hotelName === targetName ||
                post.hotelName.includes(targetName) ||
                targetName.includes(post.hotelName)
            );

            if (noMatch || nameMatch) {
                return post;
            }
        }
        return null;
    }

    /**
     * 指定ホテルが直近N日以内に投稿されたか判定
     * @param {Object|number|string} identifier
     * @param {number} days インターバル日数（デフォルト30日）
     * @param {string|null} category
     * @returns {boolean}
     */
    isRecentlyPosted(identifier, days = 30, category = null) {
        const lastPost = this.getLastPost(identifier, category);
        if (!lastPost) return false;

        const postTime = new Date(lastPost.postedAt).getTime();
        const now = Date.now();
        const diffDays = (now - postTime) / (1000 * 60 * 60 * 24);

        return diffDays < days;
    }

    /**
     * ホテル候補リストから「直近30日以内に投稿済み」のものを除外。
     * 全て除外された場合は、最も過去に投稿された（または未投稿の）ホテルをフォールバックとして選定。
     *
     * @param {Array} hotels 楽天API等のホテルオブジェクト配列
     * @param {Function} extractor ホテル情報抽出関数 (h => ({ hotelNo, hotelName }))
     * @param {number} days インターバル日数（30日）
     * @param {string|null} category
     * @returns {Object} { selectedHotel, eligibleHotels, fallbackUsed, reason }
     */
    selectHotelWithInterval(hotels, extractor, days = 30, category = null) {
        if (!hotels || hotels.length === 0) {
            return { selectedHotel: null, eligibleHotels: [], fallbackUsed: false, reason: 'No hotels provided' };
        }

        const evaluated = hotels.map(h => {
            const { hotelNo, hotelName } = extractor(h);
            const lastPost = this.getLastPost({ hotelNo, hotelName }, category);
            const postTime = lastPost ? new Date(lastPost.postedAt).getTime() : 0;
            const diffDays = lastPost ? (Date.now() - postTime) / (1000 * 60 * 60 * 24) : 9999;
            const isRecent = diffDays < days;

            return {
                raw: h,
                hotelNo,
                hotelName,
                lastPost,
                postTime,
                diffDays,
                isRecent
            };
        });

        // 30日以内に投稿されていないクリーンな候補
        const eligible = evaluated.filter(item => !item.isRecent);

        if (eligible.length > 0) {
            // クリーンな候補からランダムに1件選択
            const chosen = eligible[Math.floor(Math.random() * eligible.length)];
            return {
                selectedHotel: chosen.raw,
                eligibleHotels: eligible.map(e => e.raw),
                fallbackUsed: false,
                reason: `${eligible.length}/${hotels.length} hotels are eligible (outside ${days}-day interval)`
            };
        }

        // フォールバック：全ホテルが直近30日以内に投稿済みの場合は、最も過去に投稿されたホテルを選ぶ
        console.warn(`⚠️ [HistoryManager] All ${hotels.length} candidates were posted within ${days} days! Applying fallback...`);
        evaluated.sort((a, b) => a.postTime - b.postTime); // postTime昇順（最も古いものが先頭）
        const fallbackChosen = evaluated[0];

        return {
            selectedHotel: fallbackChosen.raw,
            eligibleHotels: [],
            fallbackUsed: true,
            reason: `All hotels posted recently. Selected oldest posted hotel: ${fallbackChosen.hotelName} (last: ${fallbackChosen.lastPost ? fallbackChosen.lastPost.postedAt : 'unknown'}, ${Math.round(fallbackChosen.diffDays)} days ago)`
        };
    }

    /**
     * 複数件のホテルを選定（はてなブログ等の複数件まとめ用）
     * 30日以内のホテルを除外し、不足する場合は最古のホテルをフォールバックとして補充
     *
     * @param {Array} hotels
     * @param {Function} extractor
     * @param {number} count 必要件数（例: 3件）
     * @param {number} days
     * @param {string|null} category
     */
    selectMultipleHotelsWithInterval(hotels, extractor, count = 3, days = 30, category = null) {
        if (!hotels || hotels.length === 0) return [];

        const evaluated = hotels.map(h => {
            const { hotelNo, hotelName } = extractor(h);
            const lastPost = this.getLastPost({ hotelNo, hotelName }, category);
            const postTime = lastPost ? new Date(lastPost.postedAt).getTime() : 0;
            const diffDays = lastPost ? (Date.now() - postTime) / (1000 * 60 * 60 * 24) : 9999;
            const isRecent = diffDays < days;

            return {
                raw: h,
                hotelNo,
                hotelName,
                lastPost,
                postTime,
                diffDays,
                isRecent
            };
        });

        const eligible = evaluated.filter(item => !item.isRecent);
        const selected = [...eligible.map(e => e.raw)];

        if (selected.length >= count) {
            return selected.slice(0, count);
        }

        // 不足分を直近投稿されたものの中から最も古い順（postTime昇順）で補充
        const recent = evaluated.filter(item => item.isRecent);
        recent.sort((a, b) => a.postTime - b.postTime);

        for (const item of recent) {
            if (selected.length >= count) break;
            selected.push(item.raw);
        }

        return selected.slice(0, count);
    }
}

module.exports = { HistoryManager, DEFAULT_HISTORY_PATH };