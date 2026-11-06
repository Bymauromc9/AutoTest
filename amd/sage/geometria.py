from sage.all import *
from sage.all import var

from sage.plot.polygon import *

from sage.plot.plot3d.shapes import *
from sage.plot.plot3d.texture import Texture
from sage.structure.element import Vector
from sage.plot.plot3d.index_face_set import IndexFaceSet


# Constantes utiles

gris="grey"
negro="black"
rojo="red"
verde="green"
azul="blue"
blanco="white"
amarillo="yellow"
naranja="orange"
Pi=3.1416
PI=Pi

# Sistema de referencia y base canonicos

def es_numero(variable):
    try:
        float(variable)
        return True
    except (TypeError, ValueError):
        return False

O3d=vector(RR,[0,0,0])
ejeX3d=vector(RR,[1,0,0])
ejeY3d=vector(RR,[0,1,0])
ejeZ3d=vector(RR,[0,0,1])

o3d=O3d
EjeX3d=ejeX3d
EjeY3d=ejeY3d
EjeZ3d=ejeZ3d

O2d=vector(RR,[0,0])
ejeX2d=vector(RR,[1,0])
ejeY2d=vector(RR,[0,1])

o2d=O2d
EjeX2d=ejeX2d
EjeY2d=ejeY2d


# Ejes

def ejes(dim=3,l=3,color=[rojo,verde,azul], g=0.01):
    if dim==3:
        T0=sage.plot.plot3d.shapes2.line3d([O3d,l*ejeX3d], radius=g,color=color[0])
        T1=sage.plot.plot3d.shapes2.line3d([O3d,l*ejeY3d], radius=g,color=color[1%len(color)])
        T2=sage.plot.plot3d.shapes2.line3d([O3d,l*ejeZ3d], radius=g,color=color[2%len(color)])
        return(T0+T1+T2)
    if dim==2:
        T0=line2d([O2d,l*ejeX2d], thickness=g,color=color[0])
        T1=line2d([O2d,O2d+l*ejeY2d], thickness=g,color=color[1%len(color)])
        return(T0+T1)

#Bases

def vectores(lista=[],inicio=[],dim=3,g=0.02,color=[rojo,verde,azul]):
    T=Graphics()
    if isinstance(lista, Vector) or (len(lista)>0 and es_numero(lista[0])):
        n=len(lista)
        if n==2:
            if len(inicio)==0:
                inicio=O2d
            if isinstance(color,str):
                col=color
            elif len(color)>0:
                col=color[0]
            else:
                col=negro
            print(col)
            T+=arrow(inicio,vector(inicio)+vector(lista), thickness=g, color=col)
        if n==3:
            if len(inicio)==0:
                inicio=O3d
            if isinstance(color,str):
                col=color
            elif len(color)>0:
                col=color[0]
            else:
                col=negro
            T+=sage.plot.plot3d.shapes2.line3d([vector(inicio),vector(inicio)+vector(lista)], radius=g, arrow_head=True, color=col)
        return(T)

    else:
        
        if len(lista)==0:
            if dim==3:
                lista=[ejeX3d,ejeY3d,ejeZ3d]
            if dim==2:
                lista=[ejeX2d,ejeY2d]
        dim=len(lista[0])
        if len(inicio)==0:
            if dim==3:
                inicio=[O3d for i in range(len(lista))]
            if dim==2:
                inicio=[O2d for i in range(len(lista))]
        lista=[vector(RR,v) for v in lista]
        inicio=[vector(RR,v) for v in inicio]
        
        if dim==3:
            for i in range(len(lista)):
                if isinstance(color,str):
                    col=color
                elif i<len(color):
                    col=color[i]
                else:
                    col=negro
                T+=sage.plot.plot3d.shapes2.line3d([inicio[i],inicio[i]+lista[i]], radius=g, arrow_head=True, color=col)
        if dim==2:
    
            for i in range(len(inicio)):
                if isinstance(color,str):
                    col=color
                elif i<len(color):
                    col=color[i]
                else:
                    col=negro
                T+=arrow(inicio[i],inicio[i]+lista[i], thickness=g, color=col)
        
        return(T)


def puntos(lista,g=10,color=negro):
    T=Graphics()
    if isinstance(lista, Vector) or (len(lista)>0 and es_numero(lista[0])):
        n=len(lista)
        if n==3:
            if isinstance(color,str):
                col=color
            elif len(color)>0:
                col=color[0]
            else:
                col=negro
            T+=sage.plot.plot3d.shapes2.Point(lista, size=g, color=col)
        if n==2:
            if isinstance(color,str):
                col=color
            elif len(color)>0:
                col=color[0]
            else:
                col=negro
            T+=point(lista, size=g, color=col)
        return(T)

    
    
    if len(lista)>=0:
        n=len(lista[0])
        if n==3:
            for i in range(len(lista)):
                if isinstance(color,str):
                    col=color
                elif i<len(color):
                    col=color[i]
                else:
                    col=negro
                P=vector(RR,lista[i])
                T+=sage.plot.plot3d.shapes2.Point(P, size=g, color=col)
        if n==2:
            for i in range(len(lista)):
                if isinstance(color,str):
                    col=color
                elif i<len(color):
                    col=color[i]
                else:
                    col=negro
                P=vector(RR,lista[i])
                T+=point(P, size=g, color=col)
    return(T)



