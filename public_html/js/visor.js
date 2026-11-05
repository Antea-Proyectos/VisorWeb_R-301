"use strict";

// ============================================================
// CONFIGURACIÓN
// ============================================================
// Color por tramos de velocidad (km/h). Cualquier otra velocidad se pinta en gris.
// (la etiqueta de la leyenda se escribe sola a partir de "desde" y "hasta": 10–40, 50…)
const GRUPOS_VELOCIDAD = [
    { desde: 10,  hasta: 40,  color: "#7b2cbf" },
    { desde: 50,  hasta: 50,  color: "#0284c7" },
    { desde: 60,  hasta: 70,  color: "#0d9488" },
    { desde: 80,  hasta: 80,  color: "#ca8a04" },
    { desde: 90,  hasta: 90,  color: "#ea580c" },
    { desde: 100, hasta: 110, color: "#dc2626" },
    { desde: 120, hasta: 120, color: "#991b1b" }
];
const etiquetaGrupo = g => g.desde === g.hasta ? String(g.desde) : `${g.desde}–${g.hasta}`;
const COLOR_OTRO = "#6b7280";

function colorVelocidad(v) {
    const grupo = GRUPOS_VELOCIDAD.find(g => v !== null && v >= g.desde && v <= g.hasta);
    return grupo ? grupo.color : COLOR_OTRO;
}

// Posición de cada dato dentro de cada señal de senales_visor.js
// (mismo orden que CAMPOS_VISOR en EjecutarTN-ITS)
const LON = 0, LAT = 1, ID = 2, VIA = 3, PK = 4, CODIGO = 5, LADO = 6,
      ZONA = 7, CARACT_GENERAL = 8, CARACT_PARTICULAR = 9, AMBITO = 10, FUERA = 11;

const SIN_VIA = "__sin_via__";

// ============================================================
// UTILIDADES
// ============================================================
// Misma lógica que obtener_velocidad() de modificaciones_entreJSON.py:
// "R-301_120" -> 120, "R-301_40-cajF" -> 40
function obtenerVelocidad(codigo) {
    if (!codigo) return null;
    const partes = String(codigo).split("_");
    if (partes.length < 2) return null;
    const v = parseInt(partes[1].split("-")[0], 10);
    return isNaN(v) ? null : v;
}

