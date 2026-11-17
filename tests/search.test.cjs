const test=require('node:test');const assert=require('node:assert/strict');const {rankDocuments}=require('../src/assets/docs.js');
const rows=[{title:'工作流与绑定',text:'定义引用、模型资源和空间安装。',url:'/docs/workflows/'},{title:'恢复与运维',text:'工作流数据库备份恢复。',url:'/docs/postgresql/'}];
test('Chinese title matches are preferred over body matches',()=>assert.equal(rankDocuments(rows,'工作流')[0].url,'/docs/workflows/'));
test('all terms must match across title and body',()=>assert.deepEqual(rankDocuments(rows,'工作流 备份').map(x=>x.url),['/docs/postgresql/']));
test('empty and absent queries return no results',()=>{assert.deepEqual(rankDocuments(rows,' '),[]);assert.deepEqual(rankDocuments(rows,'不存在的词'),[])});
test('search is literal data and cannot become markup or code',()=>assert.deepEqual(rankDocuments(rows,'<script>'),[]));
test('backup search points to the operational recovery guide',()=>{const fs=require('node:fs');const data=JSON.parse(fs.readFileSync(require('node:path').join(__dirname,'../dist/search-index.json'),'utf8'));assert.equal(rankDocuments(data,'备份')[0].url,'/docs/postgresql/');});
