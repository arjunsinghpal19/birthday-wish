const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log("============================================================");
console.log("🔍 VALIDATING SYNTAX & QUICK EDITOR DOM INTEGRITY");
console.log("============================================================");

// 1. JavaScript Syntax Verification
function checkDir(dir) {
  let count = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.git') {
      count += checkDir(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      execSync(`node --check "${fullPath}"`);
      count++;
    }
  }
  return count;
}

const totalJs = checkDir(path.resolve(__dirname, '..'));
console.log(`  ✓ 1. All ${totalJs} JavaScript files passed syntax verification (node --check)`);

// 2. Quick Editor DOM Integrity and Section Order Verification
const indexHtml = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');

// Extract all data-section attributes within Quick Editor #editor-sections
const sectionRegex = /<div\s+class="editor-section"\s+data-section="([^"]+)"/g;
const sections = [];
let match;
while ((match = sectionRegex.exec(indexHtml)) !== null) {
  sections.push(match[1]);
}

console.log(`  ✓ 2. Found ${sections.length} Quick Editor sections in index.html:`, sections);

const expectedOrder = [
  "basic",
  "sender",
  "relationship",
  "letter",
  "memory",
  "reasons",
  "wishes",
  "gallery",
  "timeline",
  "gift",
  "music",
  "videowish"
];

assert.strictEqual(sections.length, expectedOrder.length, `Must have ${expectedOrder.length} sections`);
expectedOrder.forEach((sec, idx) => {
  assert.strictEqual(sections[idx], sec, `Section at index ${idx} must be "${sec}", got "${sections[idx]}"`);
});
console.log("  ✓ 3. Quick Editor section order matches exact specification:");
console.log("     1. Basic Info (basic)");
console.log("     2. Sender Info (sender)");
console.log("     3. Relationship Preset Style (relationship)");
console.log("     4. Birthday Letter & Font Style (letter)");
console.log("     5. Special Memory (memory)");
console.log("     6. Reasons Why You're Special (reasons)");
console.log("     7. Heartfelt Wishes (wishes)");
console.log("     8. Photo Moments & Gallery (gallery)");
console.log("     9. Our Journey Timeline (timeline)");
console.log("     10. Birthday Gift & Privilege Pass (gift)");
console.log("     11. Music & Audio Track (music)");
console.log("     12. Video Wish (videowish)");

// Verify #input-from and data-reset="sender" presence
assert(indexHtml.includes('id="input-from"'), '#input-from must exist in index.html');
assert(indexHtml.includes('data-reset="sender"'), 'data-reset="sender" button must exist in index.html');
console.log("  ✓ 4. Preserved #input-from and data-reset=\"sender\" elements");

console.log("\n============================================================");
console.log("🎉 ALL SYNTAX & DOM INTEGRITY CHECKS PASSED!");
console.log("============================================================\n");