def segmentos(lista, g=0.02, color=negro):
    T=Graphics()
    if len(lista)>0:
        lista=[vector(RR,v) for v in lista]
        n=len(lista[0])
        if n==3:
            T+=sage.plot.plot3d.shapes2.line3d(lista, radius=g, color=color)
        if n==2:
            T+=line2d(lista, thickness=100*g, color=color)
    return(T)


def recta(u=[], C=O3d, ec=[],l=5, g=0.02, color=negro):
    T=Graphics()
    if len(u)>0:
        u=vector(RR,u)
        if len(u)==3:
            u=u.normalized()
            C=vector(C)
            P0=C-l/2*u
            P1=C+l/2*u
            T+=sage.plot.plot3d.shapes2.line3d([P0,P1], radius=g, color=color)
        if len(u)==2:
            if C==O3d:
                C=O2d
            C=vector(C)
            u=u.normalized()
            P0=C-l/2*u
            P1=C+l/2*u
            T+=line2d([P0,P1], thickness=100*g, color=color)
    elif len(ec)>0:
        if len(ec)==1:
            ec=ec[0]
            coef, indep=interpretaEc(ec,2)
            u=vector([-coef[1],coef[0]])
            u=u.normalized()
            a=coef[0]
            b=coef[1]
            if not a==0:
                C=vector([indep/a,0])
            else:
                C=vector([0,indep/b])
            C=C-(C*u)*u
            P0=C-l/2*u
            P1=C+l/2*u
            T+=line2d([P0,P1], thickness=100*g, color=color)
            
        if len(ec)==2:
            coef=[]
            indep=[]
            for ecu in ec:
                coe, inde=interpretaEc(ecu,3)
                coef.append(coe)
                indep.append(inde)
            v=vector(coef[0])
            w=vector(coef[1])
            A=matrix([v,w])
            B=column_matrix(indep)
            A=A.augment(B)
            A=A.rref()
            if not A[0][0]==0:
                C=vector([A[0][3],A[1][3],0])
            else:
                C=vector([0,A[0][3],A[1][3]])
            u=v.cross_product(w)
            u=u.normalized()
            C=C-(C*u)*u
            P0=C-l/2*u
            P1=C+l/2*u
            T+=sage.plot.plot3d.shapes2.line3d([P0,P1], radius=g, color=color)
    return(T)


import re

def leer_ecuacion(texto):
    var('x, y, z')
    texto_seguro = re.sub(r'(\d)\s*([a-zA-Z])', r'\1*\2', texto)
    texto_seguro = re.sub(r'(\))\s*([a-zA-Z])', r'\1*\2', texto_seguro)

    try:
        if "=" in texto_seguro:
            partes = texto_seguro.split("=")
            lado_izq = SR(partes[0])
            lado_der = SR(partes[1])
            expr = lado_izq - lado_der
        else:
            expr = SR(texto_seguro)
            
    except Exception as e:
        return f"Error al interpretar la ecuación. Revisa la sintaxis. ({e})"
    
    cx = expr.coefficient(x).simplify_full()
    cy = expr.coefficient(y).simplify_full()
    cz = expr.coefficient(z).simplify_full()
    constante_izquierda = expr.subs(x=0, y=0, z=0).simplify_full()
    indep = -constante_izquierda
    
    return [cx, cy, cz], indep



def interpretaEc(ec,dim):
    coef=[]
    indep=[]
    ecu=ec.split("=")
    indep=eval(ecu[1])
    if dim==2:
        x, y = 1,0
        coef.append(eval(ecu[0]))
        x,y=0,1
        coef.append(eval(ecu[0]))
    if dim==3:
        x,y,z=1,0,0
        coef.append(eval(ecu[0]))
        x,y,z=0,1,0
        coef.append(eval(ecu[0]))
        x,y,z=0,0,1
        coef.append(eval(ecu[0]))
    return([coef,indep])



