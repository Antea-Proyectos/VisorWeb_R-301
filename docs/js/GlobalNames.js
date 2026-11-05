"use strict";

// ============================================================
// GlobalNames: TODOS los textos que se ven en el visor.
// Para cambiar un texto, cámbialo aquí y recarga la página (F5).
//
// Los textos con {llaves} llevan un dato que se rellena solo:
//   "Mostrando {n} de {total} señales" -> "Mostrando 22 de 90.430 señales"
// Puedes mover o quitar las {llaves}, pero no cambiar su nombre.
// ============================================================
const GlobalNames = {

    // ---------- Página y cabecera ----------
    TITULO_PAGINA:          "Visor R-301 · TN-ITS",
    TITULO_CABECERA:        "Visor de señales R-301",
    FECHA_JSON:             "JSON: {fecha}",
    FECHA_JSON_VACIA:       "JSON: —",
    CARGANDO:               "Cargando señales…",

    // ---------- Filtros ----------
    TITULO_FILTROS:         "Filtros",
    ETIQUETA_VIA:           "Vía",
    ETIQUETA_PK:            "PK",
    PK_DESDE:               "desde",
    PK_HASTA:               "hasta",
    ETIQUETA_VELOCIDAD:     "Velocidad",
    SOLO_FUERA_ESPANA:      "Solo fuera de España",
    OPCION_TODAS:           "Todas",
    OPCION_SIN_VIA:         "(sin vía)",
    OPCION_VELOCIDAD:       "{v} km/h",
    INFO_VIA_UNA:           "{n} señal en esta vía",
    INFO_VIA_VARIAS:        "{n} señales en esta vía",
    BOTON_APLICAR:          "Aplicar",
    BOTON_LIMPIAR:          "Limpiar",
    CONTADOR:               "Mostrando {n} de {total} señales",
    CONTADOR_VACIO:         "—",

    // ---------- Buscar por ID ----------
    TITULO_BUSCAR:          "Buscar por ID",
    BUSCAR_EJEMPLO:         "p. ej. 928031",
    BOTON_BUSCAR:           "Buscar",
    BUSCAR_SIN_ID:          "Escribe un ID.",
    BUSCAR_NO_EXISTE:       "No existe la señal {id} en este JSON.",
    BUSCAR_OCULTA:          "La señal {id} está oculta por los filtros. Pulsa \"Limpiar\".",

    // ---------- Leyenda ----------
    TITULO_LEYENDA:         "Leyenda (km/h)",
    LEYENDA_FUERA_ESPANA:   "Fuera de España (borde negro)",

    // ---------- Resumen ----------
    TITULO_RESUMEN:         "Resumen del JSON",
    RESUMEN_TOTAL:          "Señales en el JSON",
    RESUMEN_SIN_VIA:        "Sin vía",
    RESUMEN_SIN_PK:         "Sin PK",
    RESUMEN_FUERA_ESPANA:   "Fuera de España",
    RESUMEN_SIN_COORD:      "Sin coordenadas",

    // ---------- Ficha de la señal (al pinchar un punto) ----------
    FICHA_TITULO:           "Señal {id}",
    FICHA_ALERTA_FUERA:     "⚠ Coordenadas fuera de España",
    FICHA_CODIGO:           "Código",
    FICHA_VIA:              "Vía",
    FICHA_PK:               "PK",
    FICHA_ZONA:             "Zona",
    FICHA_MARGEN:           "Margen",
    FICHA_CARACT_GENERAL:   "Característica general",
    FICHA_CARACT_PARTICULAR:"Característica particular",
    FICHA_AMBITO:           "Ámbito",
    SIN_DATO:               "—",
    VELOCIDAD_DESCONOCIDA:  "?",

    // ---------- Exportar CSV ----------
    BOTON_EXPORTAR:         "Descargar selección (CSV)",
    CSV_NOMBRE_ARCHIVO:     "senales_R301_{fecha}.csv",
    CSV_CABECERA: ["id", "via", "pk", "codigo_senal", "velocidad", "margen", "zona",
                   "caract_general", "caract_particular", "ambito", "fuera_espana", "lat", "lon"],
    CSV_SI:                 "Sí",
    CSV_NO:                 "No",

    // ---------- Mapa ----------
    ATRIBUCION_MAPA:        "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a>",

    // ---------- Errores ----------
    ERROR_SIN_DATOS:        "No se encontró data/senales_visor.js. Ejecuta EjecutarTN-ITS para generarlo.",
    ERROR_SIN_LEAFLET:      "No se pudo cargar la librería del mapa (Leaflet). ¿Hay conexión a internet?"
};

// Devuelve el texto de GlobalNames con las {llaves} rellenadas.
// Ejemplo: GN("CONTADOR", { n: 22, total: "90.430" }) -> "Mostrando 22 de 90.430 señales"
function GN(clave, valores) {
    let resultado = GlobalNames[clave];
    if (resultado === undefined) return "[" + clave + "]";   // así se ve enseguida si falta una clave
    if (valores) {
        Object.keys(valores).forEach(k => {
            resultado = resultado.split("{" + k + "}").join(valores[k]);
        });
    }
    return resultado;
}
