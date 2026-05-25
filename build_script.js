const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const src = "C:\\Users\\82107\\OneDrive\\바탕 화면\\제작한 어플서비스\\study-app";
const dest = "C:\\temp_study_app";

console.log("Copying files...");
if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

const items = fs.readdirSync(src);
for (const item of items) {
    if (['node_modules', '.git', 'app_backup', 'context_backup'].includes(item)) continue;
    fs.cpSync(path.join(src, item), path.join(dest, item), { recursive: true });
}

console.log("Installing dependencies...");
execSync('npm install', { cwd: dest, stdio: 'inherit' });

console.log("Building APK...");
execSync('.\\gradlew assembleRelease --console=plain', { cwd: path.join(dest, 'android'), stdio: 'inherit' });

console.log("Copying APK back...");
const apkSrc = path.join(dest, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
const apkDest = path.join(src, 'app-release.apk');

if (fs.existsSync(apkSrc)) {
    fs.copyFileSync(apkSrc, apkDest);
    console.log("SUCCESS! Copied to " + apkDest);
} else {
    console.log("APK not found!");
}
