
const http = require('node:http');

// Store created waybills while the server is running.
const waybills = new Map();

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
  });
  res.end(JSON.stringify(data));
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char]);
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    return sendJson(res, 200, { status: 'ok' });
  }

  // Create a new waybill
  if (req.method === 'POST' && req.url === '/waybills') {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk;
    });

    req.on('end', () => {
      let shipment;

      try {
        shipment = JSON.parse(body);
      } catch {
        return sendJson(res, 400, {
          message: 'Invalid JSON',
        });
      }

      if (
        !shipment ||
        typeof shipment.orderNumber !== 'string' ||
        !shipment.orderNumber.trim()
      ) {
        return sendJson(res, 400, {
          message: 'Invalid order number',
        });
      }

      const orderNumber = shipment.orderNumber.trim();
      const waybillId = `HTTP-${orderNumber}`;

      if (waybills.has(waybillId)) {
        return sendJson(res, 409, {
          message: 'Waybill already exists',
        });
      }

      const result = {
        waybillId,
        trackingNumber: `TRACK-${orderNumber}`,
        status: 'CREATED',
      };

      waybills.set(waybillId, result);

      return sendJson(res, 201, result);
    });

    return;
  }

  // Track an existing waybill
  const trackingMatch = req.url.match(
    /^\/waybills\/([^/]+)\/tracking$/,
  );

  if (req.method === 'GET' && trackingMatch) {
    let waybillId;

    try {
      waybillId = decodeURIComponent(trackingMatch[1]);
    } catch {
      return sendJson(res, 400, {
        message: 'Invalid waybill ID',
      });
    }

    if (!waybills.has(waybillId)) {
      return sendJson(res, 404, {
        message: 'Waybill not found',
      });
    }

    return sendJson(res, 200, {
      waybillId,
      status: 'IN_TRANSIT',
    });
  }

  // Get a shipping label
  const labelMatch = req.url.match(
    /^\/waybills\/([^/]+)\/label$/,
  );

  if (req.method === 'GET' && labelMatch) {
    let waybillId;

    try {
      waybillId = decodeURIComponent(labelMatch[1]);
    } catch {
      return sendJson(res, 400, {
        message: 'Invalid waybill ID',
      });
    }

    if (!waybills.has(waybillId)) {
      return sendJson(res, 404, {
        message: 'Waybill not found',
      });
    }

    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
    });

    res.end(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Shipping Label</title>
        </head>
        <body>
          <h1>HTTP Courier Shipping Label</h1>
          <p>Waybill: ${escapeHtml(waybillId)}</p>
        </body>
      </html>
    `);

    return;
  }

  return sendJson(res, 404, {
    message: 'Endpoint not found',
  });
});

server.listen(3001, () => {
  console.log('Mock courier HTTP API running on port 3001');
});
