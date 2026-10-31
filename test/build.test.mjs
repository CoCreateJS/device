import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { prepareApp } from '../scripts/prepare.mjs';
const root = path.resolve(import.meta.dirname, '..');

test('webpack selects separate native entry/output and uploads only with explicit flag', async () => {
 const source = await fs.readFile(path.join(root, 'webpack.config.js'), 'utf8');
 const module = { exports: {} }; const req = createRequire(import.meta.url); let uploads = 0;
 class Plugin {}
 vm.runInNewContext(source, { module, __dirname: root, require(name) {
  if (name === 'path') return req(name);
  if (name === 'mini-css-extract-plugin') return Plugin;
  if (name === 'esbuild-loader') return { EsbuildPlugin: Plugin };
  if (name === '@cocreate/webpack') return { FileUploader: class { constructor() { uploads++; } } };
  throw new Error(name);
 } });
 const browser = await module.exports({}, { mode: 'production' });
 const native = await module.exports({ native: 'true' }, { mode: 'production' });
 assert.equal(browser.entry['CoCreate-device'], './src/index.js');
 assert.equal(native.entry['CoCreate-device.native'], './src/native/index.js');
 assert.equal(native.output.path, path.join(root, 'dist/native')); assert.equal(uploads, 0);
 assert(browser.output.clean.keep.test('native')); assert(browser.output.clean.keep.test('native/CoCreate-device.native.min.js'));
 await module.exports({ upload: 'true' }, {}); assert.equal(uploads, 1);
});
test('app preparation copies assets, inserts native bootstrap first, and records a content digest', async t => {
 const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'device-app-')); t.after(() => fs.rm(temp, { recursive: true, force: true }));
 await fs.mkdir(path.join(temp, 'app')); await fs.writeFile(path.join(temp, 'app/index.html'), '<html><head><script src="app.js"></script></head></html>');
 await fs.writeFile(path.join(temp, 'app/app.js'), 'app'); await fs.writeFile(path.join(temp, 'native.js'), 'native bootstrap');
 const config = { appId: 'app.cocreate.test', name: 'Test', version: '1.0.0', webDir: './app', entry: 'index.html' };
 const configPath = path.join(temp, 'device.config.json'); await fs.writeFile(configPath, JSON.stringify(config));
 const a = await prepareApp({ configPath, repoRoot: temp, bundlePath: path.join(temp, 'native.js') });
 const html = await fs.readFile(path.join(a.output, 'index.html'), 'utf8');
 assert(html.indexOf('data-cocreate-device') < html.indexOf('src="app.js"'));
 assert.equal(await fs.readFile(path.join(a.output, '_cocreate/device.js'), 'utf8'), 'native bootstrap');
 const b = await prepareApp({ configPath, repoRoot: temp, bundlePath: path.join(temp, 'native.js') });
 assert.equal(a.manifest.assetsSha256, b.manifest.assetsSha256);
 config.entry = '../outside.html'; await fs.writeFile(configPath, JSON.stringify(config));
 await assert.rejects(prepareApp({ configPath, repoRoot: temp, bundlePath: path.join(temp, 'native.js') }), /within webDir/);
});
test('project discovery ignores internal Xcode workspaces and rejects ambiguity', { skip: process.platform === 'win32' }, async t => {
 const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'device-ios-')); t.after(() => fs.rm(temp, { recursive: true, force: true }));
 await fs.mkdir(path.join(temp, 'App.xcodeproj/project.xcworkspace'), { recursive: true });
 const command = 'set -euo pipefail; source "$1"; select_ios_project "$2"; printf "%s\\n" "${PROJECT_ARGS[@]}"';
 let result = spawnSync('bash', ['-c', command, 'test', path.join(root, 'scripts/ios/project.sh'), temp], { encoding: 'utf8' });
 assert.equal(result.status, 0, result.stderr); assert.match(result.stdout, /^-project\n/);
 await fs.mkdir(path.join(temp, 'Other.xcodeproj'));
 result = spawnSync('bash', ['-c', command, 'test', path.join(root, 'scripts/ios/project.sh'), temp], { encoding: 'utf8' });
 assert.notEqual(result.status, 0); assert.match(result.stderr, /one iOS host project/);
});
test('Android build reports missing host without requiring or installing Java', { skip: process.platform !== 'linux' }, () => {
 const result = spawnSync('bash', ['scripts/android/build.sh', 'debug'], { cwd: root, encoding: 'utf8' });
 assert.notEqual(result.status, 0); assert.match(result.stderr, /host project is not scaffolded/);
});
test('iOS remote runner rejects a mismatched source revision before invoking a build', { skip: process.platform === 'win32' }, async t => {
 const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'device-remote-')); t.after(() => fs.rm(temp, { recursive: true, force: true }));
 assert.equal(spawnSync('git', ['init', temp]).status, 0);
 // Empty repository has no matching HEAD; no xcodebuild or remote connection is involved.
 const result = spawnSync('bash', ['scripts/ios/build-remote.sh', temp, 'archive', 'CoCreateDevice', '', '', '', 'different-revision'], { cwd: root, encoding: 'utf8' });
 assert.notEqual(result.status, 0); assert.match(result.stderr, /must be clean and match revision/);
});
test('a browser bootstrap that cannot replace navigator exposes its error and preserves the original', () => {
 const code = `
  import assert from 'node:assert/strict';
  const original = {};
  Object.defineProperty(globalThis, 'navigator', { configurable: false, get: () => original });
  globalThis.window = globalThis;
  const { default: NativeDevice } = await import('./src/native/index.js');
  assert.equal(NativeDevice.initializationError.name, 'NotSupportedError');
  assert.equal(globalThis.navigator, original);
 `;
 const result = spawnSync(process.execPath, ['--input-type=module', '-e', code], { cwd: root, encoding: 'utf8' });
 assert.equal(result.status, 0, result.stderr);
});
