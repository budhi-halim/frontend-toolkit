import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const repository=process.argv[2];
if(!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})\/[A-Za-z0-9_.-]+$/.test(repository||'')||repository.includes('..')) {
  console.error('Usage: npm run configure:repository -- owner/repository');process.exit(1);
}
const metadataFile=path.join(root,'release-metadata.json');
const metadata=JSON.parse(await fs.readFile(metadataFile,'utf8'));
metadata.repository=repository;
await fs.writeFile(metadataFile,JSON.stringify(metadata,null,2)+'\n');
const pkgFile=path.join(root,'package.json'),pkg=JSON.parse(await fs.readFile(pkgFile,'utf8'));
const [owner,name]=repository.split('/'),url=`https://github.com/${repository}`;
const site=`https://${owner}.github.io/${name.toLowerCase()===`${owner.toLowerCase()}.github.io`?'':name+'/'}`;
pkg.repository={type:'git',url:url+'.git'};pkg.homepage=site;pkg.bugs={url:url+'/issues'};
await fs.writeFile(pkgFile,JSON.stringify(pkg,null,2)+'\n');
const readmeFile=path.join(root,'README.md');let readme=await fs.readFile(readmeFile,'utf8');
const links=`[Demo](${site}) · [Full lab](${site}lab.html) · [Repository](${url}) · [Integration guide](docs/GETTING_STARTED.md) · [API reference](docs/API.md)\n\nHosted links become available only after the corresponding repository and site are published.`;
const cdn=`After the repository and the matching tag exist:\n\n\`\`\`html\n<script src="https://cdn.jsdelivr.net/gh/${repository}@${metadata.tagPrefix||'v'}${pkg.version}/dist/frontend-toolkit.js" defer></script>\n\`\`\`\n\nThis is a versioned URL template; this command does not publish the tag or verify that the URL is live.`;
readme=readme.replace(/(<!-- repository-links:start -->)[\s\S]*?(<!-- repository-links:end -->)/,`$1\n${links}\n$2`).replace(/(<!-- cdn-example:start -->)[\s\S]*?(<!-- cdn-example:end -->)/,`$1\n${cdn}\n$2`);
await fs.writeFile(readmeFile,readme);
console.log(`Local metadata configured for ${repository}. Nothing was created, uploaded, or published.`);
