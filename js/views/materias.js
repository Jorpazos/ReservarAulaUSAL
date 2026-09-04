/* =========================================================================
   PANTALLA 9 · MATERIAS Y HORARIOS  (administrador / conserjería)
   Plan de Ingeniería en Informática: qué aula tiene cada materia en cada
   turno. Es la información que consulta el Panel de Alumnos.
   ========================================================================= */
(function (global) {
  "use strict";
  var Views = global.Views = global.Views || {};

  var filtro = { texto: "", anio: "", turno: "" };
  var DIAS_LABORABLES = [1, 2, 3, 4, 5, 6];

  /* --- Alta y edición de una comisión ---------------------------------- */
  function formulario(materia, turnoId, cursada, onSave) {
    var turno = Store.TURNOS[turnoId];
    var c = cursada || {
      aulaId: Store.aulas()[0].id, dias: [1], horaInicio: turno.hIni,
      horaFin: turno.hIni + 2, docente: "", comision: materia.anio + turno.sigla
    };

    // Aulas agrupadas por pabellón
    var grupos = {};
    Store.aulas().forEach(function (a) { (grupos[a.pabellon] = grupos[a.pabellon] || []).push(a); });
    var selectAulas = Object.keys(grupos).map(function (p) {
      return '<optgroup label="' + Utils.esc(p) + '">' +
        grupos[p].map(function (a) {
          return '<option value="' + a.id + '"' + (a.id === c.aulaId ? " selected" : "") + ">" +
                 Utils.esc(a.nombre) + " · " + (a.piso === 0 ? "PB" : "piso " + a.piso) +
                 " · " + a.capacidad + " plazas</option>";
        }).join("") + "</optgroup>";
    }).join("");

    var cuerpo =
      '<div class="alert alert--info"><strong>' + Utils.esc(materia.nombre) + "</strong> · " +
        materia.anio + "º año · turno " + turno.nombre.toLowerCase() +
        " (" + turno.rango + ")</div>" +
      '<form novalidate><div class="form-grid">' +
        '<div class="field span-2"><label for="cu-aula">Aula asignada</label>' +
          '<select id="cu-aula">' + selectAulas + "</select></div>" +
        '<div class="field span-2"><div class="field-label">Días de cursada</div><div class="chips">' +
          DIAS_LABORABLES.map(function (d) {
            return '<button type="button" class="chip' + (c.dias.indexOf(d) !== -1 ? " is-on" : "") +
                   '" data-dia="' + d + '">' + Utils.capital(Utils.DIAS[d]) + "</button>";
          }).join("") + "</div></div>" +
        '<div class="field"><label for="cu-ini">Hora de inicio</label>' +
          '<select id="cu-ini">' + UI.horaOptions(c.horaInicio, turno.hIni, turno.hFin - 1) + "</select></div>" +
        '<div class="field"><label for="cu-fin">Hora de fin</label>' +
          '<select id="cu-fin">' + UI.horaOptions(c.horaFin, turno.hIni + 1, turno.hFin) + "</select></div>" +
        '<div class="field"><label for="cu-docente">Docente a cargo</label>' +
          '<input type="text" id="cu-docente" value="' + Utils.esc(c.docente) + '" placeholder="Ing. Roberto Díaz"></div>' +
        '<div class="field"><label for="cu-comision">Comisión</label>' +
          '<input type="text" id="cu-comision" value="' + Utils.esc(c.comision) + '" placeholder="' +
          materia.anio + turno.sigla + '"></div>' +
      "</div><div id=\"cu-error\" class=\"alert alert--error\" hidden></div></form>";

    var acciones = [{ texto: "Cancelar", clase: "btn--ghost" }];

    if (cursada) {
      acciones.push({
        texto: "Quitar comisión", clase: "btn--danger",
        onClick: function () {
          Store.eliminarCursada(cursada.id);
          UI.toast("Comisión eliminada", materia.nombre + " · turno " + turno.nombre.toLowerCase(), "warn");
          onSave();
        }
      });
    }

    acciones.push({
      texto: cursada ? "Guardar cambios" : "Crear comisión",
      clase: "btn--primary",
      onClick: function (b) {
        var err = UI.$("#cu-error", b);
        var res = Store.guardarCursada(cursada ? cursada.id : null, {
          materiaId: materia.id,
          turno: turnoId,
          aulaId: UI.$("#cu-aula", b).value,
          dias: UI.$$(".chip.is-on", b).map(function (x) { return x.getAttribute("data-dia"); }),
          horaInicio: UI.$("#cu-ini", b).value,
          horaFin: UI.$("#cu-fin", b).value,
          docente: UI.$("#cu-docente", b).value,
          comision: UI.$("#cu-comision", b).value
        });

        if (!res.ok) { err.textContent = res.error; err.hidden = false; return false; }

        UI.toast(cursada ? "Comisión actualizada" : "Comisión creada",
                 materia.nombre + " · " + Store.nombreAula(res.cursada.aulaId), "ok");
        onSave();
        return true;
      }
    });

    var body = UI.openModal({
      titulo: cursada ? "Editar comisión" : "Nueva comisión",
      cuerpo: cuerpo,
      ancho: true,
      acciones: acciones
    });

    UI.on(body, "click", "[data-dia]", function (ev, chip) { chip.classList.toggle("is-on"); });
  }

  /* --- Celda de la tabla por turno -------------------------------------- */
  function celda(materia, turnoId) {
    var c = Store.cursadaDe(materia.id, turnoId);
    if (!c) {
      return '<td><button class="btn btn--sm btn--ghost" data-nueva="' + materia.id + "|" + turnoId +
             '">' + UI.icon("mas", 14) + " Asignar</button></td>";
    }
    var a = Store.aula(c.aulaId);
    return "<td>" +
      '<button class="btn btn--sm btn--outline" data-editar="' + c.id + '" style="width:100%;justify-content:flex-start">' +
        "<span style=\"text-align:left\"><strong>" + Utils.esc(a ? a.nombre : "—") + "</strong>" +
        '<span class="cell-sub">' + (a ? Utils.esc(a.pabellon) + " · " + (a.piso === 0 ? "PB" : "piso " + a.piso) : "") +
        "</span>" +
        '<span class="cell-sub">' + Utils.diasCorto(c.dias) + " · " + Utils.hora(c.horaInicio) +
        "–" + Utils.hora(c.horaFin) + "</span></span>" +
      "</button></td>";
  }

  Views.materias = {
    titulo: "Materias y horarios",
    subtitulo: "Plan de Ingeniería en Informática. El aula que asignes acá es la que ve el alumno.",
    roles: ["admin", "gestor"],

    render: function (root) {
      root.innerHTML =
        '<div class="stack fade-in">' +
          '<div class="alert alert--info mb-0">' +
            "Cada materia puede tener una comisión por turno. Pulsá una celda para cambiar el aula, " +
            "los días o el horario; el <strong>Panel de Alumnos</strong> refleja el cambio al instante." +
          "</div>" +
          '<section class="card">' +
            '<div class="card__head"><h3>' + UI.icon("lista", 16) + " Plan de estudios</h3>" +
              '<div class="spacer row">' +
                '<input type="search" id="ma-buscar" placeholder="Buscar materia…" style="width:210px" value="' + Utils.esc(filtro.texto) + '">' +
                '<select id="ma-anio" style="width:150px">' +
                  UI.options([1, 2, 3, 4, 5].map(function (a) { return { valor: a, texto: a + "º año" }; }),
                             filtro.anio, "Todos los años") + "</select>" +
                '<select id="ma-turno" style="width:170px">' +
                  UI.options(Object.keys(Store.TURNOS).map(function (t) {
                    return { valor: t, texto: "Se dicta en " + Store.TURNOS[t].nombre.toLowerCase() };
                  }), filtro.turno, "Todos los turnos") + "</select>" +
              "</div>" +
            "</div>" +
            '<div class="table-wrap" id="ma-tabla"></div>' +
          "</section>" +
        "</div>";

      var tabla = UI.$("#ma-tabla", root);

      function pintar() {
        var lista = Store.materias().filter(function (m) {
          if (filtro.anio && String(m.anio) !== String(filtro.anio)) return false;
          if (filtro.turno && !Store.cursadaDe(m.id, filtro.turno)) return false;
          if (filtro.texto && Utils.norm(m.nombre).indexOf(Utils.norm(filtro.texto)) === -1) return false;
          return true;
        });

        tabla.innerHTML = lista.length
          ? '<table class="data"><thead><tr><th>Materia</th><th>Año</th><th>Régimen</th>' +
            "<th>Mañana</th><th>Tarde</th><th>Noche</th></tr></thead><tbody>" +
            lista.map(function (m) {
              return "<tr>" +
                '<td class="cell-strong">' + Utils.esc(m.nombre) + "</td>" +
                '<td class="nowrap">' + m.anio + "º</td>" +
                "<td>" + (m.tipo === "A" ? '<span class="pill pill--info">Anual</span>'
                        : m.tipo === "C" ? '<span class="pill pill--soft">Cuatrimestral</span>'
                        : '<span class="muted">—</span>') + "</td>" +
                celda(m, "manana") + celda(m, "tarde") + celda(m, "noche") +
              "</tr>";
            }).join("") + "</tbody></table>"
          : UI.vacio("Sin resultados", "Ninguna materia coincide con los filtros aplicados.");
      }

      UI.$("#ma-buscar", root).addEventListener("input", function () { filtro.texto = this.value; pintar(); });
      UI.$("#ma-anio", root).addEventListener("change", function () { filtro.anio = this.value; pintar(); });
      UI.$("#ma-turno", root).addEventListener("change", function () { filtro.turno = this.value; pintar(); });

      UI.on(tabla, "click", "[data-editar]", function (ev, b) {
        var c = Store.cursada(Number(b.getAttribute("data-editar")));
        formulario(Store.materia(c.materiaId), c.turno, c, pintar);
      });

      UI.on(tabla, "click", "[data-nueva]", function (ev, b) {
        var partes = b.getAttribute("data-nueva").split("|");
        formulario(Store.materia(Number(partes[0])), partes[1], null, pintar);
      });

      pintar();
    }
  };
})(window);
