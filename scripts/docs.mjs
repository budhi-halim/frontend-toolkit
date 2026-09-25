import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {header,footer} from './layout.mjs';
import {COMMON_SCHEMA,SCHEMAS,PRESETS} from '../src/core/schema.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const pkg=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8'));
const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const kebab=key=>key.replace(/[A-Z]/g,c=>'-'+c.toLowerCase());
const label=name=>name[0].toUpperCase()+name.slice(1);
const value=v=>typeof v==='string'?v:JSON.stringify(v);
const restrictions=spec=>spec.values?spec.values.map(value).join(', '):spec.kind==='number'?`${spec.min} to ${spec.max}; step ${spec.step}`:spec.kind==='boolean'?'true or false':spec.kind==='color'?'CSS colour':'Text';
const md=value=>String(value).replaceAll('|','\\|').replaceAll('\n',' ');
function optionRows(schema) {
  return Object.entries(schema).map(([key,spec])=>`| \`${key}\` / \`${kebab(key)}\` | ${spec.kind} | \`${md(value(spec.default))}\` | ${md(restrictions(spec))} | ${md(spec.label)}${spec.kinds?`; ${spec.kinds.join(', ')} only`:''} |`).join('\n');
}
let markdown=`# Option reference\n\nGenerated from the schemas and presets for version ${pkg.version}. Edit the schema source, then run \`npm run docs\`; do not edit these generated tables.\n\nUse camelCase keys with \`configure()\` and kebab-case attributes in HTML. The tables show schema defaults; named presets can override them. Per-kind notes identify options that only apply to some constructions. Renderer-specific interactions and cross-option limits still apply.\n\nCSS custom-property form: \`--ft-<attribute>\`, for example \`--ft-flame-speed\`. Managed effects accept options directly; the custom-element CSS parsing is not a general stylesheet API for low-level renderers.\n\nSee [API](API.md) for lifecycle control, [Integration](GETTING_STARTED.md) for loading modes, and the [lab](../lab.html) for configuration experiments.\n\n## Common options\n\n| JavaScript / HTML | Type | Schema default | Range / values | Meaning |\n| --- | --- | --- | --- | --- |\n${optionRows(COMMON_SCHEMA)}\n`;
for(const [name,schema] of Object.entries(SCHEMAS)) {
  markdown+=`\n## ${label(name)}\n\nElement: \`ft-${name}\`. All common options also apply.\n\n| JavaScript / HTML | Type | Schema default | Range / values | Meaning |\n| --- | --- | --- | --- | --- |\n${optionRows(schema)}\n\nPresets: ${Object.keys(PRESETS[name]||{}).map(p=>'`'+p+'`').join(', ')}.\n`;
}
await fs.writeFile(path.join(root,'docs/OPTIONS.md'),markdown);
await fs.writeFile(path.join(root,'docs/options.json'),JSON.stringify({version:pkg.version,common:COMMON_SCHEMA,effects:SCHEMAS,presets:PRESETS},null,2)+'\n');
const names={'GETTING_STARTED.md':'guide.html','OPTIONS.md':'reference.html'};
const htmlName=name=>names[name]||name.toLowerCase().replace(/\.md$/,'.html');
const slug=text=>text.toLowerCase().replace(/[`*_]/g,'').replace(/[^a-z0-9\s-]/g,'').trim().replace(/\s+/g,'-');
function inline(text) {
  const codes=[];
  let s=escape(text).replace(/`([^`]+)`/g,(_,code)=>`\u0000${codes.push('<code>'+code+'</code>')-1}\u0000`);
  s=s.replace(/\[([^\]]+)\]\(([^)]+)\)/g,(_,title,href)=>{
    if(!/^(?:https?:|#|\.?\.?\/|[A-Za-z0-9_])/.test(href))return title;
    href=href.replace(/(^|\/)([A-Z_]+\.md)(#.*)?$/,(_,base,name,hash='')=>base+(base==='../'?name:htmlName(name))+hash);
    return `<a href="${href}">${title}</a>`;
  }).replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/\*([^*]+)\*/g,'<em>$1</em>');
  return s.replace(/\u0000(\d+)\u0000/g,(_,i)=>codes[Number(i)]);
}
// A small deterministic renderer for this repository's Markdown subset. No raw HTML execution.
function render(md) {
  const lines=md.split(/\r?\n/),out=[];
  for(let i=0;i<lines.length;){
    const line=lines[i];
    if(!line.trim()){i++;continue;}
    if(line.startsWith('```')){const lang=line.slice(3).trim();let code=[];i++;while(i<lines.length&&!lines[i].startsWith('```'))code.push(lines[i++]);i++;out.push(`<div class="code-label">${escape(lang||'Text')}</div><pre tabindex="0"><code>${escape(code.join('\n'))}</code></pre>`);continue;}
    const h=line.match(/^(#{1,6})\s+(.*)$/);if(h){out.push(`<h${h[1].length} id="${slug(h[2])}">${inline(h[2])}</h${h[1].length}>`);i++;continue;}
    if(line.startsWith('|')&&lines[i+1]?.match(/^\|[\s:|-]+\|$/)){
      const cells=l=>l.trim().replace(/^\||\|$/g,'').split(/(?<!\\)\|/).map(c=>c.trim().replaceAll('\\|','|'));
      const head=cells(line);i+=2;let rows=[];while(i<lines.length&&lines[i].startsWith('|'))rows.push(cells(lines[i++]));
      out.push(`<div class="table-scroll" tabindex="0" role="region" aria-label="Reference table"><table><thead><tr>${head.map(c=>'<th scope="col">'+inline(c)+'</th>').join('')}</tr></thead><tbody>${rows.map(row=>'<tr>'+row.map(c=>'<td>'+inline(c)+'</td>').join('')+'</tr>').join('')}</tbody></table></div>`);continue;
    }
    if(/^[-*] /.test(line)){let items=[];while(i<lines.length&&/^[-*] /.test(lines[i]))items.push(lines[i++].slice(2));out.push('<ul>'+items.map(t=>'<li>'+inline(t)+'</li>').join('')+'</ul>');continue;}
    let paragraph=[line];i++;while(i<lines.length&&lines[i].trim()&&!/^(?:#|```|\||[-*] )/.test(lines[i]))paragraph.push(lines[i++]);out.push('<p>'+inline(paragraph.join(' '))+'</p>');
  }
  return out.join('\n');
}
const nav=[['guide.html','Integration'],['api.html','API'],['reference.html','Options'],['compatibility.html','Compatibility'],['accessibility.html','Accessibility'],['testing.html','Testing'],['publishing.html','Publishing'],['notices.html','Notices']];
function page(title,body,active) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><title>${escape(title)} — Frontend Toolkit</title><link rel="icon" href="../site/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="../site/style.css"><link rel="stylesheet" href="docs.css"><link rel="stylesheet" href="../site/design.css"><script src="../site/theme.js" defer></script></head><body><a class="skip-link" href="#documentation">Skip to content</a>${header('../','docs',pkg.version)}<main class="docs-layout wrap" id="documentation"><nav class="docs-nav" aria-label="Documentation">${nav.map(([href,text])=>`<a href="${href}"${href===active?' aria-current="page"':''}>${text}</a>`).join('')}</nav><article class="documentation">${body}</article></main>${footer('../',pkg.version)}</body></html>
`;
}

for(const name of (await fs.readdir(path.join(root,'docs'))).filter(n=>n.endsWith('.md'))) {
  const text=await fs.readFile(path.join(root,'docs',name),'utf8');
  let body=render(text);
  if(name==='OPTIONS.md'){
    const sections=body.split(/(?=<h2 )/);const intro=sections.shift();
    body=intro+'<p class="reference-index">'+Object.keys(SCHEMAS).map(k=>`<a href="#${k}">${label(k)}</a>`).join(' · ')+'</p>'+sections.map((s,i)=>i===0?s:`<details class="reference-section" id="${slug(Object.keys(SCHEMAS)[i-1]||'')}" ><summary>${label(Object.keys(SCHEMAS)[i-1]||'Options')}</summary>${s.replace(/<h2[^>]*>.*?<\/h2>/,'')}</details>`).join('\n');
    // Anchor navigation must expand the section; no animation required.
    body+='<script src="reference.js" defer></script>';
  }
  await fs.writeFile(path.join(root,'docs',htmlName(name)),page(text.split('\n')[0].replace(/^# /,''),body,htmlName(name)));
}
console.log(`Generated schema reference and HTML documentation for ${Object.keys(SCHEMAS).length} effect families.`);

for (const name of ['index.html','lab.html',...(await fs.readdir(path.join(root,'examples'))).filter(n=>n.endsWith('.html')).map(n=>'examples/'+n)]) {
  const base=name.startsWith('examples/')?'../':'';
  const active=name==='index.html'?'demo':name==='lab.html'?'lab':'examples';
  const file=path.join(root,name);let text=await fs.readFile(file,'utf8');
  text=text.replace(/(<!-- chrome:header:start -->)[\s\S]*?(<!-- chrome:header:end -->)/,`$1\n${header(base,active,pkg.version)}\n$2`);
  text=text.replace(/(<!-- chrome:footer:start -->)[\s\S]*?(<!-- chrome:footer:end -->)/,`$1\n${footer(base,pkg.version)}\n$2`);
  await fs.writeFile(file,text);
}
