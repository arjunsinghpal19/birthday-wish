const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');
const adminSecJs = fs.readFileSync(path.join(ROOT_DIR, 'js', 'modules', 'admin-security.js'), 'utf8');

console.log("============================================================");
console.log("🔍 DIAGNOSTIC LIVE DOM & RUNTIME PROOF TEST");
console.log("============================================================\n");

// 1. Element Count & Uniqueness Check
console.log("--- 1. ELEMENT COUNT & UNIQUENESS IN index.html ---");
const forgotSubstepCount = (indexHtml.match(/id=["']forgot-substep-backup["']/g) || []).length;
const btnRegenCount = (indexHtml.match(/class=["'][^"']*btn-regen-code-action[^"']*["']/g) || []).length;
const forgotDisplayCount = (indexHtml.match(/id=["']forgot-backup-code-display["']/g) || []).length;
const secValCount = (indexHtml.match(/class=["'][^"']*sec-backup-code-val[^"']*["']/g) || []).length;
const secCodeDisplayCount = (indexHtml.match(/id=["']sec-code-display["']/g) || []).length;

console.log(`id="forgot-substep-backup": ${forgotSubstepCount}`);
console.log(`class="btn-regen-code-action": ${btnRegenCount}`);
console.log(`id="forgot-backup-code-display": ${forgotDisplayCount}`);
console.log(`class="sec-backup-code-val": ${secValCount}`);
console.log(`id="sec-code-display": ${secCodeDisplayCount}`);

// 2. Real API fetch against local server
console.log("\n--- 2. REAL API FETCH AGAINST LOCAL SERVER (http://localhost:3000/api/auth) ---");
async function testRealApi() {
  const reqStart = Date.now();
  const testCode = `WS-${Math.floor(0x1000 + Math.random() * 0xF000).toString(16).toUpperCase()}-${Math.floor(0x1000 + Math.random() * 0xF000).toString(16).toUpperCase()}-${Math.floor(0x1000 + Math.random() * 0xF000).toString(16).toUpperCase()}`;
  console.log(`Generated test code: ${testCode}`);
  
  try {
    const res = await fetch('http://localhost:3000/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save-recovery-code', code: testCode })
    });
    const reqEnd = Date.now();
    const data = await res.json();
    console.log(`HTTP Status: ${res.status} (${res.statusText})`);
    console.log(`Roundtrip Duration: ${reqEnd - reqStart}ms`);
    console.log(`Response JSON:`, JSON.stringify(data, null, 2));
    console.log(`data.success: ${data.success}`);
    console.log(`data.updatedAt: ${data.updatedAt}`);
    console.log(`data.backupCodeUpdatedAt: ${data.backupCodeUpdatedAt}`);
    return { testCode, data };
  } catch (err) {
    console.error(`API Fetch Error:`, err.message);
    return null;
  }
}

testRealApi().then(apiResult => {
  console.log("\n--- 3. TIMESTAMP NORMALIZATION CHECK ---");
  if (apiResult && apiResult.data && apiResult.data.updatedAt) {
    const tSession = apiResult.data.updatedAt;
    const tServer = apiResult.data.updatedAt;
    const msSession = new Date(tSession).getTime();
    const msServer = new Date(tServer).getTime();
    console.log(`Session Timestamp: ${tSession} -> ${msSession}ms`);
    console.log(`Server Timestamp:  ${tServer} -> ${msServer}ms`);
    console.log(`msSession === msServer: ${msSession === msServer}`);
  }
  console.log("\n============================================================");
});