def plano(lista=[],C=O3d,ec="",l=5, g=5, color=amarillo, opacidad=0.5, ortogonalizar=True):
    lista=[vector(RR,v) for v in lista]
    P=vector(RR,C)
    T=Graphics()
    if len(lista)==2:
        u=lista[0]
        v=lista[1]
        if ortogonalizar:
            u=u.normalized()
            w=u.cross_product(v)
            v=w.cross_product(u)
            v=v.normalized()
        P0=P+0.5*l*u-0.5*g*v
        P1=P0+g*v
        P2=P1-l*u
        P3=P2-g*v
        vertices=[P0,P1,P2,P3]
        caras=[[0,1,2],[0,2,3]]
        T+=sage.plot.plot3d.index_face_set.IndexFaceSet(caras,vertices,color=color,opacity=opacidad)
    elif not ec=="":
        coe, indep=interpretaEc(ec,3)
        w=vector(RR,coe)
        if not w[0]==0:
            C=vector([indep/w[0],0,0])
        elif not w[1]==0:
            C=vector([0,indep/w[1],0])
        else:
            C=vector([0,0,indep/w[2]])
        
        w=w.normalized()
        if not abs(w[0])+abs(w[1])==0:
            u=vector([-w[1],w[0],0])
            u=u.normalized()
        else:
            u=vector([1,0,0])
        v=w.cross_product(u)
        v=v.normalized()
        
        P=C-(C*u)*u-(C*v)*v
        P0=P+0.5*l*u-0.5*g*v
        P1=P0+g*v
        P2=P1-l*u
        P3=P2-g*v
        vertices=[P0,P1,P2,P3]
        caras=[[0,1,2],[0,2,3]]
        T+=sage.plot.plot3d.index_face_set.IndexFaceSet(caras,vertices,color=color,opacity=opacidad)
    return(T)


def poligono(lista,color=amarillo, opacidad=0.5,wire=False):
    lista=[vector(RR,v) for v in lista]
    T=Graphics()
    if len(lista)>0:
        if len(lista[0])==3:
            vertices=[]
            caras=[]
            C=O3d
            for v in lista:
                C+=v
            C*=1/len(lista)
            vertices.append(C)
            for i in range(len(lista)):
                vertices.append(lista[i])
                caras.append([0,(i+1)%len(lista)+1,i+1])
            T+=sage.plot.plot3d.index_face_set.IndexFaceSet(caras,vertices,color=color,opacity=opacidad)
            if wire:
                lista2=lista.copy()
                lista2.append(lista[0])
                T+=segmentos(lista2)
        if len(lista[0])==2:
            if wire:
                thick=2
            else:
                thick=0
            T+=polygon(lista,color=color,alpha=opacidad,thickness=thick,edgecolor=negro)
    
    return(T)




def prisma(lista,color=rojo, color2=negro, opacidad=0.5, solid=True, wire=False, g=0.01):
    lista=[vector(RR,v) for v in lista]

    if isinstance(color,list):
        colorBase=color[0]
        if len(color)>1:
            colors=[color[i] for i in range(len(color)) if i>0]
        else:
            colors=color
        
    else:
        colorBase=color
        colors=[color]
    
    colores=[]
    vertices=[v for v in lista]
    if not (len(lista)%2)==0:
        print("El numero de vertices debe ser par")
        return(Graphics())
    if len(lista)<6:
        print("El numero de vertices ha de ser mayor o igual a 6")
        return(Graphics())
    n=int(len(lista)/2)
    #base
    C0=vector([0,0,0])
    C1=vector([0,0,0])
    for i in range(n):
        C0+=lista[i]
        C1+=lista[n+i]
    C0=C0*1/n
    C1=C1*1/n
    n0=len(vertices)
    n1=len(vertices)+1
    vertices.append(C0)
    vertices.append(C1)
    caras=[]
    if solid:
        for i in range(n):
            caras.append([n0,i,(i+1)%n])
            colores.append(colorBase)
        for i in range(n):
            caras.append([n1,(i+1)%n+n,i+n])
            colores.append(colorBase)
        for i in range(n):
            caras.append([i,i+n,(i+1)%n])
            caras.append([(i+1)%n,i+n,(i+1)%n+n])
            colores.append(colors[i%len(colors)])
            colores.append(colors[i%len(colors)])
    if wire:
        aristas=[]
        for i in range(n):
            aristas.append([i,(i+1)%n])
            aristas.append([i+n,(i+1)%n+n])
            aristas.append([i,i+n])
        for arista in aristas:
            P=vertices[arista[0]]
            Q=vertices[arista[1]]
            n1=len(vertices)
            u=Q-P
            if not u[0]==0:
                v=vector(RR,[-u[1],u[0],0])
            else:
                v=vector([1,0,0])
            v=v.normalized()
            w=v.cross_product(u)
            w=w.normalized()
            
            ang=2*pi/3
            P0=P+g*(cos(0*ang)*v+sin(0*ang)*w)
            P1=P+g*(cos(1*ang)*v+sin(1*ang)*w)
            P2=P+g*(cos(2*ang)*v+sin(2*ang)*w)
            P3=P0+u
            P4=P1+u
            P5=P2+u
            vertices.append(P0)
            vertices.append(P1)
            vertices.append(P2)
            vertices.append(P3)
            vertices.append(P4)
            vertices.append(P5)
            
            caras.append([n1,n1+3,n1+1])
            caras.append([n1+1,n1+3,n1+4])
            
            caras.append([n1+1,n1+4,n1+2])
            caras.append([n1+2,n1+4,n1+5])
    
            caras.append([n1+2,n1+5,n1])
            caras.append([n1,n1+3,n1+5])
    
            for i in range(6):
                colores.append(color2)
    t_list=[Texture(colores[i]) for i in range(len(colores))]
    _prisma=sage.plot.plot3d.index_face_set.IndexFaceSet(caras,vertices,texture_list=t_list,opacity=opacidad)
    return(_prisma)

