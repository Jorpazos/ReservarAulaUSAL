/* =========================================================================
   app.js · Arranque, tema claro/oscuro, sesión y navegación entre pantallas
   ========================================================================= */
(function (global) {
  "use strict";

  var TEMA_KEY = "reservaaulas.tema";
  var INICIO_KEY = "reservaaulas.inicio";   // "alumnos" (por defecto) o "sistema"

  /* --- Mapa de pantallas ------------------------------------------------ */
  var MENU = [
    { grupo: "General" },
    { id: "dashboard",   texto: "Panel de inicio",   icono: "panel" },
    { id: "reservar",    texto: "Buscar y reservar", icono: "buscar" },
    { id: "calendario",  texto: "Calendario",        icono: "calendario" },
    { id: "misreservas", texto: "Mis reservas",      icono: "lista" },
    { accion: "alumnos", texto: "Panel de alumnos",  icono: "grupo" },

    { grupo: "Administración", roles: ["admin", "gestor"] },
    { id: "solicitudes", texto: "Solicitudes",       icono: "inbox",    roles: ["admin", "gestor"], badge: "pendientes" },
    { id: "materias",    texto: "Materias y horarios", icono: "lista",  roles: ["admin", "gestor"] },
    { id: "aulas",       texto: "Espacios",          icono: "edificio", roles: ["admin", "gestor"] },
    { id: "usuarios",    texto: "Usuarios",          icono: "usuarios", roles: ["admin"] }
  ];

  var vistaActual = null;

  /* --- Tema ------------------------------------------------------------- */
  function aplicarTema(tema) {
    document.documentElement.setAttribute("data-theme", tema);
    try { localStorage.setItem(TEMA_KEY, tema); } catch (e) { /* modo privado */ }
  }

  function temaGuardado() {
    var guardado = null;
    try { guardado = localStorage.getItem(TEMA_KEY); } catch (e) { /* ignorar */ }
    if (guardado) return guardado;
    return global.matchMedia && global.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function alternarTema() {
    var actual = document.documentElement.getAttribute("data-theme");
    var nuevo = actual === "dark" ? "light" : "dark";
    aplicarTema(nuevo);
    UI.toast(nuevo === "dark" ? "Modo oscuro activado" : "Modo claro activado", "", "ok");
  }

  /* --- Navegación ------------------------------------------------------- */
  function puedeVer(item) {
    if (!item.roles) return true;
    return Store.esRol.apply(Store, item.roles);
  }

  function pintarMenu() {
    var nav = UI.$("#main-nav");
    nav.innerHTML = MENU.filter(puedeVer).map(function (item) {
      if (item.grupo) return '<div class="nav__group">' + Utils.esc(item.grupo) + "</div>";
      if (item.accion) {
        return '<button class="nav__item" data-accion="' + item.accion + '">' +
          UI.icon(item.icono, 17) + "<span>" + Utils.esc(item.texto) + "</span></button>";
      }
      return '<button class="nav__item" data-vista="' + item.id + '">' +
        UI.icon(item.icono, 17) + "<span>" + Utils.esc(item.texto) + "</span>" +
        (item.badge ? '<span class="nav__badge" data-badge="' + item.badge + '" hidden>0</span>' : "") +
      "</button>";
    }).join("");
  }

  function refrescarBadges() {
    var pendientes = Store.reservas().filter(function (r) { return r.estado === "pendiente"; }).length;
    UI.$$('[data-badge="pendientes"]').forEach(function (b) {
      b.textContent = pendientes;
      b.hidden = pendientes === 0;
    });
  }

  /** Cambia de pantalla. `pre` son datos iniciales opcionales para la vista. */
  function ir(id, pre) {
    var vista = global.Views[id];
    if (!vista) return;
    if (vista.roles && !Store.esRol.apply(Store, vista.roles)) {
      UI.toast("Acceso restringido", "Tu perfil no puede abrir esa sección.", "err");
      return;
    }
    if (vista.preparar) vista.preparar(pre);

    vistaActual = id;
    UI.$$(".nav__item").forEach(function (b) {
      b.classList.toggle("is-active", b.getAttribute("data-vista") === id);
    });

    UI.$("#page-title").textContent = typeof vista.titulo === "function" ? vista.titulo() : vista.titulo;
    UI.$("#page-subtitle").textContent = typeof vista.subtitulo === "function" ? vista.subtitulo() : (vista.subtitulo || "");

    var contenedor = UI.$("#view");
    contenedor.innerHTML = "";
    vista.render(contenedor);

    UI.$("#app-shell").classList.remove("nav-open");
    window.scrollTo({ top: 0 });
    refrescarBadges();
  }

  /* --- Cambio entre las tres pantallas principales ---------------------- */
  function mostrarPantalla(cual) {
    UI.$("#alumnos-screen").hidden = cual !== "alumnos";
    UI.$("#login-screen").hidden = cual !== "login";
    UI.$("#app-shell").hidden = cual !== "app";
    window.scrollTo({ top: 0 });
  }

  function inicioPreferido() {
    try { return localStorage.getItem(INICIO_KEY) || "alumnos"; } catch (e) { return "alumnos"; }
  }

  /** Panel de alumnos: público, no necesita sesión. */
  function verAlumnos() {
    UI.closeModal();
    mostrarPantalla("alumnos");
    UI.$("#alu-inicio").checked = inicioPreferido() === "alumnos";
    UI.$("#alu-sistema").textContent = Store.usuarioActual() ? "Volver al sistema" : "Acceso al sistema";
    Views.alumnos.render();
  }

  function verLogin() {
    mostrarPantalla("login");
    UI.$("#login-error").hidden = true;
  }

  /* --- Sesión ----------------------------------------------------------- */
  function entrarEnApp() {
    var u = Store.usuarioActual();
    if (!u) return;

    mostrarPantalla("app");

    UI.$("#side-name").textContent = u.nombre;
    UI.$("#side-role").textContent = Store.ROLES[u.rol].nombre + (u.departamento ? " · " + u.departamento : "");
    UI.$("#side-avatar").textContent = Utils.iniciales(u.nombre);
    UI.$("#top-avatar").textContent = Utils.iniciales(u.nombre);
    UI.$("#topbar-date").textContent = Utils.fechaLarga(Utils.hoy());

    pintarMenu();
    ir("dashboard");
  }

  function salir() {
    Store.logout();
    UI.closeModal();
    UI.$("#login-form").reset();
    vistaActual = null;
    // Al cerrar sesión se vuelve al punto de entrada elegido.
    if (inicioPreferido() === "alumnos") verAlumnos(); else verLogin();
  }

  /* --- Pantalla de acceso ----------------------------------------------- */
  function initLogin() {
    var form = UI.$("#login-form");
    var error = UI.$("#login-error");

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var usuario = UI.$("#login-user").value.trim();
      var pass = UI.$("#login-pass").value;

      if (!usuario || !pass) {
        error.textContent = "Introduce tu usuario y tu contraseña.";
        error.hidden = false;
        return;
      }

      var res = Store.login(usuario, pass);
      if (!res.ok) {
        error.textContent = res.error;
        error.hidden = false;
        return;
      }

      error.hidden = true;
      UI.$("#login-pass").value = "";
      entrarEnApp();
      UI.toast("Bienvenido, " + res.usuario.nombre.split(" ")[0],
               Store.ROLES[res.usuario.rol].nombre, "ok");
    });

    UI.$("#toggle-pass").addEventListener("click", function () {
      var input = UI.$("#login-pass");
      var visible = input.type === "text";
      input.type = visible ? "password" : "text";
      this.textContent = visible ? "Ver" : "Ocultar";
    });

    UI.on(document, "click", ".demo-chip", function (ev, chip) {
      UI.$("#login-user").value = chip.getAttribute("data-user");
      UI.$("#login-pass").value = chip.getAttribute("data-pass");
      error.hidden = true;
      UI.$("#login-form").requestSubmit
        ? UI.$("#login-form").requestSubmit()
        : UI.$("#login-form").dispatchEvent(new Event("submit", { cancelable: true }));
    });

    UI.$("#login-theme-toggle").addEventListener("click", alternarTema);
    UI.$("#login-volver").addEventListener("click", verAlumnos);
  }

  /* --- Panel de alumnos ------------------------------------------------- */
  function initAlumnos() {
    UI.$("#alu-theme-toggle").addEventListener("click", alternarTema);

    UI.$("#alu-sistema").addEventListener("click", function () {
      if (Store.usuarioActual()) entrarEnApp(); else verLogin();
    });

    // Interruptor: abrir (o no) este panel al iniciar la aplicación.
    UI.$("#alu-inicio").addEventListener("change", function () {
      var valor = this.checked ? "alumnos" : "sistema";
      try { localStorage.setItem(INICIO_KEY, valor); } catch (e) { /* modo privado */ }
      UI.toast(
        this.checked ? "Se abrirá el panel de alumnos" : "Se abrirá el acceso al sistema",
        "Podés cambiarlo cuando quieras desde acá.",
        "ok"
      );
    });
  }

  /* --- Arranque --------------------------------------------------------- */
  function init() {
    aplicarTema(temaGuardado());
    Store.init();
    UI.initModal();
    initLogin();
    initAlumnos();

    UI.$("#theme-toggle").addEventListener("click", alternarTema);
    UI.$("#logout-btn").addEventListener("click", function () {
      UI.confirmar({
        titulo: "Cerrar sesión",
        texto: "Vas a salir de ReservaAulas. Tus reservas se mantienen guardadas.",
        aceptar: "Cerrar sesión",
        clase: "btn--primary",
        onOk: salir
      });
    });

    UI.on(document, "click", "[data-vista]", function (ev, btn) {
      ir(btn.getAttribute("data-vista"));
    });

    UI.on(document, "click", '[data-accion="alumnos"]', function () { verAlumnos(); });

    // Menú lateral en pantallas pequeñas
    var shell = UI.$("#app-shell");
    UI.$("#sidebar-open").addEventListener("click", function () { shell.classList.add("nav-open"); });
    UI.$("#sidebar-close").addEventListener("click", function () { shell.classList.remove("nav-open"); });
    UI.$("#sidebar-backdrop").addEventListener("click", function () { shell.classList.remove("nav-open"); });

    // Punto de entrada: sesión abierta → sistema; si no, la preferencia guardada.
    if (Store.usuarioActual()) entrarEnApp();
    else if (inicioPreferido() === "sistema") verLogin();
    else verAlumnos();
  }

  global.App = {
    init: init,
    ir: ir,
    salir: salir,
    verAlumnos: verAlumnos,
    verLogin: verLogin,
    refrescarBadges: refrescarBadges,
    alternarTema: alternarTema,
    vistaActual: function () { return vistaActual; }
  };

  document.addEventListener("DOMContentLoaded", init);
})(window);
