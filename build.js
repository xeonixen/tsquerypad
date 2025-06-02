const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');
const fileFilters = [
  'linq.d.ts',
  'media/index.html',
  '.css',
  'media/vs'
];
function shouldCopyFile(srcPath) {
  if (!srcPath)
    return false;
  if (fileFilters.find(x => srcPath.toLowerCase().includes(x.toLowerCase())))
    return true;
  return false;
}

function copyStaticFiles(srcDir, outDir) {


  const files = fs.readdirSync(srcDir);

  files.forEach(file => {
    const srcPath = path.join(srcDir, file);
    const outPath = path.join(outDir, file);
    const stat = fs.statSync(srcPath);

    if (stat.isDirectory()) {
      copyStaticFiles(srcPath, outPath); // recurse into subfolders
    } else if (shouldCopyFile(srcPath)) {
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }
      fs.copyFileSync(srcPath, outPath);
      console.log(`Copied ${srcPath} -> ${outPath}`);
    }
  });
}
esbuild.build({
  entryPoints: ['src/extension.ts'], // or extension.js if you use JS
  bundle: true,
  platform: 'node',        // VS Code extensions run in Node.js
  target: 'node16',        // Adjust to your Node version (VS Code currently uses node16)
  outfile: 'out/extension.js',
  external: ['vscode'],    // vscode API provided by VS Code, don’t bundle it
  sourcemap: false,
  minify: true,
}).catch(() => process.exit(1))
  .then(() => {
    copyStaticFiles('src/media', 'out/media');
  });