def piramide(lista,color=rojo, color2=negro,opacidad=0.5, solid=True, wire=False,g=0.01):
    if isinstance(color,list):
        colorBase=color[0]
        if len(color)>1:
            colors=[color[i] for i in range(len(color)) if i>0]
        else:
            colors=color
    else:
        colorBase=color
        colors=[color]
    
    
    if len(lista)<4:
        print("El numero de vertices ha de ser mayor o igual a 4")
        return(Graphics())
    
    lista=[vector(RR,v) for v in lista]

    colores=[]
    vertices=[v for v in lista]
    n=int(len(lista)-1)
    #base
    C0=vector([0,0,0])
    for i in range(n):
        C0+=lista[i]
    C0=C0*1/n
    n0=len(vertices)

    vertices.append(C0)
    caras=[]
    if solid:
        for i in range(n):
            caras.append([n0,i,(i+1)%n])
            colores.append(colorBase)
        for i in range(n):
            caras.append([n,i,(i+1)%n])
            colores.append(colors[i%len(colors)])

    if wire:
        aristas=[]
        for i in range(n):
            aristas.append([i,(i+1)%n])
            aristas.append([i,n])
        for arista in aristas:
            P=vertices[arista[0]]
            Q=vertices[arista[1]]
            n1=len(vertices)
            u=Q-P
            if not u[0]==0:
                v=vector(RR,[-u[1],u[0],0])
            else:
                v=vector([1,0,0])
            v=v.normalized()
            w=v.cross_product(u)
            w=w.normalized()
            
            ang=2*pi/3
            P0=P+g*(cos(0*ang)*v+sin(0*ang)*w)
            P1=P+g*(cos(1*ang)*v+sin(1*ang)*w)
            P2=P+g*(cos(2*ang)*v+sin(2*ang)*w)
            P3=P0+u
            P4=P1+u
            P5=P2+u
            vertices.append(P0)
            vertices.append(P1)
            vertices.append(P2)
            vertices.append(P3)
            vertices.append(P4)
            vertices.append(P5)
            
            caras.append([n1,n1+3,n1+1])
            caras.append([n1+1,n1+3,n1+4])
            
            caras.append([n1+1,n1+4,n1+2])
            caras.append([n1+2,n1+4,n1+5])
    
            caras.append([n1+2,n1+5,n1])
            caras.append([n1,n1+3,n1+5])
    
            for i in range(6):
                colores.append(color2)
        
    t_list=[Texture(colores[i]) for i in range(len(colores))]
        
    _piramide=sage.plot.plot3d.index_face_set.IndexFaceSet(caras,vertices,texture_list=t_list,opacity=opacidad)
    return(_piramide)


def esfera(lista=[ejeX3d,ejeY3d,ejeZ3d],C=O3d,r=1,color=rojo,opacidad=0.2,nLados=60,nAnillos=30, trozos=False):
    u=lista[0]
    v=lista[1]
    w=lista[2]
    vertices=[]
    caras=[]
    
    ang0=2*pi/nLados
    ang1=pi/nAnillos
    puntos=[]
    for i in range(nAnillos+1):
        for j in range(nLados):
            C1=C+r*sin(-pi/2+i*ang1)*w
            r1=r*cos(-pi/2+i*ang1)
            P=C1+r1*(cos(j*ang0)*u+sin(j*ang0)*v)
            vertices.append(P)
    for i in range(nAnillos):
        for j in range(nLados):
            if i<nAnillos:
                i0=i*nLados
                i1=(i+1)*nLados
                j0=j
                j1=(j+1)%nLados
                if (i+j)%2==0 or not trozos:
                    #caras.append([i0+j0,i1+j0,i1+j1,i0+j1])
                    caras.append([i0+j0,i0+j1,i1+j1,i1+j0])
            
    #vertices=[quitaHomogenea(v) for v in vertices]
    _esfera=sage.plot.plot3d.index_face_set.IndexFaceSet(caras,vertices,color=color,opacity=opacidad)
    return(_esfera)


