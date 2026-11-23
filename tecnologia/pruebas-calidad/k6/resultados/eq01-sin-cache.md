# EQ-01 · eq01-sin-cache

| Métrica | Valor |
| :--- | ---: |
| Usuarios virtuales máximos | 2000 |
| Peticiones totales | 92388 |
| Peticiones por segundo | 457.6 |
| Cupos · promedio | 1684.4 ms |
| Cupos · mediana | 1571.3 ms |
| Cupos · p95 | 3473.5 ms |
| Cupos · p99 | 3659.8 ms |
| Cupos · máximo | 3738.4 ms |
| Fechas · p95 | 3483.1 ms |
| Errores 5xx | 0.00 % |
| Peticiones fallidas (cualquier causa) | 0.00 % |
| Checks correctos | 100.00 % |

| Métrica | Umbral | Resultado |
| :--- | :--- | :--- |
| errores_5xx | rate<0.01 | CUMPLE |
| http_req_duration{tipo:cupos} | p(95)<2000 | NO CUMPLE |
| checks | rate>0.99 | CUMPLE |
