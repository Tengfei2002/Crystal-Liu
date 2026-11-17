import {spawnSync} from 'node:child_process';
// Reuse an existing login through Git's standard credential helper. Never log or save it.
export function githubHeaders(){
  let token=process.env.GITHUB_TOKEN;
  if(!token){const r=spawnSync('git',['credential','fill'],{input:'protocol=https\nhost=github.com\n\n',encoding:'utf8',env:{...process.env,GCM_INTERACTIVE:'Never',GIT_TERMINAL_PROMPT:'0'}});if(r.status!==0)throw Error('No existing GitHub login available');token=r.stdout.split(/\r?\n/).find(s=>s.startsWith('password='))?.slice(9);}
  if(!token)throw Error('No existing GitHub login available');
  return {Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'CrystalLiuArchive'};
}
