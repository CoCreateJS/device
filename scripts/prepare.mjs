import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export async function prepareApp({ configPath, repoRoot, bundlePath } = {}) {
 repoRoot ??= path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
 configPath = path.resolve(configPath || process.env.COCREATE_DEVICE_CONFIG || path.join(repoRoot, 'device.config.json'));
 const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
 if (!/^[A-Za-z]\w*(?:\.[A-Za-z]\w*)+$/.test(config.appId || '') || typeof config.name !== 'string' || !config.name.trim() || !/^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/.test(config.version || '')) throw new Error('App configuration requires appId, name, and semantic version.');
 if (typeof config.webDir !== 'string' || typeof config.entry !== 'string') throw new Error('App configuration requires webDir and entry.');
 if (config.capabilities !== undefined && (!Array.isArray(config.capabilities) || config.capabilities.some(value => typeof value !== 'string' || !/^device\.[A-Za-z]\w*(?:\.[A-Za-z]\w*)*$/.test(value)))) throw new Error('Capabilities must be device.* method names.');
 if (config.allowedOrigins !== undefined && (!Array.isArray(config.allowedOrigins) || config.allowedOrigins.some(value => typeof value !== 'string' || !value || value === '*'))) throw new Error('Allowed origins must be explicit origin strings.');
 const source = await fs.realpath(path.resolve(path.dirname(configPath), config.webDir));
 const entry = path.normalize(config.entry);
 if (path.isAbsolute(entry) || entry === '..' || entry.startsWith('..' + path.sep)) throw new Error('App entry must stay within webDir.');
 bundlePath ??= path.join(repoRoot, 'dist/native/CoCreate-device.native.min.js');
 const bootstrap = await fs.readFile(bundlePath);
 const output = path.join(repoRoot, 'build', config.appId, 'web');
 const relativeOutput = path.relative(source, output);
 if (!relativeOutput.startsWith('..' + path.sep) && relativeOutput !== '..' && !path.isAbsolute(relativeOutput)) throw new Error('Generated output must be outside webDir.');
 const paths = [];
 async function walk(dir, prefix = '') {
  for (const item of await fs.readdir(dir, { withFileTypes: true })) {
   const name = path.join(prefix, item.name);
   if (item.isSymbolicLink()) throw new Error('Web assets must not contain symlinks: ' + name);
   if (prefix === '' && ['_cocreate', 'device-app.json'].includes(item.name)) throw new Error('Reserved generated asset name: ' + item.name);
   if (item.isDirectory()) await walk(path.join(dir, item.name), name);
   else if (item.isFile()) paths.push(name);
  }
 }
 await walk(source);
 const html = await fs.readFile(path.join(source, entry), 'utf8');
 if (!/<head(?:\s[^>]*)?>/i.test(html)) throw new Error('App entry must contain a head element for the native bootstrap.');
 const staging = path.join(repoRoot, 'build', config.appId, '.web-' + randomUUID());
 await fs.mkdir(staging, { recursive: true });
 try {
  await fs.cp(source, staging, { recursive: true });
  await fs.mkdir(path.join(staging, '_cocreate'), { recursive: true });
  await fs.writeFile(path.join(staging, '_cocreate/device.js'), bootstrap);
  const scriptPath = path.relative(path.dirname(entry), '_cocreate/device.js').split(path.sep).join('/');
  const updated = html.replace(/<head(?:\s[^>]*)?>/i, tag => tag + '\n<script data-cocreate-device src="' + scriptPath + '"></script>');
  await fs.writeFile(path.join(staging, entry), updated);
  const hash = createHash('sha256');
  for (const name of [...paths, '_cocreate/device.js'].sort()) hash.update(name.split(path.sep).join('/') + '\0').update(await fs.readFile(path.join(staging, name)));
  let revision = null;
  try { revision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch {}
  const manifest = { appId: config.appId, name: config.name, version: config.version, entry: config.entry, protocolVersion: 1, capabilities: config.capabilities || [], allowedOrigins: config.allowedOrigins || [], revision, assetsSha256: hash.digest('hex') };
  await fs.writeFile(path.join(staging, 'device-app.json'), JSON.stringify(manifest, null, 2) + '\n');
  await fs.rm(output, { recursive: true, force: true });
  await fs.rename(staging, output);
  return { output, manifest };
 } catch (error) { await fs.rm(staging, { recursive: true, force: true }); throw error; }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
 try { console.log((await prepareApp()).output); }
 catch (error) { console.error('Device app preparation failed: ' + error.message); process.exitCode = 1; }
}
