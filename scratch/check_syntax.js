const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

function checkDir(dir) {
  let count = 0;
  fs.readdirSync(dir).forEach(f => {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      if (f !== "node_modules" && f !== ".git") count += checkDir(p);
    } else if (p.endsWith(".js")) {
      try {
        execSync(`node --check "${p}"`);
        count++;
      } catch (e) {
        console.error("Syntax error in:", p);
        process.exit(1);
      }
    }
  });
  return count;
}

const jsCount = checkDir("js");
const apiCount = checkDir("api");
const scratchCount = checkDir("scratch");

console.log(`✓ Syntax check PASSED for ${jsCount + apiCount + scratchCount} JS files (${jsCount} in js/, ${apiCount} in api/, ${scratchCount} in scratch/).`);
