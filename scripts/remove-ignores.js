// @ts-check
const fs = require('fs');
const path = require('path');

/** @type {string[]} */
const directoriesToScan = ['src'];

/** @type {string[]} */
const fileExtensions = ['.ts', '.tsx'];

/** @type {RegExp[]} */
const regexesToRemove = [
  /\/\/\s*@ts-nocheck/gi,
  /\/\/\s*@ts-ignore/gi,
  /\/\/\s*eslint-disable-next-line.*/gi,
  /\/\/\s*eslint-disable.*/gi,
  /\/\*\s*eslint-disable[\s\S]*?\*\//gi
];

/**
 * Strips TypeScript and ESLint ignore comments from a single file in place.
 * @param {string} filePath - Absolute or relative path of the file to process.
 * @returns {boolean} True if the file was modified, false otherwise.
 */
function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  for (const regex of regexesToRemove) {
    regex.lastIndex = 0;
    if (regex.test(content)) {
      regex.lastIndex = 0;
      content = content.replace(regex, '');
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Removed ignores from: ${filePath}`);
  }

  return modified;
}

/**
 * Recursively scans a directory and processes matching source files.
 * @param {string} dir - Directory path to scan.
 * @returns {void}
 */
function scanDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      scanDirectory(fullPath);
    } else if (fileExtensions.some(ext => fullPath.endsWith(ext))) {
      processFile(fullPath);
    }
  }
}

/**
 * Runs the ignore-comment cleanup across configured project directories.
 * @param {string} [rootDir] - Optional root directory override.
 * @returns {void}
 */
function runCleanup(rootDir = path.join(__dirname, '..')) {
  for (const dir of directoriesToScan) {
    const fullPath = path.join(rootDir, dir);
    if (fs.existsSync(fullPath)) {
      scanDirectory(fullPath);
    }
  }
  console.log('Ignore comments cleanup complete.');
}

if (require.main === module) {
  runCleanup();
}

module.exports = {
  directoriesToScan,
  fileExtensions,
  regexesToRemove,
  processFile,
  scanDirectory,
  runCleanup
};
