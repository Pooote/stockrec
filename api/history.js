export default async function handler(req, res) {
  const { ticker, range = "max" } = req.query;
  if (!ticker) return res.status(400).json({ error: "ticker required" });

  const rangeMap = {
    "1d": { range: "5d",  interval: "1d"  },
    "1w": { range: "1mo", interval: "1d"  },
    "1m": { range: "3mo", interval: "1d"  },
    "1y": { range: "2y",  interval: "1wk" },
    "max":{ range: "max", interval: "1mo" },
  };
  const p = rangeMap[range] ?? rangeMap["max"];

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=${p.range}&interval=${p.interval}`;

  let upstream;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
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
  if (!result) {
    return res.status(404).json({ error: `No data for "${ticker}"` });
  }

  const timestamps = result.timestamp ?? [];
  const closes = result.indicators?.quote?.[0]?.close ?? [];

  const rows = timestamps
    .map((ts, i) => ({
      date: new Date(ts * 1000).toISOString().slice(0, 10),
      close: closes[i] ?? null,
    }))
    .filter(r => r.close !== null);

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.json({ ticker, range, rows });
}
