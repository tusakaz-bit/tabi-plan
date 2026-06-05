// Gemini APIキーのテストスクリプト
require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

async function testGemini() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('GEMINI_API_KEY が設定されていません');
        return;
    }
    
    console.log('APIキー先頭5文字:', apiKey.substring(0, 5));
    console.log('APIキー長さ:', apiKey.length);
    
    const ai = new GoogleGenAI({ apiKey });
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: 'テスト：「東京ホテルの魅力を1文で教えてください」',
        });
        console.log('AI生成成功！');
        console.log('レスポンス:', response.text.substring(0, 200));
    } catch (e) {
        console.error('AI生成エラー:', e.message);
        if (e.status) console.error('HTTPステータス:', e.status);
    }
}

testGemini();
