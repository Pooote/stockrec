export default async function handler(req, res) {
  const { ticker } = req.query;
  if (!ticker) return res.status(400).json({ error: "ticker required" });

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}`;

  let upstream;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    upstream = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    clearTimeout(timeout);
  } catch {
    return res.status(504).json({ error: "Yahoo Finance timeout" });
  }

  if (!upstream.ok) {
    return res.status(502).json({ error: "Yahoo Finance error" });
  }

  const data = await upstream.json();
  const result = data?.chart?.result?.[0];
  const meta = result?.meta;
  const price = meta?.regularMarketPrice;

  if (!result || price === undefined) {
    return res.status(404).json({
      error: `No price found for "${ticker}". Thai stocks need .BK suffix (e.g. PTT.BK)`
    });
  }

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.json({
    ticker,
    price,
    previousClose: meta?.chartPreviousClose ?? meta?.previousClose ?? null,
    currency: meta?.currency || "",
  });
}
