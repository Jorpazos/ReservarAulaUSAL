/* =========================================================================
   PANTALLA 4 · CALENDARIO SEMANAL
   Rejilla semanal de un espacio: franjas horarias × días. Permite reservar
   pulsando sobre un hueco libre y consultar el detalle de cada reserva.
   ========================================================================= */
(function (global) {
  "use strict";
  var Views = global.Views = global.Views || {};

  var estado = { aulaId: null, lunes: null };

  /* --- Detalle de una reserva ------------------------------------------ */
  function detalle(reservaId, recargar) {
    var r = Store.reserva(reservaId);
    if (!r) return;
    var a = Store.aula(r.aulaId);
    var usuario = Store.usuarioActual();
    var esMia = r.usuarioId === usuario.id;
    var gestiona = Store.esRol("admin", "gestor");

    var cuerpo = '<dl class="kv">' +
      "<dt>Espacio</dt><dd>" + Utils.esc(a ? a.nombre + " · " + a.edificio : "—") + "</dd>" +
      "<dt>Fecha</dt><dd>" + Utils.fechaLarga(r.fecha) + "</dd>" +
      "<dt>Horario</dt><dd>" + Utils.hora(r.horaInicio) + " – " + Utils.hora(r.horaFin) + "</dd>" +
      "<dt>Solicitante</dt><dd>" + Utils.esc(Store.nombreUsuario(r.usuarioId)) + "</dd>" +
      "<dt>Motivo</dt><dd>" + Utils.esc(r.asunto) + "</dd>" +
      (r.asignatura ? "<dt>Asignatura</dt><dd>" + Utils.esc(r.asignatura) + "</dd>" : "") +
      "<dt>Asistentes</dt><dd>" + r.asistentes + "</dd>" +
      "<dt>Estado</dt><dd>" + UI.estadoPill(r.estado) + "</dd>" +
      (r.observaciones ? "<dt>Observaciones</dt><dd>" + Utils.esc(r.observaciones) + "</dd>" : "") +
      (r.motivoRechazo ? "<dt>Motivo del rechazo</dt><dd>" + Utils.esc(r.motivoRechazo) + "</dd>" : "") +
    "</dl>";

    var acciones = [{ texto: "Cerrar", clase: "btn--ghost" }];

    if (gestiona && r.estado === "pendiente") {
      acciones.push({
        texto: "Aprobar", clase: "btn--success",
        onClick: function () {
          var res = Store.cambiarEstado(r.id, "confirmada");
          UI.toast(res.ok ? "Reserva aprobada" : "No se pudo aprobar", res.ok ? a.nombre : res.error, res.ok ? "ok" : "err");
          if (recargar) recargar();
        }
      });
    }
    if (esMia || gestiona) {
      if (r.estado === "confirmada" || r.estado === "pendiente") {
        acciones.push({
          texto: "Cancelar reserva", clase: "btn--danger",
          onClick: function () {
            Store.cambiarEstado(r.id, "cancelada");
            UI.toast("Reserva cancelada", a ? a.nombre + " · " + Utils.fechaCorta(r.fecha) : "", "warn");
            if (recargar) recargar();
          }
        });
      }
    }

    UI.openModal({ titulo: "Detalle de la reserva", cuerpo: cuerpo, acciones: acciones });
  }

  /* --- Vista ------------------------------------------------------------ */
  Views.calendario = {
    titulo: "Calendario semanal",
    subtitulo: "Consulta la ocupación de un espacio y reserva pulsando sobre un hueco libre.",

    preparar: function (pre) {
      if (pre && pre.aulaId) estado.aulaId = pre.aulaId;
      if (pre && pre.fecha) estado.lunes = Utils.lunesDe(pre.fecha);
    },

    render: function (root) {
      var aulas = Store.aulas();
      if (!estado.aulaId || !Store.aula(estado.aulaId)) estado.aulaId = aulas[0].id;
      if (!estado.lunes) estado.lunes = Utils.lunesDe(Utils.hoy());

      // Selector agrupado por edificio
      var grupos = {};
      aulas.forEach(function (a) { (grupos[a.edificio] = grupos[a.edificio] || []).push(a); });
      var selectAulas = Object.keys(grupos).map(function (ed) {
        return '<optgroup label="' + Utils.esc(ed) + '">' +
          grupos[ed].map(function (a) {
            return '<option value="' + a.id + '"' + (a.id === estado.aulaId ? " selected" : "") + ">" +
                   Utils.esc(a.nombre) + (a.activa ? "" : " (fuera de servicio)") + "</option>";
          }).join("") + "</optgroup>";
      }).join("");

      root.innerHTML =
        '<div class="card fade-in">' +
          '<div class="cal-toolbar">' +
            '<button class="icon-btn" id="cal-prev" title="Semana anterior">' + UI.icon("flechaIzq", 18) + "</button>" +
            '<button class="btn btn--sm btn--outline" id="cal-hoy">Hoy</button>' +
            '<button class="icon-btn" id="cal-next" title="Semana siguiente">' + UI.icon("flechaDer", 18) + "</button>" +
            '<span class="cal-title" id="cal-title"></span>' +
            '<div class="spacer" style="min-width:220px"><select id="cal-aula">' + selectAulas + "</select></div>" +
          "</div>" +
          '<div class="cal-scroll" id="cal-scroll"></div>' +
          '<div class="legend">' +
            '<span class="legend__item"><span class="legend__box cal-event--confirmada"></span>Confirmada</span>' +
            '<span class="legend__item"><span class="legend__box cal-event--pendiente"></span>Pendiente de confirmación</span>' +
            '<span class="legend__item"><span class="legend__box cal-event--rechazada"></span>Rechazada</span>' +
            '<span class="legend__item"><span class="legend__box cal-event--cancelada"></span>Cancelada</span>' +
            '<span class="legend__item spacer">Pulsa un hueco libre para reservarlo</span>' +
          "</div>" +
        "</div>";

      var scroll = UI.$("#cal-scroll", root);

      function pintar() {
        var aula = Store.aula(estado.aulaId);
        var dias = [];
        for (var i = 0; i < 7; i++) dias.push(Utils.addDays(estado.lunes, i));
        var hoy = Utils.hoy();

        var d0 = Utils.parse(dias[0]), d6 = Utils.parse(dias[6]);
        UI.$("#cal-title", root).textContent =
          d0.getDate() + " " + Utils.MESES[d0.getMonth()].slice(0, 3) + " – " +
          d6.getDate() + " " + Utils.MESES[d6.getMonth()] + " " + d6.getFullYear();

        // Reservas de la semana (todas, incluidas rechazadas/canceladas para el histórico)
        var semana = Store.reservas().filter(function (r) {
          return r.aulaId === estado.aulaId && r.fecha >= dias[0] && r.fecha <= dias[6];
        });

        var head = '<tr><th class="cal-hour">' + Utils.esc(aula.nombre) + "</th>" +
          dias.map(function (d) {
            var esHoy = d === hoy;
            return '<th class="' + (esHoy ? "is-today" : "") + '">' +
              Utils.DIAS[Utils.parse(d).getDay()] + "<small>" + Utils.fechaCorta(d) + "</small></th>";
          }).join("") + "</tr>";

        var filas = "";
        for (var h = Store.HORA_INICIO; h < Store.HORA_FIN; h++) {
          filas += '<tr><th class="cal-hour">' + Utils.hora(h) + "<br>" + Utils.hora(h + 1) + "</th>";

          for (var j = 0; j < 7; j++) {
            var dia = dias[j];
            var hora = h;
            var evento = semana.find(function (r) {
              return r.fecha === dia && r.horaInicio <= hora && r.horaFin > hora &&
                     (r.estado === "confirmada" || r.estado === "pendiente");
            });
            var clases = [];
            if (Utils.esFinDeSemana(dia)) clases.push("is-weekend");
            if (dia < hoy) clases.push("is-past");

            if (evento) {
              var esInicio = evento.horaInicio === hora;
              var mio = evento.usuarioId === (Store.usuarioActual() || {}).id;
              filas += '<td class="' + clases.join(" ") + '">' +
                '<span class="cal-event cal-event--' + evento.estado + (mio ? " cal-event--mine" : "") +
                '" data-reserva="' + evento.id + '">' +
                (esInicio
                  ? "<strong>" + Utils.esc(evento.asunto) + "</strong><span>" +
                    Utils.esc(Store.nombreUsuario(evento.usuarioId)) + "</span>"
                  : '<span>· continúa ·</span>') +
                "</span></td>";
            } else {
              var libre = dia >= hoy && aula.activa;
              clases.push(libre ? "is-free" : "");
              filas += '<td class="' + clases.join(" ") + '"' +
                (libre ? ' data-hueco="' + dia + "|" + hora + '" title="Reservar ' + Utils.hora(hora) + '"' : "") +
                "></td>";
            }
          }
          filas += "</tr>";
        }

        scroll.innerHTML = '<table class="calendar"><thead>' + head + "</thead><tbody>" + filas + "</tbody></table>";
      }

      UI.$("#cal-prev", root).addEventListener("click", function () { estado.lunes = Utils.addDays(estado.lunes, -7); pintar(); });
      UI.$("#cal-next", root).addEventListener("click", function () { estado.lunes = Utils.addDays(estado.lunes, 7); pintar(); });
      UI.$("#cal-hoy", root).addEventListener("click", function () { estado.lunes = Utils.lunesDe(Utils.hoy()); pintar(); });
      UI.$("#cal-aula", root).addEventListener("change", function () { estado.aulaId = Number(this.value); pintar(); });

      UI.on(scroll, "click", "[data-reserva]", function (ev, el) {
        detalle(Number(el.getAttribute("data-reserva")), function () { pintar(); App.refrescarBadges(); });
      });

      UI.on(scroll, "click", "[data-hueco]", function (ev, celda) {
        var partes = celda.getAttribute("data-hueco").split("|");
        Views.reservar.preparar({ fecha: partes[0], hIni: Number(partes[1]), hFin: Number(partes[1]) + 1 });
        Views.reservar.abrirReserva(estado.aulaId, function () { pintar(); App.refrescarBadges(); });
      });

      pintar();
    },

    detalle: detalle
  };
})(window);
