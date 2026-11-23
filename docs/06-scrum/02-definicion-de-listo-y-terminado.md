# 02. Definición de Listo (DoR) y de Terminado (DoD)

## Definition of Ready — una historia puede entrar a un sprint cuando…

- [ ] Está escrita como *Como… quiero… para…* y tiene ID en el product backlog.
- [ ] Tiene una **spec en estado Aprobada** con reglas, contrato de API y criterios de aceptación *Dado / Cuando / Entonces*.
- [ ] Sus datos de prueba están definidos (y son ficticios).
- [ ] Está estimada en puntos y cabe en un sprint (≤ 8 puntos; si no, se divide).
- [ ] Sus dependencias (simuladores, otra historia) están terminadas o en el mismo sprint.

## Definition of Done — una historia está terminada cuando…

**Código**
- [ ] Respeta la estructura de Clean Architecture del diseño interno; `dominio/` no importa infraestructura.
- [ ] Se escribió el `plan.md` de la spec antes de programar.
- [ ] Cada criterio de aceptación tiene al menos una prueba automatizada, y todas pasan.
- [ ] Cobertura del dominio y de los casos de uso ≥ 80 %.

**Integración**
- [ ] Commits con Conventional Commits; se integra por Pull Request a `main`.
- [ ] El CI (GitHub Actions) está en verde.
- [ ] Funciona con `docker compose up` desde cero.

**Documentación**
- [ ] La spec pasa a estado **Implementada**; si algo cambió durante el desarrollo, la spec se actualizó primero.
- [ ] Si cambió el diseño, se actualizó el diagrama correspondiente (C4 o secuencia).

**Demostración**
- [ ] Se mostró en la Sprint Review con los datos de prueba.
