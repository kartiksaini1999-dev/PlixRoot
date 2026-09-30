import { build } from 'esbuild';
import { access } from 'node:fs/promises';
await access('public/index.html');
await build({entryPoints:['client/media-client.mjs'],outfile:'public/media-client.js',bundle:true,minify:true,platform:'browser',target:['es2022'],format:'iife'});
console.log('Built static frontend and private Blob client. Vercel bundles api/index.mjs separately.');
