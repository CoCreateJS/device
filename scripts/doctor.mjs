import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const platform = process.argv[2];
const tools = { android: [['java', '-version'], ['adb', '--version']], ios: [['xcodebuild', '-version']], windows: [['dotnet', '--version'], ['winapp', '--version']] };
if (!tools[platform]) { console.error('Usage: node scripts/doctor.mjs android|ios|windows'); process.exit(2); }
const report = { target: platform, host: process.platform, projectDirectory: path.join(root, 'src/native', platform), nativeBundle: fs.existsSync(path.join(root, 'dist/native/CoCreate-device.native.min.js')), appConfiguration: fs.existsSync(process.env.COCREATE_DEVICE_CONFIG || path.join(root, 'device.config.json')), tools: {} };
for (const [command, ...args] of tools[platform]) {
 const result = spawnSync(command, args, { encoding: 'utf8', timeout: 10000 });
 report.tools[command] = result.error ? result.error.code : (result.stdout + result.stderr).trim().split('\n')[0];
}
report.projectPresent = fs.existsSync(report.projectDirectory) && fs.readdirSync(report.projectDirectory).some(name => /gradlew|\.xcodeproj$|\.xcworkspace$|\.csproj$/.test(name));
report.signing = 'Not inspected; configure on the platform build host.';
console.log(JSON.stringify(report, null, 2));
