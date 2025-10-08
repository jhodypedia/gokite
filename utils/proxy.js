/**
 * utils/proxy.js
 * ==========================
 * Utility untuk membuat HTTP/SOCKS proxy agent untuk axios
 * dengan fallback ke koneksi langsung jika proxy invalid.
 * 
 * Mendukung format:
 *   http://user:pass@host:port
 *   socks5://user:pass@host:port
 *   socks4://host:port
 *   http://host:port
 */

const { HttpsProxyAgent } = require("https-proxy-agent");
const { SocksProxyAgent } = require("socks-proxy-agent");
const axios = require("axios");
const { logMessage } = require("./logger");

/**
 * Membuat instance agent sesuai tipe proxy.
 * @param {string} proxyUrl
 * @returns {HttpsProxyAgent|SocksProxyAgent|undefined}
 */
function getProxyAgent(proxyUrl) {
  try {
    if (!proxyUrl || proxyUrl === "direct") return undefined;
    if (proxyUrl.startsWith("http")) {
      return new HttpsProxyAgent(proxyUrl);
    } else if (proxyUrl.startsWith("socks")) {
      return new SocksProxyAgent(proxyUrl);
    } else {
      throw new Error("Unsupported proxy protocol");
    }
  } catch (e) {
    logMessage(0, 0, `Invalid proxy format: ${e.message}`, "error", "PROXY");
    return undefined;
  }
}

/**
 * Mengecek apakah proxy bisa digunakan.
 * @param {string} proxyUrl
 * @param {number} timeoutMs
 * @returns {Promise<boolean>}
 */
async function testProxy(proxyUrl, timeoutMs = 5000) {
  if (!proxyUrl) return false;
  try {
    const agent = getProxyAgent(proxyUrl);
    const start = Date.now();
    const res = await axios.get("https://api.ipify.org?format=json", {
      httpsAgent: agent,
      httpAgent: agent,
      timeout: timeoutMs,
    });
    const ms = Date.now() - start;
    logMessage(0, 0, `Proxy OK (${res.data.ip}) in ${ms}ms`, "success", "PROXY");
    return true;
  } catch (e) {
    logMessage(0, 0, `Proxy test failed: ${e.message}`, "error", "PROXY");
    return false;
  }
}

/**
 * Memilih proxy secara acak dari array.
 * @param {string[]} proxies
 * @returns {string|null}
 */
function pickRandomProxy(proxies = []) {
  if (!Array.isArray(proxies) || proxies.length === 0) return null;
  return proxies[Math.floor(Math.random() * proxies.length)];
}

/**
 * Membaca list proxy dari file teks (opsional)
 * Format file:
 *   http://user:pass@host:port
 *   socks5://host:port
 *   ...
 */
const fs = require("fs");
function loadProxyList(filePath = "./proxies.txt") {
  try {
    if (!fs.existsSync(filePath)) return [];
    const lines = fs
      .readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"));
    logMessage(0, 0, `Loaded ${lines.length} proxies`, "process", "PROXY");
    return lines;
  } catch (e) {
    logMessage(0, 0, `Error loading proxy file: ${e.message}`, "error", "PROXY");
    return [];
  }
}

/**
 * Mendapatkan proxy agent random dari list file proxy.txt
 * dengan fallback ke direct.
 */
function getRandomProxyAgent() {
  const list = loadProxyList();
  const proxy = pickRandomProxy(list);
  if (!proxy) return undefined;
  return getProxyAgent(proxy);
}

module.exports = {
  getProxyAgent,
  getRandomProxyAgent,
  loadProxyList,
  pickRandomProxy,
  testProxy,
};
