import json,re,sys
S=sys.argv[1]
ads=[a for a in json.load(open(S+'/rsas.json')) if a['st']=='ENABLED']
BAD=re.compile(r"10 a[ñn]os|papel a la|del papel|agenda (tu )?(sesi|diagn)|diagn[oó]stico|<\s?24|24\s?h|fractional|y ?combinator|\byc\b|15 suc|big-?four|big four|bloat|tier 1|accenture|deloitte|indra|esta semana|dise[ñn]o\s?=\s?estrategia|estrategia son una sola|producto, no|noci[oó]n de proyecto|usuario-c[eé]ntrico|sobreprecio|precio accesible|nichada|hands-on|rebranding|erps caros|freelancers|fabricantes sw|decks|sin compromiso alguno|contr[aá]tanos|sin obligaci|solicita propuesta hoy|lab de innovaci[oó]n interna|bootstrap|setup de innovaci|sin consultora full|alternativa a contratar|alternativa a in-house|alternativa a agencias|sin tarifa|sin overhead|impulsando l[ií]deres|impulsamos l[ií]deres|visi[oó]n de l[ií]deres|kazam",re.I)
COMMON_H=["Hagamos Realidad el Cambio","Estrategia, Diseño, Tecnología","Más de 50 Proyectos","Primera Conversación Sin Costo","Habla con un Socio de APTO","Hablemos de Tu Reto","Metodología de 5 Etapas","Coppel · KIOSKO · APYMSA","BayWa r.e. · Fanosa · ITESO","Monte de Piedad · BanCoppel","Consultora en Guadalajara","Empresas de Todo Tamaño","Prototipos con Usuarios","APTO Innovación Digital"]
COMMON_D=["Convertimos retos de negocio en servicios, productos y herramientas para tu organización.","Integramos estrategia, diseño y tecnología: del problema a su implementación.","Más de 50 proyectos en retail, servicios financieros, energía, educación y vivienda.","Primera conversación sin costo y sin compromiso. Un socio de APTO conoce tu contexto.","Metodología de cinco etapas: definimos cuáles requiere tu proyecto y hasta dónde llegar."]
G={ # grupo: (titulares del tema a fijar en posición 1, banco de titulares, banco de descripciones)
 'T1 · Estrategia de negocio usuario-céntrico':(["Estrategia de Negocio","Enfoque Centrado en el Usuario"],["Análisis de Negocio","Diseño Centrado en el Usuario"],["Enfoque centrado en el usuario y estrategia de negocio para tus decisiones importantes.","Investigación, análisis y estrategia de negocio para entender mejor a tus clientes."]),
 'T1 · Diseño de servicios omnicanales':(["Diseño de Servicios Omnicanal","Experiencias Omnicanales"],["Ecosistemas de Servicio","Diseño de Servicios"],["Diseñamos servicios y experiencias omnicanales para que la información siga al cliente.","Diseño de procesos y reglas para coordinar los canales. Caso KIOSKO: más de 1,000 cajeros."]),
 'T1 · Consultoría de innovación corporativa':(["Consultoría de Innovación","Innovación para tu Empresa"],["Equipos de Innovación y Diseño","Capacitación en Innovación"],["Equipos de innovación y diseño, y capacitación en diseño e innovación para tu empresa.","Criterios para evaluar y priorizar iniciativas, y prototipos para validar hipótesis clave."]),
 'T2 Core · Diseño y desarrollo de productos digitales':(["Diseño de Productos Digitales","Producto Digital para Empresa"],["Validación y Desarrollo","Diseño de Experiencia e UI"],["Diseño, validación y desarrollo de productos digitales con pruebas con usuarios.","Tu producto digital necesita evolucionar: diseño de experiencia, interfaces y desarrollo."]),
 'T2 Core · Equipos internos de innovación':(["Equipos de Innovación y Diseño","Equipo Interno de Innovación"],["Capacitación en Innovación","Consultoría de Innovación"],["Equipos de innovación y diseño, y capacitación en diseño e innovación para tu empresa.","Tus iniciativas no logran avanzar: criterios para evaluarlas, priorizarlas y validarlas."]),
 'T2 Core · Experiencia de Cliente / CX':(["Experiencia del Cliente","Experiencia de Cliente B2B"],["Diseño de Experiencias","Diseño de Servicios Omnicanal"],["Rediseñamos la experiencia cuando ya no responde a lo que necesitan tus clientes.","Experiencia del cliente: servicios y experiencias omnicanales diseñados con investigación."]),
 'T2 Core · Transformación digital empresa mediana':(["Transformación Digital","Transformación Digital México"],["Empresas de Todo Tamaño","Transformación con Método"],["Transformación digital: conectamos productos, servicios, procesos y tecnología.","Trabajamos con empresas medianas y corporativos. Lo importante es entender el problema."]),
 'T2 Op · Arquitectura de software empresarial':(["Arquitectura de Software","Arquitectura Empresarial"],["Desarrollo de Software","Integración con Tus Sistemas"],["Desarrollo de software y arquitectura de software empresarial para tu operación.","Herramientas e integraciones con los sistemas existentes. Caso APYMSA: plataforma B2B."]),
 'T2 Op · Digitalización de operaciones':(["Digitaliza Tu Operación","Automatización de Procesos"],["Menos Captura Manual","Tableros para Tu Operación"],["Análisis de procesos, automatización e integraciones con los sistemas existentes.","Tu operación depende de tareas manuales: desarrollamos herramientas y tableros para ella."]),
 'T3 · MVP y validación de producto':(["Validación de Producto","Prototipos para Validar"],["Trabajamos con Startups","Validación y Desarrollo"],["Prototipos para validar las hipótesis clave y una ruta de implementación clara.","Trabajamos con startups: evaluamos cada iniciativa según el problema que busca resolver."]),
 'Brand · Marca APTO':(["APTO Innovación Digital","APTO Innovación GDL"],["Sitio Oficial Apto.mx"],["APTO Innovación Digital: estrategia, diseño y tecnología en Guadalajara."]),
 'C6 · Competidores':(None,["Consultora en Guadalajara","Diferente a una Consultora"],["A diferencia de una consultora tradicional, conectamos el problema con su implementación."]),
}
def fix(t):
    t=t.replace('Rediseamos','Rediseñamos')
    return t.replace('Bayware','BayWa r.e.').replace('BayWa ·','BayWa r.e. ·') if 'r.e.' not in t else t
