/**
 * microserviceClient.js
 *
 * Lightweight HTTP client for calling internal Python microservices.
 * Uses Node's built-in https/http modules — zero new dependencies.
 *
 * Key behaviours:
 *  • Enforces a short timeout (default 4 s) so a slow/down microservice
 *    never blocks the monolith.
 *  • Returns { success, data } on success, { success: false, error } on failure.
 *  • Callers decide whether to fall back to the original implementation.
 */

const http  = require('http');
const https = require('https');

const DEFAULT_TIMEOUT_MS = parseInt(process.env.MICROSERVICE_TIMEOUT_MS || '4000', 10);

/**
 * Post JSON to a microservice endpoint.
 *
 * @param {string} url        - Full URL, e.g. http://localhost:8001/api/notify/welcome
 * @param {object} payload    - Request body (serialised to JSON)
 * @param {string} apiKey     - Value for X-API-Key header
 * @param {number} [timeoutMs]
 * @returns {Promise<{success:boolean, data?:object, error?:string}>}
 */
function postJson(url, payload, apiKey, timeoutMs = DEFAULT_TIMEOUT_MS) {
  return new Promise((resolve) => {
    let resolved = false;

    const safeResolve = (value) => {
      if (!resolved) {
        resolved = true;
        resolve(value);
      }
    };

    try {
      const body    = JSON.stringify(payload);
      const parsed  = new URL(url);
      const isHttps = parsed.protocol === 'https:';
      const lib     = isHttps ? https : http;

      const options = {
        hostname: parsed.hostname,
        port:     parsed.port || (isHttps ? 443 : 80),
        path:     parsed.pathname + parsed.search,
        method:   'POST',
        headers:  {
          'Content-Type':   'application/json',
          'Content-Length': Buffer.byteLength(body),
          'X-API-Key':      apiKey || '',
        },
        timeout: timeoutMs,
      };

      const req = lib.request(options, (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            const data = JSON.parse(raw);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              safeResolve({ success: true, data });
            } else {
              safeResolve({ success: false, error: data?.detail || `HTTP ${res.statusCode}` });
            }
          } catch {
            safeResolve({ success: false, error: 'Invalid JSON response from microservice' });
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        safeResolve({ success: false, error: `Microservice timeout after ${timeoutMs}ms` });
      });

      req.on('error', (err) => {
        safeResolve({ success: false, error: err.message });
      });

      req.write(body);
      req.end();
    } catch (err) {
      safeResolve({ success: false, error: err.message });
    }
  });
}

/**
 * GET JSON from a microservice endpoint.
 */
function getJson(url, apiKey, timeoutMs = DEFAULT_TIMEOUT_MS) {
  return new Promise((resolve) => {
    let resolved = false;

    const safeResolve = (value) => {
      if (!resolved) {
        resolved = true;
        resolve(value);
      }
    };

    try {
      const parsed  = new URL(url);
      const isHttps = parsed.protocol === 'https:';
      const lib     = isHttps ? https : http;

      const options = {
        hostname: parsed.hostname,
        port:     parsed.port || (isHttps ? 443 : 80),
        path:     parsed.pathname + parsed.search,
        method:   'GET',
        headers:  { 'X-API-Key': apiKey || '' },
        timeout:  timeoutMs,
      };

      const req = lib.request(options, (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            const data = JSON.parse(raw);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              safeResolve({ success: true, data });
            } else {
              safeResolve({ success: false, error: data?.detail || `HTTP ${res.statusCode}` });
            }
          } catch {
            safeResolve({ success: false, error: 'Invalid JSON response from microservice' });
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        safeResolve({ success: false, error: `Microservice timeout after ${timeoutMs}ms` });
      });

      req.on('error', (err) => {
        safeResolve({ success: false, error: err.message });
      });

      req.end();
    } catch (err) {
      safeResolve({ success: false, error: err.message });
    }
  });
}

module.exports = { postJson, getJson };
