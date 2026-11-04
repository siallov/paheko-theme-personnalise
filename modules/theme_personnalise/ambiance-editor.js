(() => {
 'use strict';
 const panel=document.getElementById('atelier-ambiances'); if(!panel||!document.querySelector('[name=hero_height]'))return;
 const field=name=>document.querySelector(`[name="${name}"]`);
 const frame=document.querySelector('#preview iframe');
 const stage=document.getElementById('preview-stage');
 const status=document.getElementById('visual-status');
 const fixButton=document.getElementById('visual-fix-contrast');
 const modelSelect=field('visual_model');
 const visualKeys=['style','primary','on_primary','accent','on_accent','background','surface','text','font','size','radius','spacing'];
 const extraKeys=['hero_height','hero_ratio','hero_fit','layout','site_width','news_columns','hue1','hue2'];
 const mapping={name:'visual_name',mode:'theme_style',site_background:'background',...Object.fromEntries(visualKeys.map(k=>[k,'visual_'+k])),...Object.fromEntries(extraKeys.map(k=>[k,k]))};
 const fonts={sans:'Arial,sans-serif',serif:'Georgia,serif',verdana:'Verdana,sans-serif',trebuchet:'"Trebuchet MS",Arial,sans-serif',nunito:'"Nunito Sans","Trebuchet MS",sans-serif'};
 const parseData=id=>{try{return JSON.parse(document.getElementById(id)?.value)||{};}catch{return {};}};
 const presets=parseData('visual-presets');
 const publicPages=Object.values(parseData('navigation-pages')).sort((a,b)=>a.label.localeCompare(b.label,'fr'));
 const navRows=[...document.querySelectorAll('[data-nav-row]')];
 const initialBannerSized=panel.dataset.heroSized==='true';
 let previewWidth=1280,previewHeight=800,notice='',bannerDirty=initialBannerSized;
 const readAppearance=()=>Object.fromEntries(Object.entries(mapping).map(([key,name])=>[key,field(name).value]));
 const initial=readAppearance();
 const enums={mode:['nature','sobre','custom','legacy'],style:['standard','apeu','corail','sobre'],font:Object.keys(fonts),hero_ratio:['40','50','60'],hero_fit:['contain','cover'],layout:['1col','2col','wide'],site_width:['standard','large'],news_columns:['2','3'],site_background:['gradient','white_gradient','white','gray','all_white','dark']};
 const ranges={size:[14,20],radius:[0,24],spacing:[16,40],hero_height:[220,650],hue1:[0,360],hue2:[0,360]};
 const colorKeys=['primary','on_primary','accent','on_accent','background','surface','text'];
 const validateAppearance=value=>{
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Le fichier ne contient pas un modèle valide.');
  const expected=Object.keys(mapping);
  if(Object.keys(value).some(k=>!expected.includes(k)))throw Error('Le fichier contient des propriétés non reconnues.');
  const result={};
  for(const key of expected){
   const val=value[key];
   if(key==='name'){if(typeof val!=='string'||!(/^[\p{L}\p{N} _-]{1,40}$/u).test(val))throw Error('Nom de modèle invalide.');result[key]=val;}
   else if(colorKeys.includes(key)){if(typeof val!=='string'||!/^#[a-f0-9]{6}$/i.test(val))throw Error('Couleur invalide : '+key);result[key]=val;}
   else if(enums[key]){if(!enums[key].includes(String(val)))throw Error('Choix invalide : '+key);result[key]=String(val);}
   else if(ranges[key]){const n=Number(val);if(!Number.isInteger(n)||n<ranges[key][0]||n>ranges[key][1])throw Error('Dimension invalide : '+key);result[key]=String(n);}
  }
  return result;
 };
 const writeAppearance=value=>{Object.entries(value).forEach(([key,val])=>{if(mapping[key])field(mapping[key]).value=val;});bannerDirty=true;};
 const replaceClass=(body,prefix,val)=>{[...body.classList].filter(c=>c.startsWith(prefix)).forEach(c=>body.classList.remove(c));body.classList.add(prefix+val);};
 const contrast=(a,b)=>{
  const lum=v=>{const rgb=v.match(/[a-f0-9]{2}/gi).map(n=>parseInt(n,16)/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;};
  const x=lum(a),y=lum(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);
 };
 const contrastPairs=[['visual_primary','visual_on_primary','menu'],['visual_accent','visual_on_accent','bannière et boutons'],['visual_surface','visual_text','contenus']];
 const resizePreview=()=>{
  if(!frame||!stage)return;
  const scale=Math.min(stage.clientWidth/previewWidth,1);
  frame.style.width=previewWidth+'px';frame.style.height=previewHeight+'px';frame.style.transform=`scale(${scale})`;stage.style.height=Math.ceil(previewHeight*scale)+'px';
 };
 document.querySelectorAll('[data-preview-width]').forEach(button=>button.addEventListener('click',()=>{
  previewWidth=Number(button.dataset.previewWidth);previewHeight=Number(button.dataset.previewHeight);
  document.querySelectorAll('[data-preview-width]').forEach(other=>other.setAttribute('aria-pressed',String(other===button)));resizePreview();
 }));
 if(stage)new ResizeObserver(resizePreview).observe(stage);
 const rowData=row=>({label:row.querySelector('[data-nav-label]').value,url:row.querySelector('[data-nav-url]').value,page:Number(row.querySelector('[data-nav-page-id]').value),enabled:row.querySelector('[data-nav-enabled]').checked});
 const setRow=(row,value)=>{row.querySelector('[data-nav-label]').value=value.label;row.querySelector('[data-nav-url]').value=value.url;row.querySelector('[data-nav-page-id]').value=value.page;row.querySelector('[data-nav-page]').value=String(value.page);row.querySelector('[data-nav-enabled]').checked=value.enabled;};
 const hasContent=(page,seen=new Set())=>{
  if(Number(page.type)!==1)return true;if(seen.has(Number(page.id)))return false;seen.add(Number(page.id));
  return publicPages.some(child=>Number(child.parent)===Number(page.id)&&(Number(child.type)===2||hasContent(child,new Set(seen))));
 };
 const renderNavigation=doc=>{
  const menu=doc.querySelector('[data-nav-menu]');if(!menu)return;
  const home=menu.querySelector('a');const root=home?.href||frame.src.split('?')[0];
  const items=[{label:'Accueil',url:root}];
  const hideEmpty=field('hide_empty_categories').checked;
  if(field('nav_mode').value==='custom'){
   for(const row of navRows){const item=rowData(row);if(!item.enabled||!item.label||!item.url)continue;const page=publicPages.find(p=>Number(p.id)===item.page);if(page&&hideEmpty&&!hasContent(page))continue;if(!/^(https?:\/\/|\/(?!\/))/i.test(item.url))continue;items.push({...item,url:page?.url||item.url});}
  }else{
   const parent=Number(field('menu_public_category').value);
   publicPages.filter(p=>parent?Number(p.parent)===parent:Number(p.type)===1&&!p.parent).filter(p=>!hideEmpty||hasContent(p)).forEach(p=>items.push(p));
   if(field('contact_form')?.checked)items.push({label:'Contact',url:new URL('contact.html',root).href});
  }
  menu.replaceChildren(...items.map(item=>{const a=doc.createElement('a');a.href=item.url;a.textContent=item.label;return a;}));
  doc.querySelectorAll('[data-nav-module]').forEach(e=>{const checkbox=field(e.dataset.navModule);if(checkbox)e.hidden=!checkbox.checked;});
 };
 const render=()=>{
  const doc=frame?.contentDocument,body=doc?.body;if(!body)return;
  replaceClass(body,'theme-',field('theme_style').value);
  body.classList.toggle('visual-sobre',field('visual_style').value==='sobre'||field('theme_style').value==='sobre'||field('visual_name').value==='Sobre - blanc et vert');
  body.classList.toggle('visual-apeu',['apeu','sobre'].includes(field('visual_style').value));body.classList.toggle('visual-corail',field('visual_style').value==='corail');
  for(const [prefix,name]of [['layout-','layout'],['bg-','background'],['width-','site_width'],['columns-','news_columns']])replaceClass(body,prefix,field(name).value);
  body.style.setProperty('--first-color',field('hue1').value);body.style.setProperty('--second-color',field('hue2').value);
  visualKeys.forEach(key=>{if(key==='style')return;let value=field('visual_'+key).value;if(key==='font')value=fonts[value];if(['size','radius','spacing'].includes(key))value+='px';body.style.setProperty('--visual-'+key.replaceAll('_','-'),value);});
  body.classList.toggle('hero-sized',bannerDirty);
  if(bannerDirty){const ratio=Number(field('hero_ratio').value)||40;
   body.style.setProperty('--hero-height',field('hero_height').value+'px');body.style.setProperty('--hero-text-track',ratio+'fr');body.style.setProperty('--hero-image-track',(100-ratio)+'fr');body.style.setProperty('--hero-copy-share',ratio+'%');body.style.setProperty('--hero-fit',field('hero_fit').value);
  }
  renderNavigation(doc);resizePreview();
  const low=contrastPairs.map(([bg,fg,label])=>({label,ratio:contrast(field(bg).value,field(fg).value)})).filter(p=>p.ratio<4.5);
  fixButton.hidden=field('theme_style').value!=='custom'||!low.length;
  status.textContent=notice||(field('theme_style').value==='custom'&&low.length?'Contraste insuffisant : '+low.map(p=>`${p.label} ${p.ratio.toFixed(1)}:1`).join(', ')+'. Une correction est disponible.':'Aperçu uniquement. Appliquer au site pour publier.');
 };
 field('visual_name').addEventListener('input',()=>{notice='';modelSelect.value='custom';render();});
 visualKeys.forEach(key=>field('visual_'+key).addEventListener('input',()=>{notice='';field('theme_style').value='custom';modelSelect.value='custom';render();}));
 extraKeys.forEach(name=>field(name).addEventListener('input',()=>{notice='';if(name.startsWith('hero_'))bannerDirty=true;render();}));
 ['background','nav_mode','menu_public_category','hide_empty_categories','contact_form','show_petites_annonces','show_permanences','show_trombinoscope','show_bookings'].forEach(name=>field(name)?.addEventListener('input',()=>{notice='';render();}));
 const models={
  apeu:{name:'Corail épuré',style:'corail',primary:'#e6eee3',on_primary:'#222e50',accent:'#ed7969',on_accent:'#222e50',background:'#fafbf7',surface:'#ffffff',text:'#222e50',font:'nunito',size:17,radius:12,spacing:32},
  nature:{name:'Nature - vert et orange',style:'standard',primary:'#375431',on_primary:'#ffffff',accent:'#ae4a13',on_accent:'#ffffff',background:'#637c39',surface:'#faf9f3',text:'#243326',font:'sans',size:16,radius:5,spacing:28},
  sobre:{name:'Sobre - blanc et vert',style:'sobre',primary:'#e5ece5',on_primary:'#24432e',accent:'#295a3a',on_accent:'#ffffff',background:'#f5f7f3',surface:'#ffffff',text:'#243326',font:'sans',size:16,radius:6,spacing:28},
  ocean:{name:'Ocean - bleu et sable',style:'apeu',primary:'#dfeef2',on_primary:'#163746',accent:'#e5b46b',on_accent:'#203844',background:'#f6fafb',surface:'#ffffff',text:'#203844',font:'trebuchet',size:17,radius:12,spacing:32},
  terre:{name:'Terre - ocre et creme',style:'standard',primary:'#643e2b',on_primary:'#ffffff',accent:'#be643e',on_accent:'#ffffff',background:'#eee3d5',surface:'#fffaf2',text:'#49372c',font:'serif',size:17,radius:8,spacing:30},
  lavande:{name:'Lavande - violet et ivoire',style:'apeu',primary:'#ebe4f3',on_primary:'#46325f',accent:'#69498c',on_accent:'#ffffff',background:'#faf8fc',surface:'#fffdf8',text:'#352a45',font:'sans',size:17,radius:16,spacing:32}
 };
 modelSelect.addEventListener('change',()=>{
  notice='';const selected=modelSelect.value;
  if(selected==='actuel'){writeAppearance(initial);bannerDirty=initialBannerSized;}
  else if(selected==='legacy'){field('theme_style').value='legacy';field('visual_style').value='standard';}
  else if(models[selected]){const model=models[selected];visualKeys.forEach(key=>field('visual_'+key).value=model[key]);field('visual_name').value=model.name;field('theme_style').value='custom';}
  else field('theme_style').value='custom';render();
 });
 document.getElementById('visual-load').addEventListener('click',()=>{
  const preset=presets['slot_'+field('visual_slot').value];
  if(!preset){notice='Cet emplacement est libre. Nommez votre variante, puis enregistrez-la.';render();return;}
  const complete={...initial,mode:'custom',style:'standard',...preset};writeAppearance(complete);modelSelect.value='custom';notice='Variante chargée dans l’aperçu. Appliquer au site pour la publier.';render();
 });
 fixButton.addEventListener('click',()=>{
  for(const[bg,fg]of contrastPairs){if(contrast(field(bg).value,field(fg).value)<4.5)field(fg).value=contrast(field(bg).value,'#111111')>contrast(field(bg).value,'#ffffff')?'#111111':'#ffffff';}
  field('theme_style').value='custom';modelSelect.value='custom';notice='Couleurs de texte corrigées dans l’aperçu. Enregistrez une variante ou appliquez au site.';render();
 });
 document.getElementById('visual-export').addEventListener('click',()=>{
  try{
   const appearance=validateAppearance(readAppearance());const data={format:'paheko-ambiance',version:1,appearance};
   const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='modele-'+appearance.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/gi,'-').toLowerCase()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notice='Modèle exporté. Le fichier contient uniquement sa présentation.';render();
  }catch(error){notice=error.message;render();}
 });
 const importInput=document.getElementById('visual-import');document.getElementById('visual-import-button').addEventListener('click',()=>importInput.click());
 importInput.addEventListener('change',async()=>{
  try{
   const file=importInput.files[0];if(!file)return;if(file.size>65536)throw Error('Le fichier de modèle dépasse 64 Ko.');
   const data=JSON.parse(await file.text());if(data.format!=='paheko-ambiance'||data.version!==1)throw Error('Format ou version de modèle non reconnue.');
   const appearance=validateAppearance(data.appearance);writeAppearance(appearance);modelSelect.value='custom';notice='Modèle importé dans l’aperçu. Enregistrez une variante ou appliquez au site.';render();
  }catch(error){notice='Import refusé : '+error.message;render();}finally{importInput.value='';}
 });
 navRows.forEach((row,index)=>{
  const select=row.querySelector('[data-nav-page]');
  publicPages.forEach(page=>{const option=document.createElement('option');option.value=String(page.id);option.textContent=page.label;select.append(option);});select.value=row.querySelector('[data-nav-page-id]').value;
  select.addEventListener('change',()=>{const page=publicPages.find(p=>Number(p.id)===Number(select.value));row.querySelector('[data-nav-page-id]').value=select.value;if(page){row.querySelector('[data-nav-label]').value=page.label;row.querySelector('[data-nav-url]').value=page.url;}field('nav_mode').value='custom';render();});
  row.querySelector('[data-nav-url]').addEventListener('input',()=>{row.querySelector('[data-nav-page-id]').value='0';select.value='0';});
  row.querySelectorAll('input').forEach(input=>input.addEventListener('input',()=>{field('nav_mode').value='custom';render();}));
  [['[data-nav-up]',-1],['[data-nav-down]',1]].forEach(([selector,offset])=>{const button=row.querySelector(selector);button.disabled=index+offset<0||index+offset>=navRows.length;button.addEventListener('click',()=>{const other=navRows[index+offset],a=rowData(row),b=rowData(other);setRow(row,b);setRow(other,a);field('nav_mode').value='custom';render();});});
 });
 frame?.addEventListener('load',render);render();resizePreview();
})();