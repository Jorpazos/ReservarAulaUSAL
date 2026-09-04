/* =========================================================================
   PANTALLA 1 · PANEL DE ALUMNOS  (pública, pensada para el celular)
   El alumno elige materia y turno, y ve en grande el aula, el piso y el
   pabellón donde cursa. Se abre al iniciar la aplicación salvo que se
   desactive esa opción desde el pie de la pantalla.
   ========================================================================= */
(function (global) {
  "use strict";
  var Views = global.Views = global.Views || {};

  var PREF = "reservaaulas.alumno";
  var seleccion = { materiaId: null, turno: "manana" };

  function cargarPreferencia() {
    try {
      var raw = localStorage.getItem(PREF);
      if (raw) {
        var p = JSON.parse(raw);
        if (p && Store.materia(p.materiaId)) seleccion.materiaId = p.materiaId;
        if (p && Store.TURNOS[p.turno]) seleccion.turno = p.turno;
      }
    } catch (e) { /* sin preferencia guardada */ }
  }

  function guardarPreferencia() {
    try { localStorage.setItem(PREF, JSON.stringify(seleccion)); } catch (e) { /* modo privado */ }
  }

  /** <select> de materias agrupadas por año, filtrado por texto. */
  function opcionesMaterias(texto) {
    var filtro = Utils.norm(texto || "");
    var porAnio = {};

    Store.materias().forEach(function (m) {
      if (filtro && Utils.norm(m.nombre).indexOf(filtro) === -1) return;
      (porAnio[m.anio] = porAnio[m.anio] || []).push(m);
    });

    var anios = Object.keys(porAnio);
    if (!anios.length) return '<option value="">Ninguna materia coincide</option>';

    return anios.map(function (anio) {
      var ordinal = ["", "Primer", "Segundo", "Tercer", "Cuarto", "Quinto"][anio];
      return '<optgroup label="' + ordinal + ' año">' +
        porAnio[anio].map(function (m) {
          return '<option value="' + m.id + '"' + (m.id === seleccion.materiaId ? " selected" : "") + ">" +
                 Utils.esc(m.nombre) + "</option>";
        }).join("") + "</optgroup>";
    }).join("");
  }

  /** Tarjeta grande con el aula, el pabellón y el piso. */
  function tarjetaAula(cursada) {
    var aula = Store.aula(cursada.aulaId);
    var turno = Store.TURNOS[cursada.turno];
    var piso = aula.piso === 0 ? "PB" : aula.piso;

    return '<section class="aula-card">' +
      '<span class="aula-card__label">Cursás en</span>' +
      '<div class="aula-card__aula">' + Utils.esc(aula.nombre) + "</div>" +
      '<div class="aula-card__tipo">' + Utils.esc(aula.tipo) + " · aforo " + aula.capacidad + " · " +
        Utils.esc(aula.codigo) + "</div>" +

      '<div class="aula-card__ubi">' +
        "<div class=\"ubi\"><span>Pabellón</span><strong>" +
          Utils.esc(aula.pabellon.replace("Pabellón ", "")) + "</strong></div>" +
        "<div class=\"ubi\"><span>Piso</span><strong>" + piso + "</strong>" +
          (aula.piso === 0 ? "<em>planta baja</em>" : "") + "</div>" +
      "</div>" +

      '<div class="aula-card__linea">' +
        "<strong>" + Utils.diasTexto(cursada.dias) + "</strong>" +
        "<span>·</span><strong>" + Utils.hora(cursada.horaInicio) + " a " + Utils.hora(cursada.horaFin) + "</strong>" +
        '<span class="pill pill--brand">Turno ' + turno.nombre.toLowerCase() + "</span>" +
        '<span class="pill pill--soft">Comisión ' + Utils.esc(cursada.comision) + "</span>" +
      "</div>" +

      '<p class="aula-card__nota">' + Utils.esc(cursada.docente) +
        (aula.nota ? " · " + Utils.esc(aula.nota) : "") + "</p>" +
    "</section>";
  }

  function tarjetaSinTurno(materia, disponibles) {
    return '<section class="card" style="margin-top:18px">' +
      '<div class="card__body">' +
        '<div class="alert alert--warn mb-0">' +
          "<strong>" + Utils.esc(materia.nombre) + "</strong> no se dicta en el turno " +
          Store.TURNOS[seleccion.turno].nombre.toLowerCase() + "." +
        "</div>" +
        (disponibles.length
          ? '<p class="small muted" style="margin:14px 0 8px">Turnos en los que sí se dicta:</p>' +
            '<div class="otros-turnos">' + disponibles.map(botonOtroTurno).join("") + "</div>"
          : '<p class="small muted mb-0" style="margin-top:12px">Todavía no hay comisiones cargadas para esta materia.</p>') +
      "</div>" +
    "</section>";
  }

  function botonOtroTurno(c) {
    var aula = Store.aula(c.aulaId);
    return '<button class="otro-turno" data-turno="' + c.turno + '">' +
      "<strong>" + Store.TURNOS[c.turno].nombre + "</strong>" +
      "<span>" + Utils.esc(aula.nombre) + " · " + Utils.esc(aula.pabellon) +
        (aula.piso === 0 ? " · PB" : " · piso " + aula.piso) +
        "<br>" + Utils.diasCorto(c.dias) + " · " + Utils.hora(c.horaInicio) + " a " + Utils.hora(c.horaFin) +
      "</span>" +
    "</button>";
  }

  Views.alumnos = {
    render: function () {
      var root = UI.$("#alu-main");
      cargarPreferencia();

      var materias = Store.materias();
      if (!seleccion.materiaId || !Store.materia(seleccion.materiaId)) {
        seleccion.materiaId = materias.length ? materias[0].id : null;
      }

      root.innerHTML =
        '<div class="alu__hero">' +
          "<h1>¿En qué aula tengo clase?</h1>" +
          "<p>Elegí tu materia y el turno para ver el aula, el piso y el pabellón.</p>" +
        "</div>" +

        '<section class="card">' +
          '<div class="card__body stack">' +
            '<div class="field mb-0">' +
              '<label class="field-label" for="alu-buscar">Materia</label>' +
              '<input type="search" id="alu-buscar" placeholder="Buscar materia… (p. ej. Programación)">' +
            "</div>" +
            '<select id="alu-materia" aria-label="Materia">' + opcionesMaterias("") + "</select>" +
            "<div>" +
              '<div class="field-label">Turno</div>' +
              '<div class="turnos" id="alu-turnos">' +
                Object.keys(Store.TURNOS).map(function (t) {
                  var turno = Store.TURNOS[t];
                  return '<button type="button" class="turno' + (t === seleccion.turno ? " is-on" : "") +
                         '" data-turno="' + t + '">' + turno.nombre +
                         "<small>" + turno.rango + "</small></button>";
                }).join("") +
              "</div>" +
            "</div>" +
          "</div>" +
        "</section>" +

        '<div id="alu-resultado"></div>';

      var buscar = UI.$("#alu-buscar", root);
      var select = UI.$("#alu-materia", root);
      var resultado = UI.$("#alu-resultado", root);

      function pintarResultado() {
        var materia = Store.materia(seleccion.materiaId);
        if (!materia) {
          resultado.innerHTML = "";
          return;
        }

        var cursada = Store.cursadaDe(materia.id, seleccion.turno);
        var otras = Store.cursadasDe(materia.id).filter(function (c) { return c.turno !== seleccion.turno; });

        resultado.innerHTML = (cursada ? tarjetaAula(cursada) : tarjetaSinTurno(materia, otras)) +
          (cursada && otras.length
            ? '<p class="small muted" style="margin:20px 0 8px">La misma materia en otros turnos:</p>' +
              '<div class="otros-turnos">' + otras.map(botonOtroTurno).join("") + "</div>"
            : "");
      }

      buscar.addEventListener("input", function () {
        select.innerHTML = opcionesMaterias(this.value);
        // Si la materia elegida ya no está en la lista filtrada, toma la primera.
        if (select.value) {
          seleccion.materiaId = Number(select.value);
          guardarPreferencia();
          pintarResultado();
        }
      });

      select.addEventListener("change", function () {
        seleccion.materiaId = Number(this.value);
        guardarPreferencia();
        pintarResultado();
      });

      UI.on(root, "click", "[data-turno]", function (ev, btn) {
        seleccion.turno = btn.getAttribute("data-turno");
        UI.$$(".turno", root).forEach(function (t) {
          t.classList.toggle("is-on", t.getAttribute("data-turno") === seleccion.turno);
        });
        guardarPreferencia();
        pintarResultado();
        if (btn.classList.contains("otro-turno")) {
          resultado.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });

      pintarResultado();
    }
  };
})(window);
