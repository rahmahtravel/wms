const fs = require('fs');
const path = require('path');

const viewsDir = path.join(__dirname, '..', 'views');

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...walk(full));
    else files.push(full);
  }
  return files;
}

const files = walk(viewsDir).filter(f => f.endsWith('.ejs'));
let problems = [];
for (const file of files) {
  const rel = path.relative(viewsDir, file).replace(/\\/g, '/');
  const depth = rel.split('/').length - 1; // path segments after views
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    let idx = 0;
    while ((idx = lines[i].indexOf('include(', idx)) !== -1) {
      // find opening quote
      const rest = lines[i].slice(idx + 'include('.length);
      const q = rest[0];
      if (q === '"' || q === "'") {
        const endQuote = rest.indexOf(q, 1);
        if (endQuote !== -1) {
          const includePath = rest.slice(1, endQuote);
          if (includePath.includes('partials')) {
            const upCount = (includePath.match(/\.\./g) || []).length;
            if (upCount !== depth) {
              problems.push({ file: rel, includePath, depth, upCount, line: i+1 });
            }
          }
        }
      }
      idx += 'include('.length;
    }
  }
}

if (problems.length === 0) {
  console.log('No include path problems found.');
  process.exit(0);
}

console.log('Include path problems:');
for (const p of problems) {
  console.log(`- ${p.file}: include('${p.includePath}') - expected ../ repeated ${p.depth} times but found ${p.upCount}`);
}
process.exit(1);
