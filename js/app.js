/* ========================================================= UTILIDADES */
const $ = s => document.querySelector(s);
const esc = t => String(t).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const plata = n => "$ " + n.toLocaleString("es-AR");
const curso = id => CURSOS.find(c => c.id === id);
const alumno = dni => ALUMNOS.find(a => a.dni === dni);
const alumnosDe = cursoId => ALUMNOS.filter(a => a.cursos.includes(cursoId));
const NOMBRE_ESTADO = {presente:"Presente", ausente:"Ausente", justificada:"Justificada"};
const ETIQUETA_CUOTA = {ok:"Al día", mora:"Cuota vencida", beca:"Becado"};

function porcentaje(fila){
  if (!fila || !fila.length) return 0;
  return Math.round(fila.filter(e => e === "presente").length / fila.length * 100);
}

/** Faltas seguidas contando desde la última clase hacia atrás. */
function ausenciasSeguidas(fila){
  let n = 0;
  for (let i = (fila || []).length - 1; i >= 0; i--){
    if (fila[i] === "ausente") n++; else break;
  }
  return n;
}

function asistenciaDeAlumno(dni){
  return ALUMNOS.find(a => a.dni === dni).cursos.map(id => ({
    curso: curso(id),
    fila: ASISTENCIA[id][dni],
    fechas: fechasDeClases(curso(id))
  }));
}

function enRiesgo(){
  const salida = [];
  CURSOS.forEach(c => {
    alumnosDe(c.id).forEach(al => {
      const faltas = ausenciasSeguidas(ASISTENCIA[c.id][al.dni]);
      if (faltas >= 2) salida.push({alumno: al, curso: c, faltas});
    });
  });
  return salida.sort((a, b) => b.faltas - a.faltas);
}

function cuotaDe(al){
  return al.cursos.reduce((t, id) => t + curso(id).cuota, 0);
}

function finanzas(){
  let cobrado = 0, deuda = 0, proyeccion = 0;
  ALUMNOS.forEach(al => {
    const mes = PAGOS[al.dni][0];                 // el período más reciente
    if (al.estado !== "beca") proyeccion += cuotaDe(al);
    if (mes.fecha === "Pendiente") deuda += mes.monto; else cobrado += mes.monto;
  });
  return {cobrado, deuda, proyeccion};
}

function asistenciaPromedio(cursoId){
  const filas = Object.values(ASISTENCIA[cursoId]);
  if (!filas.length) return 0;
  return Math.round(filas.reduce((t, f) => t + porcentaje(f), 0) / filas.length);
}

/* ============================================================ SESIÓN */
let sesion = null;     // {dni, rol, nombre}

const MENU = {
  alumno:   [["inicio","Inicio"],["asistencia","Asistencia"],["cuotas","Cuotas"],["perfil","Mi perfil"]],
  profesor: [["cursos","Mis cursos"],["tomar","Tomar asistencia"],["misalumnos","Alumnos"],["cobros","Cobros"]],
  admin:    [["panel","Panel"],["alumnosabm","Alumnos"],["cursosabm","Cursos"],["reportes","Reportes"],
             ["usuarios","Usuarios"],["sistema","Sistema"]]
};

function entrar(dni){
  const persona = PERSONAL[dni];
  const al = alumno(dni);
  if (persona)      sesion = {dni, rol: persona.rol, nombre: persona.nombre};
  else if (al)      sesion = {dni, rol: "alumno", nombre: al.nombre};
  else return;

  $("#nombreUsuario").innerHTML = esc(sesion.nombre) +
    `<span class="rol ${sesion.rol}">${sesion.rol}</span>`;
  $("#dniUsuario").textContent = sesion.rol === "alumno"
    ? "DNI " + sesion.dni
    : (sesion.rol === "profesor" ? "Profesor/a" : "Administración");

  $("#pestanas").innerHTML = MENU[sesion.rol]
    .map(([id, texto], i) => `<button class="${i === 0 ? "activa" : ""}" data-vista="${id}">${texto}</button>`)
    .join("");
  $("#pestanas").querySelectorAll("button").forEach(b => {
    b.addEventListener("click", () => mostrar(b.dataset.vista));
  });

  $("#pantallaIngreso").classList.add("oculto");
  $("#pantallaPortal").classList.remove("oculto");
  mostrar(MENU[sesion.rol][0][0]);
}

function salir(){
  sesion = null;
  $("#pantallaPortal").classList.add("oculto");
  $("#pantallaIngreso").classList.remove("oculto");
  $("#dni").value = ""; $("#clave").value = ""; $("#errorIngreso").textContent = "";
  window.scrollTo(0, 0);
}

function mostrar(vista){
  $("#pestanas").querySelectorAll("button").forEach(b => {
    b.classList.toggle("activa", b.dataset.vista === vista);
  });
  const pintar = VISTAS[vista];
  $("#contenido").innerHTML = pintar ? pintar() : "";
  window.scrollTo(0, 0);
}

/* Vuelve a dibujar la vista activa (después de tocar datos). */
function refrescar(){
  const activa = $("#pestanas button.activa");
  if (activa) mostrar(activa.dataset.vista);
}

