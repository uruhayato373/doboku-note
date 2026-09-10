#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { readXReview } from './lib/x-review.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const at=process.argv.indexOf('--port');
const port=at<0?3026:Number(process.argv[at+1]);
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('port が不正です');
if(process.argv.includes('--check')){const data=readXReview(root);console.log(JSON.stringify(data.counts));process.exit(data.counts.all?0:1);}
const html=fs.readFileSync(path.join(root,'scripts/templates/x-review.html'));
const server=http.createServer((req,res)=>{
  const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; img-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'"};
  const send=(code,body,type='text/plain; charset=utf-8')=>{res.writeHead(code,{...headers,'Content-Type':type});res.end(body);};
  if(!['GET','HEAD'].includes(req.method))return send(405,'読み取り専用です');
  if(![`127.0.0.1:${port}`,`localhost:${port}`].includes(req.headers.host))return send(403,'許可されていない接続先です');
  try{
    const u=new URL(req.url,`http://127.0.0.1:${port}`);
    if(u.pathname==='/')return send(200,req.method==='HEAD'?'':html,'text/html; charset=utf-8');
    const data=readXReview(root);
    if(u.pathname==='/data')return send(200,JSON.stringify(data),'application/json; charset=utf-8');
    if(u.pathname==='/image'){
      const row=data.rows.find(r=>r.id===u.searchParams.get('id'));
      if(!row?.imagePath)return send(404,'この端末に画像がありません');
      const target=fs.realpathSync(path.join(root,row.imagePath));
      if(!target.startsWith(fs.realpathSync(root)+path.sep)||fs.lstatSync(path.join(root,row.imagePath)).isSymbolicLink())return send(403,'画像パスが不正です');
      res.writeHead(200,{...headers,'Content-Type':'image/png','Content-Length':fs.statSync(target).size});
      if(req.method==='HEAD')return res.end();
      fs.createReadStream(target).on('error',()=>res.destroy()).pipe(res);return;
    }
    send(404,'ページがありません');
  }catch(error){console.error(error.message);send(500,'確認データを読み込めません。端末のログを確認してください。');}
});
server.listen(port,'127.0.0.1',()=>console.log(`X投稿確認: http://127.0.0.1:${port}（閲覧専用）`));
