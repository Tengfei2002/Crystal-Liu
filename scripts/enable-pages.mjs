import {githubHeaders} from './github-auth.mjs';
const url='https://api.github.com/repos/Tengfei2002/Crystal-Liu/pages';
const headers=githubHeaders();
let r=await fetch(url,{headers,signal:AbortSignal.timeout(30000)});
if(r.status===404)r=await fetch(url,{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({build_type:'workflow'}),signal:AbortSignal.timeout(30000)});
else if(r.ok){const p=await r.json();if(p.build_type==='workflow'){console.log(JSON.stringify({enabled:true,url:p.html_url,build_type:p.build_type}));process.exit(0)}r=await fetch(url,{method:'PUT',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({build_type:'workflow'}),signal:AbortSignal.timeout(30000)});}
if(!r.ok)throw Error(`Pages setup ${r.status}: ${(await r.text()).slice(0,240)}`);
const p=await r.json();console.log(JSON.stringify({enabled:true,url:p.html_url,build_type:p.build_type}));
