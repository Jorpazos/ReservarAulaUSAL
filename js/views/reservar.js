/* =========================================================================
   PANTALLA 3 · BUSCAR Y RESERVAR
   Filtros de búsqueda sobre los 203 espacios, comprobación de
   disponibilidad en la franja elegida y formulario de reserva.
   ========================================================================= */
(function (global) {
  "use strict";
  var Views = global.Views = global.Views || {};

  var POR_PAGINA = 24;

  // Estado del buscador (se conserva mientras dura la sesión de navegación)
  var f = {
    texto: "",
    fecha: null,
    hIni: 9,
    hFin: 11,
    edificio: "",
    tipo: "",
    capacidad: "",
    equipamiento: [],
    soloLibres: true,
    pagina: 1
  };

  /** Permite abrir la pantalla con filtros preestablecidos (desde el calendario). */
  function preparar(pre) {
    if (!pre) return;
    Object.keys(pre).forEach(function (k) { f[k] = pre[k]; });
    f.pagina = 1;
  }

  function tarjetaAula(item) {
    var a = item.aula;
    var libre = item.libre;
    var esTech = a.tipo === "Laboratorio de Robótica";

    var meta = '<span class="tag">' + UI.icon("grupo", 11) + " " + a.capacidad + " plazas</span>" +
               '<span class="tag">' + Utils.esc(a.tipo) + "</span>" +
               (a.planta === 0 ? '<span class="tag">Planta baja</span>' : '<span class="tag">Planta ' + a.planta + "</span>");

    var equipo = a.equipamiento.slice(0, 3).map(function (e) {
      return '<span class="tag">' + Utils.esc(e) + "</span>";
    }).join("") + (a.equipamiento.length > 3 ? '<span class="tag">+' + (a.equipamiento.length - 3) + "</span>" : "");

    return '<article class="room' + (esTech ? " room--tech" : "") + (libre ? "" : " room--busy") + '">' +
      '<div class="room__head">' +
        "<div><div class=\"room__name\">" + Utils.esc(a.nombre) + "</div>" +
        '<div class="room__place">' + Utils.esc(a.codigo) + " · " + Utils.esc(a.edificio) + "</div></div>" +
        (libre ? '<span class="pill pill--ok"><span class="pill__dot"></span>Libre</span>'
               : '<span class="pill pill--err"><span class="pill__dot"></span>Ocupada</span>') +
      "</div>" +
      '<div class="room__meta">' + meta + equipo + "</div>" +
      (a.nota ? '<p class="small muted">' + Utils.esc(a.nota) + "</p>" : "") +
      '<div class="room__foot">' +
        (a.requiereAutorizacion ? '<span class="pill pill--warn">Requiere autorización</span>' : "") +
        '<button class="btn btn--sm btn--outline spacer" data-ver="' + a.id + '">Horario</button>' +
        '<button class="btn btn--sm btn--primary" data-reservar="' + a.id + '"' + (libre ? "" : " disabled") + ">Reservar</button>" +
      "</div>" +
    "</article>";
  }

  /* --- Ficha de ocupación del día (modal secundario) ------------------- */
  function verHorario(aulaId) {
    var a = Store.aula(aulaId);
    var reservas = Store.reservasDeAula(aulaId, f.fecha)
      .sort(function (x, y) { return x.horaInicio - y.horaInicio; });

    var filas = "";
    for (var h = Store.HORA_INICIO; h < Store.HORA_FIN; h++) {
      var r = reservas.find(function (x) { return x.horaInicio <= h && x.horaFin > h; });
      filas += "<tr><td class=\"nowrap\">" + Utils.hora(h) + " – " + Utils.hora(h + 1) + "</td>" +
        "<td>" + (r
          ? Utils.esc(r.asunto) + ' <span class="cell-sub">' + Utils.esc(Store.nombreUsuario(r.usuarioId)) + "</span>"
          : '<span class="muted">Libre</span>') + "</td>" +
        "<td>" + (r ? UI.estadoPill(r.estado) : '<span class="pill pill--ok">Disponible</span>') + "</td></tr>";
    }

    UI.openModal({
      titulo: a.nombre + " · " + Utils.fechaLarga(f.fecha),
      cuerpo: '<div class="table-wrap"><table class="data"><thead><tr>' +
              "<th>Franja</th><th>Actividad</th><th>Estado</th></tr></thead><tbody>" + filas + "</tbody></table></div>",
      acciones: [{ texto: "Cerrar", clase: "btn--outline" }],
      ancho: true
    });
  }

  /* --- Formulario de reserva ------------------------------------------- */
  function abrirReserva(aulaId, onDone) {
    var a = Store.aula(aulaId);
    var usuario = Store.usuarioActual();
    var aprobacion = Store.requiereAprobacion(a, usuario);

    var cuerpo =
      '<div class="alert alert--info">' +
        "<strong>" + Utils.esc(a.nombre) + "</strong> · " + Utils.esc(a.edificio) +
        " · aforo " + a.capacidad + " · " + Utils.esc(a.tipo) +
      "</div>" +
      (aprobacion ? '<div class="alert alert--warn">Esta reserva quedará <strong>pendiente</strong> hasta que conserjería o un administrador la apruebe.</div>' : "") +
      '<form id="form-reserva" novalidate><div class="form-grid">' +
        '<div class="field"><label for="rv-fecha">Fecha</label>' +
          '<input type="date" id="rv-fecha" value="' + f.fecha + '" min="' + Utils.hoy() + '"></div>' +
        '<div class="field"><label for="rv-asistentes">Asistentes previstos</label>' +
          '<input type="number" id="rv-asistentes" min="1" max="' + a.capacidad + '" value="' + Math.min(20, a.capacidad) + '"></div>' +
        '<div class="field"><label for="rv-ini">Hora de inicio</label>' +
          '<select id="rv-ini">' + UI.horaOptions(f.hIni, Store.HORA_INICIO, Store.HORA_FIN - 1) + "</select></div>" +
        '<div class="field"><label for="rv-fin">Hora de fin</label>' +
          '<select id="rv-fin">' + UI.horaOptions(f.hFin, Store.HORA_INICIO + 1, Store.HORA_FIN) + "</select></div>" +
        '<div class="field span-2"><label for="rv-asunto">Motivo de la reserva</label>' +
          '<input type="text" id="rv-asunto" placeholder="p. ej. Clase magistral, examen, tutoría…" value="Clase magistral"></div>' +
        '<div class="field span-2"><label for="rv-asignatura">Asignatura o actividad</label>' +
          '<input type="text" id="rv-asignatura" placeholder="p. ej. Sistemas de Información II"></div>' +
        '<div class="field span-2"><label for="rv-obs">Observaciones (opcional)</label>' +
          '<textarea id="rv-obs" placeholder="Material necesario, disposición del aula, etc."></textarea></div>' +
      "</div>" +
      '<div id="rv-error" class="alert alert--error" hidden></div></form>';

    var body = UI.openModal({
      titulo: "Nueva reserva",
      cuerpo: cuerpo,
      ancho: true,
      acciones: [
        { texto: "Cancelar", clase: "btn--ghost" },
        {
          texto: "Confirmar reserva",
          clase: "btn--primary",
          onClick: function (b) {
            var error = UI.$("#rv-error", b);
            var res = Store.crearReserva({
              aulaId: a.id,
              fecha: UI.$("#rv-fecha", b).value,
              horaInicio: UI.$("#rv-ini", b).value,
              horaFin: UI.$("#rv-fin", b).value,
              asunto: UI.$("#rv-asunto", b).value,
              asignatura: UI.$("#rv-asignatura", b).value,
              asistentes: UI.$("#rv-asistentes", b).value,
              observaciones: UI.$("#rv-obs", b).value
            });

            if (!res.ok) {
              error.textContent = res.error;
              error.hidden = false;
              return false; // mantiene el modal abierto
            }

            UI.toast(res.pendiente ? "Solicitud enviada" : "Reserva confirmada",
                     a.nombre + " · " + Utils.fechaCorta(res.reserva.fecha) + " " +
                     Utils.hora(res.reserva.horaInicio) + "–" + Utils.hora(res.reserva.horaFin),
                     res.pendiente ? "warn" : "ok");
            if (onDone) onDone();
            return true;
          }
        }
      ]
    });

    // La hora de fin siempre por delante de la de inicio
    UI.$("#rv-ini", body).addEventListener("change", function () {
      var fin = UI.$("#rv-fin", body);
      if (Number(fin.value) <= Number(this.value)) fin.value = String(Number(this.value) + 1);
    });
  }

  /* --- Vista ------------------------------------------------------------ */
  Views.reservar = {
    titulo: "Buscar y reservar",
    subtitulo: "Filtra por edificio, aforo o equipamiento y comprueba la disponibilidad real.",
    preparar: preparar,

    render: function (root) {
      if (!f.fecha || f.fecha < Utils.hoy()) f.fecha = Utils.hoy();

      root.innerHTML =
        '<div class="stack fade-in">' +
          '<section class="card">' +
            '<div class="card__head"><h3>' + UI.icon("buscar", 16) + " Criterios de búsqueda</h3>" +
              '<span class="pill pill--soft spacer" id="rs-resumen"></span></div>' +
            '<div class="card__body stack">' +
              '<div class="filters">' +
                '<div class="field"><label class="field-label" for="fl-texto">Buscar</label>' +
                  '<input type="search" id="fl-texto" placeholder="Aula 120, CT-2…" value="' + Utils.esc(f.texto) + '"></div>' +
                '<div class="field"><label class="field-label" for="fl-fecha">Fecha</label>' +
                  '<input type="date" id="fl-fecha" value="' + f.fecha + '" min="' + Utils.hoy() + '"></div>' +
                '<div class="field"><label class="field-label" for="fl-ini">Desde</label>' +
                  '<select id="fl-ini">' + UI.horaOptions(f.hIni, Store.HORA_INICIO, Store.HORA_FIN - 1) + "</select></div>" +
                '<div class="field"><label class="field-label" for="fl-fin">Hasta</label>' +
                  '<select id="fl-fin">' + UI.horaOptions(f.hFin, Store.HORA_INICIO + 1, Store.HORA_FIN) + "</select></div>" +
                '<div class="field"><label class="field-label" for="fl-edificio">Edificio</label>' +
                  '<select id="fl-edificio">' + UI.options(Store.EDIFICIOS, f.edificio, "Todos") + "</select></div>" +
                '<div class="field"><label class="field-label" for="fl-tipo">Tipo de espacio</label>' +
                  '<select id="fl-tipo">' + UI.options(Store.TIPOS, f.tipo, "Todos") + "</select></div>" +
                '<div class="field"><label class="field-label" for="fl-cap">Aforo mínimo</label>' +
                  '<input type="number" id="fl-cap" min="0" step="5" placeholder="0" value="' + Utils.esc(f.capacidad) + '"></div>' +
              "</div>" +

              '<div><div class="field-label">Equipamiento necesario</div>' +
                '<div class="chips">' +
                  Store.EQUIPAMIENTO.map(function (e) {
                    return '<button type="button" class="chip' + (f.equipamiento.indexOf(e) !== -1 ? " is-on" : "") +
                           '" data-equipo="' + Utils.esc(e) + '">' + Utils.esc(e) + "</button>";
                  }).join("") +
                "</div></div>" +

              '<div class="row">' +
                '<label class="check"><input type="checkbox" id="fl-libres"' + (f.soloLibres ? " checked" : "") +
                  "> Mostrar solo espacios libres en esa franja</label>" +
                '<button class="btn btn--ghost btn--sm spacer" id="fl-reset">Limpiar filtros</button>' +
              "</div>" +
            "</div>" +
          "</section>" +

          '<section id="rs-resultados"></section>' +
        "</div>";

      var resultados = UI.$("#rs-resultados", root);

      function leerFiltros() {
        f.texto = UI.$("#fl-texto", root).value;
        f.fecha = UI.$("#fl-fecha", root).value || Utils.hoy();
        f.hIni = Number(UI.$("#fl-ini", root).value);
        f.hFin = Number(UI.$("#fl-fin", root).value);
        if (f.hFin <= f.hIni) { f.hFin = f.hIni + 1; UI.$("#fl-fin", root).value = String(f.hFin); }
        f.edificio = UI.$("#fl-edificio", root).value;
        f.tipo = UI.$("#fl-tipo", root).value;
        f.capacidad = UI.$("#fl-cap", root).value;
        f.soloLibres = UI.$("#fl-libres", root).checked;
      }

      function pintar() {
        var lista = Store.buscarAulas(f);
        var total = lista.length;
        var paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
        if (f.pagina > paginas) f.pagina = paginas;
        var pagina = lista.slice((f.pagina - 1) * POR_PAGINA, f.pagina * POR_PAGINA);

        UI.$("#rs-resumen", root).textContent =
          Utils.fechaCorta(f.fecha) + " · " + Utils.hora(f.hIni) + "–" + Utils.hora(f.hFin);

        resultados.innerHTML = total
          ? '<div class="grid grid--rooms">' + pagina.map(tarjetaAula).join("") + "</div>" +
            '<div class="card" style="margin-top:16px">' + UI.pager(f.pagina, paginas, total, "espacios") + "</div>"
          : '<div class="card">' + UI.vacio("Ningún espacio coincide",
              "Prueba a ampliar la franja horaria, reducir el aforo mínimo o quitar filtros de equipamiento.") + "</div>";
      }

      /* --- Eventos de los filtros --- */
      ["fl-texto", "fl-fecha", "fl-ini", "fl-fin", "fl-edificio", "fl-tipo", "fl-cap", "fl-libres"].forEach(function (id) {
        var el = UI.$("#" + id, root);
        var evento = (el.tagName === "INPUT" && (el.type === "text" || el.type === "search" || el.type === "number"))
          ? "input" : "change";
        el.addEventListener(evento, function () { leerFiltros(); f.pagina = 1; pintar(); });
      });

      UI.on(root, "click", "[data-equipo]", function (ev, chip) {
        var e = chip.getAttribute("data-equipo");
        var i = f.equipamiento.indexOf(e);
        if (i === -1) f.equipamiento.push(e); else f.equipamiento.splice(i, 1);
        chip.classList.toggle("is-on");
        f.pagina = 1;
        pintar();
      });

      UI.$("#fl-reset", root).addEventListener("click", function () {
        f.texto = ""; f.edificio = ""; f.tipo = ""; f.capacidad = "";
        f.equipamiento = []; f.soloLibres = true; f.pagina = 1;
        Views.reservar.render(root);
      });

      /* --- Eventos de los resultados --- */
      UI.on(resultados, "click", "[data-reservar]", function (ev, btn) {
        abrirReserva(Number(btn.getAttribute("data-reservar")), function () { pintar(); App.refrescarBadges(); });
      });
      UI.on(resultados, "click", "[data-ver]", function (ev, btn) {
        verHorario(Number(btn.getAttribute("data-ver")));
      });
      UI.on(resultados, "click", "[data-page]", function (ev, btn) {
        if (btn.disabled) return;
        f.pagina = Number(btn.getAttribute("data-page"));
        pintar();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });

      pintar();
    },

    // Reutilizado por el calendario
    abrirReserva: abrirReserva
  };
})(window);
