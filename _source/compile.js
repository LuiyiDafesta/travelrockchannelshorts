const fs = require('fs');
const path = require('path');

const cssDir = path.join(__dirname, 'css');
const files = [
  path.join(cssDir, 'main.css'),
  path.join(cssDir, 'components.css'),
  path.join(cssDir, 'responsive.css')
];

let compiled = '';

files.forEach(file => {
  if (fs.existsSync(file)) {
    compiled += fs.readFileSync(file, 'utf8') + '\n';
  }
});

// Simple regex-based minifier
// 1. Remove comments
compiled = compiled.replace(/\/\*[\s\S]*?\*\//g, '');
// 2. Remove multiple spaces/newlines
compiled = compiled.replace(/\s+/g, ' ');
// 3. Remove spaces around structural symbols
compiled = compiled.replace(/\s*([{}:;])\s*/g, '$1');
// 4. Clean up trailing semicolons inside blocks
compiled = compiled.replace(/;}/g, '}');
// 5. Trim
compiled = compiled.trim();

const outputDir = path.join(__dirname, '..', 'assets', 'css');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(path.join(outputDir, 'app.min.css'), compiled, 'utf8');
console.log('CSS compiled and minified successfully to assets/css/app.min.css!');
