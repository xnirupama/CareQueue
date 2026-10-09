"""Render the reviewed report content to PDF. Requires reportlab and pymupdf for QA."""
from pathlib import Path
import json,re
from xml.sax.saxutils import escape
from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer,Table,TableStyle,PageBreak,Image,KeepTogether
from reportlab.lib.styles import getSampleStyleSheet,ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.graphics.shapes import Drawing,Rect,String,Line
ROOT=Path(__file__).resolve().parents[1]
data=json.loads((ROOT/'docs/submission/report-content.json').read_text(encoding='utf-8-sig'))
font=Path('C:/Windows/Fonts/arial.ttf');bold=Path('C:/Windows/Fonts/arialbd.ttf')
if font.exists():
 pdfmetrics.registerFont(TTFont('CQ',str(font)));pdfmetrics.registerFont(TTFont('CQBold',str(bold)));regular,strong='CQ','CQBold'
else:regular,strong='Helvetica','Helvetica-Bold'
navy=colors.HexColor('#09386b');teal=colors.HexColor('#0a8a8c');ink=colors.HexColor('#141f2b');muted=colors.HexColor('#52697a')
styles=getSampleStyleSheet()
styles.add(ParagraphStyle(name='CQBody',fontName=regular,fontSize=10.5,leading=15.6,textColor=ink,spaceAfter=12))
styles.add(ParagraphStyle(name='CQTitle',fontName=strong,fontSize=24,leading=30,textColor=navy,spaceAfter=20))
styles.add(ParagraphStyle(name='CQCell',fontName=regular,fontSize=8,leading=11.2,textColor=ink))
styles.add(ParagraphStyle(name='CQHeadCell',fontName=strong,fontSize=8,leading=11.2,textColor=colors.white))
styles.add(ParagraphStyle(name='CQCover',fontName=strong,fontSize=30,leading=38,textColor=navy,alignment=TA_CENTER,spaceAfter=20))
styles.add(ParagraphStyle(name='CQCenter',fontName=regular,fontSize=12,leading=18,textColor=ink,alignment=TA_CENTER,spaceAfter=14))
def ascii_text(s):return str(s).replace('—','-').replace('–','-').replace('→',' -> ').replace('≤','<=').replace('’',"'").replace('“','"').replace('”','"').replace('·',' / ')
def para(s,style='CQBody'):return Paragraph(escape(ascii_text(s)).replace('\n','<br/>'),styles[style])
def table(rows):
 n=len(rows[0]);widths={2:[170,329],3:[118,180,201],4:[111,102,159,127]}.get(n,[499/n]*n)
 t=Table([[para(c,'CQHeadCell' if i==0 else 'CQCell') for c in row] for i,row in enumerate(rows)],colWidths=widths,repeatRows=1,hAlign='LEFT')
 t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),navy),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),8),('TOPPADDING',(0,0),(-1,-1),9),('BOTTOMPADDING',(0,0),(-1,-1),9),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,colors.HexColor('#f0f7ff')]),('LINEBELOW',(0,0),(-1,-1),.5,colors.HexColor('#d3e1eb'))]))
 return t

def architecture():
 d=Drawing(499,225)
 boxes=[(0,165,149,'Patient / caregiver'),(175,165,149,'Staff / administrator'),(350,165,149,'Token display'),(80,90,339,'Store + validated domain commands'),(0,10,239,'Demo / device notes: AsyncStorage'),(260,10,239,'Firebase Auth + Firestore + rules')]
 for x,y,w,label in boxes:
  d.add(Rect(x,y,w,42,rx=8,ry=8,fillColor=colors.HexColor('#f0f7ff'),strokeColor=teal));d.add(String(x+w/2,y+17,label,fontName=strong,fontSize=9,textAnchor='middle',fillColor=navy))
 for x in [75,249,424]:d.add(Line(x,165,249,132,strokeColor=muted))
 for x in [119,380]:d.add(Line(249,90,x,52,strokeColor=muted))
 return d

