/* =========================================================================
   PANTALLA 7 · GESTIÓN DE USUARIOS  (solo administrador)
   Alta, edición, activación y baja de las cuentas que pueden reservar.
   ========================================================================= */
(function (global) {
  "use strict";
  var Views = global.Views = global.Views || {};

  var filtro = { texto: "", rol: "", soloActivos: false };

  function formulario(usuario, onSave) {
    var esNuevo = !usuario;
    var u = usuario || { usuario: "", nombre: "", email: "", rol: "docente", departamento: "", activo: true };

    var cuerpo =
      '<form novalidate><div class="form-grid">' +
        '<div class="field span-2"><label for="us-nombre">Nombre y apellidos</label>' +
          '<input type="text" id="us-nombre" value="' + Utils.esc(u.nombre) + '" placeholder="p. ej. María García"></div>' +
        '<div class="field"><label for="us-usuario">Usuario de acceso</label>' +
          '<input type="text" id="us-usuario" value="' + Utils.esc(u.usuario) + '" placeholder="mgarcia"></div>' +
        '<div class="field"><label for="us-email">Correo institucional</label>' +
          '<input type="email" id="us-email" value="' + Utils.esc(u.email) + '" placeholder="mgarcia@usal.edu.ar"></div>' +
        '<div class="field"><label for="us-rol">Perfil</label><select id="us-rol">' +
          UI.options(Object.keys(Store.ROLES).map(function (k) {
            return { valor: k, texto: Store.ROLES[k].nombre };
          }), u.rol) + "</select></div>" +
        '<div class="field"><label for="us-depto">Departamento o servicio</label>' +
          '<input type="text" id="us-depto" value="' + Utils.esc(u.departamento) + '" placeholder="Informática y Automática"></div>' +
        '<div class="field span-2"><label for="us-pass">' +
          (esNuevo ? "Contraseña inicial" : "Nueva contraseña (dejar vacío para no cambiarla)") + "</label>" +
          '<input type="text" id="us-pass" placeholder="' + (esNuevo ? "mínimo 6 caracteres" : "sin cambios") + '"></div>' +
        '<div class="field span-2"><label class="check"><input type="checkbox" id="us-activo"' +
          (u.activo ? " checked" : "") + "> Cuenta activa (puede iniciar sesión y reservar)</label></div>" +
      "</div>" +
      '<p class="hint" id="us-rol-desc">' + Utils.esc(Store.ROLES[u.rol].desc) + "</p>" +
      '<div id="us-error" class="alert alert--error" hidden></div></form>';

    var body = UI.openModal({
      titulo: esNuevo ? "Nuevo usuario" : "Editar usuario",
      cuerpo: cuerpo,
      ancho: true,
      acciones: [
        { texto: "Cancelar", clase: "btn--ghost" },
        {
          texto: esNuevo ? "Crear usuario" : "Guardar cambios",
          clase: "btn--primary",
          onClick: function (b) {
            var err = UI.$("#us-error", b);
            var datos = {
              nombre: UI.$("#us-nombre", b).value.trim(),
              usuario: UI.$("#us-usuario", b).value.trim(),
              email: UI.$("#us-email", b).value.trim(),
              rol: UI.$("#us-rol", b).value,
              departamento: UI.$("#us-depto", b).value,
              pass: UI.$("#us-pass", b).value,
              activo: UI.$("#us-activo", b).checked
            };

            function fallar(msg) { err.textContent = msg; err.hidden = false; return false; }

            if (!datos.nombre) return fallar("Indica el nombre completo del usuario.");
            if (!/^[a-zA-Z0-9._-]{3,}$/.test(datos.usuario)) return fallar("El usuario debe tener al menos 3 caracteres (letras, números, punto, guion).");
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email)) return fallar("El correo electrónico no tiene un formato válido.");
            if (esNuevo && datos.pass.length < 6) return fallar("La contraseña inicial debe tener al menos 6 caracteres.");
            if (!esNuevo && datos.pass && datos.pass.length < 6) return fallar("La nueva contraseña debe tener al menos 6 caracteres.");

            var res = esNuevo ? Store.crearUsuario(datos) : Store.actualizarUsuario(usuario.id, datos);
            if (!res.ok) return fallar(res.error);

            UI.toast(esNuevo ? "Usuario creado" : "Usuario actualizado",
                     datos.nombre + " · " + Store.ROLES[datos.rol].nombre, "ok");
            onSave();
            return true;
          }
        }
      ]
    });

    UI.$("#us-rol", body).addEventListener("change", function () {
      UI.$("#us-rol-desc", body).textContent = Store.ROLES[this.value].desc;
    });
  }

  Views.usuarios = {
    titulo: "Gestión de usuarios",
    subtitulo: "Crea las cuentas del profesorado, conserjería y delegación que podrán reservar espacios.",
    roles: ["admin"],

    render: function (root) {
      root.innerHTML =
        '<div class="stack fade-in">' +
          '<section class="grid grid--stats" id="us-stats"></section>' +
          '<section class="card">' +
            '<div class="card__head"><h3>' + UI.icon("usuarios", 16) + " Cuentas del sistema</h3>" +
              '<div class="spacer row">' +
                '<input type="search" id="us-buscar" placeholder="Buscar por nombre, usuario o correo…" style="width:250px" value="' + Utils.esc(filtro.texto) + '">' +
                '<select id="us-filtro-rol" style="width:170px">' +
                  UI.options(Object.keys(Store.ROLES).map(function (k) {
                    return { valor: k, texto: Store.ROLES[k].nombre };
                  }), filtro.rol, "Todos los perfiles") + "</select>" +
                '<label class="check nowrap"><input type="checkbox" id="us-activos"' + (filtro.soloActivos ? " checked" : "") + "> Solo activos</label>" +
                '<button class="btn btn--sm btn--primary" id="us-nuevo">' + UI.icon("mas", 15) + " Nuevo usuario</button>" +
              "</div>" +
            "</div>" +
            '<div class="table-wrap" id="us-tabla"></div>' +
          "</section>" +
        "</div>";

      var tabla = UI.$("#us-tabla", root);

      function pintar() {
        var todos = Store.usuarios();

        // Métricas por perfil
        UI.$("#us-stats", root).innerHTML = Object.keys(Store.ROLES).map(function (k) {
          var n = todos.filter(function (u) { return u.rol === k && u.activo; }).length;
          return '<article class="stat"><div class="stat__top">' +
            '<span class="stat__label">' + Store.ROLES[k].nombre + "</span>" +
            '<span class="stat__icon">' + UI.icon("usuarios", 18) + "</span></div>" +
            '<div class="stat__value tnum">' + n + "</div>" +
            '<div class="stat__foot">' + Store.ROLES[k].desc + "</div></article>";
        }).join("");

        var lista = todos.filter(function (u) {
          if (filtro.rol && u.rol !== filtro.rol) return false;
          if (filtro.soloActivos && !u.activo) return false;
          if (filtro.texto) {
            var blob = Utils.norm(u.nombre + " " + u.usuario + " " + u.email + " " + u.departamento);
            if (blob.indexOf(Utils.norm(filtro.texto)) === -1) return false;
          }
          return true;
        });

        var actual = Store.usuarioActual();

        tabla.innerHTML = lista.length
          ? '<table class="data"><thead><tr><th>Usuario</th><th>Acceso</th><th>Perfil</th>' +
            "<th>Departamento</th><th>Reservas</th><th>Estado</th><th class=\"col-actions\">Acciones</th></tr></thead><tbody>" +
            lista.map(function (u) {
              var reservas = Store.reservasDe(u.id).filter(function (r) { return r.estado !== "cancelada"; }).length;
              return "<tr>" +
                '<td><div class="row" style="flex-wrap:nowrap;gap:10px">' +
                  '<span class="avatar" style="width:32px;height:32px;font-size:11.5px">' + Utils.iniciales(u.nombre) + "</span>" +
                  '<span class="cell-strong">' + Utils.esc(u.nombre) +
                  '<span class="cell-sub">' + Utils.esc(u.email) + "</span></span></div></td>" +
                "<td><code>" + Utils.esc(u.usuario) + "</code>" +
                  '<span class="cell-sub">alta ' + Utils.fechaCorta(u.creado) + "</span></td>" +
                "<td>" + UI.rolPill(u.rol) + "</td>" +
                "<td>" + Utils.esc(u.departamento || "—") + "</td>" +
                '<td class="tnum">' + reservas + "</td>" +
                "<td>" + (u.activo ? '<span class="pill pill--ok">Activa</span>' : '<span class="pill pill--soft">Desactivada</span>') + "</td>" +
                '<td class="col-actions">' +
                  '<button class="btn btn--sm btn--ghost" data-editar="' + u.id + '">Editar</button>' +
                  '<button class="btn btn--sm btn--ghost" data-toggle="' + u.id + '">' + (u.activo ? "Desactivar" : "Activar") + "</button>" +
                  (u.id === actual.id ? "" : '<button class="btn btn--sm btn--danger" data-borrar="' + u.id + '">Eliminar</button>') +
                "</td></tr>";
            }).join("") + "</tbody></table>"
          : UI.vacio("Sin resultados", "Ningún usuario coincide con los filtros aplicados.");
      }

      UI.$("#us-buscar", root).addEventListener("input", function () { filtro.texto = this.value; pintar(); });
      UI.$("#us-filtro-rol", root).addEventListener("change", function () { filtro.rol = this.value; pintar(); });
      UI.$("#us-activos", root).addEventListener("change", function () { filtro.soloActivos = this.checked; pintar(); });
      UI.$("#us-nuevo", root).addEventListener("click", function () { formulario(null, pintar); });

      UI.on(tabla, "click", "[data-editar]", function (ev, b) {
        formulario(Store.usuario(Number(b.getAttribute("data-editar"))), pintar);
      });

      UI.on(tabla, "click", "[data-toggle]", function (ev, b) {
        var u = Store.usuario(Number(b.getAttribute("data-toggle")));
        var res = Store.actualizarUsuario(u.id, {
          nombre: u.nombre, usuario: u.usuario, email: u.email, rol: u.rol,
          departamento: u.departamento, activo: !u.activo
        });
        if (res.ok) UI.toast(u.activo ? "Cuenta desactivada" : "Cuenta activada", u.nombre, u.activo ? "warn" : "ok");
        else UI.toast("Error", res.error, "err");
        pintar();
      });

      UI.on(tabla, "click", "[data-borrar]", function (ev, b) {
        var u = Store.usuario(Number(b.getAttribute("data-borrar")));
        UI.confirmar({
          titulo: "Eliminar usuario",
          texto: "Se eliminará la cuenta de " + u.nombre + ".",
          aviso: "Sus reservas activas quedarán canceladas y los espacios se liberarán.",
          aceptar: "Eliminar",
          onOk: function () {
            var res = Store.eliminarUsuario(u.id);
            UI.toast(res.ok ? "Usuario eliminado" : "No se pudo eliminar", res.ok ? u.nombre : res.error, res.ok ? "ok" : "err");
            pintar();
            App.refrescarBadges();
          }
        });
      });

      pintar();
    }
  };
})(window);
