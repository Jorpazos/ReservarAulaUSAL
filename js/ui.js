/* =========================================================================
   ui.js · Componentes de interfaz reutilizables
   Modal, avisos (toasts), confirmaciones, píldoras de estado, paginación
   e iconos SVG. Expone el objeto global UI.
   ========================================================================= */
(function (global) {
  "use strict";

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  /* --- Iconos (línea, 24x24) ------------------------------------------ */
  var ICONS = {
    panel:      '<path d="M3 13h8V3H3zM13 21h8V11h-8zM13 7h8V3h-8zM3 21h8v-4H3z"/>',
    buscar:     '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    calendario: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4M16 2v4M3 10h18"/>',
    lista:      '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    inbox:      '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5h13l3.5 7v5a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-5z"/>',
    usuarios:   '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9"/>',
    edificio:   '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 8h.01M15 8h.01M9 12h.01M15 12h.01M10 21v-4h4v4"/>',
    reloj:      '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    ok:         '<circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.5 2.5 4.5-5"/>',
    aviso:      '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    grupo:      '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>',
    robot:      '<rect x="4" y="8" width="16" height="12" rx="2"/><path d="M12 8V4M9 13h.01M15 13h.01M9 17h6M2 13h2M20 13h2"/>',
    mas:        '<path d="M12 5v14M5 12h14"/>',
    editar:     '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    borrar:     '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>',
    vacio:      '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M9 15h6"/>',
    flechaIzq:  '<path d="M15 18l-6-6 6-6"/>',
    flechaDer:  '<path d="M9 18l6-6-6-6"/>',
    descarga:   '<path d="M12 3v12M7 11l5 5 5-5M4 21h16"/>'
  };

  function icon(name, size) {
    var s = size || 18;
    return '<svg viewBox="0 0 24 24" width="' + s + '" height="' + s + '">' + (ICONS[name] || "") + "</svg>";
  }

  /* --- Avisos flotantes ------------------------------------------------ */
  function toast(titulo, texto, tipo) {
    var cont = $("#toasts");
    if (!cont) return;

    var el = document.createElement("div");
    el.className = "toast" + (tipo ? " toast--" + tipo : "");
    el.innerHTML = '<div>' +
      '<strong>' + Utils.esc(titulo) + "</strong>" +
      (texto ? "<span>" + Utils.esc(texto) + "</span>" : "") +
      "</div>";
    cont.appendChild(el);

    setTimeout(function () {
      el.classList.add("is-out");
      setTimeout(function () { el.remove(); }, 260);
    }, 3600);
  }

  /* --- Modal ----------------------------------------------------------- */
  var modalEl, modalBody, modalFoot, modalTitle, onCloseCb = null;

  function initModal() {
    modalEl = $("#modal");
    modalBody = $("#modal-body");
    modalFoot = $("#modal-foot");
    modalTitle = $("#modal-title");

    modalEl.addEventListener("click", function (ev) {
      if (ev.target.hasAttribute("data-close-modal") || ev.target.closest("[data-close-modal]")) closeModal();
    });
    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape" && !modalEl.hidden) closeModal();
    });
  }

  /**
   * openModal({ titulo, cuerpo, acciones:[{texto,clase,onClick,cerrar}], ancho, onClose })
   * Devuelve el elemento del cuerpo para engancharle eventos.
   */
  function openModal(opts) {
    modalTitle.textContent = opts.titulo || "";
    modalBody.innerHTML = opts.cuerpo || "";
    modalFoot.innerHTML = "";
    modalEl.classList.toggle("modal--wide", !!opts.ancho);
    onCloseCb = opts.onClose || null;

    (opts.acciones || []).forEach(function (a) {
      var b = document.createElement("button");
      b.className = "btn " + (a.clase || "btn--outline");
      b.textContent = a.texto;
      b.addEventListener("click", function () {
        var res = a.onClick ? a.onClick(modalBody) : true;
        if (a.cerrar !== false && res !== false) closeModal();
      });
      modalFoot.appendChild(b);
    });
    modalFoot.hidden = !(opts.acciones && opts.acciones.length);

    modalEl.hidden = false;
    var primero = modalBody.querySelector("input, select, textarea");
    if (primero) setTimeout(function () { primero.focus(); }, 40);
    return modalBody;
  }

  function closeModal() {
    if (!modalEl || modalEl.hidden) return;
    modalEl.hidden = true;
    modalBody.innerHTML = "";
    if (onCloseCb) { var cb = onCloseCb; onCloseCb = null; cb(); }
  }

  /** Confirmación con botón destructivo. */
  function confirmar(opts) {
    openModal({
      titulo: opts.titulo || "¿Confirmar acción?",
      cuerpo: '<p class="mb-0">' + Utils.esc(opts.texto || "") + "</p>" +
              (opts.aviso ? '<div class="alert alert--warn" style="margin-top:14px">' + Utils.esc(opts.aviso) + "</div>" : ""),
      acciones: [
        { texto: "Cancelar", clase: "btn--ghost" },
        { texto: opts.aceptar || "Aceptar", clase: opts.clase || "btn--danger", onClick: opts.onOk }
      ]
    });
  }

  /* --- Constructores de HTML ------------------------------------------- */
  function options(lista, seleccionado, placeholder) {
    var out = placeholder ? '<option value="">' + Utils.esc(placeholder) + "</option>" : "";
    lista.forEach(function (o) {
      var valor = (typeof o === "object") ? o.valor : o;
      var texto = (typeof o === "object") ? o.texto : o;
      out += '<option value="' + Utils.esc(valor) + '"' +
             (String(valor) === String(seleccionado) ? " selected" : "") + ">" +
             Utils.esc(texto) + "</option>";
    });
    return out;
  }

  /** Opciones de horas 08:00 … 21:00 */
  function horaOptions(seleccionada, desde, hasta) {
    var out = "";
    for (var h = (desde === undefined ? Store.HORA_INICIO : desde);
         h <= (hasta === undefined ? Store.HORA_FIN : hasta); h++) {
      out += '<option value="' + h + '"' + (Number(seleccionada) === h ? " selected" : "") + ">" +
             Utils.hora(h) + "</option>";
    }
    return out;
  }

  function estadoPill(estado) {
    var e = Store.ESTADOS[estado] || Store.ESTADOS.pendiente;
    return '<span class="pill ' + e.pill + '"><span class="pill__dot"></span>' + e.nombre + "</span>";
  }

  function rolPill(rol) {
    var r = Store.ROLES[rol];
    var clase = rol === "admin" ? "pill--brand" : rol === "gestor" ? "pill--info" :
                rol === "docente" ? "pill--soft" : "pill--warn";
    return '<span class="pill ' + clase + '">' + Utils.esc(r ? r.nombre : rol) + "</span>";
  }

  function vacio(titulo, texto) {
    return '<div class="empty">' + icon("vacio", 38) +
           "<strong>" + Utils.esc(titulo) + "</strong>" +
           '<p class="mb-0">' + Utils.esc(texto || "") + "</p></div>";
  }

  /**
   * Paginador simple. Devuelve HTML; los botones llevan data-page.
   */
  function pager(pagina, totalPaginas, totalItems, etiqueta) {
    if (totalPaginas <= 1) {
      return '<div class="pager"><span class="muted small">' +
             totalItems + " " + (etiqueta || "resultados") + "</span></div>";
    }
    var botones = "";
    var desde = Math.max(1, pagina - 2);
    var hasta = Math.min(totalPaginas, desde + 4);
    desde = Math.max(1, hasta - 4);

    if (desde > 1) botones += '<button class="pager__btn" data-page="1">1</button>' +
                              (desde > 2 ? '<span class="pager__btn" style="border:0;background:none">…</span>' : "");
    for (var p = desde; p <= hasta; p++) {
      botones += '<button class="pager__btn' + (p === pagina ? " is-on" : "") + '" data-page="' + p + '">' + p + "</button>";
    }
    if (hasta < totalPaginas) botones += (hasta < totalPaginas - 1 ? '<span class="pager__btn" style="border:0;background:none">…</span>' : "") +
                                         '<button class="pager__btn" data-page="' + totalPaginas + '">' + totalPaginas + "</button>";

    return '<div class="pager">' +
      '<span class="muted small">' + totalItems + " " + (etiqueta || "resultados") +
      " · página " + pagina + " de " + totalPaginas + "</span>" +
      '<div class="pager__pages">' +
        '<button class="pager__btn" data-page="' + (pagina - 1) + '"' + (pagina === 1 ? " disabled" : "") + ">‹</button>" +
        botones +
        '<button class="pager__btn" data-page="' + (pagina + 1) + '"' + (pagina === totalPaginas ? " disabled" : "") + ">›</button>" +
      "</div></div>";
  }

  /** Delegación de eventos cómoda: UI.on(contenedor, "click", ".sel", fn) */
  function on(root, evento, selector, handler) {
    root.addEventListener(evento, function (ev) {
      var t = ev.target.closest(selector);
      if (t && root.contains(t)) handler(ev, t);
    });
  }

  global.UI = {
    $: $, $$: $$,
    icon: icon,
    toast: toast,
    initModal: initModal,
    openModal: openModal,
    closeModal: closeModal,
    confirmar: confirmar,
    options: options,
    horaOptions: horaOptions,
    estadoPill: estadoPill,
    rolPill: rolPill,
    vacio: vacio,
    pager: pager,
    on: on
  };
})(window);
