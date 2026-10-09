"""Analyze actual, anonymized working-app observations. No third-party packages."""
import json,sys,statistics
from pathlib import Path
path=Path(sys.argv[1] if len(sys.argv)>1 else 'docs/testing/usability-results.json')
data=json.loads(path.read_text(encoding='utf-8-sig')); participants=data.get('participants',[]); attempts=data.get('attempts',[])
ids={p['id'] for p in participants}
if len(ids)!=len(participants):raise SystemExit('Duplicate participant IDs.')
for p in participants:
 if not p.get('consent') or not p.get('app_build') or not p.get('date') or not p.get('role'):raise SystemExit('Each actual participant needs consent, app_build, date and role.')
seen=set()
for a in attempts:
 if a['participant'] not in ids:raise SystemExit('Attempt references an unregistered participant.')
 if a['outcome'] not in ['independent','helped','unsuccessful','blocked']:raise SystemExit('Invalid outcome.')
 if a['task'] not in [f'T{i:02d}' for i in range(1,13)]:raise SystemExit('Invalid task.')
 key=(a['participant'],a['task'],a.get('round','initial'))
 if key in seen:raise SystemExit('Duplicate task attempt; use round to distinguish retests.')
 seen.add(key)
 if a.get('seconds') is not None and (not isinstance(a['seconds'],(int,float)) or a['seconds']<0):raise SystemExit('Seconds must be nonnegative.')
 if a.get('ease') is not None and (not isinstance(a['ease'],int) or not 1<=a['ease']<=5):raise SystemExit('Ease must be an integer 1–5.')
initial=[a for a in attempts if a.get('round','initial')=='initial']
actual={a['participant'] for a in initial}
summary={'status':'recorded' if len(actual)>=5 else 'pending minimum five tested participants','tested_participants':len(actual),'registered_participants':len(ids),'eligible_attempts':len(initial),'retest_attempts':len(attempts)-len(initial),'by_task':{}}
for task in sorted({a['task'] for a in initial}):
 rows=[a for a in initial if a['task']==task]; counts={o:sum(a['outcome']==o for a in rows) for o in ['independent','helped','unsuccessful','blocked']};times=[a['seconds'] for a in rows if a['outcome'] in ['independent','helped'] and a.get('seconds') is not None];ease=[a['ease'] for a in rows if a.get('ease') is not None]
 summary['by_task'][task]={'attempts':len(rows),'outcomes':counts,'independent_success':f"{counts['independent']}/{len(rows)}",'median_completed_seconds':statistics.median(times) if times else None,'timed_completed_count':len(times),'median_ease':statistics.median(ease) if ease else None,'ease_range':[min(ease),max(ease)] if ease else None,'ease_response_count':len(ease)}
summary['issues']=[]
for issue in data.get('issues',[]):
 if issue.get('severity') not in ['high','medium','low'] or not issue.get('evidence'):raise SystemExit('Each observed issue needs severity and evidence.')
 affected=set(issue.get('participants',[]));tasks=set(issue.get('tasks',[]))
 if not affected.issubset(ids):raise SystemExit('Issue references an unregistered participant.')
 exposed={a['participant'] for a in initial if a['task'] in tasks}
 if not affected.issubset(exposed):raise SystemExit('Issue affected participants must have attempted a relevant task.')
 summary['issues'].append({'id':issue['id'],'severity':issue['severity'],'affected':len(affected),'exposed':len(exposed),'occurrence':f'{len(affected)}/{len(exposed)}','evidence':issue['evidence'],'fix_or_plan':issue.get('fix_or_plan','pending')})
out=path.with_name('usability-summary.json');out.write_text(json.dumps(summary,indent=2)+'\n',encoding='utf-8');print(json.dumps(summary,indent=2))