/* ====================================================== VISTAS ALUMNO */
function vistaInicio(){
  const al = alumno(sesion.dni);
  const mios = asistenciaDeAlumno(al.dni);
  const principal = mios[0];
  const pct = porcentaje(principal.fila);
  const faltas = Math.max(...mios.map(m => ausenciasSeguidas(m.fila)));
  let h = "";

  if (faltas >= 2){
    h += `<div class="alerta"><b>Faltaste ${faltas} clases seguidas.</b>
      Escribinos por WhatsApp al 11 6998 6997 y vemos cómo recuperarlas: no queremos que pierdas el ritmo.</div>`;
  }
  if (al.estado === "mora"){
    h += `<div class="alerta"><b>Tenés la cuota de octubre sin pagar.</b>
      Podés abonar en recepción o por transferencia y avisarnos desde la solapa Cuotas.</div>`;
  }

  h += `<p class="titulo">Tu próxima clase</p>
    <div class="tarjeta">
      <h3>${esc(principal.curso.nombre)}</h3>
      <p class="meta">${esc(proximaClase(principal.curso))} &middot; ${esc(principal.curso.aula)}</p>
      <p style="margin:12px 0 0;font-size:14.5px">Clase ${principal.curso.dadas + 1} de ${principal.curso.total}
        &middot; ${esc(principal.curso.profesor && PERSONAL[principal.curso.profesor].nombre)}</p>
    </div>

    <p class="titulo">Cómo venís</p>
    <div class="grilla">
      <div class="tarjeta">
        <p class="meta">Asistencia en ${esc(principal.curso.nombre.replace("Taller de ",""))}</p>
        <p class="dato">${pct}% <small>de presentes</small></p>
        <div class="barra-prog"><i class="${pct < 70 ? "flojo" : ""}" style="width:${pct}%"></i></div>
        <p class="meta">Vas por la clase ${principal.curso.dadas} de ${principal.curso.total}</p>
      </div>
      <div class="tarjeta">
        <p class="meta">Estado de cuenta</p>
        <p class="dato chico" style="margin-top:12px"><span class="chip ${al.estado}">${ETIQUETA_CUOTA[al.estado]}</span></p>
        <p class="meta" style="margin-top:10px">${al.estado === "mora"
          ? "Octubre impago" : al.estado === "beca" ? "Sin cargo este ciclo" : "Última cuota paga al día"}</p>
      </div>
    </div>

    <p class="titulo">Mis cursos</p>`;

  mios.forEach(m => {
    const avance = Math.round(m.curso.dadas / m.curso.total * 100);
    h += `<div class="tarjeta">
      <h3>${esc(m.curso.nombre)}</h3>
      <p class="meta">${esc(m.curso.dia)} de ${esc(m.curso.horario)} &middot; ${esc(m.curso.aula)}</p>
      <p class="meta">${esc(PERSONAL[m.curso.profesor].nombre)}</p>
      <div class="barra-prog"><i style="width:${avance}%"></i></div>
      <p class="meta">Clase ${m.curso.dadas} de ${m.curso.total}</p>
    </div>`;
  });

  h += `<p class="titulo">Novedades del taller</p>`;
  AVISOS.forEach(([fecha, texto]) => {
    h += `<div class="tarjeta"><p class="meta">${esc(fecha)}</p>
      <p style="margin:6px 0 0;font-size:14.5px">${esc(texto)}</p></div>`;
  });
  return h;
}

function vistaAsistencia(){
  let h = "";
  asistenciaDeAlumno(sesion.dni).forEach(m => {
    const pct = porcentaje(m.fila);
    const seguidas = ausenciasSeguidas(m.fila);
    h += `<p class="titulo">${esc(m.curso.nombre)}</p>
      <div class="tarjeta">
        <p class="dato">${pct}% <small>de asistencia</small></p>
        <div class="barra-prog"><i class="${pct < 70 ? "flojo" : ""}" style="width:${pct}%"></i></div>
        <p class="meta">${m.fila.filter(e => e === "presente").length} presentes de ${m.fila.length} clases dadas
          ${seguidas >= 2 ? `&middot; <span class="chip mora">${seguidas} faltas seguidas</span>` : ""}</p>
        <ul class="lista" style="margin-top:14px">`;
    for (let i = m.fila.length - 1; i >= 0; i--){
      h += `<li><span class="punto ${m.fila[i]}"></span>
        <span class="fecha">${esc(m.fechas[i])}</span>
        <span class="texto">${NOMBRE_ESTADO[m.fila[i]]}</span></li>`;
    }
    h += `</ul></div>`;
  });
  h += `<div class="tarjeta quieta"><p class="meta">La asistencia se registra sola cuando apoyás el dedo
    en el lector al entrar. Si el lector no te reconoce, en recepción te la cargan con tu documento.
    ¿Ves algo mal? Avisá por WhatsApp al 11 6998 6997.</p></div>`;
  return h;
}

