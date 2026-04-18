const { TwitterApi } = require('twitter-api-v2');

const client = new TwitterApi({
    appKey: process.env.X_API_KEY,
    appSecret: process.env.X_API_SECRET,
    accessToken: process.env.X_ACCESS_TOKEN,
    accessSecret: process.env.X_ACCESS_TOKEN_SECRET,
});

async function run() {
    console.log('Sending simple test tweet...');
    try {
        const { data: createdTweet } = await client.v2.tweet('Tabi-Plan 自動投稿テスト中！本日の最安値をチェック。 https://tabi-plan.org/');
        console.log('Successfully posted tweet!', createdTweet.id);
    } catch (error) {
        console.error('X API Error Detail:', JSON.stringify(error.data || error.message, null, 2));
        process.exit(1); 
    }
}

run();