def circulo(lista=[ejeX2d,ejeY2d],C=O2d,dim=2,r=1,color=negro,g=0.01,nLados=64):
    u=vector(lista[0])
    v=vector(lista[1])
    C=vector(C)
    
    if dim==3:
        if u==ejeX2d:
            u=ejeX3d
        if v==ejeY2d:
            v=ejeY3d
        if C==O2d:
            C=O3d
    ang=2*pi/nLados
    vertices=[]
    for i in range(nLados+1):
        Q=C+r*(cos(i*ang)*u+sin(i*ang)*v)
        vertices.append(Q)
    return(segmentos(vertices,g=g,color=color))



def poliedro(puntos,color='lime', opacidad=0.9, dibujar=True):
    puntos=[vector(v) for v in puntos]
    P = Polyhedron(vertices=puntos, base_ring=RDF)
    centro_poliedro = sum([vector(v) for v in P.vertices()]) / len(P.vertices())

    lista_vertices = list(P.vertices())
    coords_vertices = [vector(v) for v in lista_vertices]
    v_a_indice = {v: i for i, v in enumerate(lista_vertices)}
    
    caras_indices = []
    for cara in P.facets():
        verts_cara = list(cara.vertices())
        if len(verts_cara) > 2:
            coords_cara = [vector(v) for v in verts_cara]
            centro_cara = sum(coords_cara) / len(coords_cara)
            v0, v1, v2 = coords_cara[0], coords_cara[1], coords_cara[2]
            normal_plano = (v1 - v0).cross_product(v2 - v0)
            U = coords_cara[0] - centro_cara
            V = normal_plano.cross_product(U)
            
            def obtener_angulo(vertice_obj):
                p = vector(vertice_obj) - centro_cara
                return atan2(p.dot_product(V), p.dot_product(U))
            verts_cara.sort(key=obtener_angulo)

            v_ordenados = [vector(v) for v in verts_cara]
            lado1 = v_ordenados[1] - v_ordenados[0]
            lado2 = v_ordenados[2] - v_ordenados[1]
            normal_calculada = lado1.cross_product(lado2)
            vector_salida = centro_cara - centro_poliedro
            if normal_calculada.dot_product(vector_salida) < 0:
                verts_cara.reverse()
        indices = [v_a_indice[v] for v in verts_cara]
        caras_indices.append(indices)
    if dibujar:
        return IndexFaceSet(caras_indices, coords_vertices, color=color, opacity=opacidad, mesh=True)
    else:
        return([coords_vertices,caras_indices])


def objeto(vertices,caras,color=amarillo,opacidad=1,dim=3,aristas=False):
    if dim==2:
        return(objeto2D(vertices,caras,color=color,opacidad=1,aristas=aristas))
    else:
        return(objeto3D(vertices,caras,color=color,opacidad=1))

def objeto2D(vertices,caras,color=amarillo,opacidad=1,aristas=False):
    if isinstance(color,str):
        color2=[color for i in range(len(caras))]
        colores=color2
    else:
        colores=color
    coordenadas_por_cara = [[vertices[idx] for idx in cara] for cara in caras]
    mi_malla_2d = Graphics()
    for i in range(len(coordenadas_por_cara)):
        if aristas:
            mi_malla_2d += polygon(coordenadas_por_cara[i], color=colores[i], edgecolor='black')
        else:
            mi_malla_2d += polygon(coordenadas_por_cara[i], color=colores[i])
    return(mi_malla_2d)



    
def objeto3D(vertices,caras,color=amarillo,opacidad=1):
    if isinstance(color,str):
        return(sage.plot.plot3d.index_face_set.IndexFaceSet(caras,vertices,color=color,opacity=opacidad))
    else:
        t_list = [Texture(color[i]) for i in range(len(color))]
        return(sage.plot.plot3d.index_face_set.IndexFaceSet(caras,vertices,texture_list=t_list))

def aristas(vertices,caras):
    misAristas=set()
    misSegmentos=[]
    for cara in caras:
        for i in range(len(cara)):
            arista=frozenset([cara[i],cara[(i+1)%len(cara)]])
            misAristas.add(arista)
    misAristas=[list(arista) for arista in misAristas]
    misSegmentos=[[vertices[arista[0]],vertices[arista[1]]] for arista in misAristas]
    return(misSegmentos)
        

def importarObjeto(ruta_obj,color=False,dim=3):
    if dim==3:
        return(importarObjeto3D(ruta_obj,color=color))
    else:
        return(importarObjeto2D(ruta_obj,color=color))

