/* =========================================================================
   PANTALLA 2 · PANEL DE INICIO
   Resumen de la actividad: métricas, ocupación por franja, próximas
   reservas del usuario y espacios más solicitados.
   ========================================================================= */
(function (global) {
  "use strict";
  var Views = global.Views = global.Views || {};

  function statCard(label, valor, pie, ico, variante) {
    return '<article class="stat ' + (variante ? "stat--" + variante : "") + '">' +
      '<div class="stat__top">' +
        '<span class="stat__label">' + Utils.esc(label) + "</span>" +
        '<span class="stat__icon">' + UI.icon(ico, 18) + "</span>" +
      "</div>" +
      '<div class="stat__value tnum">' + valor + "</div>" +
      '<div class="stat__foot">' + Utils.esc(pie) + "</div>" +
    "</article>";
  }

  Views.dashboard = {
    titulo: "Panel de inicio",
    subtitulo: function () {
      var u = Store.usuarioActual();
      return "Hola, " + (u ? u.nombre.split(" ")[0] : "") + ". Este es el estado de los espacios hoy.";
    },

    render: function (root) {
      var st = Store.estadisticas();
      var usuario = Store.usuarioActual();
      var hoy = Utils.hoy();
      var puedeGestionar = Store.esRol("admin", "gestor");

      /* --- Métricas --- */
      var stats = "";
      stats += statCard("Espacios disponibles", st.totalAulas, "200 aulas + 3 centros tecnológicos", "edificio");
      stats += statCard("Reservas para hoy", st.reservasHoy,
        Utils.plural(st.espaciosOcupados, "espacio ocupado", "espacios ocupados"), "calendario", "info");
      stats += statCard("Mis reservas activas", st.misReservas, "Desde hoy en adelante", "lista", "ok");
      stats += puedeGestionar
        ? statCard("Solicitudes pendientes", st.pendientes, "Esperando aprobación", "aviso", "warn")
        : statCard("Usuarios activos", st.totalUsuarios, "Comunidad de la facultad", "usuarios", "warn");

      /* --- Ocupación por franja (hoy) --- */
      var maxFranja = Math.max.apply(null, st.porFranja.map(function (f) { return f.total; }).concat([1]));
      var barras = st.porFranja.map(function (f) {
        var pct = Math.round(f.total * 100 / maxFranja);
        return '<div class="bar__row">' +
          "<span>" + Utils.hora(f.hora) + "</span>" +
          '<div class="bar__track"><div class="bar__fill" style="width:' + (f.total ? Math.max(pct, 4) : 0) + '%"></div></div>' +
          '<span class="bar__val">' + f.total + "</span>" +
        "</div>";
      }).join("");

      /* --- Próximas reservas del usuario --- */
      var proximas = Store.reservasDe(usuario.id)
        .filter(function (r) { return r.fecha >= hoy && r.estado !== "cancelada" && r.estado !== "rechazada"; })
        .sort(function (a, b) { return a.fecha === b.fecha ? a.horaInicio - b.horaInicio : (a.fecha < b.fecha ? -1 : 1); })
        .slice(0, 5);

      var listaProximas = proximas.length ? proximas.map(function (r) {
        var a = Store.aula(r.aulaId);
        return '<div class="list__item">' +
          '<div class="list__icon">' + Utils.fechaDia(r.fecha).replace(" ", "<br>") + "</div>" +
          '<div class="list__body">' +
            "<strong>" + Utils.esc(a ? a.nombre : "Aula eliminada") + " · " + Utils.esc(r.asunto) + "</strong>" +
            "<span>" + Utils.hora(r.horaInicio) + " – " + Utils.hora(r.horaFin) +
            (a ? " · " + Utils.esc(a.edificio) : "") + "</span>" +
          "</div>" +
          UI.estadoPill(r.estado) +
        "</div>";
      }).join("") : UI.vacio("Sin reservas próximas", "Busca un aula libre y reserva en dos clics.");

      /* --- Agenda del día (todo el centro) --- */
      var deHoy = Store.reservasActivas()
        .filter(function (r) { return r.fecha === hoy; })
        .sort(function (a, b) { return a.horaInicio - b.horaInicio; })
        .slice(0, 6);

      var listaHoy = deHoy.length ? deHoy.map(function (r) {
        var a = Store.aula(r.aulaId);
        return '<div class="list__item">' +
          '<div class="list__icon">' + Utils.hora(r.horaInicio) + "</div>" +
          '<div class="list__body">' +
            "<strong>" + Utils.esc(a ? a.nombre : "—") + " · " + Utils.esc(r.asignatura || r.asunto) + "</strong>" +
            "<span>" + Utils.esc(Store.nombreUsuario(r.usuarioId)) + " · hasta " + Utils.hora(r.horaFin) + "</span>" +
          "</div>" +
          UI.estadoPill(r.estado) +
        "</div>";
      }).join("") : UI.vacio("Hoy no hay actividad", "Ningún espacio tiene reservas para la fecha de hoy.");

      /* --- Ranking del mes --- */
      var ranking = st.top.length ? st.top.map(function (t, i) {
        return '<div class="list__item">' +
          '<div class="list__icon">' + (i + 1) + "º</div>" +
          '<div class="list__body"><strong>' + Utils.esc(t.aula.nombre) + "</strong>" +
          "<span>" + Utils.esc(t.aula.edificio) + " · aforo " + t.aula.capacidad + "</span></div>" +
          '<span class="pill pill--soft">' + Utils.plural(t.total, "reserva", "reservas") + "</span>" +
        "</div>";
      }).join("") : UI.vacio("Sin datos este mes", "Todavía no se han registrado reservas.");

      root.innerHTML =
        '<div class="stack fade-in">' +
          '<section class="grid grid--stats">' + stats + "</section>" +

          '<section class="grid grid--2">' +
            '<div class="card">' +
              '<div class="card__head"><h3>Mis próximas reservas</h3>' +
                '<button class="btn btn--sm btn--outline spacer" data-goto="misreservas">Ver todas</button></div>' +
              '<div class="card__body card__body--flush"><div class="list">' + listaProximas + "</div></div>" +
            "</div>" +

            '<div class="card">' +
              '<div class="card__head"><h3>Ocupación de hoy por franja</h3>' +
                '<span class="pill pill--soft spacer">' + Utils.fechaCorta(hoy) + "</span></div>" +
              '<div class="card__body"><div class="bars">' + barras + "</div></div>" +
            "</div>" +
          "</section>" +

          '<section class="grid grid--2">' +
            '<div class="card">' +
              '<div class="card__head"><h3>Agenda del centro · hoy</h3>' +
                '<button class="btn btn--sm btn--outline spacer" data-goto="calendario">Abrir calendario</button></div>' +
              '<div class="card__body card__body--flush"><div class="list">' + listaHoy + "</div></div>" +
            "</div>" +

            '<div class="card">' +
              '<div class="card__head"><h3>Espacios más solicitados del mes</h3></div>' +
              '<div class="card__body card__body--flush"><div class="list">' + ranking + "</div></div>" +
            "</div>" +
          "</section>" +

          '<section class="card">' +
            '<div class="card__head"><h3>Accesos rápidos</h3></div>' +
            '<div class="card__body row">' +
              '<button class="btn btn--primary" data-goto="reservar">' + UI.icon("buscar", 16) + " Buscar aula libre</button>" +
              '<button class="btn btn--outline" data-goto="calendario">' + UI.icon("calendario", 16) + " Calendario semanal</button>" +
              '<button class="btn btn--outline" data-goto="misreservas">' + UI.icon("lista", 16) + " Mis reservas</button>" +
              (puedeGestionar
                ? '<button class="btn btn--outline" data-goto="solicitudes">' + UI.icon("inbox", 16) + " Solicitudes (" + st.pendientes + ")</button>"
                : "") +
              (Store.esRol("admin")
                ? '<button class="btn btn--outline" data-goto="usuarios">' + UI.icon("usuarios", 16) + " Gestionar usuarios</button>"
                : "") +
            "</div>" +
          "</section>" +
        "</div>";

      UI.on(root, "click", "[data-goto]", function (ev, btn) {
        App.ir(btn.getAttribute("data-goto"));
      });
    }
  };
})(window);