function vistaCuotas(){
  const al = alumno(sesion.dni);
  const pagos = PAGOS[al.dni];
  const total = cuotaDe(al);
  let h = `<p class="titulo">Estado de cuenta</p>
    <div class="tarjeta">
      <p><span class="chip ${al.estado}">${ETIQUETA_CUOTA[al.estado]}</span></p>
      <p class="dato" style="margin-top:14px">${plata(al.estado === "beca" ? 0 : total)}
        <small>${al.estado === "mora" ? "adeudado" : "por mes"}</small></p>
      <p class="meta">${al.estado === "mora" ? "Venció el 10/10/2026" : "Próximo vencimiento: 10/11/2026"}
        &middot; ${al.cursos.length} curso${al.cursos.length > 1 ? "s" : ""}</p>
      <button class="btn chico" style="margin-top:16px" onclick="avisarPago()">Ya pagué, avisar</button>
    </div>

    <p class="titulo">Mis pagos</p>
    <div class="tarjeta"><div class="scroll-x"><table>
      <thead><tr><th>Período</th><th>Monto</th><th>Medio</th><th class="num">Fecha</th></tr></thead><tbody>`;
  pagos.forEach(p => {
    h += `<tr><td>${esc(p.periodo)}</td><td class="nowrap">${plata(p.monto)}</td>
      <td>${esc(p.medio)}</td>
      <td class="num nowrap">${p.fecha === "Pendiente" ? '<span class="chip mora">Pendiente</span>' : esc(p.fecha)}</td></tr>`;
  });
  h += `</tbody></table></div></div>
    <div class="tarjeta quieta"><p class="meta">Podés pagar en efectivo en recepción o por transferencia.
      Los comprobantes quedan guardados acá para que los tengas a mano.</p></div>`;
  return h;
}

function vistaPerfil(){
  const al = alumno(sesion.dni);
  let h = `<p class="titulo">Mis datos</p>
    <div class="tarjeta">
      <dl class="datos">
        <dt>Nombre</dt><dd>${esc(al.nombre)}</dd>
        <dt>Documento</dt><dd>${esc(al.dni)}</dd>
        <dt>Nacimiento</dt><dd>${esc(al.nac)}</dd>
        <dt>Teléfono</dt><dd>${esc(al.tel)}</dd>
        <dt>Email</dt><dd>${esc(al.email)}</dd>
        <dt>Domicilio</dt><dd>${esc(al.dom)}</dd>
        <dt>Alumno desde</dt><dd>${esc(al.desde)}</dd>
        <dt>Huella</dt><dd><span class="chip ok">Registrada</span></dd>
      </dl>
      <button class="btn chico" style="margin-top:18px" onclick="demo('En el sistema real pedís el cambio y lo confirma la recepción.')">
        Pedir corrección de datos</button>
    </div>
    <p class="titulo">Cursos en los que estoy anotado</p>`;
  al.cursos.forEach(id => {
    const c = curso(id);
    h += `<div class="tarjeta"><h3>${esc(c.nombre)}</h3>
      <p class="meta">${esc(c.dia)} de ${esc(c.horario)} &middot; ${esc(c.aula)}</p>
      <p class="meta">${esc(PERSONAL[c.profesor].nombre)}</p></div>`;
  });
  return h;
}

/* ==================================================== VISTAS PROFESOR */
function misCursos(){
  return CURSOS.filter(c => c.profesor === sesion.dni);
}

function vistaCursosProfe(){
  const riesgo = enRiesgo().filter(r => r.curso.profesor === sesion.dni);
  let h = "";
  if (riesgo.length){
    h += `<div class="alerta"><b>${riesgo.length} alumno${riesgo.length > 1 ? "s" : ""} en riesgo de abandono.</b>
      ${riesgo.map(r => esc(r.alumno.nombre) + " (" + r.faltas + " faltas seguidas)").join(", ")}.
      Están en la solapa Alumnos con el teléfono para llamarlos.</div>`;
  }
  h += `<p class="titulo">Mis cursos</p>`;
  misCursos().forEach(c => {
    const pct = asistenciaPromedio(c.id);
    h += `<div class="tarjeta">
      <h3>${esc(c.nombre)}</h3>
      <p class="meta">${esc(c.dia)} de ${esc(c.horario)} &middot; ${esc(c.aula)}</p>
      <div class="grilla" style="margin-top:14px">
        <div><p class="meta">Alumnos</p><p class="dato chico">${alumnosDe(c.id).length}</p></div>
        <div><p class="meta">Asistencia promedio</p><p class="dato chico">${pct}%</p></div>
        <div><p class="meta">Avance</p><p class="dato chico">${c.dadas}<small> de ${c.total}</small></p></div>
      </div>
      <p class="meta" style="margin-top:12px">Próxima clase: ${esc(proximaClase(c))}</p>
    </div>`;
  });
  return h;
}

let tomaActual = null;   // {cursoId, estados:{dni:estado}}