def importarObjeto2D(ruta_obj,color=False):
    vertices = []
    caras = []
    colores_caras = []
    
    materiales = {}
    color_actual = (0.5, 0.5, 0.5) # Color gris por defecto si no hay material
    
    directorio_base = os.path.dirname(ruta_obj)
    
    with open(ruta_obj, 'r') as archivo_obj:
        for linea in archivo_obj:
            linea = linea.strip()
            if not linea or linea.startswith('#'):
                continue
                
            partes = linea.split()
            comando = partes[0]
            
            # 1. Leer archivo de materiales (.mtl)
            if comando == 'mtllib':
                nombre_mtl = partes[1]
                ruta_mtl = os.path.join(directorio_base, nombre_mtl)
                if os.path.exists(ruta_mtl):
                    materiales = leer_mtl(ruta_mtl)
                    
            # 2. Asignar el material actual para las siguientes caras
            elif comando == 'usemtl':
                nombre_material = partes[1]
                # Si el material existe en el dict, usamos su color; si no, gris
                color_actual = materiales.get(nombre_material, (0.5, 0.5, 0.5))
                
            # 3. Leer vértices (guardamos solo X e Y)
            elif comando == 'v':
                x = float(partes[1])
                y = float(partes[3])
                # partes[3] sería Z, pero lo ignoramos para 2D
                vertices.append((x, y))
                
            # 4. Leer caras
            elif comando == 'f':
                # Los indices en OBJ empiezan en 1, en Python en 0.
                # También manejamos el formato 'v/vt/vn' separando por '/'
                indices_cara = [int(p.split('/')[0]) - 1 for p in partes[1:]]
                caras.append(indices_cara)
                colores_caras.append(color_actual)
    if color:  
        return vertices, caras, colores_caras
    else:
        return vertices, caras
        
def leer_mtl(ruta_mtl):
    """Función auxiliar para extraer los colores del archivo MTL"""
    materiales = {}
    nombre_mtl_actual = None
    
    with open(ruta_mtl, 'r') as archivo_mtl:
        for linea in archivo_mtl:
            linea = linea.strip()
            if not linea or linea.startswith('#'):
                continue
                
            partes = linea.split()
            comando = partes[0]
            
            # Registrar nuevo material
            if comando == 'newmtl':
                nombre_mtl_actual = partes[1]
                
            # Extraer color difuso (Kd) que define el color de la cara en Blender
            elif comando == 'Kd' and nombre_mtl_actual is not None:
                r = float(partes[1])
                g = float(partes[2])
                b = float(partes[3])
                materiales[nombre_mtl_actual] = (r, g, b)
                
    return materiales
    
def importarObjeto3D(ruta_obj,color=False,dim=3):

    # 1. Definir rutas
    if not os.path.exists(ruta_obj):
        print(f"Error: No se encuentra el archivo {ruta_obj}")
        return None
        
    ruta_mtl = ruta_obj.replace('.obj', '.mtl')
    
    # --- PASO 1: LEER EL ARCHIVO MTL (COLORES) ---
    materiales = {} # Diccionario: 'NombreMaterial': (r, g, b)
    
    if color and os.path.exists(ruta_mtl):
        current_mtl_name = None
        with open(ruta_mtl, 'r') as f:
            for line in f:
                parts = line.strip().split()
                if not parts: continue
                
                if parts[0] == 'newmtl':
                    current_mtl_name = parts[1]
                elif parts[0] == 'Kd' and current_mtl_name:
                    # Kd es el color difuso (R G B) entre 0 y 1
                    rgb = (float(parts[1]), float(parts[2]), float(parts[3]))
                    materiales[current_mtl_name] = rgb
    

    # --- PASO 2: LEER EL ARCHIVO OBJ (GEOMETRÍA) ---
    vertices = []
    caras=[]
    colores=[]
    material_actual = "default"
    
    with open(ruta_obj, 'r') as f:
        for line in f:
            parts = line.strip().split()
            if not parts: continue
            
            # Vértices geométricos
            if parts[0] == 'v':
                # Convertimos a float y guardamos (x, y, z)
                v = [float(x) for x in parts[1:4]]
                vertices.append(v)
            
            # Cambio de material
            elif parts[0] == 'usemtl':
                material_actual = parts[1]
            
            # Caras
            elif parts[0] == 'f':
                # Las caras en OBJ pueden ser "v", "v/vt" o "v/vt/vn"
                # Solo nos importa el primer número (índice del vértice)
                indices_cara = []
                for p in parts[1:]:
                    # Tomamos el string antes de la primera barra '/'
                    v_idx_str = p.split('/')[0]
                    # OBJ empieza en 1, Python en 0. Restamos 1.
                    indices_cara.append(int(v_idx_str) - 1)
                
                # Si no se ha definido material aún, inicializar default
                    
                caras.append(indices_cara)
                color_rgb = materiales.get(material_actual, (1, 0, 0))
                colores.append(color_rgb)

    
    # Sumar todos los meshes para devolver un solo objeto gráfico
    return([vertices,caras,colores])





## Ayuda
comandos={}
parametros={}

