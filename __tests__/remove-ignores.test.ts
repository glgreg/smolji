import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, it, expect, afterEach } from 'vitest';
import { processFile, scanDirectory, runCleanup } from '../scripts/remove-ignores.js';

describe('scripts/remove-ignores.js', () => {
  const tempDirs: string[] = [];

  function createTempDir() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'smolji-ignores-'));
    tempDirs.push(dir);
    return dir;
  }

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('strips @ts-ignore, @ts-nocheck, and eslint-disable comments from .ts and .tsx files', () => {
    const rootDir = createTempDir();
    const srcDir = path.join(rootDir, 'src', 'nested');
    fs.mkdirSync(srcDir, { recursive: true });

    const targetFile = path.join(srcDir, 'sample.tsx');
    fs.writeFileSync(
      targetFile,
      [
        '// @ts-nocheck',
        '// @ts-ignore',
        '// eslint-disable-next-line no-unused-vars',
        '/* eslint-disable */',
        'export const value = 42;',
      ].join('\n'),
      'utf8'
    );

    const untouchedFile = path.join(srcDir, 'clean.ts');
    fs.writeFileSync(untouchedFile, 'export const clean = true;\n', 'utf8');

    const nonTsFile = path.join(srcDir, 'notes.md');
    fs.writeFileSync(nonTsFile, '// @ts-ignore\n', 'utf8');

    runCleanup(rootDir);

    const cleanedContent = fs.readFileSync(targetFile, 'utf8');
    expect(cleanedContent).not.toContain('@ts-nocheck');
    expect(cleanedContent).not.toContain('@ts-ignore');
    expect(cleanedContent).not.toContain('eslint-disable');
    expect(cleanedContent).toContain('export const value = 42;');

    expect(processFile(untouchedFile)).toBe(false);
    expect(fs.readFileSync(nonTsFile, 'utf8')).toContain('// @ts-ignore');
  });

  it('handles missing src directory gracefully', () => {
    const emptyRoot = createTempDir();
    expect(() => runCleanup(emptyRoot)).not.toThrow();
    expect(() => scanDirectory(emptyRoot)).not.toThrow();
  });
});
