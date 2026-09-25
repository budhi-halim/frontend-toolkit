const button=document.getElementById('activate');
const output=document.getElementById('load-state');
button.addEventListener('click',async()=>{
  button.disabled=true;output.textContent='Loading the fire renderer…';
  try {
    await customElements.whenDefined('ft-fire');
    await document.getElementById('manual-fire').load();
    output.textContent='The fire module is loaded. Rendering still follows the system motion preference.';
    button.textContent='Module loaded';
  }catch(error){output.textContent='Loading failed: '+error.message;button.disabled=false;}
});
