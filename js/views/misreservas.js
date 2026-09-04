/* =========================================================================
   PANTALLA 5 · MIS RESERVAS
   Histórico y próximas reservas del usuario, con filtros, edición y
   cancelación. Los administradores pueden ver las de todo el centro.
   ========================================================================= */
(function (global) {
  "use strict";
  var Views = global.Views = global.Views || {};

  var filtro = { estado: "", rango: "proximas", texto: "", todas: false };

  function editar(reservaId, recargar) {
    var r = Store.reserva(reservaId);
    var a = Store.aula(r.aulaId);

    var cuerpo =
      '<div class="alert alert--info"><strong>' + Utils.esc(a ? a.nombre : "—") + "</strong> · aforo " +
        (a ? a.capacidad : "—") + "</div>" +
      '<form novalidate><div class="form-grid">' +
        '<div class="field"><label for="ed-fecha">Fecha</label>' +
          '<input type="date" id="ed-fecha" value="' + r.fecha + '" min="' + Utils.hoy() + '"></div>' +
        '<div class="field"><label for="ed-asistentes">Asistentes</label>' +
          '<input type="number" id="ed-asistentes" min="1" value="' + r.asistentes + '"></div>' +
        '<div class="field"><label for="ed-ini">Hora de inicio</label>' +
          '<select id="ed-ini">' + UI.horaOptions(r.horaInicio, Store.HORA_INICIO, Store.HORA_FIN - 1) + "</select></div>" +
        '<div class="field"><label for="ed-fin">Hora de fin</label>' +
          '<select id="ed-fin">' + UI.horaOptions(r.horaFin, Store.HORA_INICIO + 1, Store.HORA_FIN) + "</select></div>" +
        '<div class="field span-2"><label for="ed-asunto">Motivo</label>' +
          '<input type="text" id="ed-asunto" value="' + Utils.esc(r.asunto) + '"></div>' +
        '<div class="field span-2"><label for="ed-asignatura">Asignatura o actividad</label>' +
          '<input type="text" id="ed-asignatura" value="' + Utils.esc(r.asignatura) + '"></div>' +
        '<div class="field span-2"><label for="ed-obs">Observaciones</label>' +
          '<textarea id="ed-obs">' + Utils.esc(r.observaciones) + "</textarea></div>" +
      "</div><div id=\"ed-error\" class=\"alert alert--error\" hidden></div></form>";

    UI.openModal({
      titulo: "Modificar reserva",
      cuerpo: cuerpo,
      ancho: true,
      acciones: [
        { texto: "Cancelar", clase: "btn--ghost" },
        {
          texto: "Guardar cambios", clase: "btn--primary",
          onClick: function (b) {
            var res = Store.actualizarReserva(r.id, {
              fecha: UI.$("#ed-fecha", b).value,
              horaInicio: UI.$("#ed-ini", b).value,
              horaFin: UI.$("#ed-fin", b).value,
              asunto: UI.$("#ed-asunto", b).value,
              asignatura: UI.$("#ed-asignatura", b).value,
              asistentes: UI.$("#ed-asistentes", b).value,
              observaciones: UI.$("#ed-obs", b).value
            });
            if (!res.ok) {
              var err = UI.$("#ed-error", b);
              err.textContent = res.error; err.hidden = false;
              return false;
            }
            UI.toast("Reserva actualizada", Utils.fechaCorta(res.reserva.fecha), "ok");
            recargar();
            return true;
          }
        }
      ]
    });
  }

  Views.misreservas = {
    titulo: "Mis reservas",
    subtitulo: "Consulta, modifica o cancela tus reservas de espacios.",

    render: function (root) {
      var usuario = Store.usuarioActual();
      var esAdmin = Store.esRol("admin", "gestor");
      var hoy = Utils.hoy();

      root.innerHTML =
        '<div class="card fade-in">' +
          '<div class="card__head">' +
            "<h3>" + UI.icon("lista", 16) + " Listado de reservas</h3>" +
            '<div class="spacer row">' +
              '<input type="search" id="mr-texto" placeholder="Buscar por aula o motivo…" style="width:210px" value="' + Utils.esc(filtro.texto) + '">' +
              '<select id="mr-rango" style="width:150px">' +
                UI.options([{ valor: "proximas", texto: "Próximas" },
                            { valor: "pasadas", texto: "Pasadas" },
                            { valor: "todas", texto: "Todas" }], filtro.rango) + "</select>" +
              '<select id="mr-estado" style="width:160px">' +
                UI.options(Object.keys(Store.ESTADOS).map(function (k) {
                  return { valor: k, texto: Store.ESTADOS[k].nombre };
                }), filtro.estado, "Todos los estados") + "</select>" +
              (esAdmin ? '<label class="check nowrap"><input type="checkbox" id="mr-todas"' +
                          (filtro.todas ? " checked" : "") + "> Todo el centro</label>" : "") +
              '<button class="btn btn--sm btn--primary" id="mr-nueva">' + UI.icon("mas", 15) + " Nueva reserva</button>" +
            "</div>" +
          "</div>" +
          '<div class="table-wrap" id="mr-tabla"></div>' +
        "</div>";

      var tabla = UI.$("#mr-tabla", root);

      function pintar() {
        var lista = (esAdmin && filtro.todas) ? Store.reservas() : Store.reservasDe(usuario.id);

        lista = lista.filter(function (r) {
          if (filtro.estado && r.estado !== filtro.estado) return false;
          if (filtro.rango === "proximas" && r.fecha < hoy) return false;
          if (filtro.rango === "pasadas" && r.fecha >= hoy) return false;
          if (filtro.texto) {
            var blob = Utils.norm(Store.nombreAula(r.aulaId) + " " + r.asunto + " " + r.asignatura + " " +
                                  Store.nombreUsuario(r.usuarioId));
            if (blob.indexOf(Utils.norm(filtro.texto)) === -1) return false;
          }
          return true;
        }).sort(function (a, b) {
          if (a.fecha !== b.fecha) return filtro.rango === "pasadas" ? (a.fecha < b.fecha ? 1 : -1) : (a.fecha < b.fecha ? -1 : 1);
          return a.horaInicio - b.horaInicio;
        });

        if (!lista.length) {
          tabla.innerHTML = UI.vacio("No hay reservas que mostrar",
            "Cambia los filtros o crea una nueva reserva desde el buscador de aulas.");
          return;
        }

        tabla.innerHTML = '<table class="data"><thead><tr>' +
          "<th>Espacio</th><th>Fecha</th><th>Horario</th><th>Actividad</th>" +
          (esAdmin && filtro.todas ? "<th>Solicitante</th>" : "") +
          "<th>Estado</th><th class=\"col-actions\">Acciones</th></tr></thead><tbody>" +
          lista.map(function (r) {
            var a = Store.aula(r.aulaId);
            var futura = r.fecha >= hoy;
            var editable = futura && (r.estado === "pendiente" || r.estado === "confirmada") &&
                           (r.usuarioId === usuario.id || esAdmin);
            return "<tr>" +
              '<td class="cell-strong">' + Utils.esc(a ? a.nombre : "Aula eliminada") +
                '<span class="cell-sub">' + Utils.esc(a ? a.pabellon : "") + "</span></td>" +
              '<td class="nowrap">' + Utils.fechaCorta(r.fecha) +
                '<span class="cell-sub">' + Utils.DIAS[Utils.parse(r.fecha).getDay()] + "</span></td>" +
              '<td class="nowrap tnum">' + Utils.hora(r.horaInicio) + " – " + Utils.hora(r.horaFin) + "</td>" +
              "<td>" + Utils.esc(r.asunto) +
                '<span class="cell-sub">' + Utils.esc(r.asignatura || (r.asistentes + " asistentes")) + "</span></td>" +
              (esAdmin && filtro.todas ? "<td>" + Utils.esc(Store.nombreUsuario(r.usuarioId)) + "</td>" : "") +
              "<td>" + UI.estadoPill(r.estado) + "</td>" +
              '<td class="col-actions">' +
                '<button class="btn btn--sm btn--ghost" data-detalle="' + r.id + '">Ver</button>' +
                (editable ? '<button class="btn btn--sm btn--ghost" data-editar="' + r.id + '">Editar</button>' +
                            '<button class="btn btn--sm btn--danger" data-cancelar="' + r.id + '">Cancelar</button>' : "") +
              "</td></tr>";
          }).join("") + "</tbody></table>";
      }

      UI.$("#mr-texto", root).addEventListener("input", function () { filtro.texto = this.value; pintar(); });
      UI.$("#mr-rango", root).addEventListener("change", function () { filtro.rango = this.value; pintar(); });
      UI.$("#mr-estado", root).addEventListener("change", function () { filtro.estado = this.value; pintar(); });
      if (esAdmin) UI.$("#mr-todas", root).addEventListener("change", function () { filtro.todas = this.checked; pintar(); });
      UI.$("#mr-nueva", root).addEventListener("click", function () { App.ir("reservar"); });

      UI.on(tabla, "click", "[data-detalle]", function (ev, b) {
        Views.calendario.detalle(Number(b.getAttribute("data-detalle")), function () { pintar(); App.refrescarBadges(); });
      });
      UI.on(tabla, "click", "[data-editar]", function (ev, b) {
        editar(Number(b.getAttribute("data-editar")), function () { pintar(); App.refrescarBadges(); });
      });
      UI.on(tabla, "click", "[data-cancelar]", function (ev, b) {
        var r = Store.reserva(Number(b.getAttribute("data-cancelar")));
        UI.confirmar({
          titulo: "Cancelar reserva",
          texto: "Se liberará " + Store.nombreAula(r.aulaId) + " el " + Utils.fechaCorta(r.fecha) +
                 " de " + Utils.hora(r.horaInicio) + " a " + Utils.hora(r.horaFin) + ".",
          aceptar: "Sí, cancelar",
          onOk: function () {
            Store.cambiarEstado(r.id, "cancelada");
            UI.toast("Reserva cancelada", "El espacio vuelve a estar disponible.", "warn");
            pintar();
            App.refrescarBadges();
          }
        });
      });

      pintar();
    }
  };
})(window);
