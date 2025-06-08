const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 12312;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Roku Proxy Server Running');
});

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Proxy route
// Format: /api/:ip/:path*
// Example: /api/192.168.0.6/query/device-info
app.all('/api/:ip/*', async (req, res) => {
    const { ip } = req.params;
    const path = req.params[0]; // Captures the rest of the path
    const method = req.method;
    
    // Construct the target URL
    // Roku uses port 8060
    const targetUrl = `http://${ip}:8060/${path}`;

    console.log(`Proxying ${method} request to: ${targetUrl}`);

    try {
        // Filter headers to avoid sending Host/Origin that might confuse Roku
        const headers = {};
        if (req.headers['content-type']) {
            headers['Content-Type'] = req.headers['content-type'];
        }

        const response = await fetch(targetUrl, {
            method: method,
            headers: headers,
            body: method !== 'GET' && method !== 'HEAD' ? JSON.stringify(req.body) : undefined
        });

        const data = await response.text();
        
        // Forward status
        res.status(response.status);

        // Forward Content-Type if present
        const contentType = response.headers.get('content-type');
        if (contentType) {
            res.set('Content-Type', contentType);
        }

        res.send(data);

    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).json({ error: 'Proxy request failed', details: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Proxy server running on http://localhost:${PORT}`);
});
