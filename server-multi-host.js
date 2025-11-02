const express = require("express");
const axios = require("axios");

const app = express();
const port = process.env.PORT || 8080;

// List multiple hosts untuk load balancing
const HOSTS = [
  "https://hotlivezz179266008.akainu.xyz",
  "https://hotlivezz179026907.akainu.xyz"
];

// Counter untuk round-robin load balancing
let hostIndex = 0;

// Function untuk mendapatkan host secara round-robin
const getNextHost = () => {
  const host = HOSTS[hostIndex % HOSTS.length];
  hostIndex++;
  return host;
};

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

// Proxy semua request dengan fallback ke host lain jika gagal
app.use(async (req, res) => {
  let lastError;
  
  // Loop through hosts dengan retry logic
  for (let i = 0; i < HOSTS.length; i++) {
    try {
      const host = getNextHost();
      const path = req.originalUrl;
      const url = `${host}${path}`;

      console.log(`[${new Date().toISOString()}] Proxying to: ${url}`);

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
        responseType: "stream",
        validateStatus: false,
        timeout: 10000, // timeout 10 detik
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
        console.error(`[${new Date().toISOString()}] Stream error:`, err.message);
        res.end();
      });

      return; // Success, exit loop
    } catch (error) {
      lastError = error;
      console.error(
        `[${new Date().toISOString()}] Host ${i + 1}/${HOSTS.length} failed:`,
        error.message
      );
      // Lanjut ke host berikutnya jika gagal
    }
  }

  // Semua host gagal
  console.error(
    `[${new Date().toISOString()}] All hosts failed. Last error:`,
    lastError?.message
  );
  if (!res.headersSent) {
    res.status(503).send("Service Unavailable - All upstream hosts failed");
  } else {
    res.end();
  }
});

// Jalankan server
app.listen(port, "0.0.0.0", () => {
  console.log(`✅ Multi-host proxy berjalan di http://0.0.0.0:${port}`);
  console.log(`📌 Configured hosts: ${HOSTS.join(", ")}`);
});