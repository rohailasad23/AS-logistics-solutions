# VPN relay setup

This turns your own rented VPS into the app's "VPN" exit point. FMCSA requests
get routed through this relay instead of going out directly, so they leave
from your VPS's IP (in whatever country you rented the server).

## 1. Get a VPS

Rent a small server (Vultr, Contabo, DigitalOcean, Hetzner — $4-6/month) in the
country you want. Ubuntu 22.04, smallest plan is enough.

## 2. Install Node.js on the VPS

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt-get install -y nodejs
```

## 3. Copy `relay.js` to the VPS

```bash
scp relay.js root@YOUR_SERVER_IP:~/relay.js
```

## 4. Run it

```bash
ssh root@YOUR_SERVER_IP
export RELAY_SECRET="pick-a-long-random-string-nobody-can-guess"
node relay.js
```

To keep it running after you disconnect, use `pm2`:

```bash
npm install -g pm2
RELAY_SECRET="your-secret" pm2 start relay.js --name vpn-relay
pm2 save
pm2 startup   # follow the printed instructions so it survives reboots
```

Open the firewall port (default 8787):

```bash
sudo ufw allow 8787
```

## 5. Add it in the admin panel

Go to `/admin` → VPN servers → **Add VPN** and fill in:

- **Label**: any name, e.g. "US - New Jersey"
- **Country code**: e.g. `US`
- **Relay URL**: `http://YOUR_SERVER_IP:8787`
- **Secret key**: the same value you set for `RELAY_SECRET`

Click **Check** to confirm it's reachable, then **Set active** to route scans
through it.

## Security notes

- Keep `RELAY_SECRET` private — treat it like a password.
- Prefer putting this behind HTTPS in production (e.g. Caddy or nginx as a
  reverse proxy with a free Let's Encrypt certificate) instead of plain HTTP.
- If your VPS provider lets you restrict inbound traffic by IP, only allow
  your app's server IP to reach port 8787.
