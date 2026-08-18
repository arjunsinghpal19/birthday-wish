const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function scanDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      scanDir(filePath, fileList);
    } else if (file.endsWith('.js')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const jsDir = path.join(__dirname, '../js');
const files = scanDir(jsDir);
console.log(`Validating syntax for ${files.length} JavaScript files in js/...`);

let errorCount = 0;
for (const file of files) {
  try {
    execSync(`node --check "${file}"`, { stdio: 'pipe' });
    console.log(`  ✓ ${path.relative(path.join(__dirname, '..'), file)}`);
  } catch (err) {
    console.error(`  ✗ Syntax error in ${file}:`);
    console.error(err.stderr ? err.stderr.toString() : err.message);
    errorCount++;
  }
}

if (errorCount === 0) {
  console.log(`\n🎉 All ${files.length} JS files have valid syntax!`);
  process.exit(0);
} else {
  console.error(`\n❌ ${errorCount} files failed syntax check.`);
  process.exit(1);
}
