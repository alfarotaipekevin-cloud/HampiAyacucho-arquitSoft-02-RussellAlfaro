# 08. Escenarios de Atributos de Calidad - Hampi Ayacucho

Cada atributo de calidad de `04-atributos-de-calidad.md` se convierte aquí en un **escenario medible**: quién origina la exigencia, qué ocurre, en qué condiciones, qué debe hacer el sistema y con qué valor se comprueba.

| Parte | Qué responde |
| :--- | :--- |
| Fuente del estímulo | ¿Quién o qué lo origina? |
| Estímulo | ¿Qué ocurre? |
| Artefacto | ¿Sobre qué parte del sistema? |
| Condición (entorno) | ¿En qué condiciones? |
| Respuesta esperada | ¿Qué debe hacer el sistema? |
| Medida | ¿Con qué valor se comprueba? |

---

## EQ-01. Rendimiento: consulta de disponibilidad de citas

| Elemento | Descripción |
| :--- | :--- |
| **Atributo de calidad** | Rendimiento (AC01) |
| **Fuente** | Paciente |
| **Estímulo** | El paciente consulta los cupos disponibles por especialidad y establecimiento. |
| **Artefacto** | Módulo Citas y su acceso a la caché Redis y a la base de datos. |
| **Condición** | Apertura mensual de cupos, con alta concurrencia y datos representativos de la red de salud. |
| **Respuesta esperada** | El sistema muestra los cupos disponibles sin rechazar peticiones ni mostrar cupos ya ocupados. |
| **Medida** | **Propuesta por validar:** el 95 % de las consultas responde en 2 segundos o menos, con menos del 1 % de errores 5xx, durante una prueba con 5,000 usuarios simultáneos. |
| **Verificación** | Ejecutar pruebas de carga (por ejemplo, con k6 o JMeter) y registrar tiempos de respuesta, errores y usuarios simultáneos. |
| **Estado** | Pendiente de aprobar la meta y definir el entorno de prueba. |

## EQ-02. Disponibilidad: continuidad del registro de citas y atenciones

| Elemento | Descripción |
| :--- | :--- |
| **Atributo de calidad** | Disponibilidad (AC02) |
| **Fuente** | Paciente o personal de salud |
| **Estímulo** | Se intenta reservar una cita o registrar una atención mientras falla una instancia del backend o un servicio externo (PIDE, RENHICE). |
| **Artefacto** | API Hampi (instancias detrás del balanceador) y base de datos principal. |
| **Condición** | Sistema en producción con monitoreo activo y al menos dos instancias. |
| **Respuesta esperada** | El balanceador redirige el tráfico a las instancias sanas; si un servicio externo no responde, el sistema informa el error de forma controlada y conserva la operación para reintentarla. |
| **Medida** | **Propuesta por validar:** disponibilidad mensual de 99.9 % para reserva de citas y registro de HCE (máximo ~43 minutos de interrupción al mes). |
| **Verificación** | Revisar los registros de monitoreo y calcular los periodos de disponibilidad e interrupción; simular la caída de una instancia. |
| **Estado** | Pendiente de definir las operaciones críticas y las ventanas de mantenimiento. |

## EQ-03. Escalabilidad: campañas de salud

| Elemento | Descripción |
| :--- | :--- |
| **Atributo de calidad** | Escalabilidad (AC03) |
| **Fuente** | Incremento de pacientes durante una campaña de vacunación o la apertura de cupos |
| **Estímulo** | Los usuarios simultáneos aumentan de 5,000 a 15,000. |
| **Artefacto** | API Hampi (monolito modular sin estado) y caché Redis. |
| **Condición** | Prueba con datos, configuración y carga documentados; escalamiento horizontal habilitado. |
| **Respuesta esperada** | El sistema agrega instancias y soporta el aumento sin superar los límites de tiempo de respuesta y errores. |
| **Medida** | **Propuesta por validar:** soportar 15,000 usuarios simultáneos, con el 95 % de respuestas por debajo de 3 segundos y menos del 1 % de errores técnicos. |
| **Verificación** | Aumentar progresivamente la carga y comparar tiempos, errores y uso de CPU/memoria por instancia. |
| **Estado** | Pendiente de confirmar la demanda real con la GERESA y la infraestructura de prueba. |