function vistaTomar(){
  const cursos = misCursos();
  if (!tomaActual || !cursos.some(c => c.id === tomaActual.cursoId)){
    tomaActual = {cursoId: cursos[0].id, estados: {}};
    alumnosDe(cursos[0].id).forEach(a => tomaActual.estados[a.dni] = "presente");
  }
  const c = curso(tomaActual.cursoId);

  let h = `<p class="titulo">Tomar asistencia</p>
    <div class="tarjeta">
      <div class="form">
        <div class="ancho">
          <label for="selCurso">Curso</label>
          <select id="selCurso" onchange="cambiarCursoToma(this.value)">
            ${cursos.map(x => `<option value="${x.id}" ${x.id === c.id ? "selected" : ""}>${esc(x.nombre)}</option>`).join("")}
          </select>
        </div>
      </div>
      <p class="meta" style="margin-top:12px">Clase ${c.dadas + 1} de ${c.total} &middot; ${esc(proximaClase(c))}</p>
      <p class="meta">Los que apoyaron el dedo en el lector entran marcados como presentes. Tocá el botón para corregir.</p>
    </div>

    <div class="tarjeta">`;

  alumnosDe(c.id).forEach(a => {
    const estado = tomaActual.estados[a.dni];
    h += `<div class="pasada">
      <div class="nombre">${esc(a.nombre)}<small>DNI ${esc(a.dni)}</small></div>
      <button class="marca ${estado}" onclick="rotarMarca('${a.dni}')">${NOMBRE_ESTADO[estado]}</button>
    </div>`;
  });

  h += `</div>
    <button class="btn" onclick="guardarToma()">Guardar la asistencia de hoy</button>
    <div class="tarjeta quieta" style="margin-top:14px"><p class="meta">En el sistema real esta pantalla se va
      llenando sola a medida que los alumnos pasan el dedo por el lector. El profesor solo corrige lo que haga falta.</p></div>`;
  return h;
}

function cambiarCursoToma(cursoId){
  tomaActual = {cursoId, estados: {}};
  alumnosDe(cursoId).forEach(a => tomaActual.estados[a.dni] = "presente");
  refrescar();
}

function rotarMarca(dni){
  const orden = ["presente","ausente","justificada"];
  const actual = tomaActual.estados[dni];
  tomaActual.estados[dni] = orden[(orden.indexOf(actual) + 1) % orden.length];
  refrescar();
}

function guardarToma(){
  const c = curso(tomaActual.cursoId);
  Object.entries(tomaActual.estados).forEach(([dni, estado]) => {
    ASISTENCIA[c.id][dni].push(estado);
  });
  c.dadas++;
  const ausentes = Object.values(tomaActual.estados).filter(e => e === "ausente").length;
  tomaActual = null;
  refrescar();
  alert("Asistencia guardada: clase " + c.dadas + " de " + c.total + ", " + ausentes + " ausente(s).\n" +
        "Los alumnos ya la ven en su portal.");
}

function vistaMisAlumnos(){
  const cursos = misCursos();
  let h = `<p class="titulo">Alumnos de mis cursos</p>
    <input class="buscador" placeholder="Buscar por nombre o documento" oninput="filtrarTabla(this.value,'tablaProfe')">
    <div class="tarjeta"><div class="scroll-x"><table id="tablaProfe">
      <thead><tr><th>Alumno</th><th>Curso</th><th>Asistencia</th><th>Cuota</th><th class="num">Contacto</th></tr></thead><tbody>`;
  cursos.forEach(c => {
    alumnosDe(c.id).forEach(a => {
      const fila = ASISTENCIA[c.id][a.dni];
      const pct = porcentaje(fila);
      const faltas = ausenciasSeguidas(fila);
      h += `<tr>
        <td>${esc(a.nombre)}<br><span class="meta">DNI ${esc(a.dni)}</span></td>
        <td>${esc(c.nombre.replace("Taller de ",""))}</td>
        <td class="nowrap">${pct}% ${faltas >= 2 ? `<span class="chip mora">${faltas} seguidas</span>` : ""}</td>
        <td><span class="chip ${a.estado}">${ETIQUETA_CUOTA[a.estado]}</span></td>
        <td class="num nowrap">${esc(a.tel)}</td>
      </tr>`;
    });
  });
  h += `</tbody></table></div></div>
    <div class="tarjeta quieta"><p class="meta">El profesor ve el estado de cuota para saber a quién avisarle,
      pero no puede modificar precios ni ver la caja: eso es solo del administrador.</p></div>`;
  return h;
}

