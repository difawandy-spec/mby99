const express = require("express");
const axios = require("axios");

const app = express();
const port = 8080;

// Middleware CORS (biar bisa diakses dari browser/hls.js)
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }
  next();
});

// Proxy semua request
app.use(async (req, res) => {
  try {
    const path = req.originalUrl; // path dinamis
    const url = `https://hotlivezz179026907.akainu.xyz${path}`; // ganti dengan host asli

    const headers = {
      Referer: "https://demo.crunchyrolll.xyz/",
      Origin: "https://demo.crunchyrolll.xyz",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    };

    const response = await axios({
      method: req.method,
      url,
      headers,
      data: req.method !== "GET" ? req.body : undefined,
      responseType: "stream", // pakai streaming, bukan buffer
      validateStatus: false,
    });

    // Set status & headers
    res.status(response.status);
    for (const [key, value] of Object.entries(response.headers)) {
      if (key.toLowerCase() !== "access-control-allow-origin") {
        res.setHeader(key, value);
      }
    }

    // Pipe stream langsung ke client
    response.data.pipe(res);

    // Forward error kalau stream terputus
    response.data.on("error", (err) => {
      console.error("Stream error:", err.message);
      res.end();
    });
  } catch (error) {
    console.error("Proxy error:", error.message);
    if (!res.headersSent) {
      res.status(500).send("Internal Server Error");
    } else {
      res.end();
    }
  }
});

// Jalankan server
app.listen(port, () => {
  console.log(`✅ Proxy berjalan di http://localhost:${port}`);
});