function texto(valor) {
    if (valor === null || valor === undefined || valor === "") return GN("SIN_DATO");
    return String(valor).replace(/[&<>"]/g, c =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

// PK en formato kilómetro+metros: 37 -> "37+000", 76.094 -> "76+094", -3.419 -> "-3+419"
function formatoPK(pk) {
    if (pk === null || pk === undefined || pk === "") return GN("SIN_DATO");
    const n = Number(pk);
    if (isNaN(n)) return texto(pk);
    const signo = n < 0 ? "-" : "";
    const metrosTotales = Math.round(Math.abs(n) * 1000);
    const km = Math.floor(metrosTotales / 1000);
    const metros = metrosTotales % 1000;
    return `${signo}${km}+${String(metros).padStart(3, "0")}`;
}

function leerNumero(valor) {
    if (valor === "") return null;
    const n = parseFloat(String(valor).replace(",", "."));
    return isNaN(n) ? null : n;
}

// ============================================================
// TEXTOS DE LA PÁGINA (desde GlobalNames.js)
// ============================================================
document.title = GN("TITULO_PAGINA");
document.querySelectorAll("[data-gn]").forEach(el => { el.textContent = GN(el.dataset.gn); });
document.querySelectorAll("[data-gn-placeholder]").forEach(el => { el.placeholder = GN(el.dataset.gnPlaceholder); });

const aviso = document.getElementById("cargando");
function mostrarAviso(mensaje, esError) {
    aviso.textContent = mensaje;
    aviso.classList.toggle("error", !!esError);
    aviso.classList.remove("oculto");
}

// ============================================================
// COMPROBAR QUE EXISTEN LOS DATOS
// ============================================================
if (typeof DATOS_VISOR === "undefined") {
    mostrarAviso(GN("ERROR_SIN_DATOS"), true);
    throw new Error("DATOS_VISOR no definido");
}
if (typeof L === "undefined") {
    mostrarAviso(GN("ERROR_SIN_LEAFLET"), true);
    throw new Error("Leaflet no cargado");
}

document.getElementById("fecha-json").textContent = GN("FECHA_JSON", { fecha: DATOS_VISOR.fecha });

// ============================================================
// MAPA
// ============================================================
const mapa = L.map("mapa", { preferCanvas: true }).setView([40.2, -3.7], 6);

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: GN("ATRIBUCION_MAPA")
}).addTo(mapa);

// Agrupa los puntos cercanos; a partir del zoom 12 se ven todos sueltos
const grupo = L.markerClusterGroup({
    chunkedLoading: true,
    disableClusteringAtZoom: 12,
    showCoverageOnHover: false,
    maxClusterRadius: 50,
    // Al pinchar un grupo NO se abre "en araña": siempre se hace zoom (ver más abajo)
    spiderfyOnMaxZoom: false,
    zoomToBoundsOnClick: false,
    chunkProgress: (procesados, total) => {
        if (procesados >= total) aviso.classList.add("oculto");
    }
});
mapa.addLayer(grupo);

// Pinchar un grupo: encuadrar el mapa en las señales de ese grupo
// (si están lejos entre sí, se ven todas; si están juntas, se acerca hasta verlas sueltas)
grupo.on("clusterclick", e => {
    const limites = e.layer.getBounds();
    let zoom = Math.min(mapa.getBoundsZoom(limites, false, L.point(80, 80)), 17);
    if (zoom <= mapa.getZoom()) zoom = mapa.getZoom() + 1;
    mapa.setView(limites.getCenter(), zoom);
});

// Las señales fuera de España van en una capa aparte, SIN agrupar, para que se vean siempre
const capaFuera = L.layerGroup().addTo(mapa);

// ============================================================
// SEÑALES: un punto por señal, creado una sola vez
// ============================================================
function ficha(s, velocidad) {
    return `<div class="ficha">
        <h3><span class="senal">${velocidad ?? GN("VELOCIDAD_DESCONOCIDA")}</span>${GN("FICHA_TITULO", { id: texto(s[ID]) })}</h3>
        ${s[FUERA] === 1 ? `<p class="alerta">${GN("FICHA_ALERTA_FUERA")}</p>` : ""}
        <table>
            <tr><td>${GN("FICHA_CODIGO")}</td><td>${texto(s[CODIGO])}</td></tr>
            <tr><td>${GN("FICHA_VIA")}</td><td>${texto(s[VIA])}</td></tr>
            <tr><td>${GN("FICHA_PK")}</td><td>${formatoPK(s[PK])}</td></tr>
            <tr><td>${GN("FICHA_ZONA")}</td><td>${texto(s[ZONA])}</td></tr>
            <tr><td>${GN("FICHA_MARGEN")}</td><td>${texto(s[LADO])}</td></tr>
            <tr><td>${GN("FICHA_CARACT_GENERAL")}</td><td>${texto(s[CARACT_GENERAL])}</td></tr>
            <tr><td>${GN("FICHA_CARACT_PARTICULAR")}</td><td>${texto(s[CARACT_PARTICULAR])}</td></tr>
            <tr><td>${GN("FICHA_AMBITO")}</td><td>${texto(s[AMBITO])}</td></tr>
        </table>
    </div>`;
}

// Señales de bicis: el visor las ignora por completo (no se pintan ni se cuentan en ningún sitio).
// Se descarta cualquier señal cuyo código o características contengan "bici" (p. ej. BICIS_R-301_20, "Carril bici").
const esBici = s => [s[CODIGO], s[CARACT_GENERAL], s[CARACT_PARTICULAR]]
    .some(x => x && String(x).toLowerCase().includes("bici"));
const numBicis = DATOS_VISOR.senales.filter(esBici).length;
const totalSinBicis = DATOS_VISOR.total_json - numBicis;

const senales = DATOS_VISOR.senales.filter(s => !esBici(s)).map(s => {
    const velocidad = obtenerVelocidad(s[CODIGO]);
    const fuera = s[FUERA] === 1;
    const punto = L.circleMarker([s[LAT], s[LON]], {
        radius: fuera ? 8 : 6,
        color: fuera ? "#000000" : "#ffffff",
        weight: fuera ? 3 : 1,
        fillColor: colorVelocidad(velocidad),
        fillOpacity: 0.95
    });
    punto.bindPopup(() => ficha(s, velocidad));
    return { datos: s, velocidad: velocidad, fuera: fuera, punto: punto };
});

let seleccion = senales;   // señales que se están mostrando ahora

// ============================================================
// PANEL: opciones de los filtros, leyenda y resumen
// ============================================================
const selVia = document.getElementById("filtro-via");
const selVelocidad = document.getElementById("filtro-velocidad");
const inDesde = document.getElementById("filtro-pk-desde");
const inHasta = document.getElementById("filtro-pk-hasta");
const contador = document.getElementById("contador");
const chkFuera = document.getElementById("filtro-fuera");

// Vías (ordenadas: A-2 antes que A-10)
const conteoVias = {};
let sinVia = 0, sinPK = 0;
senales.forEach(o => {
    const via = o.datos[VIA];
    if (via) conteoVias[via] = (conteoVias[via] || 0) + 1; else sinVia++;
    if (o.datos[PK] === null || o.datos[PK] === undefined) sinPK++;
});
const vias = Object.keys(conteoVias).sort((a, b) => a.localeCompare(b, "es", { numeric: true }));
selVia.innerHTML = `<option value="">${GN("OPCION_TODAS")}</option>`
    + (sinVia ? `<option value="${SIN_VIA}">${GN("OPCION_SIN_VIA")}</option>` : "")
    + vias.map(v => `<option value="${texto(v)}">${texto(v)}</option>`).join("");

// Debajo del desplegable: cuántas señales tiene la vía elegida
const infoVia = document.getElementById("info-via");
function mostrarInfoVia() {
    const via = selVia.value;
    if (!via) { infoVia.textContent = ""; return; }
    const n = via === SIN_VIA ? sinVia : conteoVias[via];
    infoVia.textContent = GN(n === 1 ? "INFO_VIA_UNA" : "INFO_VIA_VARIAS", { n: Number(n).toLocaleString("es-ES") });
}
selVia.addEventListener("change", mostrarInfoVia);

// Velocidades presentes en los datos
const velocidades = [...new Set(senales.map(o => o.velocidad).filter(v => v !== null))].sort((a, b) => a - b);
selVelocidad.innerHTML = `<option value="">${GN("OPCION_TODAS")}</option>`
    + velocidades.map(v => `<option value="${v}">${GN("OPCION_VELOCIDAD", { v: v })}</option>`).join("");

// Leyenda
document.getElementById("leyenda").innerHTML =
    GRUPOS_VELOCIDAD.map(g => `<span><i class="punto" style="background:${g.color}"></i>${etiquetaGrupo(g)}</span>`).join("")
    + `<span class="leyenda-fuera"><i class="punto borde"></i>${GN("LEYENDA_FUERA_ESPANA")}</span>`;

// Resumen
const fmt = n => Number(n).toLocaleString("es-ES");
document.getElementById("resumen").innerHTML = `
    <div class="dato">${GN("RESUMEN_TOTAL")} <b>${fmt(totalSinBicis)}</b></div>
    <div class="dato aviso">${GN("RESUMEN_SIN_VIA")} <b>${fmt(sinVia)}</b></div>
    <div class="dato aviso">${GN("RESUMEN_SIN_PK")} <b>${fmt(sinPK)}</b></div>
    <div class="dato aviso">${GN("RESUMEN_FUERA_ESPANA")} <b>${fmt(senales.filter(o => o.fuera).length)}</b></div>
    <div class="dato aviso">${GN("RESUMEN_SIN_COORD")} <b>${fmt(DATOS_VISOR.sin_coordenadas)}</b></div>`;

// ============================================================
// FILTROS
// ============================================================
function aplicarFiltros() {
    const via = selVia.value;
    const vel = selVelocidad.value === "" ? null : parseInt(selVelocidad.value, 10);
    const desde = leerNumero(inDesde.value);
    const hasta = leerNumero(inHasta.value);
    const soloFuera = chkFuera.checked;

    seleccion = senales.filter(o => {
        const s = o.datos;
        if (via === SIN_VIA && s[VIA]) return false;
        if (via && via !== SIN_VIA && s[VIA] !== via) return false;
        if (vel !== null && o.velocidad !== vel) return false;
        if (soloFuera && !o.fuera) return false;
        if (desde !== null || hasta !== null) {
            if (s[PK] === null || s[PK] === undefined) return false;
            if (desde !== null && s[PK] < desde) return false;
            if (hasta !== null && s[PK] > hasta) return false;
        }
        return true;
    });

    grupo.clearLayers();
    capaFuera.clearLayers();
    grupo.addLayers(seleccion.filter(o => !o.fuera).map(o => o.punto));
    seleccion.filter(o => o.fuera).forEach(o => capaFuera.addLayer(o.punto));
    contador.textContent = GN("CONTADOR", { n: fmt(seleccion.length), total: fmt(senales.length) });

    // Si se ha filtrado algo, encuadrar el mapa en lo seleccionado
    const hayFiltro = via || vel !== null || desde !== null || hasta !== null || soloFuera;
    if (hayFiltro && seleccion.length) {
        mapa.fitBounds(L.latLngBounds(seleccion.map(o => [o.datos[LAT], o.datos[LON]])),
                       { padding: [30, 30], maxZoom: 14 });
    }
}

function limpiarFiltros() {
    selVia.value = "";
    selVelocidad.value = "";
    inDesde.value = "";
    inHasta.value = "";
    chkFuera.checked = false;
    mostrarInfoVia();
    aplicarFiltros();
    mapa.setView([40.2, -3.7], 6);
}

document.getElementById("btn-aplicar").addEventListener("click", aplicarFiltros);
document.getElementById("btn-limpiar").addEventListener("click", limpiarFiltros);
[inDesde, inHasta].forEach(el => el.addEventListener("keydown", e => {
    if (e.key === "Enter") aplicarFiltros();
}));

// ============================================================
// BUSCAR POR ID
// ============================================================
function buscarId() {
    const mensaje = document.getElementById("mensaje-busqueda");
    const id = leerNumero(document.getElementById("buscar-id").value);
    if (id === null) { mensaje.textContent = GN("BUSCAR_SIN_ID"); return; }

    const encontrada = senales.find(o => Number(o.datos[ID]) === id);
    if (!encontrada) { mensaje.textContent = GN("BUSCAR_NO_EXISTE", { id: id }); return; }

    if (encontrada.fuera && capaFuera.hasLayer(encontrada.punto)) {
        mensaje.textContent = "";
        mapa.setView(encontrada.punto.getLatLng(), 14);
        encontrada.punto.openPopup();
        return;
    }
    if (!grupo.hasLayer(encontrada.punto)) {
        mensaje.textContent = GN("BUSCAR_OCULTA", { id: id });
        return;
    }
    mensaje.textContent = "";
    grupo.zoomToShowLayer(encontrada.punto, () => encontrada.punto.openPopup());
}
document.getElementById("btn-buscar").addEventListener("click", buscarId);
document.getElementById("buscar-id").addEventListener("keydown", e => {
    if (e.key === "Enter") buscarId();
});

// ============================================================
// EXPORTAR SELECCIÓN A CSV (separador ; para Excel en español)
// ============================================================
function exportarCSV() {
    const cabecera = GlobalNames.CSV_CABECERA;
    const celda = v => {
        if (v === null || v === undefined) return "";
        const t = String(v);
        return /[;"\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
    };
    const filas = seleccion.map(o => {
        const s = o.datos;
        return [s[ID], s[VIA], s[PK], s[CODIGO], o.velocidad, s[LADO], s[ZONA],
                s[CARACT_GENERAL], s[CARACT_PARTICULAR], s[AMBITO], o.fuera ? GN("CSV_SI") : GN("CSV_NO"), s[LAT], s[LON]]
            .map(celda).join(";");
    });
    const csv = "﻿" + cabecera.join(";") + "\n" + filas.join("\n");
    const enlace = document.createElement("a");
    enlace.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    enlace.download = GN("CSV_NOMBRE_ARCHIVO", { fecha: DATOS_VISOR.fecha });
    enlace.click();
    URL.revokeObjectURL(enlace.href);
}
document.getElementById("btn-exportar").addEventListener("click", exportarCSV);

// ============================================================
// ARRANQUE: pintar todas las señales
// ============================================================
aplicarFiltros();