function vistaCobros(){
  const deudores = ALUMNOS.filter(a => a.estado === "mora");
  let h = `<p class="titulo">Registrar un cobro</p>
    <div class="tarjeta">
      <div class="form">
        <div>
          <label for="cobroAlumno">Alumno</label>
          <select id="cobroAlumno" onchange="sugerirMonto()">
            ${ALUMNOS.map(a => `<option value="${a.dni}">${esc(a.nombre)}</option>`).join("")}
          </select>
        </div>
        <div>
          <label for="cobroMonto">Monto</label>
          <input id="cobroMonto" inputmode="numeric" value="${cuotaDe(ALUMNOS[0])}">
        </div>
        <div>
          <label for="cobroMedio">Medio de pago</label>
          <select id="cobroMedio"><option>Efectivo</option><option>Transferencia</option><option>Tarjeta</option></select>
        </div>
        <div>
          <label for="cobroPeriodo">Período</label>
          <select id="cobroPeriodo"><option>Octubre 2026</option><option>Noviembre 2026</option><option>Matrícula</option></select>
        </div>
      </div>
      <button class="btn chico" style="margin-top:16px" onclick="registrarCobro()">Registrar pago</button>
    </div>

    <p class="titulo">Cuotas pendientes (${deudores.length})</p>
    <div class="tarjeta"><div class="scroll-x"><table>
      <thead><tr><th>Alumno</th><th>Cursos</th><th class="num">Adeuda</th></tr></thead><tbody>`;
  deudores.forEach(a => {
    h += `<tr><td>${esc(a.nombre)}<br><span class="meta">${esc(a.tel)}</span></td>
      <td>${a.cursos.map(id => esc(curso(id).nombre.replace("Taller de ",""))).join("<br>")}</td>
      <td class="num nowrap">${plata(cuotaDe(a))}</td></tr>`;
  });
  if (!deudores.length) h += `<tr><td colspan="3">No hay cuotas pendientes.</td></tr>`;
  h += `</tbody></table></div></div>`;
  return h;
}

function sugerirMonto(){
  const dni = $("#cobroAlumno").value;
  $("#cobroMonto").value = cuotaDe(alumno(dni));
}

function registrarCobro(){
  const dni = $("#cobroAlumno").value;
  const al = alumno(dni);
  const monto = parseInt(String($("#cobroMonto").value).replace(/\D/g, ""), 10) || 0;
  const medio = $("#cobroMedio").value;
  const periodo = $("#cobroPeriodo").value;
  const hoy = new Date();
  const fecha = String(hoy.getDate()).padStart(2,"0") + "/" + String(hoy.getMonth()+1).padStart(2,"0") + "/" + hoy.getFullYear();

  const existente = PAGOS[dni].find(p => p.periodo === periodo);
  if (existente){ existente.monto = monto; existente.medio = medio; existente.fecha = fecha; }
  else PAGOS[dni].unshift({periodo, monto, medio, fecha});
  if (al.estado === "mora") al.estado = "ok";

  refrescar();
  alert("Pago registrado: " + al.nombre + ", " + plata(monto) + " en " + medio + ".\n" +
        "El alumno ya lo ve en su portal y queda en la caja del día.");
}

/* ======================================================= VISTAS ADMIN */
function vistaPanel(){
  const f = finanzas();
  const riesgo = enRiesgo();
  const morosos = ALUMNOS.filter(a => a.estado === "mora");
  const promedio = Math.round(CURSOS.reduce((t, c) => t + asistenciaPromedio(c.id), 0) / CURSOS.length);

  let h = "";
  if (morosos.length){
    h += `<div class="alerta roja"><b>${morosos.length} alumnos con la cuota vencida</b> por ${plata(f.deuda)} en total.
      El detalle está en Reportes.</div>`;
  }
  if (riesgo.length){
    h += `<div class="alerta"><b>${riesgo.length} alumnos en riesgo de abandono</b> (dos faltas seguidas o más).
      Conviene llamarlos esta semana.</div>`;
  }

  h += `<p class="titulo">Octubre 2026</p>
    <div class="grilla">
      <div class="tarjeta"><p class="meta">Cobrado este mes</p><p class="dato chico">${plata(f.cobrado)}</p>
        <p class="meta">${ALUMNOS.length - morosos.length} de ${ALUMNOS.length} alumnos al día</p></div>
      <div class="tarjeta"><p class="meta">Deuda pendiente</p><p class="dato chico" style="color:var(--rojo)">${plata(f.deuda)}</p>
        <p class="meta">${morosos.length} alumnos en mora</p></div>
      <div class="tarjeta"><p class="meta">Proyección si cobramos todo</p><p class="dato chico">${plata(f.proyeccion)}</p>
        <p class="meta">por mes, con los inscriptos de hoy</p></div>
    </div>

    <p class="titulo">Cursada</p>
    <div class="grilla">
      <div class="tarjeta"><p class="meta">Alumnos activos</p><p class="dato chico">${ALUMNOS.length}</p></div>
      <div class="tarjeta"><p class="meta">Cursos en marcha</p><p class="dato chico">${CURSOS.length}</p></div>
      <div class="tarjeta"><p class="meta">Asistencia promedio</p><p class="dato chico">${promedio}%</p></div>
    </div>

    <p class="titulo">Alumnos a los que llamar</p>
    <div class="tarjeta"><div class="scroll-x"><table>
      <thead><tr><th>Alumno</th><th>Curso</th><th>Faltas seguidas</th><th class="num">Teléfono</th></tr></thead><tbody>`;
  riesgo.forEach(r => {
    h += `<tr><td>${esc(r.alumno.nombre)}</td>
      <td>${esc(r.curso.nombre.replace("Taller de ",""))}</td>
      <td><span class="chip mora">${r.faltas}</span></td>
      <td class="num nowrap">${esc(r.alumno.tel)}</td></tr>`;
  });
  if (!riesgo.length) h += `<tr><td colspan="4">Nadie con faltas seguidas. Buena semana.</td></tr>`;
  h += `</tbody></table></div></div>`;
  return h;
}

