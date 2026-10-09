"""Create a source/report review archive; exclude credentials, caches and native outputs."""
from pathlib import Path
import os,zipfile,hashlib,json
root=Path(__file__).resolve().parents[1];out=root/'output';out.mkdir(exist_ok=True)
archive=out/'CareQueue_Milestone03_review-package.zip'
excluded={'.git','.agents','.codex','.aws','.expo','.firebase','.qodo','node_modules','tmp','tmp-gradle','android','ios','dist','web-build','coverage','artifacts','__pycache__'}
allowed_root={'.gitignore','.firebaserc','README.md','app.json','eas.json','firebase.json','eslint.config.js','metro.config.js','tsconfig.json','package.json','package-lock.json','.env.example'}
allowed_dirs={'assets','design','docs','firebase','scripts','src','tests','.github'}
files=[]
for directory,dirs,names in os.walk(root):
 rel=Path(directory).relative_to(root)
 dirs[:]=[d for d in dirs if d not in excluded and (rel.parts or d in allowed_dirs)]
 for name in names:
  p=Path(directory)/name;r=p.relative_to(root)
  if len(r.parts)==1 and name not in allowed_root:continue
  if name.startswith('.env') and name!='.env.example':continue
  if name in {'credentials.json','firebase-debug.log','firestore-debug.log'} or 'service-account' in name.lower() or 'serviceaccount' in name.lower():continue
  if p.suffix.lower() in {'.jks','.keystore','.p8','.p12','.mobileprovision','.pyc'}:continue
  files.append(p)
pdf=root/'output/pdf/IT3060HCI2026_Milestone03_GroupWE_79.pdf'
if pdf.exists():files.append(pdf)
with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for p in sorted(files):z.write(p,str(p.relative_to(root)).replace('\\','/'))
manifest={'package':archive.name,'files':len(files),'bytes':archive.stat().st_size,'sha256':hashlib.file_digest(archive.open('rb'),'sha256').hexdigest(),'status':'review package; actual group/user/device evidence pending','excluded':['credentials and local .env','dependency/build caches','generated native projects','git metadata'],'report':str(pdf.relative_to(root))}
(out/'review-package-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8');print(json.dumps(manifest,indent=2))
