# ReservaAulas · Universidad del Salvador (USAL)

Aplicación web para la **reserva de aulas y laboratorios de la facultad**: 200 aulas docentes
y 3 Centros Tecnológicos (dos salas de PC y uno con brazo robótico), repartidos en un único
edificio con **Pabellón 1 y Pabellón 2**. Proyecto de interfaces para la asignatura
*Sistemas de Información II*.

Incluye un **Panel de Alumnos** público —pensado para el celular— donde el estudiante elige
materia y turno y ve en grande el aula, el piso y el pabellón donde cursa.

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

La aplicación tiene **10 pantallas**, todas con modo claro y modo oscuro y todas usables
desde el celular:

| # | Pantalla | Descripción |
|---|----------|-------------|
| 1 | **Panel de Alumnos** | Pantalla pública que se abre al iniciar. El alumno busca su materia, elige turno (mañana, tarde o noche) y ve en grande el aula, el pabellón y el piso, con días, horario, comisión y docente. Muestra también la misma materia en los otros turnos. |
| 2 | **Acceso** | Login con validación, cuentas de demostración y selector de tema. |
| 3 | **Panel de inicio** | Métricas del centro, ocupación por franja horaria, próximas reservas, agenda del día y ranking de espacios. |
| 4 | **Buscar y reservar** | Filtros por texto, fecha, franja, pabellón, tipo, aforo y equipamiento; resultados paginados con disponibilidad real y formulario de reserva. |
| 5 | **Calendario semanal** | Rejilla franja × día de un espacio, navegación entre semanas, leyenda de estados y reserva pulsando sobre un hueco libre. |
| 6 | **Mis reservas** | Listado filtrable con edición y cancelación. Los administradores pueden ver las de todo el centro. |
| 7 | **Solicitudes** | Bandeja de aprobación: aprobar, rechazar con motivo, aviso de solapamientos e histórico de resoluciones. |
| 8 | **Espacios** | Catálogo de las 203 salas: alta, edición, aforo, equipamiento y baja/desactivación. |
| 9 | **Usuarios** | Alta de cuentas desde el perfil administrador, cambio de perfil, activación y borrado. |
| 10 | **Materias y horarios** | Plan completo de Ingeniería en Informática con una comisión por turno: qué aula, qué días y en qué horario cursa cada materia. Es la información que consulta el Panel de Alumnos. |

### Punto de entrada

Al abrir la aplicación se muestra el **Panel de Alumnos**. En el pie de esa pantalla hay un
interruptor —*Abrir el panel de alumnos al iniciar la aplicación*— que, al desactivarlo, hace
que la próxima vez se abra directamente el acceso al sistema de gestión. Desde el panel se
entra al sistema con el botón *Acceso al sistema*, y desde el sistema se vuelve al panel con
la opción *Panel de alumnos* del menú lateral.

---

## Reglas de negocio implementadas

- **Sin solapamientos**: dos reservas no pueden ocupar el mismo espacio en franjas que se cruzan
  (se comprueba al crear, al editar y al aprobar una solicitud).
- **Horario del centro**: de 08:00 a 21:00, en franjas de una hora.
- **Aforo**: no se admiten más asistentes que plazas tiene el aula.
- **No se reserva en el pasado**.
- **Aprobación**: quedan *pendientes* las reservas de estudiantes, las de Aulas Magnas y las
  del Centro Tecnológico 3, el laboratorio de brazo robótico. Las de docencia ordinaria se confirman
  directamente.
- **Integridad**: no se elimina un aula con reservas activas (hay que desactivarla), ni el
  último administrador del sistema.

## Catálogo de espacios

Hay un solo edificio, dividido en dos pabellones. Cada pabellón tiene planta baja y tres
pisos, con 25 aulas por piso.

| Ubicación | Espacios | Notas |
|-----------|----------|-------|
| Pabellón 1 | Aulas 1–100 | Aulas 1–25 en planta baja, 26–50 en el piso 1, 51–75 en el 2 y 76–100 en el 3 |
| Pabellón 2 | Aulas 101–200 | Mismo reparto por pisos |
| Pabellón 2 · planta baja | CT-1 y CT-2 | Salas de informática: 30 y 24 **PC** de sobremesa |
| Pabellón 2 · planta baja | CT-3 | Único laboratorio con **brazo robótico** (UR5e con visión artificial); requiere autorización |

Los tipos se reparten automáticamente: las aulas múltiplo de 25 son **Aulas Magnas**, las
múltiplo de 10 **laboratorios informáticos** y las múltiplo de 7 **seminarios**.

## Plan de estudios

Están cargadas las **48 materias** de Ingeniería en Informática (título intermedio: Analista
de Sistemas de Información), con su año y su régimen anual (A) o cuatrimestral (C). *Inglés I*
e *Inglés II* figuran sin régimen porque el plan tampoco lo indica.

Cada materia tiene comisiones en dos o tres turnos —**mañana** (08:00 a 12:00), **tarde**
(14:00 a 18:00) y **noche** (19:00 a 22:00)— con su aula, sus días y su horario. El reparto
inicial se genera de forma automática evitando que dos materias coincidan en el mismo espacio,
día y franja; desde *Materias y horarios* se puede reasignar cualquier comisión.

---

## Estructura del proyecto

```
index.html              Estructura de las pantallas y del layout
css/styles.css          Sistema de diseño: tokens de color, tema claro/oscuro y componentes
js/store.js             Capa de datos: modelo, validaciones y persistencia en localStorage
js/ui.js                Componentes reutilizables: modal, avisos, píldoras, paginador
js/app.js               Arranque, sesión, tema y navegación entre pantallas
js/views/alumnos.js     Pantalla 1  · Panel de Alumnos
js/views/dashboard.js   Pantalla 3  · Panel de inicio
js/views/reservar.js    Pantalla 4  · Buscar y reservar
js/views/calendario.js  Pantalla 5  · Calendario semanal
js/views/misreservas.js Pantalla 6  · Mis reservas
js/views/solicitudes.js Pantalla 7  · Solicitudes pendientes
js/views/aulas.js       Pantalla 8  · Catálogo de espacios
js/views/usuarios.js    Pantalla 9  · Gestión de usuarios
js/views/materias.js    Pantalla 10 · Materias y horarios
```

## Consejos para la demo en clase

1. Abrí la app en el celular: se ve el **Panel de Alumnos**. Buscá *Sistemas de Información II*,
   tocá **Noche** y mostrá el aula, el pabellón y el piso en grande.
2. Entrá al sistema como `admin` → **Materias y horarios**: cambiá el aula de esa comisión y
   volvé al panel de alumnos (menú lateral) para ver el cambio reflejado.
3. **Usuarios** → *Nuevo usuario*: creá una cuenta de docente delante del profesor.
4. Cerrá sesión y entrá con esa cuenta → **Buscar y reservar**: filtrá por *Brazo robótico*
   (solo aparece el Centro Tecnológico 3) y reservalo: queda *pendiente*.
5. Volvé a entrar como `admin` o `conserjeria` → **Solicitudes**: aprobala.
6. Abrí el **Calendario** de ese espacio: la reserva ya aparece en verde.
7. Tocá el icono de la luna de la barra superior para mostrar el **modo oscuro**.

Para volver a los datos de ejemplo desde cero, abre la consola del navegador y ejecuta:

```js
Store.reset(); location.reload();
```
