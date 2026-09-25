// Shared page chrome for the demo, lab, docs and integration examples.
export function header(base, active, version) {
  const links = [['index.html','Demo','demo'],['lab.html','Lab','lab'],['docs/guide.html','Docs','docs'],['examples/index.html','Examples','examples']];
  return `<header class="tk-header wrap"><a class="tk-brand" href="${base}index.html" aria-label="Frontend Toolkit home"><img src="${base}site/favicon.svg" alt="" width="34" height="34"><span>Frontend Toolkit</span><span class="tk-version" data-version>${version}</span></a><nav class="tk-nav" aria-label="Main navigation">${links.map(([href,label,key])=>`<a href="${base}${href}"${key===active?' aria-current="page"':''}>${label}</a>`).join('')}<button class="tk-theme" id="theme-button" data-theme-toggle type="button" aria-label="Switch color theme"><svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M12 4a8 8 0 0 1 0 16Z" fill="currentColor"/></svg></button></nav></header>`;
}
export function footer(base, version) {
  return `<footer class="tk-footer wrap"><span>Frontend Toolkit <span data-version>${version}</span></span><nav aria-label="Project resources"><a href="https://github.com/budhi-halim/frontend-toolkit">GitHub</a><a href="${base}docs/compatibility.html">Compatibility</a><a href="${base}LICENSE">MIT license</a><a href="${base}docs/notices.html">Notices</a></nav></footer>`;
}
