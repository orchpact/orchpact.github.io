(function(root){
 'use strict';
 function rankDocuments(documents,query){
  const terms=String(query).trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  if(!terms.length)return [];
  return documents.map(doc=>{const title=doc.title.toLocaleLowerCase(),text=doc.text.toLocaleLowerCase();let score=0;for(const term of terms){if(!title.includes(term)&&!text.includes(term))return null;score+=(title.includes(term)?8:0)+Math.min(5,text.split(term).length-1);}return {doc,score};}).filter(Boolean).sort((a,b)=>b.score-a.score||a.doc.title.localeCompare(b.doc.title)).slice(0,12).map(row=>row.doc);
 }
 if(typeof module==='object'&&module.exports){module.exports={rankDocuments};return;}
 const doc=root.document;if(!doc)return;
 for(const pre of doc.querySelectorAll('.prose pre')){
  const code=pre.querySelector('code');if(!code||!root.navigator.clipboard)continue;
  const button=doc.createElement('button');button.className='code-copy';button.type='button';button.textContent='复制代码';button.setAttribute('aria-label','复制此代码块');pre.prepend(button);
  button.addEventListener('click',async()=>{try{await root.navigator.clipboard.writeText(code.textContent);if(button.isConnected)button.textContent='已复制';}catch(_){if(button.isConnected)button.textContent='请手动选择复制';}root.setTimeout(()=>{if(button.isConnected)button.textContent='复制代码';},1800);});
 }
 const dialog=doc.querySelector('#search-dialog'),toggle=doc.querySelector('[data-search]'),input=doc.querySelector('#search-input'),results=doc.querySelector('#search-results'),status=doc.querySelector('#search-status');
 if(!dialog||!toggle)return;
 toggle.hidden=false;let indexPromise,generation=0;
 function open(){if(!dialog.open)dialog.showModal();input.focus();}
 function show(rows,query){
  results.replaceChildren();status.textContent=rows.length?'找到 '+rows.length+' 篇相关文档。':'没有匹配项。试试“工作流”“绑定”或“备份”。';
  for(const row of rows){const li=doc.createElement('li'),link=doc.createElement('a'),section=doc.createElement('small'),title=doc.createElement('strong'),excerpt=doc.createElement('span');link.href=row.url;section.textContent=row.section;title.textContent=row.title;const position=row.text.toLocaleLowerCase().indexOf(query.toLocaleLowerCase());const start=Math.max(0,position-25);excerpt.textContent=(start?'…':'')+row.text.slice(start,start+135)+'…';link.append(section,title,excerpt);li.append(link);results.append(li);}
 }
 toggle.addEventListener('click',open);
 dialog.addEventListener('close',()=>{generation++;toggle.focus();});
 doc.addEventListener('keydown',event=>{const tag=doc.activeElement?.tagName;if((event.key==='/'||((event.ctrlKey||event.metaKey)&&event.key.toLocaleLowerCase()==='k'))&&!['INPUT','TEXTAREA','SELECT'].includes(tag)&&!doc.activeElement?.isContentEditable){event.preventDefault();open();}});
 input.addEventListener('input',async()=>{
  const current=++generation,query=input.value.trim();results.replaceChildren();if(!query){status.textContent='输入关键词，在本站文档中查找。';return;}
  status.textContent='正在读取文档索引…';
  try{indexPromise??=root.fetch('/search-index.json',{credentials:'omit'}).then(response=>{if(!response.ok)throw new Error('index');return response.json();}).catch(error=>{indexPromise=undefined;throw error;});const documents=await indexPromise;if(current!==generation||!dialog.open)return;show(rankDocuments(documents,query),query);}catch(_){if(current===generation&&dialog.open)status.textContent='索引暂不可用，请使用文档目录浏览。';}
 });
})(typeof globalThis!=='undefined'?globalThis:this);
