// Expand an option section even when the same fragment is selected twice.
(() => {
  const targetFor=fragment=>{let id;try{id=decodeURIComponent(fragment.replace(/^#/,''));}catch{return null;}return document.getElementById(id);};
  const reveal=()=>{const section=targetFor(location.hash);if(section?.tagName==='DETAILS')section.open=true;};
  document.addEventListener('click',event=>{
    const link=event.target.closest?.('.reference-index a[href^="#"]');
    if(!link||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    const fragment=link.getAttribute('href'),section=targetFor(fragment);if(section?.tagName!=='DETAILS')return;
    event.preventDefault();section.open=true;
    try{history.replaceState(null,'',fragment);}catch{}
    section.scrollIntoView({block:'start',behavior:'instant'});
  });
  window.addEventListener('hashchange',reveal);reveal();
})();
