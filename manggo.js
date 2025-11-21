const express = require('express');
const axios = require('axios');
const cors = require('cors');
const url = require('url');

const app = express();
app.use(cors());

// Target hostname yang akan di-proxy
const TARGET_HOST = 'https://hls.suanzsd6.com';

// Headers yang akan dikirim ke target
const TARGET_HEADERS = {
  'accept': '*/*',
  'accept-language': 'en-US,en;q=0.9,id-ID;q=0.8,id;q=0.7',
  'cache-control': 'no-cache',
  'pragma': 'no-cache',
  'referer': 'https://hsif.btyff.com/',
  'user-agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36'
};

// Function untuk mengganti hostname di m3u8 content
function replaceHostname(content, originalHost, proxyHost) {
  return content.replace(new RegExp(originalHost, 'g'), proxyHost);
}

// Endpoint untuk semua path (dinamis)
app.get('*', async (req, res) => {
  try {
    // Gabungkan TARGET_HOST dengan path dan query dari request
    const targetUrl = TARGET_HOST + req.path + (req.url.includes('?') ? '?' + req.url.split('?')[1] : '');
    
    console.log(`Proxying: ${targetUrl}`);

    // Deteksi tipe file untuk response type
    const isVideoSegment = req.path.endsWith('.ts');
    const responseType = isVideoSegment ? 'stream' : 'text';

    const response = await axios.get(targetUrl, {
      headers: TARGET_HEADERS,
      responseType: responseType
    });

    // Set CORS headers
    res.set('Access-Control-Allow-Origin', '*');

    // Jika video segment (.ts), langsung stream
    if (isVideoSegment) {
      res.set('Content-Type', 'video/mp2t');
      response.data.pipe(res);
      return;
    }

    // Jika m3u8, replace hostname
    if (req.path.endsWith('.m3u8')) {
      const proxyHost = `${req.protocol}://${req.get('host')}`;
      let modifiedContent = replaceHostname(response.data, TARGET_HOST, proxyHost);

      res.set('Content-Type', 'application/vnd.apple.mpegurl');
      res.send(modifiedContent);
      return;
    }

    // File lainnya, kirim apa adanya
    res.send(response.data);

  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ 
      error: error.message,
      path: req.path 
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ HLS Proxy server running on http://localhost:${PORT}`);
  console.log(`🎯 Target host: ${TARGET_HOST}`);
  console.log(`🎬 Example: http://localhost:${PORT}/hd-en-6MuTNFjqRNVxQfMK5q.m3u8?txSecret=61c425ac3bb358d6b915e15545854913&txTime=6921A6DB`);
});