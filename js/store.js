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

    plural: function (n, sing, plu) { return n + " " + (n === 1 ? sing : plu); }
  };

  /* ---------------------------------------------------------------------
     Constantes del dominio
     --------------------------------------------------------------------- */
  var KEY = "reservaaulas.usal.v1";

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

  var EDIFICIOS = ["Edificio Central", "Edificio Politécnico", "Edificio Anexo", "Centro Tecnológico"];

  var TIPOS = ["Aula", "Aula Magna", "Seminario", "Laboratorio Informático", "Laboratorio de Robótica"];

  var EQUIPAMIENTO = [
    "Proyector", "Pizarra digital", "Ordenadores", "Megafonía",
    "Videoconferencia", "Enchufes por puesto", "Brazo robótico"
  ];

  /* ---------------------------------------------------------------------
     Datos iniciales (semilla)
     --------------------------------------------------------------------- */
  function seedAulas() {
    var aulas = [];
    var id = 1;

    for (var n = 1; n <= 200; n++) {
      var edificio, planta;
      if (n <= 80)       { edificio = "Edificio Central";     planta = Math.ceil(n / 20) - 1; }
      else if (n <= 150) { edificio = "Edificio Politécnico"; planta = Math.ceil((n - 80) / 18) - 1; }
      else               { edificio = "Edificio Anexo";       planta = Math.ceil((n - 150) / 17) - 1; }

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
        edificio: edificio,
        planta: planta,
        tipo: tipo,
        capacidad: capacidad,
        equipamiento: equipo,
        requiereAutorizacion: tipo === "Aula Magna",
        activa: true,
        nota: ""
      });
    }

    // Centros Tecnológicos: laboratorios de brazo robótico
    var ct = [
      { n: 1, cap: 16, nota: "Brazo robótico UR5e · prácticas de manipulación" },
      { n: 2, cap: 20, nota: "Brazo robótico ABB IRB 120 · célula de montaje" },
      { n: 3, cap: 24, nota: "Célula colaborativa · visión artificial y brazo robótico" }
    ];
    ct.forEach(function (c) {
      aulas.push({
        id: id++,
        codigo: "CT-" + c.n,
        nombre: "Centro Tecnológico " + c.n,
        edificio: "Centro Tecnológico",
        planta: 0,
        tipo: "Laboratorio de Robótica",
        capacidad: c.cap,
        equipamiento: ["Brazo robótico", "Ordenadores", "Proyector", "Enchufes por puesto"],
        requiereAutorizacion: true,
        activa: true,
        nota: c.nota
      });
    });

    return aulas;
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
      ["Centro Tecnológico 1", 1, 9, 13, 2, "Prácticas de brazo robótico", "Robótica Industrial", "confirmada", 16],
      ["Centro Tecnológico 2", 3, 15, 19, 4, "Proyecto fin de grado",       "TFG Automática",      "pendiente", 12],
      ["Centro Tecnológico 3", 2, 10, 12, 5, "Taller de la Delegación",     "Actividad estudiantil", "pendiente", 20],
      ["Aula 101", 3, 8,  10, 2, "Seminario invitado",    "Ingeniería del Software",    "confirmada", 70],
      ["Aula 150", 4, 17, 20, 5, "Charla de asociación",  "Actividad estudiantil",      "pendiente", 90],
      ["Aula 60",  2, 15, 17, 4, "Recuperación de clase", "Estadística",                "rechazada", 45],
      ["Aula 200", 4, 11, 13, 2, "Reunión de departamento", "Coordinación",             "confirmada", 25]
    ];

    var id = 1;
    return base.map(function (r) {
      return {
        id: id++,
        aulaId: byName[r[0]],
        fecha: Utils.addDays(lunes, r[1]),
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
    return {
      version: 1,
      usuarios: seedUsuarios(),
      aulas: aulas,
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
        if (parsed && parsed.version === 1 && parsed.aulas && parsed.usuarios) return parsed;
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
    EDIFICIOS: EDIFICIOS,
    TIPOS: TIPOS,
    EQUIPAMIENTO: EQUIPAMIENTO,

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
        edificio: datos.edificio,
        planta: Number(datos.planta) || 0,
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
      a.edificio = datos.edificio;
      a.planta = Number(datos.planta) || 0;
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
     * f = { texto, edificio, tipo, capacidad, equipamiento[], fecha, hIni, hFin, soloLibres }
     */
    buscarAulas: function (f) {
      var texto = Utils.norm(f.texto || "");
      return db.aulas.filter(function (a) {
        if (f.soloActivas !== false && !a.activa) return false;
        if (f.edificio && a.edificio !== f.edificio) return false;
        if (f.tipo && a.tipo !== f.tipo) return false;
        if (f.capacidad && a.capacidad < Number(f.capacidad)) return false;
        if (f.equipamiento && f.equipamiento.length) {
          var tiene = f.equipamiento.every(function (e) { return a.equipamiento.indexOf(e) !== -1; });
          if (!tiene) return false;
        }
        if (texto) {
          var blob = Utils.norm(a.nombre + " " + a.codigo + " " + a.edificio + " " + a.tipo);
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
