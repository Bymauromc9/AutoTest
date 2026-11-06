
def resolucion_triangular(M, b, inferior=False):
    """
    Resuelve Mx = b donde M puede ser triangular superior o inferior.
    Complejidad: O(n^2).
    """
    b=vector(b)
    n = M.nrows()
    x = [0 for i in range(n)]
    if inferior:
        # SUSTITUCIÓN HACIA ADELANTE (Forward Substitution)
        # Vamos desde la primera fila hasta la última
        for i in range(n):
            suma = sum(M[i, j] * x[j] for j in range(i))
            x[i] = (b[i] - suma) / M[i, i]
    else:
        # SUSTITUCIÓN HACIA ATRÁS (Backward Substitution)
        # Vamos desde la última fila hasta la primera
        for i in range(n - 1, -1, -1):
            suma = sum(M[i, j] * x[j] for j in range(i + 1, n))
            x[i] = (b[i] - suma) / M[i, i]
            
    return(column_matrix([a for a in x]))
