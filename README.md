# ReservaAulas · Universidad del Salvador (USAL)

Aplicación web para la **reserva de aulas y laboratorios de la facultad**: 200 aulas docentes
y 3 Centros Tecnológicos con brazo robótico. Proyecto de interfaces para la asignatura
*Sistemas de Información II*.

Identidad visual en **verde y blanco**, los colores institucionales de la Universidad del Salvador.

Funciona **sin instalar nada**: es HTML, CSS y JavaScript puro. Los datos se guardan en el
`localStorage` del navegador, así que las reservas y los usuarios que crees se conservan
entre sesiones sin necesidad de servidor ni base de datos.

---

## Cómo ejecutarla

**Opción 1 (la más rápida):** abre `index.html` haciendo doble clic.

**Opción 2 (recomendada para la presentación):** sírvela por HTTP para que el navegador
trate la app como un sitio real:

```bash
# con Python (ya instalado en la mayoría de equipos)
python3 -m http.server 8080

# o con Node
npx http-server -p 8080
```

Y abre <http://localhost:8080>.

## Cuentas de demostración

En la pantalla de acceso hay botones que rellenan las credenciales automáticamente.

| Usuario       | Contraseña     | Perfil        | Qué puede hacer                                              |
|---------------|----------------|---------------|--------------------------------------------------------------|
| `admin`       | `admin123`     | Administrador | Todo: usuarios, espacios, solicitudes y reservas              |
| `conserjeria` | `conserje123`  | Conserjería   | Aprueba o rechaza solicitudes y mantiene el catálogo de aulas |
| `mgarcia`     | `profesor123`  | Docente       | Busca aulas libres y reserva                                  |
| `jlopez`      | `profesor123`  | Docente       | Busca aulas libres y reserva                                  |
| `lmartin`     | `alumno123`    | Estudiante    | Solicita aulas (siempre requieren aprobación)                 |

> Al ser un proyecto académico sin backend, las contraseñas se guardan tal cual en el
> navegador. En un sistema real irían cifradas en el servidor.

---

## Las interfaces (la asignatura pedía un mínimo de 3)

La aplicación tiene **8 pantallas**, todas con modo claro y modo oscuro:

| # | Pantalla | Descripción |
|---|----------|-------------|
| 1 | **Acceso** | Login con validación, cuentas de demostración y selector de tema. |
| 2 | **Panel de inicio** | Métricas del centro, ocupación por franja horaria, próximas reservas, agenda del día y ranking de espacios. |
| 3 | **Buscar y reservar** | Filtros por texto, fecha, franja, edificio, tipo, aforo y equipamiento; resultados paginados con disponibilidad real y formulario de reserva. |
| 4 | **Calendario semanal** | Rejilla franja × día de un espacio, navegación entre semanas, leyenda de estados y reserva pulsando sobre un hueco libre. |
| 5 | **Mis reservas** | Listado filtrable con edición y cancelación. Los administradores pueden ver las de todo el centro. |
| 6 | **Solicitudes** | Bandeja de aprobación: aprobar, rechazar con motivo, aviso de solapamientos e histórico de resoluciones. |
| 7 | **Espacios** | Catálogo de las 203 salas: alta, edición, aforo, equipamiento y baja/desactivación. |
| 8 | **Usuarios** | Alta de cuentas desde el perfil administrador, cambio de perfil, activación y borrado. |

---

## Reglas de negocio implementadas

- **Sin solapamientos**: dos reservas no pueden ocupar el mismo espacio en franjas que se cruzan
  (se comprueba al crear, al editar y al aprobar una solicitud).
- **Horario del centro**: de 08:00 a 21:00, en franjas de una hora.
- **Aforo**: no se admiten más asistentes que plazas tiene el aula.
- **No se reserva en el pasado**.
- **Aprobación**: quedan *pendientes* las reservas de estudiantes, las de Aulas Magnas y las
  de los tres Centros Tecnológicos de brazo robótico. Las de docencia ordinaria se confirman
  directamente.
- **Integridad**: no se elimina un aula con reservas activas (hay que desactivarla), ni el
  último administrador del sistema.

## Catálogo de espacios

| Edificio | Espacios | Notas |
|----------|----------|-------|
| Edificio Central | Aulas 1–80 | Aulas ordinarias, seminarios y laboratorios informáticos |
| Edificio Politécnico | Aulas 81–150 | Ídem |
| Edificio Anexo | Aulas 151–200 | Ídem |
| Centro Tecnológico | CT-1, CT-2, CT-3 | Laboratorios de **brazo robótico** (UR5e, ABB IRB 120 y célula colaborativa) |

Los tipos se reparten automáticamente: las aulas múltiplo de 25 son **Aulas Magnas**, las
múltiplo de 10 **laboratorios informáticos** y las múltiplo de 7 **seminarios**.

---

## Estructura del proyecto

```
index.html              Estructura de las pantallas y del layout
css/styles.css          Sistema de diseño: tokens de color, tema claro/oscuro y componentes
js/store.js             Capa de datos: modelo, validaciones y persistencia en localStorage
js/ui.js                Componentes reutilizables: modal, avisos, píldoras, paginador
js/app.js               Arranque, sesión, tema y navegación entre pantallas
js/views/dashboard.js   Pantalla 2 · Panel de inicio
js/views/reservar.js    Pantalla 3 · Buscar y reservar
js/views/calendario.js  Pantalla 4 · Calendario semanal
js/views/misreservas.js Pantalla 5 · Mis reservas
js/views/solicitudes.js Pantalla 6 · Solicitudes pendientes
js/views/usuarios.js    Pantalla 8 · Gestión de usuarios
js/views/aulas.js       Pantalla 7 · Catálogo de espacios
```

## Consejos para la demo en clase

1. Entra como `admin` → **Usuarios** → *Nuevo usuario*: crea una cuenta de docente delante del profesor.
2. Cierra sesión y entra con esa cuenta → **Buscar y reservar**: filtra por *Brazo robótico*
   y reserva un Centro Tecnológico (verás que queda *pendiente*).
3. Vuelve a entrar como `admin` o `conserjeria` → **Solicitudes**: apruébala.
4. Abre el **Calendario** de ese espacio: la reserva aparece ya en verde.
5. Pulsa el icono de la luna en la barra superior para enseñar el **modo oscuro**.

Para volver a los datos de ejemplo desde cero, abre la consola del navegador y ejecuta:

```js
Store.reset(); location.reload();
```
