/* =========================================================================
   PANTALLA 6 · SOLICITUDES PENDIENTES  (administrador / conserjería)
   Bandeja de aprobación de las reservas que requieren autorización.
   ========================================================================= */
(function (global) {
  "use strict";
  var Views = global.Views = global.Views || {};

  function rechazar(reservaId, recargar) {
    var r = Store.reserva(reservaId);
    UI.openModal({
      titulo: "Rechazar solicitud",
      cuerpo: '<p>' + Utils.esc(Store.nombreAula(r.aulaId)) + " · " + Utils.fechaCorta(r.fecha) + " · " +
              Utils.hora(r.horaInicio) + "–" + Utils.hora(r.horaFin) + "</p>" +
              '<div class="field"><label for="rz-motivo">Motivo del rechazo</label>' +
              '<textarea id="rz-motivo" placeholder="Explica al solicitante por qué no se concede el espacio."></textarea></div>',
      acciones: [
        { texto: "Volver", clase: "btn--ghost" },
        {
          texto: "Rechazar", clase: "btn--danger",
          onClick: function (b) {
            Store.cambiarEstado(r.id, "rechazada", UI.$("#rz-motivo", b).value);
            UI.toast("Solicitud rechazada", "Se ha notificado el motivo al solicitante.", "err");
            recargar();
          }
        }
      ]
    });
  }

  Views.solicitudes = {
    titulo: "Solicitudes pendientes",
    subtitulo: "Revisa y resuelve las peticiones de espacios que requieren autorización.",
    roles: ["admin", "gestor"],

    render: function (root) {
      root.innerHTML =
        '<div class="stack fade-in">' +
          '<div class="alert alert--info mb-0">' +
            "Requieren autorización las reservas de <strong>estudiantes</strong>, de <strong>Aulas Magnas</strong> " +
            "y del <strong>Centro Tecnológico 3</strong>, el laboratorio de brazo robótico." +
          "</div>" +
          '<div class="card">' +
            '<div class="card__head"><h3>' + UI.icon("inbox", 16) + " Bandeja de entrada</h3>" +
              '<span class="pill pill--warn spacer" id="sol-total"></span></div>' +
            '<div class="table-wrap" id="sol-tabla"></div>' +
          "</div>" +
          '<div class="card">' +
            '<div class="card__head"><h3>Resueltas recientemente</h3></div>' +
            '<div class="table-wrap" id="sol-historico"></div>' +
          "</div>" +
        "</div>";

      var tabla = UI.$("#sol-tabla", root);
      var historico = UI.$("#sol-historico", root);

      function pintar() {
        var pendientes = Store.reservas()
          .filter(function (r) { return r.estado === "pendiente"; })
          .sort(function (a, b) { return a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : a.horaInicio - b.horaInicio; });

        UI.$("#sol-total", root).textContent = Utils.plural(pendientes.length, "solicitud", "solicitudes");

        tabla.innerHTML = pendientes.length
          ? '<table class="data"><thead><tr><th>Solicitante</th><th>Espacio</th><th>Fecha y horario</th>' +
            "<th>Actividad</th><th>Aforo</th><th class=\"col-actions\">Resolución</th></tr></thead><tbody>" +
            pendientes.map(function (r) {
              var a = Store.aula(r.aulaId);
              var u = Store.usuario(r.usuarioId);
              var conflicto = Store.hayConflicto(r.aulaId, r.fecha, r.horaInicio, r.horaFin, r.id);
              return "<tr>" +
                '<td class="cell-strong">' + Utils.esc(u ? u.nombre : "—") +
                  '<span class="cell-sub">' + (u ? Utils.esc(Store.ROLES[u.rol].nombre + " · " + u.departamento) : "") + "</span></td>" +
                '<td class="cell-strong">' + Utils.esc(a ? a.nombre : "—") +
                  '<span class="cell-sub">' + Utils.esc(a ? a.pabellon : "") + "</span></td>" +
                '<td class="nowrap">' + Utils.fechaCorta(r.fecha) +
                  '<span class="cell-sub tnum">' + Utils.hora(r.horaInicio) + " – " + Utils.hora(r.horaFin) + "</span></td>" +
                "<td>" + Utils.esc(r.asunto) + '<span class="cell-sub">' + Utils.esc(r.asignatura) + "</span></td>" +
                '<td class="tnum">' + r.asistentes + (a ? '<span class="cell-sub">de ' + a.capacidad + "</span>" : "") + "</td>" +
                '<td class="col-actions">' +
                  (conflicto ? '<span class="pill pill--err" title="Otra reserva ocupa ya esa franja">Solapada</span> ' : "") +
                  '<button class="btn btn--sm btn--ghost" data-detalle="' + r.id + '">Ver</button>' +
                  '<button class="btn btn--sm btn--danger" data-rechazar="' + r.id + '">Rechazar</button>' +
                  '<button class="btn btn--sm btn--success" data-aprobar="' + r.id + '">Aprobar</button>' +
                "</td></tr>";
            }).join("") + "</tbody></table>"
          : UI.vacio("Todo al día", "No hay solicitudes pendientes de resolver.");

        var resueltas = Store.reservas()
          .filter(function (r) { return r.estado === "confirmada" || r.estado === "rechazada"; })
          .sort(function (a, b) { return b.id - a.id; })
          .slice(0, 8);

        historico.innerHTML = resueltas.length
          ? '<table class="data"><thead><tr><th>Espacio</th><th>Fecha</th><th>Solicitante</th>' +
            "<th>Resuelta por</th><th>Estado</th></tr></thead><tbody>" +
            resueltas.map(function (r) {
              return "<tr><td>" + Utils.esc(Store.nombreAula(r.aulaId)) + "</td>" +
                '<td class="nowrap">' + Utils.fechaCorta(r.fecha) + "</td>" +
                "<td>" + Utils.esc(Store.nombreUsuario(r.usuarioId)) + "</td>" +
                "<td>" + (r.resueltaPor ? Utils.esc(Store.nombreUsuario(r.resueltaPor)) : "—") + "</td>" +
                "<td>" + UI.estadoPill(r.estado) +
                  (r.motivoRechazo ? '<span class="cell-sub">' + Utils.esc(r.motivoRechazo) + "</span>" : "") + "</td></tr>";
            }).join("") + "</tbody></table>"
          : UI.vacio("Sin histórico", "Aún no se ha resuelto ninguna solicitud.");
      }

      function recargar() { pintar(); App.refrescarBadges(); }

      UI.on(tabla, "click", "[data-aprobar]", function (ev, b) {
        var res = Store.cambiarEstado(Number(b.getAttribute("data-aprobar")), "confirmada");
        if (res.ok) UI.toast("Solicitud aprobada", Store.nombreAula(res.reserva.aulaId) + " · " + Utils.fechaCorta(res.reserva.fecha), "ok");
        else UI.toast("No se pudo aprobar", res.error, "err");
        recargar();
      });
      UI.on(tabla, "click", "[data-rechazar]", function (ev, b) {
        rechazar(Number(b.getAttribute("data-rechazar")), recargar);
      });
      UI.on(tabla, "click", "[data-detalle]", function (ev, b) {
        Views.calendario.detalle(Number(b.getAttribute("data-detalle")), recargar);
      });

      pintar();
    }
  };
})(window);
