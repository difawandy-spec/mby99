import express from "express";
import fetch from "node-fetch";

const app = express();
const port = process.env.PORT || 8080;

// Config hosts dengan key-based routing
const HOSTS = {
  twnx1: "https://twnx1-cf.boblcfwudz421.com",
  twnx2: "https://twnx2-cf.boblcfwudz421.com",
  twnx3: "https://twnx3-cf.boblcfwudz421.com",
  // Tambah host baru di sini
};

// Middleware untuk parse body (untuk POST requests)
app.use(express.raw({ type: "*/*", limit: "50mb" }));

// Middleware CORS (biar bisa diakses dari browser/hls.js)
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, HEAD");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, Range"
  );

  if (req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }
  next();
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", hosts: Object.keys(HOSTS) });
});

// Main proxy handler
app.all("/:hostKey/*", async (req, res) => {
  const { hostKey } = req.params;
  const path = req.params[0]; // Capture everything after /:hostKey/

  // Validate host key
  if (!HOSTS[hostKey]) {
    console.warn(
      `[${new Date().toISOString()}] Invalid host key: ${hostKey}`
    );
    return res.status(404).json({
      error: "Host not found",
      available: Object.keys(HOSTS),
    });
  }

  const host = HOSTS[hostKey];
  const url = `${host}/${path}${
    Object.keys(req.query).length > 0 ? "?" + new URLSearchParams(req.query) : ""
  }`;

  console.log(
    `[${new Date().toISOString()}] [${hostKey}] ${req.method} ${url}`
  );

  let lastError;

  // Retry logic - coba 2 kali jika gagal
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const headers = {
        Referer: "https://demo.crunchyrolll.xyz/",
        Origin: "https://demo.crunchyrolll.xyz",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      };

      // Copy incoming headers (exclude host-related ones)
      for (const [key, value] of Object.entries(req.headers)) {
        if (
          ![
            "host",
            "connection",
            "content-length",
            "transfer-encoding",
          ].includes(key.toLowerCase())
        ) {
          headers[key] = value;
        }
      }

      const fetchOptions = {
        method: req.method,
        headers,
        timeout: 15000,
      };

      // Add body untuk POST/PUT/PATCH
      if (req.method !== "GET" && req.method !== "HEAD" && req.body) {
        fetchOptions.body = req.body;
      }

      const response = await fetch(url, fetchOptions);

      // Set status & headers dari response
      res.status(response.status);
      for (const [key, value] of response.headers.entries()) {
        if (key.toLowerCase() !== "access-control-allow-origin") {
          res.setHeader(key, value);
        }
      }

      console.log(
        `[${new Date().toISOString()}] [${hostKey}] Response status: ${response.status}`
      );

      // Pipe stream langsung ke client
      response.body.pipe(res);

      // Handle stream errors
      response.body.on("error", (err) => {
        console.error(
          `[${new Date().toISOString()}] [${hostKey}] Stream error:`,
          err.message
        );
        if (!res.headersSent) {
          res.status(502).send("Bad Gateway - Stream error");
        } else {
          res.end();
        }
      });

      return; // Success, exit retry loop
    } catch (error) {
      lastError = error;
      console.error(
        `[${new Date().toISOString()}] [${hostKey}] Attempt ${attempt}/2 failed:`,
        error.message
      );

      if (attempt < 2) {
        console.log(`[${new Date().toISOString()}] [${hostKey}] Retrying...`);
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1s before retry
      }
    }
  }

  // All attempts failed
  console.error(
    `[${new Date().toISOString()}] [${hostKey}] All attempts failed:`,
    lastError?.message
  );

  if (!res.headersSent) {
    res.status(502).json({
      error: "Bad Gateway",
      message: lastError?.message || "Failed to proxy request",
      host: hostKey,
    });
  } else {
    res.end();
  }
});

// 404 handler untuk root path
app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: "Use /:hostKey/path to proxy requests",
    available_hosts: Object.keys(HOSTS),
    example: `/${Object.keys(HOSTS)[0]}/stream.m3u8`,
  });
});

// Jalankan server
app.listen(port, "0.0.0.0", () => {
  console.log(`✅ Multi-host proxy berjalan di http://0.0.0.0:${port}`);
  console.log(`📌 Available hosts:`);
  Object.entries(HOSTS).forEach(([key, url]) => {
    console.log(`   - /${key} → ${url}`);
  });
  console.log(`📍 Health check: http://localhost:${port}/health`);
});
