/* =========================================================================
   PANTALLA 8 · CATÁLOGO DE ESPACIOS  (administrador / conserjería)
   Alta y mantenimiento de las 200 aulas y los 3 Centros Tecnológicos.
   ========================================================================= */
(function (global) {
  "use strict";
  var Views = global.Views = global.Views || {};

  var POR_PAGINA = 15;
  var filtro = { texto: "", edificio: "", tipo: "", pagina: 1 };

  function formulario(aula, onSave) {
    var esNueva = !aula;
    var a = aula || {
      codigo: "", nombre: "", edificio: Store.EDIFICIOS[0], planta: 0,
      tipo: "Aula", capacidad: 40, equipamiento: [], requiereAutorizacion: false, activa: true, nota: ""
    };

    var cuerpo =
      '<form novalidate><div class="form-grid">' +
        '<div class="field"><label for="au-nombre">Nombre del espacio</label>' +
          '<input type="text" id="au-nombre" value="' + Utils.esc(a.nombre) + '" placeholder="Aula 201"></div>' +
        '<div class="field"><label for="au-codigo">Código</label>' +
          '<input type="text" id="au-codigo" value="' + Utils.esc(a.codigo) + '" placeholder="A-201"></div>' +
        '<div class="field"><label for="au-edificio">Edificio</label>' +
          '<select id="au-edificio">' + UI.options(Store.EDIFICIOS, a.edificio) + "</select></div>" +
        '<div class="field"><label for="au-planta">Planta</label>' +
          '<input type="number" id="au-planta" min="0" max="10" value="' + a.planta + '"></div>' +
        '<div class="field"><label for="au-tipo">Tipo</label>' +
          '<select id="au-tipo">' + UI.options(Store.TIPOS, a.tipo) + "</select></div>" +
        '<div class="field"><label for="au-cap">Aforo</label>' +
          '<input type="number" id="au-cap" min="1" max="600" value="' + a.capacidad + '"></div>' +
        '<div class="field span-2"><div class="field-label">Equipamiento</div><div class="chips">' +
          Store.EQUIPAMIENTO.map(function (e) {
            return '<button type="button" class="chip' + (a.equipamiento.indexOf(e) !== -1 ? " is-on" : "") +
                   '" data-equipo="' + Utils.esc(e) + '">' + Utils.esc(e) + "</button>";
          }).join("") + "</div></div>" +
        '<div class="field span-2"><label for="au-nota">Nota interna (opcional)</label>' +
          '<input type="text" id="au-nota" value="' + Utils.esc(a.nota) + '" placeholder="Equipamiento especial, restricciones…"></div>' +
        '<div class="field"><label class="check"><input type="checkbox" id="au-auth"' +
          (a.requiereAutorizacion ? " checked" : "") + "> Requiere autorización</label></div>" +
        '<div class="field"><label class="check"><input type="checkbox" id="au-activa"' +
          (a.activa ? " checked" : "") + "> Disponible para reservar</label></div>" +
      "</div><div id=\"au-error\" class=\"alert alert--error\" hidden></div></form>";

    var body = UI.openModal({
      titulo: esNueva ? "Nuevo espacio" : "Editar " + a.nombre,
      cuerpo: cuerpo,
      ancho: true,
      acciones: [
        { texto: "Cancelar", clase: "btn--ghost" },
        {
          texto: esNueva ? "Crear espacio" : "Guardar cambios",
          clase: "btn--primary",
          onClick: function (b) {
            var err = UI.$("#au-error", b);
            var datos = {
              nombre: UI.$("#au-nombre", b).value.trim(),
              codigo: UI.$("#au-codigo", b).value.trim(),
              edificio: UI.$("#au-edificio", b).value,
              planta: UI.$("#au-planta", b).value,
              tipo: UI.$("#au-tipo", b).value,
              capacidad: UI.$("#au-cap", b).value,
              equipamiento: UI.$$(".chip.is-on", b).map(function (c) { return c.getAttribute("data-equipo"); }),
              requiereAutorizacion: UI.$("#au-auth", b).checked,
              activa: UI.$("#au-activa", b).checked,
              nota: UI.$("#au-nota", b).value
            };

            if (!datos.nombre || !datos.codigo) {
              err.textContent = "El nombre y el código del espacio son obligatorios.";
              err.hidden = false;
              return false;
            }
            if (Number(datos.capacidad) < 1) {
              err.textContent = "El aforo debe ser al menos de 1 persona.";
              err.hidden = false;
              return false;
            }

            var res = esNueva ? Store.crearAula(datos) : Store.actualizarAula(a.id, datos);
            if (!res.ok) { err.textContent = res.error; err.hidden = false; return false; }

            UI.toast(esNueva ? "Espacio creado" : "Espacio actualizado", datos.nombre, "ok");
            onSave();
            return true;
          }
        }
      ]
    });

    UI.on(body, "click", "[data-equipo]", function (ev, chip) { chip.classList.toggle("is-on"); });
  }

  Views.aulas = {
    titulo: "Catálogo de espacios",
    subtitulo: "200 aulas docentes y 3 Centros Tecnológicos: dos salas de PC y el laboratorio de brazo robótico.",
    roles: ["admin", "gestor"],

    render: function (root) {
      root.innerHTML =
        '<div class="stack fade-in">' +
          '<section class="card">' +
            '<div class="card__head"><h3>' + UI.icon("edificio", 16) + " Espacios registrados</h3>" +
              '<div class="spacer row">' +
                '<input type="search" id="au-buscar" placeholder="Buscar aula…" style="width:190px" value="' + Utils.esc(filtro.texto) + '">' +
                '<select id="au-f-edificio" style="width:180px">' + UI.options(Store.EDIFICIOS, filtro.edificio, "Todos los edificios") + "</select>" +
                '<select id="au-f-tipo" style="width:190px">' + UI.options(Store.TIPOS, filtro.tipo, "Todos los tipos") + "</select>" +
                (Store.esRol("admin") ? '<button class="btn btn--sm btn--primary" id="au-nueva">' + UI.icon("mas", 15) + " Nuevo espacio</button>" : "") +
              "</div>" +
            "</div>" +
            '<div class="table-wrap" id="au-tabla"></div>' +
            '<div id="au-pager"></div>' +
          "</section>" +
        "</div>";

      var tabla = UI.$("#au-tabla", root);
      var pagerEl = UI.$("#au-pager", root);
      var esAdmin = Store.esRol("admin");

      function pintar() {
        var lista = Store.aulas().filter(function (a) {
          if (filtro.edificio && a.edificio !== filtro.edificio) return false;
          if (filtro.tipo && a.tipo !== filtro.tipo) return false;
          if (filtro.texto) {
            var blob = Utils.norm(a.nombre + " " + a.codigo + " " + a.edificio + " " + a.tipo);
            if (blob.indexOf(Utils.norm(filtro.texto)) === -1) return false;
          }
          return true;
        });

        var paginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
        if (filtro.pagina > paginas) filtro.pagina = paginas;
        var pagina = lista.slice((filtro.pagina - 1) * POR_PAGINA, filtro.pagina * POR_PAGINA);
        var hoy = Utils.hoy();

        tabla.innerHTML = lista.length
          ? '<table class="data"><thead><tr><th>Espacio</th><th>Ubicación</th><th>Tipo</th>' +
            "<th>Aforo</th><th>Equipamiento</th><th>Reservas futuras</th><th>Estado</th>" +
            "<th class=\"col-actions\">Acciones</th></tr></thead><tbody>" +
            pagina.map(function (a) {
              var futuras = Store.reservasActivas().filter(function (r) {
                return r.aulaId === a.id && r.fecha >= hoy;
              }).length;
              return "<tr>" +
                '<td class="cell-strong">' + Utils.esc(a.nombre) + '<span class="cell-sub">' + Utils.esc(a.codigo) + "</span></td>" +
                "<td>" + Utils.esc(a.edificio) +
                  '<span class="cell-sub">' + (a.planta === 0 ? "Planta baja" : "Planta " + a.planta) + "</span></td>" +
                "<td>" + Utils.esc(a.tipo) +
                  (a.requiereAutorizacion ? '<span class="cell-sub">requiere autorización</span>' : "") + "</td>" +
                '<td class="tnum">' + a.capacidad + "</td>" +
                "<td>" + a.equipamiento.slice(0, 2).map(function (e) { return '<span class="tag">' + Utils.esc(e) + "</span>"; }).join("") +
                  (a.equipamiento.length > 2 ? '<span class="tag">+' + (a.equipamiento.length - 2) + "</span>" : "") + "</td>" +
                '<td class="tnum">' + futuras + "</td>" +
                "<td>" + (a.activa ? '<span class="pill pill--ok">Operativa</span>' : '<span class="pill pill--warn">Fuera de servicio</span>') + "</td>" +
                '<td class="col-actions">' +
                  '<button class="btn btn--sm btn--ghost" data-cal="' + a.id + '">Horario</button>' +
                  '<button class="btn btn--sm btn--ghost" data-editar="' + a.id + '">Editar</button>' +
                  (esAdmin ? '<button class="btn btn--sm btn--danger" data-borrar="' + a.id + '">Eliminar</button>' : "") +
                "</td></tr>";
            }).join("") + "</tbody></table>"
          : UI.vacio("Sin resultados", "Ningún espacio coincide con los filtros aplicados.");

        pagerEl.innerHTML = lista.length ? UI.pager(filtro.pagina, paginas, lista.length, "espacios") : "";
      }

      UI.$("#au-buscar", root).addEventListener("input", function () { filtro.texto = this.value; filtro.pagina = 1; pintar(); });
      UI.$("#au-f-edificio", root).addEventListener("change", function () { filtro.edificio = this.value; filtro.pagina = 1; pintar(); });
      UI.$("#au-f-tipo", root).addEventListener("change", function () { filtro.tipo = this.value; filtro.pagina = 1; pintar(); });
      if (esAdmin) UI.$("#au-nueva", root).addEventListener("click", function () { formulario(null, pintar); });

      UI.on(pagerEl, "click", "[data-page]", function (ev, b) {
        if (b.disabled) return;
        filtro.pagina = Number(b.getAttribute("data-page"));
        pintar();
      });

      UI.on(tabla, "click", "[data-editar]", function (ev, b) {
        formulario(Store.aula(Number(b.getAttribute("data-editar"))), pintar);
      });
      UI.on(tabla, "click", "[data-cal]", function (ev, b) {
        App.ir("calendario", { aulaId: Number(b.getAttribute("data-cal")) });
      });
      UI.on(tabla, "click", "[data-borrar]", function (ev, b) {
        var a = Store.aula(Number(b.getAttribute("data-borrar")));
        UI.confirmar({
          titulo: "Eliminar espacio",
          texto: "Se eliminará " + a.nombre + " del catálogo.",
          aviso: "Si tiene reservas activas no podrá eliminarse; desactívalo en su lugar.",
          aceptar: "Eliminar",
          onOk: function () {
            var res = Store.eliminarAula(a.id);
            UI.toast(res.ok ? "Espacio eliminado" : "No se pudo eliminar", res.ok ? a.nombre : res.error, res.ok ? "ok" : "err");
            pintar();
          }
        });
      });

      pintar();
    }
  };
})(window);
