/* =========================================================================
   store.js · Capa de datos
   Persistencia en localStorage (proyecto académico, sin servidor).
   Expone dos objetos globales: Utils y Store.
   ========================================================================= */
(function (global) {
  "use strict";

  /* ---------------------------------------------------------------------
     Utilidades generales (fechas, texto, ids)
     --------------------------------------------------------------------- */
  var DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  var MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio",
               "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

  var Utils = {
    DIAS: DIAS,
    MESES: MESES,

    /** Devuelve "YYYY-MM-DD" de un objeto Date (hora local, no UTC). */
    iso: function (date) {
      var d = date || new Date();
      var m = String(d.getMonth() + 1).padStart(2, "0");
      var dd = String(d.getDate()).padStart(2, "0");
      return d.getFullYear() + "-" + m + "-" + dd;
    },

    /** Convierte "YYYY-MM-DD" en Date local a las 00:00. */
    parse: function (iso) {
      var p = String(iso).split("-");
      return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    },

    hoy: function () { return Utils.iso(new Date()); },

    addDays: function (iso, n) {
      var d = Utils.parse(iso);
      d.setDate(d.getDate() + n);
      return Utils.iso(d);
    },

    /** Lunes de la semana a la que pertenece la fecha. */
    lunesDe: function (iso) {
      var d = Utils.parse(iso);
      var dow = (d.getDay() + 6) % 7; // 0 = lunes
      d.setDate(d.getDate() - dow);
      return Utils.iso(d);
    },

    /** "lunes, 4 de septiembre de 2026" */
    fechaLarga: function (iso) {
      var d = Utils.parse(iso);
      return DIAS[d.getDay()] + ", " + d.getDate() + " de " + MESES[d.getMonth()] + " de " + d.getFullYear();
    },

    /** "04/09/2026" */
    fechaCorta: function (iso) {
      var d = Utils.parse(iso);
      return String(d.getDate()).padStart(2, "0") + "/" +
             String(d.getMonth() + 1).padStart(2, "0") + "/" + d.getFullYear();
    },

    /** "lun 04/09" */
    fechaDia: function (iso) {
      var d = Utils.parse(iso);
      return DIAS[d.getDay()].slice(0, 3) + " " +
             String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0");
    },

    esFinDeSemana: function (iso) {
      var g = Utils.parse(iso).getDay();
      return g === 0 || g === 6;
    },

    hora: function (h) { return String(h).padStart(2, "0") + ":00"; },

    /** Iniciales para el avatar: "María García" -> "MG" */
    iniciales: function (nombre) {
      var partes = String(nombre || "").trim().split(/\s+/);
      var a = (partes[0] || "?")[0];
      var b = partes.length > 1 ? partes[1][0] : "";
      return (a + b).toUpperCase();
    },

    /** Normaliza texto para búsquedas (minúsculas, sin acentos). */
    norm: function (s) {
      return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    },

    /** Escapa HTML para insertar texto de usuario sin riesgo. */
    esc: function (s) {
      return String(s === undefined || s === null ? "" : s)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    },

    plural: function (n, sing, plu) { return n + " " + (n === 1 ? sing : plu); },

    capital: function (s) {
      s = String(s || "");
      return s.charAt(0).toUpperCase() + s.slice(1);
    },

    /** [1,3] -> "Lunes y miércoles" */
    diasTexto: function (dias) {
      var nombres = (dias || []).map(function (d) { return DIAS[d]; });
      if (!nombres.length) return "—";
      if (nombres.length === 1) return Utils.capital(nombres[0]);
      return Utils.capital(nombres.slice(0, -1).join(", ")) + " y " + nombres[nombres.length - 1];
    },

    /** [1,3] -> "Lu · Mi" */
    diasCorto: function (dias) {
      return (dias || []).map(function (d) {
        return Utils.capital(DIAS[d].slice(0, 2));
      }).join(" · ");
    }
  };

  /* ---------------------------------------------------------------------
     Constantes del dominio
     --------------------------------------------------------------------- */
  var KEY = "reservaaulas.usal.v3";

  var HORA_INICIO = 8;   // primera franja: 08:00
  var HORA_FIN = 21;     // última franja termina a las 21:00

  var ROLES = {
    admin:      { id: "admin",      nombre: "Administrador",  desc: "Control total del sistema" },
    gestor:     { id: "gestor",     nombre: "Conserjería",    desc: "Aprueba solicitudes y gestiona espacios" },
    docente:    { id: "docente",    nombre: "Docente",        desc: "Reserva aulas para su docencia" },
    estudiante: { id: "estudiante", nombre: "Estudiante",     desc: "Solicita aulas (requiere aprobación)" }
  };

  var ESTADOS = {
    pendiente:  { id: "pendiente",  nombre: "Pendiente",  pill: "pill--warn" },
    confirmada: { id: "confirmada", nombre: "Confirmada", pill: "pill--ok" },
    rechazada:  { id: "rechazada",  nombre: "Rechazada",  pill: "pill--err" },
    cancelada:  { id: "cancelada",  nombre: "Cancelada",  pill: "pill--soft" }
  };

  // La facultad es un único edificio dividido en dos pabellones.
  var PABELLONES = ["Pabellón 1", "Pabellón 2"];

  var TIPOS = ["Aula", "Aula Magna", "Seminario", "Laboratorio Informático", "Laboratorio de Robótica"];

  var EQUIPAMIENTO = [
    "Proyector", "Pizarra digital", "Ordenadores", "Megafonía",
    "Videoconferencia", "Enchufes por puesto", "Brazo robótico"
  ];

  var TURNOS = {
    manana: { id: "manana", nombre: "Mañana", rango: "08:00 a 12:00", hIni: 8,  hFin: 12, sigla: "M" },
    tarde:  { id: "tarde",  nombre: "Tarde",  rango: "14:00 a 18:00", hIni: 14, hFin: 18, sigla: "T" },
    noche:  { id: "noche",  nombre: "Noche",  rango: "19:00 a 22:00", hIni: 19, hFin: 22, sigla: "N" }
  };

  // Plan de estudios · Ingeniero en Informática  [nombre, año, A anual / C cuatrimestral]
  var PLAN = [
    ["Introducción a la Administración de Empresas", 1, "C"],
    ["Sistemas Numéricos", 1, "C"],
    ["Análisis Matemático I", 1, "A"],
    ["Metodología de la Investigación", 1, "C"],
    ["Introducción a la Programación", 1, "C"],
    ["Arquitectura de Computadoras", 1, "C"],
    ["Álgebra I", 1, "C"],
    ["Paradigmas de Programación", 1, "C"],
    ["Programación I", 1, "C"],

    ["Sistemas de Representación", 2, "C"],
    ["Física I", 2, "C"],
    ["Cálculo Numérico", 2, "C"],
    ["Estructuras de Datos y Algoritmos", 2, "A"],
    ["Sistemas de Información I", 2, "A"],
    ["Álgebra II", 2, "C"],
    ["Filosofía", 2, "C"],
    ["Programación II", 2, "C"],
    ["Teoría de Lenguajes", 2, "C"],
    ["Análisis Matemático II", 2, "C"],

    ["Química General", 3, "C"],
    ["Física II", 3, "C"],
    ["Sistemas Operativos", 3, "A"],
    ["Sistemas de Información II", 3, "A"],
    ["Sistemas de Bases de Datos", 3, "A"],
    ["Probabilidad y Estadística", 3, "A"],
    ["Programación Avanzada", 3, "A"],
    ["Teleinformática", 3, "C"],
    ["Física III", 3, "C"],
    ["Inglés I", 3, ""],
    ["Inglés II", 3, ""],

    ["Tecnología Informática", 4, "C"],
    ["Ingeniería del Software", 4, "C"],
    ["Seminario de Integración Profesional", 4, "A"],
    ["Investigación Operativa", 4, "C"],
    ["Arquitectura de Redes", 4, "C"],
    ["Dirección de Proyectos Informáticos", 4, "C"],
    ["Auditoría de Sistemas", 4, "C"],
    ["Teología", 4, "C"],
    ["Modelos y Simulación", 4, "C"],

    ["Derecho Informático", 5, "C"],
    ["Ética Profesional", 5, "C"],
    ["Tecnologías Emergentes", 5, "A"],
    ["Sistemas Inteligentes", 5, "A"],
    ["Proyecto Final de Ingeniería en Informática", 5, "A"],
    ["Gestión Ambiental", 5, "C"],
    ["Aseguramiento de la Calidad del Software", 5, "C"],
    ["Seguridad Informática", 5, "C"],
    ["Elementos de Economía", 5, "C"]
  ];

  var DOCENTES = [
    "Ing. Roberto Díaz", "Lic. Silvia Ferrari", "Ing. Marcos Pereyra", "Dra. Andrea Sosa",
    "Ing. Pablo Herrera", "Lic. Nadia Rossi", "Ing. Gustavo Molina", "Dra. Carolina Vega",
    "Ing. Federico Bustos", "Lic. Mariana Ledesma"
  ];

  /* ---------------------------------------------------------------------
     Datos iniciales (semilla)
     --------------------------------------------------------------------- */
  function seedAulas() {
    var aulas = [];
    var id = 1;

    for (var n = 1; n <= 200; n++) {
      // Un solo edificio: aulas 1-100 en el Pabellón 1 y 101-200 en el Pabellón 2.
      // Dentro de cada pabellón, 25 aulas por piso (planta baja + 3 pisos).
      var pabellon = n <= 100 ? "Pabellón 1" : "Pabellón 2";
      var piso = Math.floor(((n - 1) % 100) / 25);

      var tipo, capacidad, equipo;
      if (n % 25 === 0) {
        tipo = "Aula Magna";
        capacidad = 160 + (n % 3) * 20;
        equipo = ["Proyector", "Megafonía", "Videoconferencia", "Pizarra digital"];
      } else if (n % 10 === 0) {
        tipo = "Laboratorio Informático";
        capacidad = 24 + (n % 4) * 4;
        equipo = ["Ordenadores", "Proyector", "Enchufes por puesto", "Pizarra digital"];
      } else if (n % 7 === 0) {
        tipo = "Seminario";
        capacidad = 16 + (n % 5) * 3;
        equipo = ["Pizarra digital", "Videoconferencia"];
      } else {
        tipo = "Aula";
        capacidad = 40 + (n % 6) * 15;
        equipo = n % 2 === 0 ? ["Proyector", "Enchufes por puesto"] : ["Proyector"];
      }

      aulas.push({
        id: id++,
        codigo: "A-" + String(n).padStart(3, "0"),
        nombre: "Aula " + n,
        pabellon: pabellon,
        piso: piso,
        tipo: tipo,
        capacidad: capacidad,
        equipamiento: equipo,
        requiereAutorizacion: tipo === "Aula Magna",
        activa: true,
        nota: ""
      });
    }

    // Centros Tecnológicos: dos salas de informática y una de robótica
    var ct = [
      {
        n: 1, cap: 30, tipo: "Laboratorio Informático",
        equipo: ["Ordenadores", "Proyector", "Enchufes por puesto", "Pizarra digital"],
        auth: false, nota: "30 PC de sobremesa · prácticas de programación"
      },
      {
        n: 2, cap: 24, tipo: "Laboratorio Informático",
        equipo: ["Ordenadores", "Proyector", "Enchufes por puesto", "Videoconferencia"],
        auth: false, nota: "24 PC · diseño asistido, simulación y trabajos en grupo"
      },
      {
        n: 3, cap: 16, tipo: "Laboratorio de Robótica",
        equipo: ["Brazo robótico", "Ordenadores", "Proyector", "Enchufes por puesto"],
        auth: true, nota: "Brazo robótico UR5e con visión artificial · única célula del centro"
      }
    ];
    ct.forEach(function (c) {
      aulas.push({
        id: id++,
        codigo: "CT-" + c.n,
        nombre: "Centro Tecnológico " + c.n,
        pabellon: "Pabellón 2",
        piso: 0,
        tipo: c.tipo,
        capacidad: c.cap,
        equipamiento: c.equipo,
        requiereAutorizacion: c.auth,
        activa: true,
        nota: c.nota
      });
    });

    return aulas;
  }

  /** Materias del plan de estudios de Ingeniería en Informática. */
  function seedMaterias() {
    return PLAN.map(function (m, i) {
      return { id: i + 1, nombre: m[0], anio: m[1], tipo: m[2] };
    });
  }

  /**
   * Cursadas: para cada materia se generan sus comisiones por turno con el
   * aula, los días y el horario asignados. El reparto es determinista y evita
   * que dos cursadas coincidan en el mismo espacio, día y franja.
   */
  function seedCursadas(aulas, materias) {
    var LAB_PC = /programaci|estructuras de datos|bases de datos|sistemas operativos|c[áa]lculo num[ée]rico|teor[íi]a de lenguajes|ingenier[íi]a del software|calidad del software|teleinform/i;
    var LAB_ROBOT = /sistemas inteligentes|tecnolog[íi]as emergentes/i;

    var comunes = aulas.filter(function (a) {
      return a.tipo === "Aula" || a.tipo === "Aula Magna" || a.tipo === "Seminario";
    });
    var salasPC = aulas.filter(function (a) { return a.tipo === "Laboratorio Informático"; });
    var salaRobot = aulas.filter(function (a) { return a.tipo === "Laboratorio de Robótica"; });

    // Combinaciones de turnos: no todas las materias se dictan en los tres.
    var combos = [["manana", "noche"], ["tarde", "noche"], ["manana", "tarde", "noche"]];
    var ocupado = {};   // "aulaId|dia|hora" -> true
    var cursadas = [];
    var id = 1;

    materias.forEach(function (m, i) {
      var pool = LAB_ROBOT.test(m.nombre) ? salaRobot : LAB_PC.test(m.nombre) ? salasPC : comunes;

      combos[i % 3].forEach(function (turnoId, t) {
        var turno = TURNOS[turnoId];
        var hIni = turno.hIni + ((i + t) % 2) * 2;
        var hFin = hIni + 2;
        if (hFin > turno.hFin) { hIni = turno.hIni; hFin = hIni + 2; }

        var dias = m.tipo === "A"
          ? ((i % 2) ? [1, 3] : [2, 4])          // anuales: dos días por semana
          : [((i + t) % 5) + 1];                 // cuatrimestrales: un día

        // Busca en el pool la primera aula libre en todos esos días y horas.
        var elegida = null;
        for (var k = 0; k < pool.length && !elegida; k++) {
          var cand = pool[(i * 7 + t * 13 + k) % pool.length];
          var libre = dias.every(function (d) {
            for (var h = hIni; h < hFin; h++) {
              if (ocupado[cand.id + "|" + d + "|" + h]) return false;
            }
            return true;
          });
          if (libre) elegida = cand;
        }
        if (!elegida) return;

        dias.forEach(function (d) {
          for (var h = hIni; h < hFin; h++) ocupado[elegida.id + "|" + d + "|" + h] = true;
        });

        cursadas.push({
          id: id++,
          materiaId: m.id,
          turno: turnoId,
          aulaId: elegida.id,
          dias: dias,
          horaInicio: hIni,
          horaFin: hFin,
          docente: DOCENTES[(i * 3 + t) % DOCENTES.length],
          comision: m.anio + turno.sigla
        });
      });
    });

    return cursadas;
  }

  function seedUsuarios() {
    return [
      { id: 1, usuario: "admin", nombre: "Jorge Pazos", email: "admin@usal.edu.ar",
        rol: "admin", departamento: "Servicios Informáticos", pass: "admin123", activo: true,
        creado: Utils.hoy() },
      { id: 2, usuario: "mgarcia", nombre: "María García", email: "mgarcia@usal.edu.ar",
        rol: "docente", departamento: "Informática y Automática", pass: "profesor123", activo: true,
        creado: Utils.hoy() },
      { id: 3, usuario: "conserjeria", nombre: "Antonio Ruiz", email: "conserjeria@usal.edu.ar",
        rol: "gestor", departamento: "Conserjería", pass: "conserje123", activo: true,
        creado: Utils.hoy() },
      { id: 4, usuario: "jlopez", nombre: "Javier López", email: "jlopez@usal.edu.ar",
        rol: "docente", departamento: "Matemáticas", pass: "profesor123", activo: true,
        creado: Utils.hoy() },
      { id: 5, usuario: "lmartin", nombre: "Lucía Martín", email: "lmartin@usal.edu.ar",
        rol: "estudiante", departamento: "Delegación de Alumnos", pass: "alumno123", activo: true,
        creado: Utils.hoy() }
    ];
  }

  function seedReservas(aulas) {
    var lunes = Utils.lunesDe(Utils.hoy());
    var byName = {};
    aulas.forEach(function (a) { byName[a.nombre] = a.id; });

    var base = [
      // [aula, díaOffset, hIni, hFin, usuarioId, asunto, asignatura, estado, asistentes]
      ["Aula 12",  0, 9,  11, 2, "Clase magistral",       "Sistemas de Información II", "confirmada", 55],
      ["Aula 12",  2, 9,  11, 2, "Clase magistral",       "Sistemas de Información II", "confirmada", 55],
      ["Aula 25",  0, 12, 14, 4, "Examen parcial",        "Álgebra Lineal",             "confirmada", 150],
      ["Aula 40",  1, 16, 18, 2, "Prácticas de laboratorio", "Bases de Datos",          "confirmada", 30],
      ["Aula 7",   1, 10, 12, 4, "Tutoría grupal",        "Cálculo I",                  "confirmada", 18],
      ["Centro Tecnológico 1", 1, 9, 13, 2, "Prácticas en sala de PC",     "Programación I",      "confirmada", 28],
      ["Centro Tecnológico 2", 2, 10, 12, 5, "Taller de la Delegación",    "Actividad estudiantil", "pendiente", 20],
      ["Centro Tecnológico 3", 3, 15, 19, 4, "Prácticas de brazo robótico", "Robótica Industrial", "pendiente", 12],
      ["Aula 101", 3, 8,  10, 2, "Seminario invitado",    "Ingeniería del Software",    "confirmada", 70],
      ["Aula 150", 4, 17, 20, 5, "Charla de asociación",  "Actividad estudiantil",      "pendiente", 90],
      ["Aula 60",  2, 15, 17, 4, "Recuperación de clase", "Estadística",                "rechazada", 45],
      ["Aula 200", 4, 11, 13, 2, "Reunión de departamento", "Coordinación",             "confirmada", 25]
    ];

    var id = 1;
    var hoy = Utils.hoy();
    return base.map(function (r) {
      // Si el día de la semana ya pasó, la reserva de ejemplo se traslada a la
      // semana siguiente: así la demo siempre muestra actividad próxima.
      var fecha = Utils.addDays(lunes, r[1]);
      if (fecha < hoy) fecha = Utils.addDays(fecha, 7);

      return {
        id: id++,
        aulaId: byName[r[0]],
        fecha: fecha,
        horaInicio: r[2],
        horaFin: r[3],
        usuarioId: r[4],
        asunto: r[5],
        asignatura: r[6],
        estado: r[7],
        asistentes: r[8],
        observaciones: "",
        creada: Utils.hoy(),
        resueltaPor: r[7] === "confirmada" || r[7] === "rechazada" ? 3 : null,
        motivoRechazo: r[7] === "rechazada" ? "Aula asignada a docencia oficial en esa franja." : ""
      };
    });
  }

  /* ---------------------------------------------------------------------
     Estado interno + persistencia
     --------------------------------------------------------------------- */
  var db = null;

  function nuevaBase() {
    var aulas = seedAulas();
    var materias = seedMaterias();
    return {
      version: 3,
      usuarios: seedUsuarios(),
      aulas: aulas,
      materias: materias,
      cursadas: seedCursadas(aulas, materias),
      reservas: seedReservas(aulas),
      sesion: null
    };
  }

  function guardar() {
    try {
      localStorage.setItem(KEY, JSON.stringify(db));
    } catch (e) {
      console.warn("No se pudo guardar en localStorage:", e);
    }
  }

  function cargar() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.version === 3 && parsed.aulas && parsed.usuarios &&
            parsed.materias && parsed.cursadas) return parsed;
      }
    } catch (e) {
      console.warn("Datos guardados no válidos, se regeneran:", e);
    }
    return null;
  }

  function nextId(coleccion) {
    return coleccion.reduce(function (max, o) { return Math.max(max, o.id); }, 0) + 1;
  }

  /* ---------------------------------------------------------------------
     API pública
     --------------------------------------------------------------------- */
  var Store = {
    HORA_INICIO: HORA_INICIO,
    HORA_FIN: HORA_FIN,
    ROLES: ROLES,
    ESTADOS: ESTADOS,
    PABELLONES: PABELLONES,
    TIPOS: TIPOS,
    EQUIPAMIENTO: EQUIPAMIENTO,
    TURNOS: TURNOS,

    init: function () {
      db = cargar() || nuevaBase();
      guardar();
    },

    reset: function () {
      db = nuevaBase();
      guardar();
    },

    /* --- Sesión ------------------------------------------------------- */
    login: function (usuario, pass) {
      var clave = Utils.norm(usuario).trim();
      var u = db.usuarios.find(function (x) {
        return Utils.norm(x.usuario) === clave || Utils.norm(x.email) === clave;
      });
      if (!u) return { ok: false, error: "No existe ningún usuario con ese identificador." };
      if (!u.activo) return { ok: false, error: "La cuenta está desactivada. Contacta con el administrador." };
      if (u.pass !== pass) return { ok: false, error: "La contraseña no es correcta." };
      db.sesion = u.id;
      guardar();
      return { ok: true, usuario: u };
    },

    logout: function () { db.sesion = null; guardar(); },

    usuarioActual: function () {
      if (!db.sesion) return null;
      return db.usuarios.find(function (u) { return u.id === db.sesion; }) || null;
    },

    /** ¿El usuario actual tiene alguno de estos roles? */
    esRol: function () {
      var u = Store.usuarioActual();
      if (!u) return false;
      var roles = Array.prototype.slice.call(arguments);
      return roles.indexOf(u.rol) !== -1;
    },

    /* --- Usuarios ----------------------------------------------------- */
    usuarios: function () { return db.usuarios.slice(); },

    usuario: function (id) {
      return db.usuarios.find(function (u) { return u.id === id; }) || null;
    },

    nombreUsuario: function (id) {
      var u = Store.usuario(id);
      return u ? u.nombre : "Usuario eliminado";
    },

    crearUsuario: function (datos) {
      var dup = db.usuarios.some(function (u) {
        return Utils.norm(u.usuario) === Utils.norm(datos.usuario) ||
               Utils.norm(u.email) === Utils.norm(datos.email);
      });
      if (dup) return { ok: false, error: "Ya existe un usuario con ese identificador o correo." };

      var nuevo = {
        id: nextId(db.usuarios),
        usuario: datos.usuario.trim(),
        nombre: datos.nombre.trim(),
        email: datos.email.trim(),
        rol: datos.rol,
        departamento: (datos.departamento || "").trim(),
        pass: datos.pass,
        activo: datos.activo !== false,
        creado: Utils.hoy()
      };
      db.usuarios.push(nuevo);
      guardar();
      return { ok: true, usuario: nuevo };
    },

    actualizarUsuario: function (id, datos) {
      var u = Store.usuario(id);
      if (!u) return { ok: false, error: "El usuario no existe." };

      var dup = db.usuarios.some(function (o) {
        return o.id !== id && (Utils.norm(o.usuario) === Utils.norm(datos.usuario) ||
                               Utils.norm(o.email) === Utils.norm(datos.email));
      });
      if (dup) return { ok: false, error: "Otro usuario ya usa ese identificador o correo." };

      u.usuario = datos.usuario.trim();
      u.nombre = datos.nombre.trim();
      u.email = datos.email.trim();
      u.rol = datos.rol;
      u.departamento = (datos.departamento || "").trim();
      u.activo = datos.activo !== false;
      if (datos.pass) u.pass = datos.pass;
      guardar();
      return { ok: true, usuario: u };
    },

    eliminarUsuario: function (id) {
      var actual = Store.usuarioActual();
      if (actual && actual.id === id) return { ok: false, error: "No puedes eliminar tu propia cuenta." };

      var admins = db.usuarios.filter(function (u) { return u.rol === "admin" && u.activo; });
      var victima = Store.usuario(id);
      if (victima && victima.rol === "admin" && admins.length <= 1) {
        return { ok: false, error: "Debe existir al menos un administrador activo." };
      }

      db.usuarios = db.usuarios.filter(function (u) { return u.id !== id; });
      // Las reservas del usuario se cancelan para no dejar huecos ocupados.
      db.reservas.forEach(function (r) {
        if (r.usuarioId === id && r.estado !== "cancelada") r.estado = "cancelada";
      });
      guardar();
      return { ok: true };
    },

    /* --- Aulas -------------------------------------------------------- */
    aulas: function () { return db.aulas.slice(); },

    aula: function (id) {
      return db.aulas.find(function (a) { return a.id === id; }) || null;
    },

    nombreAula: function (id) {
      var a = Store.aula(id);
      return a ? a.nombre : "Aula eliminada";
    },

    crearAula: function (datos) {
      var dup = db.aulas.some(function (a) {
        return Utils.norm(a.nombre) === Utils.norm(datos.nombre) ||
               Utils.norm(a.codigo) === Utils.norm(datos.codigo);
      });
      if (dup) return { ok: false, error: "Ya existe un espacio con ese nombre o código." };

      var nueva = {
        id: nextId(db.aulas),
        codigo: datos.codigo.trim(),
        nombre: datos.nombre.trim(),
        pabellon: datos.pabellon,
        piso: Number(datos.piso) || 0,
        tipo: datos.tipo,
        capacidad: Number(datos.capacidad) || 0,
        equipamiento: datos.equipamiento || [],
        requiereAutorizacion: !!datos.requiereAutorizacion,
        activa: datos.activa !== false,
        nota: (datos.nota || "").trim()
      };
      db.aulas.push(nueva);
      guardar();
      return { ok: true, aula: nueva };
    },

    actualizarAula: function (id, datos) {
      var a = Store.aula(id);
      if (!a) return { ok: false, error: "El espacio no existe." };

      var dup = db.aulas.some(function (o) {
        return o.id !== id && (Utils.norm(o.nombre) === Utils.norm(datos.nombre) ||
                               Utils.norm(o.codigo) === Utils.norm(datos.codigo));
      });
      if (dup) return { ok: false, error: "Otro espacio ya usa ese nombre o código." };

      a.codigo = datos.codigo.trim();
      a.nombre = datos.nombre.trim();
      a.pabellon = datos.pabellon;
      a.piso = Number(datos.piso) || 0;
      a.tipo = datos.tipo;
      a.capacidad = Number(datos.capacidad) || 0;
      a.equipamiento = datos.equipamiento || [];
      a.requiereAutorizacion = !!datos.requiereAutorizacion;
      a.activa = datos.activa !== false;
      a.nota = (datos.nota || "").trim();
      guardar();
      return { ok: true, aula: a };
    },

    eliminarAula: function (id) {
      var conReservas = db.reservas.some(function (r) {
        return r.aulaId === id && (r.estado === "confirmada" || r.estado === "pendiente") &&
               r.fecha >= Utils.hoy();
      });
      if (conReservas) {
        return { ok: false, error: "El espacio tiene reservas activas. Desactívalo en lugar de eliminarlo." };
      }
      db.aulas = db.aulas.filter(function (a) { return a.id !== id; });
      guardar();
      return { ok: true };
    },

    /* --- Materias y cursadas ------------------------------------------ */
    materias: function () {
      return db.materias.slice().sort(function (a, b) {
        return a.anio === b.anio ? a.nombre.localeCompare(b.nombre, "es") : a.anio - b.anio;
      });
    },

    materia: function (id) {
      return db.materias.find(function (m) { return m.id === id; }) || null;
    },

    cursadas: function () { return db.cursadas.slice(); },

    cursada: function (id) {
      return db.cursadas.find(function (c) { return c.id === id; }) || null;
    },

    /** Comisiones de una materia, ordenadas mañana → tarde → noche. */
    cursadasDe: function (materiaId) {
      var orden = ["manana", "tarde", "noche"];
      return db.cursadas
        .filter(function (c) { return c.materiaId === materiaId; })
        .sort(function (a, b) { return orden.indexOf(a.turno) - orden.indexOf(b.turno); });
    },

    /** La cursada de una materia en un turno concreto (null si no se dicta). */
    cursadaDe: function (materiaId, turno) {
      return db.cursadas.find(function (c) {
        return c.materiaId === materiaId && c.turno === turno;
      }) || null;
    },

    /** Cursadas que ocupan un aula en un día de la semana (1 = lunes). */
    cursadasDeAula: function (aulaId, dia) {
      return db.cursadas.filter(function (c) {
        return c.aulaId === aulaId && (dia === undefined || c.dias.indexOf(dia) !== -1);
      });
    },

    /** ¿Otra cursada ocupa ya ese espacio en esos días y horas? */
    choqueDeCursada: function (aulaId, dias, hIni, hFin, excluirId) {
      return db.cursadas.some(function (c) {
        if (c.aulaId !== aulaId || c.id === excluirId) return false;
        var mismoDia = c.dias.some(function (d) { return dias.indexOf(d) !== -1; });
        return mismoDia && hIni < c.horaFin && hFin > c.horaInicio;
      });
    },

    guardarCursada: function (id, datos) {
      var aula = Store.aula(Number(datos.aulaId));
      if (!aula) return { ok: false, error: "El espacio seleccionado no existe." };

      var dias = (datos.dias || []).map(Number).sort();
      if (!dias.length) return { ok: false, error: "Elegí al menos un día de cursada." };

      var hIni = Number(datos.horaInicio), hFin = Number(datos.horaFin);
      if (!(hFin > hIni)) return { ok: false, error: "La hora de fin debe ser posterior a la de inicio." };

      var turno = TURNOS[datos.turno];
      if (!turno) return { ok: false, error: "Turno no válido." };
      if (hIni < turno.hIni || hFin > turno.hFin) {
        return { ok: false, error: "El turno " + turno.nombre.toLowerCase() + " va de " + turno.rango + "." };
      }
      if (Store.choqueDeCursada(aula.id, dias, hIni, hFin, id)) {
        return { ok: false, error: "Ese espacio ya tiene otra cursada en ese día y horario." };
      }

      var existente = id ? Store.cursada(id) : null;
      if (!existente) {
        var duplicada = Store.cursadaDe(Number(datos.materiaId), datos.turno);
        if (duplicada) return { ok: false, error: "Esa materia ya tiene comisión en el turno " + turno.nombre.toLowerCase() + "." };
      }

      var registro = existente || { id: nextId(db.cursadas), materiaId: Number(datos.materiaId) };
      registro.turno = datos.turno;
      registro.aulaId = aula.id;
      registro.dias = dias;
      registro.horaInicio = hIni;
      registro.horaFin = hFin;
      registro.docente = (datos.docente || "").trim();
      registro.comision = (datos.comision || "").trim() ||
                          (Store.materia(registro.materiaId).anio + turno.sigla);

      if (!existente) db.cursadas.push(registro);
      guardar();
      return { ok: true, cursada: registro };
    },

    eliminarCursada: function (id) {
      db.cursadas = db.cursadas.filter(function (c) { return c.id !== id; });
      guardar();
      return { ok: true };
    },

    /* --- Reservas ----------------------------------------------------- */
    reservas: function () { return db.reservas.slice(); },

    reserva: function (id) {
      return db.reservas.find(function (r) { return r.id === id; }) || null;
    },

    /** Reservas que ocupan realmente el aula (pendientes y confirmadas). */
    reservasActivas: function () {
      return db.reservas.filter(function (r) {
        return r.estado === "pendiente" || r.estado === "confirmada";
      });
    },

    reservasDe: function (usuarioId) {
      return db.reservas.filter(function (r) { return r.usuarioId === usuarioId; });
    },

    reservasDeAula: function (aulaId, fecha) {
      return Store.reservasActivas().filter(function (r) {
        return r.aulaId === aulaId && (!fecha || r.fecha === fecha);
      });
    },

    /** Conflicto si se solapan los intervalos [ini, fin). */
    hayConflicto: function (aulaId, fecha, hIni, hFin, excluirId) {
      return Store.reservasActivas().some(function (r) {
        return r.aulaId === aulaId && r.fecha === fecha && r.id !== excluirId &&
               hIni < r.horaFin && hFin > r.horaInicio;
      });
    },

    /** ¿Debe pasar la reserva por aprobación? */
    requiereAprobacion: function (aula, usuario) {
      if (!usuario) return true;
      if (usuario.rol === "admin" || usuario.rol === "gestor") return false;
      if (usuario.rol === "estudiante") return true;
      return !!aula.requiereAutorizacion;
    },

    crearReserva: function (datos) {
      var usuario = Store.usuarioActual();
      if (!usuario) return { ok: false, error: "No hay sesión iniciada." };

      var aula = Store.aula(datos.aulaId);
      if (!aula) return { ok: false, error: "El espacio seleccionado no existe." };
      if (!aula.activa) return { ok: false, error: "El espacio está fuera de servicio." };

      var hIni = Number(datos.horaInicio), hFin = Number(datos.horaFin);
      if (!(hFin > hIni)) return { ok: false, error: "La hora de fin debe ser posterior a la de inicio." };
      if (hIni < HORA_INICIO || hFin > HORA_FIN) {
        return { ok: false, error: "El horario disponible es de " + Utils.hora(HORA_INICIO) + " a " + Utils.hora(HORA_FIN) + "." };
      }
      if (datos.fecha < Utils.hoy()) return { ok: false, error: "No se pueden hacer reservas en fechas pasadas." };
      if (Store.hayConflicto(aula.id, datos.fecha, hIni, hFin)) {
        return { ok: false, error: "Ese espacio ya está ocupado en la franja seleccionada." };
      }
      if (Number(datos.asistentes) > aula.capacidad) {
        return { ok: false, error: "El aforo del espacio es de " + aula.capacidad + " personas." };
      }

      var pendiente = Store.requiereAprobacion(aula, usuario);
      var nueva = {
        id: nextId(db.reservas),
        aulaId: aula.id,
        fecha: datos.fecha,
        horaInicio: hIni,
        horaFin: hFin,
        usuarioId: usuario.id,
        asunto: (datos.asunto || "").trim() || "Reserva de espacio",
        asignatura: (datos.asignatura || "").trim(),
        asistentes: Number(datos.asistentes) || 0,
        observaciones: (datos.observaciones || "").trim(),
        estado: pendiente ? "pendiente" : "confirmada",
        creada: Utils.hoy(),
        resueltaPor: pendiente ? null : usuario.id,
        motivoRechazo: ""
      };
      db.reservas.push(nueva);
      guardar();
      return { ok: true, reserva: nueva, pendiente: pendiente };
    },

    actualizarReserva: function (id, datos) {
      var r = Store.reserva(id);
      if (!r) return { ok: false, error: "La reserva no existe." };

      var hIni = Number(datos.horaInicio), hFin = Number(datos.horaFin);
      if (!(hFin > hIni)) return { ok: false, error: "La hora de fin debe ser posterior a la de inicio." };
      if (Store.hayConflicto(datos.aulaId || r.aulaId, datos.fecha, hIni, hFin, id)) {
        return { ok: false, error: "Ese espacio ya está ocupado en la franja seleccionada." };
      }

      r.aulaId = datos.aulaId || r.aulaId;
      r.fecha = datos.fecha;
      r.horaInicio = hIni;
      r.horaFin = hFin;
      r.asunto = (datos.asunto || "").trim() || r.asunto;
      r.asignatura = (datos.asignatura || "").trim();
      r.asistentes = Number(datos.asistentes) || 0;
      r.observaciones = (datos.observaciones || "").trim();
      guardar();
      return { ok: true, reserva: r };
    },

    cambiarEstado: function (id, estado, motivo) {
      var r = Store.reserva(id);
      if (!r) return { ok: false, error: "La reserva no existe." };
      var actual = Store.usuarioActual();

      if (estado === "confirmada" && Store.hayConflicto(r.aulaId, r.fecha, r.horaInicio, r.horaFin, r.id)) {
        return { ok: false, error: "No se puede confirmar: el espacio ya está ocupado en esa franja." };
      }

      r.estado = estado;
      r.resueltaPor = actual ? actual.id : null;
      r.motivoRechazo = estado === "rechazada" ? (motivo || "") : "";
      guardar();
      return { ok: true, reserva: r };
    },

    eliminarReserva: function (id) {
      db.reservas = db.reservas.filter(function (r) { return r.id !== id; });
      guardar();
      return { ok: true };
    },

    /* --- Consultas de disponibilidad ---------------------------------- */
    /**
     * Filtra espacios y marca si están libres en la franja indicada.
     * f = { texto, pabellon, tipo, capacidad, equipamiento[], fecha, hIni, hFin, soloLibres }
     */
    buscarAulas: function (f) {
      var texto = Utils.norm(f.texto || "");
      return db.aulas.filter(function (a) {
        if (f.soloActivas !== false && !a.activa) return false;
        if (f.pabellon && a.pabellon !== f.pabellon) return false;
        if (f.tipo && a.tipo !== f.tipo) return false;
        if (f.capacidad && a.capacidad < Number(f.capacidad)) return false;
        if (f.equipamiento && f.equipamiento.length) {
          var tiene = f.equipamiento.every(function (e) { return a.equipamiento.indexOf(e) !== -1; });
          if (!tiene) return false;
        }
        if (texto) {
          var blob = Utils.norm(a.nombre + " " + a.codigo + " " + a.pabellon + " " + a.tipo);
          if (blob.indexOf(texto) === -1) return false;
        }
        return true;
      }).map(function (a) {
        var libre = true;
        if (f.fecha && f.hIni !== undefined && f.hFin !== undefined) {
          libre = !Store.hayConflicto(a.id, f.fecha, Number(f.hIni), Number(f.hFin));
        }
        return { aula: a, libre: libre };
      }).filter(function (r) {
        return f.soloLibres ? r.libre : true;
      });
    },

    /** Métricas para el panel de inicio. */
    estadisticas: function () {
      var hoy = Utils.hoy();
      var activas = Store.reservasActivas();
      var usuario = Store.usuarioActual();

      var reservasHoy = activas.filter(function (r) { return r.fecha === hoy; });
      var pendientes = db.reservas.filter(function (r) { return r.estado === "pendiente"; });
      var mias = usuario ? db.reservas.filter(function (r) {
        return r.usuarioId === usuario.id && r.fecha >= hoy && r.estado !== "cancelada" && r.estado !== "rechazada";
      }) : [];

      var aulasActivas = db.aulas.filter(function (a) { return a.activa; });
      var franjas = HORA_FIN - HORA_INICIO;
      var horasOcupadas = reservasHoy.reduce(function (s, r) { return s + (r.horaFin - r.horaInicio); }, 0);
      var ocupacion = aulasActivas.length ? Math.round(horasOcupadas * 100 / (aulasActivas.length * franjas)) : 0;

      // Ocupación por franja horaria (hoy)
      var porFranja = [];
      for (var h = HORA_INICIO; h < HORA_FIN; h++) {
        var n = reservasHoy.filter(function (r) { return r.horaInicio <= h && r.horaFin > h; }).length;
        porFranja.push({ hora: h, total: n });
      }

      // Ranking de espacios más solicitados (mes en curso)
      var mes = hoy.slice(0, 7);
      var conteo = {};
      db.reservas.forEach(function (r) {
        if (r.fecha.slice(0, 7) !== mes || r.estado === "cancelada") return;
        conteo[r.aulaId] = (conteo[r.aulaId] || 0) + 1;
      });
      var top = Object.keys(conteo).map(function (k) {
        return { aula: Store.aula(Number(k)), total: conteo[k] };
      }).filter(function (x) { return x.aula; })
        .sort(function (a, b) { return b.total - a.total; })
        .slice(0, 5);

      var ocupadosHoy = {};
      reservasHoy.forEach(function (r) { ocupadosHoy[r.aulaId] = true; });

      return {
        espaciosOcupados: Object.keys(ocupadosHoy).length,
        totalAulas: aulasActivas.length,
        totalUsuarios: db.usuarios.filter(function (u) { return u.activo; }).length,
        reservasHoy: reservasHoy.length,
        pendientes: pendientes.length,
        misReservas: mias.length,
        ocupacion: ocupacion,
        porFranja: porFranja,
        top: top
      };
    }
  };

  global.Utils = Utils;
  global.Store = Store;
})(window);