function vistaAlumnosAbm(){
  let h = `<p class="titulo">Alta de alumno</p>
    <div class="tarjeta">
      <div class="form">
        <div><label for="nvNombre">Nombre y apellido</label><input id="nvNombre" placeholder="Ej: Lucía Fernández"></div>
        <div><label for="nvDni">Documento</label><input id="nvDni" inputmode="numeric" placeholder="40123456"></div>
        <div><label for="nvTel">Teléfono</label><input id="nvTel" placeholder="11 5555 5555"></div>
        <div><label for="nvEmail">Email</label><input id="nvEmail" placeholder="correo@ejemplo.com"></div>
        <div><label for="nvCurso">Curso</label>
          <select id="nvCurso">${CURSOS.map(c => `<option value="${c.id}">${esc(c.nombre)}</option>`).join("")}</select></div>
        <div><label for="nvEstado">Estado de cuota</label>
          <select id="nvEstado"><option value="ok">Al día</option><option value="mora">Debe</option><option value="beca">Becado</option></select></div>
      </div>
      <button class="btn chico" style="margin-top:16px" onclick="altaAlumno()">Dar de alta</button>
      <button class="btn chico gris" style="margin-top:16px;margin-left:8px"
        onclick="demo('En el sistema real acá se registra la huella con el lector conectado a la PC de recepción.')">
        Registrar huella</button>
    </div>

    <p class="titulo">Alumnos (${ALUMNOS.length})</p>
    <input class="buscador" placeholder="Buscar por nombre o documento" oninput="filtrarTabla(this.value,'tablaAlumnos')">
    <div class="tarjeta"><div class="scroll-x"><table id="tablaAlumnos">
      <thead><tr><th>Alumno</th><th>Cursos</th><th>Cuota</th><th>Asistencia</th><th class="num">Acciones</th></tr></thead><tbody>`;

  ALUMNOS.forEach(a => {
    const pcts = a.cursos.map(id => porcentaje(ASISTENCIA[id][a.dni]));
    const pct = Math.round(pcts.reduce((t, x) => t + x, 0) / pcts.length);
    h += `<tr>
      <td>${esc(a.nombre)}<br><span class="meta">DNI ${esc(a.dni)} &middot; ${esc(a.tel)}</span></td>
      <td>${a.cursos.map(id => esc(curso(id).nombre.replace("Taller de ",""))).join("<br>")}</td>
      <td><span class="chip ${a.estado}">${ETIQUETA_CUOTA[a.estado]}</span></td>
      <td class="nowrap">${pct}%</td>
      <td class="num nowrap">
        <button class="btn chico gris" onclick="demo('Ficha completa de ${esc(a.nombre)}: datos, cursos, pagos y asistencia, todo editable.')">Ver ficha</button>
      </td></tr>`;
  });
  h += `</tbody></table></div></div>`;
  return h;
}

function altaAlumno(){
  const nombre = $("#nvNombre").value.trim();
  const dni = $("#nvDni").value.replace(/\D/g, "");
  if (!nombre || !dni){ alert("Completá al menos nombre y documento."); return; }
  if (alumno(dni) || PERSONAL[dni]){ alert("Ese documento ya existe en el sistema."); return; }

  const cursoId = $("#nvCurso").value;
  ALUMNOS.push({
    dni, nombre,
    nac:"—", tel: $("#nvTel").value || "—", email: $("#nvEmail").value || "—",
    dom:"—", desde:"Octubre 2026", cursos:[cursoId], estado: $("#nvEstado").value
  });
  ASISTENCIA[cursoId][dni] = new Array(curso(cursoId).dadas).fill("presente");
  PAGOS[dni] = [{periodo:"Octubre 2026", monto: curso(cursoId).cuota, medio:"—", fecha:"Pendiente"}];

  refrescar();
  alert(nombre + " quedó dado de alta y ya puede entrar al portal con su documento.");
}

function vistaCursosAbm(){
  let h = `<p class="titulo">Alta de curso</p>
    <div class="tarjeta">
      <div class="form">
        <div class="ancho"><label for="ncNombre">Nombre del taller</label><input id="ncNombre" placeholder="Ej: Taller de Retrato"></div>
        <div><label for="ncDia">Día</label>
          <select id="ncDia"><option>Lunes</option><option>Martes</option><option>Miércoles</option><option>Jueves</option><option>Viernes</option><option>Sábados</option></select></div>
        <div><label for="ncHorario">Horario</label><input id="ncHorario" placeholder="19:00 a 21:00"></div>
        <div><label for="ncProfe">Profesor</label>
          <select id="ncProfe">${Object.entries(PERSONAL).filter(([,p]) => p.rol === "profesor")
            .map(([dni, p]) => `<option value="${dni}">${esc(p.nombre)}</option>`).join("")}</select></div>
        <div><label for="ncCuota">Cuota mensual</label><input id="ncCuota" inputmode="numeric" placeholder="38000"></div>
      </div>
      <button class="btn chico" style="margin-top:16px" onclick="altaCurso()">Crear curso</button>
    </div>

    <p class="titulo">Cursos (${CURSOS.length})</p>
    <div class="tarjeta"><div class="scroll-x"><table>
      <thead><tr><th>Curso</th><th>Cuándo</th><th>Profesor</th><th>Inscriptos</th><th>Asistencia</th><th class="num">Cuota</th></tr></thead><tbody>`;
  CURSOS.forEach(c => {
    h += `<tr>
      <td>${esc(c.nombre)}<br><span class="meta">Clase ${c.dadas} de ${c.total} &middot; ${esc(c.aula)}</span></td>
      <td class="nowrap">${esc(c.dia)}<br><span class="meta">${esc(c.horario)}</span></td>
      <td>${esc(PERSONAL[c.profesor].nombre)}</td>
      <td>${alumnosDe(c.id).length}</td>
      <td class="nowrap">${asistenciaPromedio(c.id)}%</td>
      <td class="num nowrap">${plata(c.cuota)}</td></tr>`;
  });
  h += `</tbody></table></div></div>`;
  return h;
}

