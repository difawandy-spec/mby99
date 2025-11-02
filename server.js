import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware agar body selalu tersedia
app.use(express.text({ type: "*/*" }));

// Mapping prefix ke host CDN
const hosts = {
  twnx1: "https://twnx1-cf.boblcfwudz421.com",
  twnx2: "https://twnx2-cf.boblcfwudz421.com",
  twnx3: "https://twnx3-cf.boblcfwudz421.com",
  t2nt1: "https://t2nt1-cf.boblcfwudz421.com",
  t2nt2: "https://t2nt2-cf.boblcfwudz421.com",
  t2nt3: "https://t2nt3-cf.boblcfwudz421.com",
  t3nt1: "https://t3nt1-cf.wooblzlhl524.com",
  t3nt2: "https://t3nt2-cf.wooblzlhl524.com",
  t4nt1: "https://t4nt1-cf.wooblzlhl524.com",
};

app.all("*", async (req, res) => {
  try {
    const pathParts = req.path.split("/");
    const prefix = pathParts[1];
    const host = hosts[prefix];
    if (!host) return res.status(400).send("Invalid prefix");

    // Buat URL target lengkap dengan query string
    const query = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
    const targetUrl = host + "/" + pathParts.slice(2).join("/") + query;

    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers: {
        "User-Agent": req.get("User-Agent") || "Mozilla/5.0",
        Referer: "https://ppdd02.playerktidfintkd.shop/",
        Origin: "https://ppdd02.playerktidfintkd.shop",
        Cookie: "vc_ts=1757037722532; show_link=false",
      },
      body: req.method !== "GET" && req.method !== "HEAD" ? req.body : undefined,
    });

    // Set CORS
    res.set({
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    });

    // Pipe hasil upstream
    if (upstream.body) {
      upstream.body.pipe(res);
      upstream.body.on("error", (err) => {
        console.error("Stream error:", err);
        res.end();
      });
    } else {
      res.status(500).send("Upstream body is empty");
    }
  } catch (err) {
    console.error("Proxy error:", err);
    res.status(500).send("Proxy internal error: " + err.message);
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Proxy running on port ${PORT}`);
});