comandos["Constantes"]="Constantes definidas en el modulo"
parametros["Constantes"]={}
parametros["Constantes"]["Colores"]="rojo, verde, azul, blanco, amarillo, naranja"
parametros["Constantes"]["Numericas"]="Pi"
parametros["Constantes"]["2D"]="O2d, ejeX2d, ejeY2d"
parametros["Constantes"]["3D"]="O3d, ejeX3d, ejeY3d, ejeZ3d"

comandos["vectores"]="Funcion para dibujar un vector o una lista de vectores en 2D o 3D"
parametros["vectores"]={}
parametros["vectores"]["lista"]="Es el parametro principal y no tiene valor por defecto. Puede ser un solo vector  o una lista de vectores"
parametros["vectores"]["inicio"]="El punto desde donde se dibuja el vector. Por defecto es el origen (0,0,0)"
parametros["vectores"]["g"]="El grosor de la flecha"
parametros["vectores"]["color"]="Un color o una lista de colores ([rojo, verde, azul])"

comandos["ejes"]="Funcion para crear un objeto gráfico que representa las líneas de los ejes cartesianos"
parametros["ejes"]={}
parametros["ejes"]["dim"]="La dimensión es 3 para dibujar en el espacio o 2 para el plano. Por defecto es 3"
parametros["ejes"]["l"]="La longitud de las líneas de los ejes. Por defecto miden 3 unidades"
parametros["ejes"]["color"]="Lista de colores. Asigna el primero al eje X, el segundo al Y, y el tercero al Z"
parametros["ejes"]["g"]="grosor de las líneas"

comandos["puntos"]="La funcion recibe una coordenada o una lista de coordenadas y devuelve un objeto grafico compuesto por puntos"
parametros["puntos"]={}
parametros["puntos"]["lista"]="Puede ser un solo punto o una lista de puntos . El programa detecta si son 2d o 3d. No tiene valor por defecto"
parametros["puntos"]["g"]="El grosor de los puntos"
parametros["puntos"]["color"]="Puede ser un color unico o una lista de colores ([rojo, azul]) para alternar entre puntos"

comandos["segmentos"]="La funcion toma una lista ordenada de coordenadas y dibuja una linea que va del primer punto al segundo, del segundo al tercero, y asi sucesivamente"
parametros["segmentos"]={}
parametros["segmentos"]["lista"]="Una lista de puntos. La funcion conectara estos puntos en ese orden. No tiene valor por defecto"
parametros["segmentos"]["g"]="El grosor de la linea"
parametros["segmentos"]["color"]="El color de la linea (por defecto negro)."

comandos["recta"]="Dibuja rectas (en 2D o en 3D) definidas mediante punto y vector o por ecuaciones implicitas"
parametros["recta"]={}
parametros["recta"]["u"]="Vector director de la recta. Si se da, tiene prioridad sobre las ecuaciones. No tiene valor por defecto"
parametros["recta"]["C"]="Punto por donde pasa la recta. Por defecto, es O3d"
parametros["recta"]["ec"]="Lista de ecuaciones. Si no hay vector u, se intenta deducir la recta a partir de aqui. El numero de ecuaciones determina si es 2D o 3D"
parametros["recta"]["l"]=": Longitud del segmento de recta que se dibujará"
parametros["recta"]["g"]="Grosor de la linea "
parametros["recta"]["color"]="Color de la linea."

comandos["plano"]="Dibuja un plano definido mediante un punto y dos vectores o una ecuacion"
parametros["plano"]={}
parametros["plano"]["lista"]="Lista de vectores directores. No tiene valor por defecto"
parametros["plano"]["P"]="Punto central del plano (por defecto O3d)."
parametros["plano"]["ec"]="Cadena de texto con la ecuación del plano (ej. 'x + 2*y = 0')"
parametros["plano"]["l"]="Longitud del rectangulo visualizado"
parametros["plano"]["g"]="Ancho del rectangulo visualizado"
parametros["plano"]["color"]="Color del plano"
parametros["plano"]["opacidad"]="Transparencia del plano"
parametros["plano"]["ortogonalizar"]="Variable booleana para forzar que los vectores dados sean ortonormales"

comandos["poligono"]="Dibuja un poligono relleno basandose en las coordenadas de los puntos de entrada. Dependiendo del numero de coordenadas del primer punto se dibuja en 2D o 3D."
parametros["poligono"]={}
parametros["poligono"]["lista"]="Una lista de vectores o tuplas que representan los vértices del polígono (en orden). No tiene valor por defecto"
parametros["poligono"]["color"]="El color de relleno"
parametros["poligono"]["opacidad"]="La transparencia del poligono"
parametros["poligono"]["wire"]="Un booleano. Si es True, dibuja tambien el contorno (las aristas) del poligono"

