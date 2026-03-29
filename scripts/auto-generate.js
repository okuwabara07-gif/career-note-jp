const fs = require('fs');
const path = require('path');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const AMAZON_ID = process.env.AMAZON_TRACKING_ID || '';
const RAKUTEN_ID = process.env.RAKUTEN_AFFILIATE_ID || '';

const KEYWORDS = [
  {kw:"\u8ee2\u8077 30\u4ee3 \u6210\u529f \u65b9\u6cd5",genre:"\u8ee2\u8077"},
  {kw:"\u8077\u52d9\u7d4c\u6b74\u66f8 \u66f8\u304d\u65b9 \u4f8b\u6587",genre:"\u8ee2\u8077"},
  {kw:"\u5e74\u53ce\u30a2\u30c3\u30d7 \u4ea4\u6e09 \u65b9\u6cd5",genre:"\u5e74\u53ce"},
  {kw:"\u526f\u696d \u304a\u3059\u3059\u3081 \u4f1a\u793e\u54e1",genre:"\u30b9\u30ad\u30eb\u30a2\u30c3\u30d7"},
  {kw:"\u30ea\u30e2\u30fc\u30c8\u30ef\u30fc\u30af \u6c42\u4eba \u63a2\u3057\u65b9",genre:"\u30ea\u30e2\u30fc\u30c8"},
  {kw:"\u8cc7\u683c \u304a\u3059\u3059\u3081 \u8ee2\u8077 \u5f37\u3044",genre:"\u8cc7\u683c"},
  {kw:"\u9762\u63a5 \u81ea\u5df1PR \u4f8b\u6587",genre:"\u8ee2\u8077"},
  {kw:"\u30ad\u30e3\u30ea\u30a2\u30a2\u30c3\u30d7 20\u4ee3 \u65b9\u6cd5",genre:"\u30b9\u30ad\u30eb\u30a2\u30c3\u30d7"},
  {kw:"\u30d5\u30ea\u30fc\u30e9\u30f3\u30b9 \u59cb\u3081\u65b9 \u6e96\u5099",genre:"\u30b9\u30ad\u30eb\u30a2\u30c3\u30d7"},
  {kw:"IT\u30a8\u30f3\u30b8\u30cb\u30a2 \u672a\u7d4c\u9a13 \u8ee2\u8077",genre:"\u8ee2\u8077"}
];

const SYS = `あなたはキャリア・転職専門ライターです。読者目線で分かりやすく、SEOに強い記事を書きます。見出しはH2/H3を使ってください。文字数2000字以上。Markdown形式で出力。記事内でおすすめ商品を紹介する箇所には[AMAZON:商品名]と[RAKUTEN:商品名]を合計5箇所挿入してください。`;

function insertLinks(text) {
  text = text.replace(/\[AMAZON:([^\]]+)\]/g, (_, p) => {
    return `[🛒 ${p}をAmazonでチェック](https://www.amazon.co.jp/s?k=${encodeURIComponent(p)}&tag=${AMAZON_ID})`;
  });
  text = text.replace(/\[RAKUTEN:([^\]]+)\]/g, (_, p) => {
    return `[🛍 ${p}を楽天でチェック](https://search.rakuten.co.jp/search/mall/${encodeURIComponent(p)}/?rafcid=${RAKUTEN_ID})`;
  });
  return text;
}

function toSlug(kw) {
  return kw.replace(/[\s\u3000]+/g, '-').replace(/[^a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF-]/g, '') + '-' + Date.now();
}

async function generateArticle(kw, genre) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      system: SYS,
      messages: [{ role: 'user', content: `ジャンル：${genre}\nキーワード：「${kw}」\n\nSEO記事をMarkdownで書いてください。` }],
    }),
  });
  const data = await res.json();
  return data.content?.map(c => c.text || '').join('') || '';
}

async function main() {
  const contentDir = path.join(process.cwd(), 'content/blog');
  if (!fs.existsSync(contentDir)) fs.mkdirSync(contentDir, { recursive: true });

  const targets = KEYWORDS.sort(() => Math.random() - 0.5).slice(0, 5);

  for (const { kw, genre } of targets) {
    console.log(`生成中: ${kw}`);
    try {
      let text = await generateArticle(kw, genre);
      text = insertLinks(text);
      const slug = toSlug(kw);
      const content = `---\ntitle: "${kw}"\ndate: "${new Date().toISOString().split('T')[0]}"\ngenre: "${genre}"\ntags: [${genre}]\n---\n\n${text}\n`;
      fs.writeFileSync(path.join(contentDir, `${slug}.mdx`), content);
      console.log(`完了: ${slug}.mdx`);
      await new Promise(r => setTimeout(r, 1000));
    } catch (e) {
      console.error(`エラー: ${kw}`, e.message);
    }
  }
  console.log('全記事生成完了！');
}

main();