ops=[];report=[]
for a in ads:
    pin,hb,db=G[a['agn']]
    H=[fix(t) for t,_ in a['H']]; D=[fix(t) for t,_ in a['D']]
    H=[h if len(h)<=30 else None for h in H]  # fix() puede alargar
    low=lambda L:{x.lower() for x in L if x}
    keepH=[h for h in H if h and not BAD.search(h)]; nH=len(a['H'])
    keepD=[d for d in D if d and not BAD.search(d)]; nD=len(a['D'])
    pool=(pin or [])+hb+COMMON_H
    # titulares del tema primero
    newH=[p for p in (pin or []) if p.lower() not in low(keepH)]
    H2=keepH[:]
    for p in newH:
        if len(H2)<nH: H2.append(p)
        else:
            # reemplaza el ultimo titular no-tema
            for i in range(len(H2)-1,-1,-1):
                if not pin or H2[i] not in pin: H2[i]=p; break
    for p in pool:
        if len(H2)>=max(nH,10): break
        if p.lower() not in low(H2): H2.append(p)
    D2=keepD[:]
    for p in db+COMMON_D:
        if len(D2)>=max(nD,4): break
        if p.lower() not in low(D2): D2.append(p)
    assert all(len(h)<=30 for h in H2),[h for h in H2 if len(h)>30]
    assert all(len(d)<=90 for d in D2),[d for d in D2 if len(d)>90]
    assert len(set(x.lower() for x in H2))==len(H2) and len(set(x.lower() for x in D2))==len(D2)
    assert 3<=len(H2)<=15 and 2<=len(D2)<=4
    hl=[{'text':h,**({'pinnedField':'HEADLINE_1'} if pin and h in pin else {})} for h in H2]
    dl=[{'text':d} for d in D2]
    ops.append({'update':{'resourceName':f"customers/7021324934/ads/{a['ad']}",'responsiveSearchAd':{'headlines':hl,'descriptions':dl}},'updateMask':'responsive_search_ad.headlines,responsive_search_ad.descriptions'})
    report.append({'grupo':a['agn'],'ad':a['ad'],'quitados_H':[t for t,_ in a['H'] if fix(t) not in H2],'nuevos_H':[h for h in H2 if h not in [fix(t) for t,_ in a['H']]],'quitadas_D':[t for t,_ in a['D'] if fix(t) not in D2],'nuevas_D':[d for d in D2 if d not in [fix(t) for t,_ in a['D']]],'fijados':[h for h in H2 if pin and h in pin]})
json.dump(ops,open(S+'/rsa_ops.json','w'),ensure_ascii=False)
json.dump(report,open(S+'/rsa_report.json','w'),ensure_ascii=False,indent=1)
print('ops',len(ops)); import collections
print('titulares quitados',sum(len(r['quitados_H']) for r in report),'| descripciones quitadas',sum(len(r['quitadas_D']) for r in report))
for r in report[:3]: print(json.dumps(r,ensure_ascii=False)[:900])
