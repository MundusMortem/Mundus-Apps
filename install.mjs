export function installationSteps({userAgent='',platform='',maxTouchPoints=0}={}){
 const ios=/iPad|iPhone|iPod/i.test(userAgent)||(platform==='MacIntel'&&maxTouchPoints>1);
 if(ios)return ['Open this app link in Safari if you are viewing it inside another app.','Tap Share, then Add to Home Screen. If it is not listed, scroll the Share menu or choose Edit Actions.','If shown, enable Open as Web App, then tap Add.'];
 if(/Android/i.test(userAgent))return ['Open this app link in Chrome or another browser that supports installed web apps.','Open the browser menu (⋮) and choose Install app or Add to Home screen.','Confirm Add or Install. If already installed, open the app from your home screen or app drawer.'];
 if(/Safari/i.test(userAgent)&&!/Chrome|Chromium|Edg/i.test(userAgent)&&/Mac/i.test(platform))return ['In Safari on your Mac, open File → Add to Dock.','Confirm the app name and choose Add.','If that option is unavailable, open this link in Chrome or Edge and use its install option.'];
 return ['Open this app link in a full browser, such as Chrome or Edge, rather than an embedded preview.','Use the install icon in the address bar, or open the browser menu and choose Install app or Install page as app.','Confirm installation. If already installed, open it from your apps or launcher.'];
}
export function setupInstallButton(button,{name='this app'}={}){
 if(!button)return {refresh(){}};
 let deferred=null,busy=false,installed=false;
 const standalone=()=>installed||window.matchMedia('(display-mode: standalone)').matches||window.matchMedia('(display-mode: window-controls-overlay)').matches||navigator.standalone===true;
 const create=(tag,text)=>{const el=document.createElement(tag);if(text)el.textContent=text;return el;};
 const dialog=create('dialog');dialog.className='pwa-install-dialog';dialog.id='pwaInstallDialog';dialog.setAttribute('aria-labelledby','pwaInstallTitle');
 const title=create('h2',`Install ${name}`);title.id='pwaInstallTitle';
 const status=create('p');status.id='pwaInstallStatus';status.setAttribute('role','status');
 const list=create('ol');for(const step of installationSteps(navigator))list.append(create('li',step));
 const note=create('p','Installation is controlled by your browser. A home-screen install does not upload or move your saved data.');note.className='pwa-install-note';
 const linkURL=new URL('./',document.querySelector('link[rel=manifest]')?.href||window.location.href).href;
 const link=create('a','Open app link ↗');link.href=linkURL;link.target='_blank';link.rel='noopener';
 const actions=create('div');actions.className='pwa-install-actions';const copy=create('button','Copy app link'),close=create('button','Close');copy.type=close.type='button';actions.append(copy,close);close.onclick=()=>dialog.close();
 const address=create('input');address.type='url';address.readOnly=true;address.value=linkURL;address.setAttribute('aria-label','App link');address.hidden=true;
 copy.onclick=async()=>{try{await navigator.clipboard.writeText(linkURL);status.textContent='App link copied. Open it in your browser to install.';}catch{address.hidden=false;address.focus();address.select();status.textContent='Copy the selected app link and open it in your browser.';}};
 dialog.append(title,status,list,link,address,note,actions);document.body.append(dialog);
 const refresh=()=>{button.hidden=false;button.disabled=busy||standalone();button.textContent=standalone()?'Installed':busy?'Opening…':'Install';};
 const help=message=>{status.textContent=message;if(!dialog.open)dialog.showModal();};
 window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferred=event;refresh();});
 window.addEventListener('appinstalled',()=>{installed=true;deferred=null;refresh();if(dialog.open)status.textContent=`${name} is installed. Open it from your home screen or app launcher.`;});
 window.matchMedia('(display-mode: standalone)').addEventListener?.('change',refresh);
 button.addEventListener('click',async()=>{
  if(busy)return;
  if(standalone()){help(`${name} is already running as an installed app.`);return;}
  if(!deferred){help('This browser has not offered an automatic install prompt. Follow these steps to install:');return;}
  const event=deferred;deferred=null;busy=true;refresh();
  try{
   // Invoke directly inside the click gesture; browsers reject deferred calls.
   const prompted=event.prompt();
   await prompted;
   const choice=await event.userChoice;
   if(standalone())help(`${name} is installed. Open it from your home screen or app launcher.`);
   else if(choice?.outcome==='accepted')help('Installation was requested. Finish any browser confirmation; the browser will confirm when installation completes.');
   else help('The install prompt was dismissed. You can still install using your browser menu:');
  }catch{help('The browser could not open its install prompt. You can install using these browser steps:');}
  finally{busy=false;refresh();}
 });
 refresh();return {refresh};
}