comandos["circulo"]="Permite dibujar un circulo tanto en 2D como en 3D"
parametros["circulo"]={}
parametros["circulo"]["lista"]="Contiene los dos vectores u y v que definen los dos ejes del circulo. Por defecto son los ejes X e Y en 2D"
parametros["circulo"]["C"]="El punto central del circulo (por defecto el origen 2D)"
parametros["circulo"]["dim"]="Dimensión del espacio (2 para plano, 3 para espacio). Solo es necesario si no se especifican los ejes"
parametros["circulo"]["r"]="El radio del circulo"
parametros["circulo"]["g"]="El grosor de la linea"
parametros["circulo"]["nLados"]="La resolucion"

comandos["prisma"]="Genera un prisma 3D conectando dos bases de puntos. La funcion espera recibir una lista de vertices donde la primera mitad corresponde a la base inferior y la segunda mitad a la base superior"
parametros["prisma"]={}
parametros["prisma"]["lista"]="Lista con todos los vertices (Base inferior + Base superior). No tiene valor por defecto"
parametros["prisma"]["color"]="Puede ser un color unico o una lista. Si es una lista, el primer color es para las tapas (bases) y los siguientes para las caras laterales"
parametros["prisma"]["solid"]="Booleano. Si es True, dibuja las caras del prisma"
parametros["prisma"]["wire"]="Booleano. Si es True, dibuja las aristas"
parametros["prisma"]["g"]="Grosor de las aristas (si wire esta activo)"

comandos["piramide"]="Dibuja  una piramide con una base poligonal arbitraria y una cuspide (apice). La funcion asume que el ultimo punto de la lista proporcionada es la punta de la piramide y todos los puntos anteriores forman el poligono de la base"
parametros["piramide"]={}
parametros["piramide"]["lista"]="Lista con todos los vertices (base + cuspide). No tiene valor por defecto"
parametros["piramide"]["color"]="Puede ser un color unico o una lista. Si es una lista, el primer color es para la base y los siguientes para las caras laterales"
parametros["piramide"]["solid"]="Booleano. Si es True, dibuja las caras de la piramide"
parametros["piramide"]["wire"]="Booleano. Si es True, dibuja las aristas"
parametros["piramide"]["g"]="Grosor de las aristas (si wire esta activo)"

comandos["esfera"]="Construye una superficie esferica aproximada"
parametros["esfera"]={}
parametros["esfera"]["lista"]="Lista de tres vectores u, v y w que actuan como ejes locales de la esfera. El vector w va de Polo Sur a Polo Norte"
parametros["esfera"]["C"]="Centro de la esfera (por defecto el origen O3d)"
parametros["esfera"]["r"]="Radio de la esfera"
parametros["esfera"]["nLados"]="Resolucion longitudinal (numero de meridianos)"
parametros["esfera"]["nAnillos"]="Resolucion latitudinal (numero de paralelos)"
parametros["esfera"]["trozos"]="Si es True, la esfera se dibuja como un tablero de ajedrez (hueca en partes); si es False, se dibuja completa"

comandos["poliedro"]="Recibe una 'nube de puntos' y dibuja la envoltura convexa de esos puntos"
parametros["poliedro"]={}
parametros["poliedro"]["puntos"]="lista de puntos 3D"
parametros["poliedro"]["color"]="el color del objeto"
parametros["poliedro"]["opacidad"]="la opacidad del objeto"

comandos["objeto"]="Funcion que actua como un constructor universal para crear mallas 3D arbitrarias. Esta pensada para usarse junto con importarObjeto()"
parametros["objeto"]={}
parametros["objeto"]["vertices"]="Lista de coordenadas (x, y, z) de los puntos del objeto"
parametros["objeto"]["caras"]="Lista de listas. Cada sub-lista contiene los indices de los vertices de cada cara"
parametros["objeto"]["color"]="Puede ser un color o una lista de colores"

comandos["importarObjeto"]="La funcion toma la ruta de un archivo .obj, lee sus vertices, caras y colores (si estan activados), y devuelve una lista con los datos [vertices, caras, colores]"
parametros["importarObjeto"]={}
parametros["importarObjeto"]["ruta_obj"]="Nombre del archivo a leer"
parametros["importarObjeto"]["color"]="Booleano. Si es true intenta leer los colores de las caras del archivo .mtl con el mismo nombre"



def ayuda(cadena=""):
    if cadena=="":
        print("Constantes y funciones del modulo geometria:")
        for nombre in comandos:
            print("* "+nombre+": "+comandos[nombre])
        print()
        print("Escribe ayuda(nombre), donde nombre es 'Constantes' o el nombre de una funcion para obtener mas informacion")
    
    elif not cadena in comandos:
        print("Esa funcion no forma parte del modulo geometria")
    
    else:
        adorno="()"
        if cadena=="Constantes":
            adorno=""
        print("Ayuda de "+cadena+adorno+":")
        print("   "+cadena+adorno+": "+comandos[cadena])
        if not cadena=="Constantes":
            print("   Parametros:")
        for parametro in parametros[cadena]:
            print("      "+parametro+": "+parametros[cadena][parametro])


    

