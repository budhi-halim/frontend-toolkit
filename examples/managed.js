import {mountEffect} from '../dist/frontend-toolkit.esm.js';
const button=document.getElementById('action'),toggle=document.getElementById('toggle');
let effect=null,count=0;
function attach(){effect=mountEffect(button,{effect:'highlight',preset:'ripple',activation:'click'});}
attach();
button.addEventListener('click',()=>{document.getElementById('result').textContent=`Action activated ${++count} ${count===1?'time':'times'}.`;});
toggle.addEventListener('click',()=>{if(effect){effect.destroy();effect=null;toggle.textContent='Restore decoration';}else{attach();toggle.textContent='Remove decoration';}});
window.addEventListener('pagehide',()=>{effect?.destroy();effect=null;});
window.addEventListener('pageshow',event=>{if(event.persisted){attach();toggle.textContent='Remove decoration';}});
