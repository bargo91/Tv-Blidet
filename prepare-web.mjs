import { cp, mkdir, rm } from 'node:fs/promises';

await rm('www', { recursive: true, force: true });
await mkdir('www', { recursive: true });
for (const file of ['index.html', 'styles.css', 'app.js', 'manifest.webmanifest', 'icon.svg', 'channel-database.js']) {
  await cp(file, `www/${file}`);
}
await cp('node_modules/hls.js/dist/hls.min.js', 'www/hls.min.js');