def gantt():
 d=Drawing(499,230);dates=['5 Oct','7 Oct','8 Oct','9 Oct'];x0=203;w=70
 for i,label in enumerate(dates):d.add(String(x0+i*w+w/2,207,label,fontName=strong,fontSize=10,textAnchor='middle',fillColor=navy))
 rows=[('Repository verification',0,0,False),('Requirements / code / checks',1,1,False),('Owner setup + phone tests',2,2,True),('Five user sessions + retests',2,2,True),('Report + viva + submission',3,3,True)]
 for j,(label,start,end,planned) in enumerate(rows):
  y=165-j*30;d.add(String(0,y+7,label,fontName=regular,fontSize=9,fillColor=ink))
  for i in range(4):d.add(Rect(x0+i*w,y,w,23,fillColor=colors.HexColor('#f8fafc'),strokeColor=colors.HexColor('#d3e1eb')))
  d.add(Rect(x0+start*w+3,y+3,(end-start+1)*w-6,17,fillColor=colors.HexColor('#b7d9d9') if planned else teal,strokeColor=None))
 d.add(String(0,5,'Dark teal: recorded activity. Light teal: planned, not completed.',fontName=regular,fontSize=9,fillColor=muted));return d

out=ROOT/'output/pdf/IT3060HCI2026_Milestone03_GroupWE_79.pdf';out.parent.mkdir(parents=True,exist_ok=True)
story=[Spacer(1,55),para(data['module'],'CQCenter'),para(data['milestones'],'CQCenter'),Spacer(1,22),para(data['title'],'CQCover'),para(data['subtitle'],'CQCenter'),para('Group WE_79 / Malabe Campus','CQCenter'),Spacer(1,22),para(data['status'],'CQCenter'),para('Prepared 7 October 2026 / Deadline 9 October 2026','CQCenter'),Spacer(1,16),table([['Student ID','Name','Proposed M02 workload (unconfirmed actual contribution)'],['IT23681156','Korala N M','Patient / caregiver / directions'],['IT23685048','Aluthge D D','Staff queue operations'],['IT23677296','Withanage A G','Admin / report integration'],['IT23682764','J.A.I.T. Kalugalla','Accessibility / testing']])]
for s in data['sections']:
 story+=[PageBreak(),para(s['title'],'CQTitle')]
 story += [para(p) for p in s['paragraphs']]
 if s.get('kind')=='architecture':story += [Spacer(1,12),architecture()]
 if s.get('kind')=='gantt':story += [Spacer(1,12),gantt()]
 if s.get('table'):story += [Spacer(1,6),table(s['table'])]
 for name in s.get('images') or []:
  img=Image(str(ROOT/name));ratio=min(499/img.imageWidth,490/img.imageHeight);img.drawWidth=img.imageWidth*ratio;img.drawHeight=img.imageHeight*ratio;story +=[Spacer(1,12),img,Spacer(1,12),para('Archived browser implementation evidence / 5 October 2026.','CQCenter')]
def chrome(c,doc):
 c.saveState();c.setStrokeColor(teal);c.line(48,798,547,798);c.setFont(strong,8);c.setFillColor(navy);c.drawString(48,810,'CareQueue | IT3060 | Group WE_79');c.setFont(regular,8);c.setFillColor(muted);c.drawString(48,28,'REVIEW DRAFT - verify group contributions and actual test evidence');c.drawRightString(547,28,str(doc.page));c.restoreState()
doc=SimpleDocTemplate(str(out),pagesize=(595.28,841.89),rightMargin=48,leftMargin=48,topMargin=60,bottomMargin=54,title=data['title']+' - Milestones 01-03',author='CareQueue Group WE_79 - review draft')
doc.build(story,onFirstPage=chrome,onLaterPages=chrome)
print(out)