## EQ-04. Seguridad: acceso a la historia clínica

| Elemento | Descripción |
| :--- | :--- |
| **Atributo de calidad** | Seguridad (AC04) |
| **Fuente** | Usuario sin sesión, con credenciales inválidas, sin segundo factor o con un rol no autorizado |
| **Estímulo** | Intenta consultar o modificar la historia clínica electrónica de un paciente. |
| **Artefacto** | Middleware de autenticación (JWT + 2FA), control de roles (RBAC) y módulo HCE. |
| **Condición** | Pruebas sobre todas las operaciones protegidas de la HCE. |
| **Respuesta esperada** | El sistema rechaza la operación (401/403), no expone datos clínicos y registra el intento en la bitácora de auditoría. |
| **Medida** | Rechazar el 100 % de los intentos no autorizados de las pruebas; el 100 % de los accesos (permitidos y rechazados) queda registrado en auditoría; datos cifrados en tránsito (HTTPS) y en reposo (AES-256). |
| **Verificación** | Ejecutar pruebas de acceso autorizado y no autorizado por cada rol y revisar la bitácora de auditoría. |
| **Estado** | Pendiente de definir la matriz de permisos por rol con la GERESA. |

## EQ-05. Accesibilidad: uso bilingüe e inclusivo

| Elemento | Descripción |
| :--- | :--- |
| **Atributo de calidad** | Accesibilidad (AC05) |
| **Fuente** | Paciente quechuahablante o con discapacidad visual |
| **Estímulo** | Reserva una cita usando el idioma quechua o un lector de pantalla. |
| **Artefacto** | Aplicación web (portal del paciente). |
| **Condición** | Navegador de escritorio o móvil con conexión limitada. |
| **Respuesta esperada** | El paciente completa la reserva sin ayuda, con todos los textos disponibles en quechua y español y controles navegables con teclado. |
| **Medida** | **Propuesta por validar:** 0 errores críticos en la auditoría WCAG 2.1 AA (por ejemplo, con Lighthouse/axe) y 100 % de las pantallas del flujo de reserva traducidas. |
| **Verificación** | Auditoría automática de accesibilidad y prueba con usuarios reales de la red de salud. |
| **Estado** | Pendiente de validar las traducciones con hablantes de quechua ayacuchano. |

## EQ-06. Mantenibilidad: cambio normativo del MINSA

| Elemento | Descripción |
| :--- | :--- |
| **Atributo de calidad** | Mantenibilidad (AC06) |
| **Fuente** | Equipo de desarrollo |
| **Estímulo** | El MINSA cambia el formato de intercambio del RENHICE o una regla de las referencias. |
| **Artefacto** | Módulos HCE y Referencias, y su adaptador `RenhiceAdapter`. |
| **Condición** | El sistema está organizado en módulos con Clean Architecture y tiene pruebas para las funciones afectadas. |
| **Respuesta esperada** | El cambio se concentra en el adaptador o en la entidad responsable, sin modificar otros módulos. |
| **Medida** | El cambio modifica solo archivos del módulo afectado; las pruebas del módulo y las de regresión pasan al 100 %; ningún import de `dominio/` apunta a infraestructura. |
| **Verificación** | Revisar los cambios del commit, ejecutar las pruebas e inspeccionar las dependencias entre módulos. |
| **Estado** | Pendiente de definir las pruebas obligatorias por módulo. |

---

## Resumen de escenarios

| Código | Atributo de calidad | Driver | Qué se busca comprobar |
| :--- | :--- | :--- | :--- |
| EQ-01 | Rendimiento | DA01 | Que la consulta de cupos responda dentro del tiempo establecido. |
| EQ-02 | Disponibilidad | DA05 | Que la reserva de citas y el registro de atenciones estén disponibles cuando se necesitan. |
| EQ-03 | Escalabilidad | DA01 | Que el sistema soporte los picos de las campañas de salud. |
| EQ-04 | Seguridad | DA02 | Que la historia clínica no pueda consultarse sin autorización y todo acceso quede auditado. |
| EQ-05 | Accesibilidad | — | Que cualquier paciente, incluido el quechuahablante, pueda reservar una cita. |
| EQ-06 | Mantenibilidad | DA06 | Que los cambios normativos no afecten innecesariamente a otros módulos. |
