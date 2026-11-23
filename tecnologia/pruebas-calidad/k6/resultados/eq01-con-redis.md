# EQ-01 · eq01-con-redis

| Métrica | Valor |
| :--- | ---: |
| Usuarios virtuales máximos | 2000 |
| Peticiones totales | 187426 |
| Peticiones por segundo | 929.2 |
| Cupos · promedio | 437.5 ms |
| Cupos · mediana | 514.5 ms |
| Cupos · p95 | 923.7 ms |
| Cupos · p99 | 1167.6 ms |
| Cupos · máximo | 1842.5 ms |
| Fechas · p95 | 920.9 ms |
| Errores 5xx | 0.00 % |
| Peticiones fallidas (cualquier causa) | 0.00 % |
| Checks correctos | 100.00 % |

| Métrica | Umbral | Resultado |
| :--- | :--- | :--- |
| errores_5xx | rate<0.01 | CUMPLE |
| checks | rate>0.99 | CUMPLE |
| http_req_duration{tipo:cupos} | p(95)<2000 | CUMPLE |
