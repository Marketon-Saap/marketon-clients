import re,sys,json,html
md_path,old_html,out_json=sys.argv[1:4]
H=open(old_html,encoding='utf-8').read()
style=H[H.find('<style>'):H.find('</style>')+8]
logo=re.search(r'src="(data:image/[a-z]+;base64,[A-Za-z0-9+/=]+)"',H).group(1)
def inline(t):
    codes=[]
    def cs(m): codes.append('<code>'+html.escape(m.group(1))+'</code>'); return f'\x00{len(codes)-1}\x00'
    t=re.sub(r'`([^`]+)`',cs,t)
    t=html.escape(t,quote=False)
    t=re.sub(r'\[([^\]]+)\]\(([^)]+)\)',r'\1',t)
    t=re.sub(r'\*\*(.+?)\*\*',r'<strong>\1</strong>',t)
    t=re.sub(r'\x00(\d+)\x00',lambda m:codes[int(m.group(1))],t)
    return t
lines=open(md_path,encoding='utf-8').read().split('\n')
blocks=[];i=0;title=None;meta=[]
def cells(l): return [c.strip() for c in l.strip().strip('|').split('|')]
while i<len(lines):
    l=lines[i]
    if not l.strip() or l.strip()=='---': i+=1; continue
    if l.startswith('# '): title=l[2:].strip(); i+=1; continue
    if l.startswith('## '): blocks.append({'h':f'<h2 class="section-title">{inline(l[3:].strip())}</h2>','keep':True}); i+=1; continue
    if l.startswith('### '): blocks.append({'h':f'<h3 class="h3">{inline(l[4:].strip())}</h3>','keep':True}); i+=1; continue
    if l.lstrip().startswith('|'):
        rows=[]
        while i<len(lines) and lines[i].lstrip().startswith('|'): rows.append(lines[i]); i+=1
        hdr=cells(rows[0]); body=[cells(r) for r in rows[2:]]
        blocks.append({'table':True,'head':'<thead><tr>'+''.join(f'<th>{inline(c)}</th>' for c in hdr)+'</tr></thead>','rows':['<tr>'+''.join(f'<td>{inline(c)}</td>' for c in r)+'</tr>' for r in body]}); continue
    m=re.match(r'\s*(- |\* |\d+\. )',l)
    if m:
        ordered=m.group(1)[0].isdigit(); items=[]
        while i<len(lines) and re.match(r'\s*(- |\* |\d+\. )',lines[i]):
            it=re.sub(r'^\s*(- |\* |\d+\. )','',lines[i]); i+=1
            while i<len(lines) and lines[i].startswith('  ') and lines[i].strip() and not re.match(r'\s*(- |\* |\d+\. )',lines[i]): it+=' '+lines[i].strip(); i+=1
            items.append(f'<li>{inline(it)}</li>')
        tag='ol' if ordered else 'ul'
        blocks.append({'list':tag,'items':items}); continue
    para=[l.strip()]; i+=1
    while i<len(lines) and lines[i].strip() and not re.match(r'(#|\||---|\s*(- |\* |\d+\. ))',lines[i]): para.append(lines[i].strip()); i+=1
    # metadatos iniciales: cada línea en negritas por separado
    if not blocks and all(p.startswith('**') for p in para):
        for p in para: blocks.append({'h':f'<p class="p">{inline(p)}</p>'})
    else:
        blocks.append({'h':f'<p class="p">{inline(" ".join(para))}</p>'})
json.dump({'style':style,'logo':logo,'title':title,'blocks':blocks},open(out_json,'w'),ensure_ascii=False)
print('bloques',len(blocks),'| título',title)