function altaCurso(){
  const nombre = $("#ncNombre").value.trim();
  if (!nombre){ alert("Poné el nombre del taller."); return; }
  const id = "nuevo" + (CURSOS.length + 1);
  CURSOS.push({
    id, nombre,
    dia: $("#ncDia").value,
    horario: $("#ncHorario").value || "19:00 a 21:00",
    aula: "A definir",
    profesor: $("#ncProfe").value,
    cuota: parseInt($("#ncCuota").value.replace(/\D/g, ""), 10) || 38000,
    dadas: 0, total: 20, inicio: "2026-11-02"
  });
  ASISTENCIA[id] = {};
  refrescar();
  alert("Curso creado. Ya podés inscribir alumnos desde la solapa Alumnos.");
}

function vistaReportes(){
  const f = finanzas();
  const morosos = ALUMNOS.filter(a => a.estado === "mora");
  const ranking = CURSOS.slice().sort((a, b) => alumnosDe(b.id).length - alumnosDe(a.id).length);
  const maxAlumnos = Math.max(...CURSOS.map(c => alumnosDe(c.id).length), 1);

  let h = `<p class="titulo">Asistencia por curso</p>
    <div class="tarjeta"><div class="barras">`;
  CURSOS.forEach(c => {
    const pct = asistenciaPromedio(c.id);
    h += `<div><p class="meta">${esc(c.nombre)}</p>
      <div class="fila-b">
        <div class="pista"><i class="${pct < 70 ? "flojo" : ""}" style="width:${pct}%"></i></div>
        <div class="valor">${pct}%</div>
      </div></div>`;
  });
  h += `</div></div>

    <p class="titulo">Cursos más concurridos</p>
    <div class="tarjeta"><div class="barras">`;
  ranking.forEach(c => {
    const n = alumnosDe(c.id).length;
    h += `<div><p class="meta">${esc(c.nombre)} &middot; ${esc(c.dia)} ${esc(c.horario)}</p>
      <div class="fila-b">
        <div class="pista"><i style="width:${Math.round(n / maxAlumnos * 100)}%"></i></div>
        <div class="valor">${n}</div>
      </div></div>`;
  });
  h += `</div></div>

    <p class="titulo">Resumen financiero de octubre</p>
    <div class="grilla">
      <div class="tarjeta"><p class="meta">Cobrado</p><p class="dato chico">${plata(f.cobrado)}</p></div>
      <div class="tarjeta"><p class="meta">Pendiente</p><p class="dato chico" style="color:var(--rojo)">${plata(f.deuda)}</p></div>
      <div class="tarjeta"><p class="meta">Proyectado</p><p class="dato chico">${plata(f.proyeccion)}</p></div>
    </div>

    <p class="titulo">Morosos (${morosos.length})</p>
    <div class="tarjeta"><div class="scroll-x"><table>
      <thead><tr><th>Alumno</th><th>Contacto</th><th>Desde</th><th class="num">Adeuda</th></tr></thead><tbody>`;
  morosos.forEach(a => {
    h += `<tr><td>${esc(a.nombre)}</td><td class="nowrap">${esc(a.tel)}</td>
      <td class="nowrap">10/10/2026</td><td class="num nowrap">${plata(cuotaDe(a))}</td></tr>`;
  });
  if (!morosos.length) h += `<tr><td colspan="4">Nadie debe cuota.</td></tr>`;
  h += `</tbody></table></div></div>
    <div class="tarjeta quieta">
      <button class="btn chico gris" onclick="demo('En el sistema real baja un Excel con el detalle del período elegido.')">Exportar a Excel</button>
    </div>`;
  return h;
}

