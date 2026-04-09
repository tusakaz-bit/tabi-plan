export async function onRequest(context) {
  const baseUrl = "https://tabi-plan.org";
  
  // 今後ホテル個別ページや別都市を追加した場合は、この配列にURLを追加すれば
  // アクセス時にオートマチックにsitemap.xmlが生成されます。
  const pages = [
    { loc: "/", changefreq: "daily", priority: "1.0" },
    { loc: "/fukuoka/", changefreq: "daily", priority: "0.8" },
    { loc: "/contact.html", changefreq: "monthly", priority: "0.5" },
    { loc: "/privacy.html", changefreq: "monthly", priority: "0.3" }
  ];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

  pages.forEach(page => {
    xml += `
  <url>
    <loc>${baseUrl}${page.loc}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
  });

  xml += `\n</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "max-age=3600"
    }
  });
}
