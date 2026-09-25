// AS Logistics Solutions — VPN relay server.
//
// Run this on YOUR OWN VPS (in whichever country you rented it). It has no
// npm dependencies — only Node's built-in modules — so `node relay.js` is
// enough. The app's backend calls this relay instead of fetching FMCSA
// directly, so requests leave from THIS server's IP address.
//
// Setup:
//   1. Copy this file to your VPS (scp relay.js user@your-server:~/relay.js)
//   2. Set a secret key:   export RELAY_SECRET="pick-a-long-random-string"
//   3. Run it:             node relay.js
//      (use `pm2 start relay.js --name vpn-relay` or a systemd service to keep it running)
//   4. In the admin panel, add a VPN server with:
//        Relay URL:  http://YOUR_SERVER_IP:8787   (or https:// behind a reverse proxy)
//        Secret key: the same RELAY_SECRET value
//
// Security: keep RELAY_SECRET private. Anyone with it can make this server
// fetch arbitrary URLs on your behalf. Put this behind a firewall rule that
// only allows your app's IP if possible, and prefer HTTPS (e.g. via Caddy/nginx)
// in production.

const http = require("http");
const https = require("https");
const { URL } = require("url");

const PORT = process.env.RELAY_PORT || 8787;
const SECRET = process.env.RELAY_SECRET || "";

if (!SECRET) {
  console.error("Set RELAY_SECRET before starting the relay, e.g.:\n  RELAY_SECRET=your-long-random-string node relay.js");
  process.exit(1);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function fetchUrl(targetUrl, headers) {
  return new Promise((resolve, reject) => {
    let parsed;
    try {
      parsed = new URL(targetUrl);
    } catch {
      reject(new Error("Invalid URL"));
      return;
    }
    const lib = parsed.protocol === "https:" ? https : http;
    const request = lib.get(
      parsed,
      { headers: { "user-agent": "Safer Scraber/1.0 (low-rate carrier research tool)", ...headers } },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => resolve({ status: res.statusCode || 0, body }));
      },
    );
    request.on("error", reject);
    request.setTimeout(20000, () => {
      request.destroy(new Error("Upstream request timed out"));
    });
  });
}

function getSelfIpInfo() {
  return fetchUrl("https://ipwho.is/", {}).then((r) => {
    try {
      const data = JSON.parse(r.body);
      return { ip: data.ip, country: data.country };
    } catch {
      return { ip: null, country: null };
    }
  });
}

const server = http.createServer(async (req, res) => {
  const key = req.headers["x-relay-key"];
  if (key !== SECRET) {
    res.writeHead(401, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "Unauthorized" }));
    return;
  }

  if (req.method === "GET" && req.url === "/health") {
    try {
      const info = await getSelfIpInfo();
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, ...info }));
    } catch (err) {
      res.writeHead(500, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: String(err) }));
    }
    return;
  }

  if (req.method === "POST" && req.url === "/fetch") {
    try {
      const raw = await readBody(req);
      const { url, headers } = JSON.parse(raw || "{}");
      if (!url) throw new Error("Missing url");
      const result = await fetchUrl(url, headers || {});
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(502, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: String(err) }));
    }
    return;
  }

  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, () => {
  console.log(`VPN relay listening on port ${PORT}`);
});