function vistaUsuarios(){
  let h = `<p class="titulo">Usuarios del sistema</p>
    <div class="tarjeta"><div class="scroll-x"><table>
      <thead><tr><th>Nombre</th><th>Documento</th><th>Rol</th><th class="num">Acciones</th></tr></thead><tbody>`;
  Object.entries(PERSONAL).forEach(([dni, p]) => {
    h += `<tr><td>${esc(p.nombre)}<br><span class="meta">${esc(p.email)}</span></td>
      <td class="nowrap">${esc(dni)}</td>
      <td><span class="chip ${p.rol === "admin" ? "mora" : "ok"}">${p.rol === "admin" ? "Administrador" : "Profesor"}</span></td>
      <td class="num"><button class="btn chico gris" onclick="demo('Acá se cambia el rol o se da de baja el acceso de ${esc(p.nombre)}.')">Editar</button></td></tr>`;
  });
  h += `</tbody></table></div></div>

    <p class="titulo">Qué puede hacer cada rol</p>
    <div class="tarjeta"><div class="scroll-x"><table>
      <thead><tr><th>Acción</th><th>Alumno</th><th>Profesor</th><th>Admin</th></tr></thead><tbody>
        <tr><td>Ver sus cursos y asistencia</td><td>Sí</td><td>Sí</td><td>Sí</td></tr>
        <tr><td>Tomar asistencia</td><td>No</td><td>Sí</td><td>Sí</td></tr>
        <tr><td>Registrar cobros</td><td>No</td><td>Sí</td><td>Sí</td></tr>
        <tr><td>Ver datos de contacto de alumnos</td><td>No</td><td>Solo los suyos</td><td>Todos</td></tr>
        <tr><td>Alta y baja de alumnos</td><td>No</td><td>No</td><td>Sí</td></tr>
        <tr><td>Crear cursos y fijar cuotas</td><td>No</td><td>No</td><td>Sí</td></tr>
        <tr><td>Ver caja y reportes financieros</td><td>No</td><td>No</td><td>Sí</td></tr>
        <tr><td>Administrar usuarios y backups</td><td>No</td><td>No</td><td>Sí</td></tr>
      </tbody></table></div></div>`;
  return h;
}

function vistaSistema(){
  return `<p class="titulo">Copias de seguridad</p>
    <div class="tarjeta">
      <p class="meta">Último respaldo automático</p>
      <p class="dato chico">Hoy 03:00</p>
      <p class="meta">Se guarda todos los días y queda una copia de los últimos 30 días.</p>
      <button class="btn chico" style="margin-top:14px" onclick="demo('En el sistema real genera y descarga el respaldo del día.')">Hacer copia ahora</button>
      <button class="btn chico gris" style="margin-top:14px;margin-left:8px" onclick="demo('Restaurar pide confirmación y deja registro de quién lo hizo.')">Restaurar</button>
    </div>

    <p class="titulo">Datos del instituto</p>
    <div class="tarjeta">
      <dl class="datos">
        <dt>Nombre</dt><dd>GAPH Talleres Fotográficos</dd>
        <dt>Dirección</dt><dd>Alte. Brown 782, Morón</dd>
        <dt>Teléfono</dt><dd>11 5761 9889</dd>
        <dt>WhatsApp</dt><dd>11 6998 6997</dd>
        <dt>Email</dt><dd>info@gaphfotografia.com</dd>
        <dt>Lector de huella</dt><dd><span class="chip ok">Conectado en recepción</span></dd>
      </dl>
    </div>

    <p class="titulo">Seguridad</p>
    <div class="tarjeta quieta"><p class="meta">
      Cada persona entra con su documento y su clave, y el sistema guarda quién hizo cada cosa:
      quién tomó la asistencia, quién cobró y quién cambió un dato.
      Las huellas se guardan como un código que no permite reconstruir el dedo.</p></div>`;
}

/* ============================================================= VARIOS */
const VISTAS = {
  inicio: vistaInicio, asistencia: vistaAsistencia, cuotas: vistaCuotas, perfil: vistaPerfil,
  cursos: vistaCursosProfe, tomar: vistaTomar, misalumnos: vistaMisAlumnos, cobros: vistaCobros,
  panel: vistaPanel, alumnosabm: vistaAlumnosAbm, cursosabm: vistaCursosAbm,
  reportes: vistaReportes, usuarios: vistaUsuarios, sistema: vistaSistema
};

function demo(texto){ alert(texto); }

function avisarPago(){
  alert("Listo: la recepción recibe el aviso y confirma el pago cuando lo ve acreditado.");
}

function filtrarTabla(texto, idTabla){
  const buscado = texto.toLowerCase();
  document.querySelectorAll("#" + idTabla + " tbody tr").forEach(tr => {
    tr.style.display = tr.textContent.toLowerCase().includes(buscado) ? "" : "none";
  });
}

/* ============================================================ INGRESO */
$("#formIngreso").addEventListener("submit", e => {
  e.preventDefault();
  const dni = $("#dni").value.replace(/\D/g, "");
  const clave = $("#clave").value;
  if (!alumno(dni) && !PERSONAL[dni]){
    $("#errorIngreso").textContent = "No encontramos ese documento. Probá con los de ejemplo de abajo.";
    return;
  }
  if (clave !== CLAVE_DEMO){
    $("#errorIngreso").textContent = "La contraseña del prototipo es: gaph";
    return;
  }
  $("#errorIngreso").textContent = "";
  entrar(dni);
});

document.querySelectorAll("[data-entrar]").forEach(b => {
  b.addEventListener("click", () => entrar(b.dataset.entrar));
});

$("#btnSalir").addEventListener("click", salir);
