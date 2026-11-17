(function(root){
 'use strict';
 const configuration={
  startOnLoad:false,securityLevel:'strict',suppressErrorRendering:true,
  maxTextSize:50000,maxEdges:1000,htmlLabels:false,theme:'base',
  fontFamily:'"Avenir Next", "PingFang SC", "Microsoft YaHei", sans-serif',
  flowchart:{htmlLabels:false,curve:'basis',useMaxWidth:false},
  themeVariables:{background:'#f4f4ec',primaryColor:'#e7ede1',primaryTextColor:'#173d32',primaryBorderColor:'#6e866a',lineColor:'#6e866a',secondaryColor:'#d4e7a3',tertiaryColor:'#f4f4ec',edgeLabelBackground:'#f4f4ec',fontSize:'15px'}
 };
 function fallback(doc,pre){
  pre.dataset.mermaidState='failed';
  const message=doc.createElement('p');message.className='diagram-fallback';message.setAttribute('role','status');
  message.textContent='图表暂时无法显示，下方保留 Mermaid 源码，可阅读或复制。';pre.before(message);
 }
 async function enhanceDiagrams(doc,renderer){
  const blocks=Array.from(doc.querySelectorAll('.prose pre')).filter(pre=>pre.querySelector('code.language-mermaid'));
  const result={rendered:0,failed:0};if(!blocks.length)return result;
  try{if(!renderer?.initialize||!renderer?.render)throw Error('renderer unavailable');renderer.initialize(configuration);}
  catch(_){for(const pre of blocks)fallback(doc,pre);result.failed=blocks.length;return result;}
  for(const [index,pre] of blocks.entries()){
   const code=pre.querySelector('code.language-mermaid'),id='orchpact-diagram-'+(index+1);
   try{
    const {svg}=await renderer.render(id,code.textContent);
    const figure=doc.createElement('figure');figure.className='doc-diagram';
    const caption=doc.createElement('figcaption');caption.id=id+'-caption';caption.textContent='流程图 '+(index+1)+' · 窄屏可横向滚动';
    const viewport=doc.createElement('div');viewport.className='diagram-scroll';viewport.tabIndex=0;viewport.setAttribute('role','region');viewport.setAttribute('aria-labelledby',caption.id);
    // Mermaid runs in strict mode; only its generated, sanitized SVG enters this container.
    viewport.innerHTML=svg;
    const drawing=viewport.querySelector('svg');if(!drawing)throw Error('renderer returned no SVG');
    drawing.setAttribute('role','img');drawing.setAttribute('aria-labelledby',caption.id);
    const width=Number(drawing.getAttribute('viewBox')?.trim().split(/[ ,]+/)[2]);
    if(Number.isFinite(width)&&width>0)drawing.style.minWidth=Math.ceil(width)+'px';
    const source=doc.createElement('details');source.className='diagram-source';
    const summary=doc.createElement('summary');summary.textContent='查看 Mermaid 源码';
    figure.append(caption,viewport,source);pre.replaceWith(figure);source.append(summary,pre);
    pre.dataset.mermaidState='rendered';result.rendered++;
   }catch(_){fallback(doc,pre);result.failed++;}
  }
  return result;
 }
 if(typeof module==='object'&&module.exports){module.exports={configuration,enhanceDiagrams};return;}
 if(root.document)enhanceDiagrams(root.document,root.mermaid);
})(typeof globalThis!=='undefined'?globalThis:this);
