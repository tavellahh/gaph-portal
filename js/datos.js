/* =============================================================== DATOS
   Todo inventado para la demostración. En el sistema real esto sale de la
   base de datos: la recepción carga alumnos, cursos y pagos, y la asistencia
   la escribe sola el lector de huella.                                     */

const CLAVE_DEMO = "gaph";

/* ------------------------------------------------------------ personal */
const PERSONAL = {
  "27345981": { nombre: "Laura Pérez",     rol: "profesor", email: "laura@gaphfotografia.com",  telefono: "11 5012 7788" },
  "30998123": { nombre: "Diego Álvarez",   rol: "profesor", email: "diego@gaphfotografia.com",  telefono: "11 5366 1120" },
  "28776554": { nombre: "Rubén Casas",     rol: "profesor", email: "ruben@gaphfotografia.com",  telefono: "11 5744 9023" },
  "20111222": { nombre: "Silvina Costa",   rol: "admin",    email: "info@gaphfotografia.com",   telefono: "11 5761 9889" }
};

/* -------------------------------------------------------------- cursos */
const CURSOS = [
  { id:"basico",    nombre:"Taller de Fotografía Básico",        dia:"Jueves",  horario:"18:30 a 20:30", aula:"Aula 1",   profesor:"27345981", cuota:36000, dadas:12, total:20, inicio:"2026-08-06" },
  { id:"avanzado",  nombre:"Taller de Fotografía Avanzado",      dia:"Martes",  horario:"19:00 a 21:00", aula:"Aula 2",   profesor:"30998123", cuota:38000, dadas:14, total:20, inicio:"2026-07-28" },
  { id:"photoshop", nombre:"Taller de Procesado con Photoshop",  dia:"Sábados", horario:"10:00 a 12:00", aula:"Aula 2",   profesor:"30998123", cuota:34000, dadas:6,  total:20, inicio:"2026-09-12" },
  { id:"luz",       nombre:"Taller de Iluminación",              dia:"Lunes",   horario:"19:00 a 21:00", aula:"Estudio",  profesor:"28776554", cuota:40000, dadas:9,  total:20, inicio:"2026-08-24" }
];

/* ------------------------------------------------------------- alumnos
   estado: "ok" al día, "mora" cuota vencida, "beca" becado           */
const ALUMNOS = [
  { dni:"38452109", nombre:"Camila Rossi",      nac:"14/03/1995", tel:"11 5123 4488", email:"camila.rossi@gmail.com",   dom:"Yatay 1240, Morón",        desde:"Marzo 2025",      cursos:["avanzado"],             estado:"ok"   },
  { dni:"42118760", nombre:"Martín Duarte",     nac:"02/11/1999", tel:"11 6744 2091", email:"martinduarte99@gmail.com", dom:"Sarmiento 455, Castelar",  desde:"Agosto 2026",     cursos:["basico","photoshop"],   estado:"mora" },
  { dni:"35662401", nombre:"Valeria Sosa",      nac:"27/06/1991", tel:"11 5890 3312", email:"vale.sosa@gmail.com",      dom:"Rivadavia 980, Morón",     desde:"Agosto 2026",     cursos:["basico"],               estado:"ok"   },
  { dni:"40223118", nombre:"Nicolás Ferrari",   nac:"09/01/1998", tel:"11 6012 7745", email:"nico.ferrari@gmail.com",   dom:"Belgrano 233, Haedo",      desde:"Agosto 2026",     cursos:["basico"],               estado:"mora" },
  { dni:"33445566", nombre:"Paula Giménez",     nac:"18/09/1988", tel:"11 5422 8890", email:"paugimenez@gmail.com",     dom:"San Martín 112, Morón",    desde:"Marzo 2026",      cursos:["avanzado","luz"],       estado:"ok"   },
  { dni:"29887744", nombre:"Sergio Molina",     nac:"03/05/1983", tel:"11 5677 1234", email:"sergio.molina@gmail.com",  dom:"Mitre 640, Ituzaingó",     desde:"Marzo 2025",      cursos:["avanzado"],             estado:"ok"   },
  { dni:"44003321", nombre:"Ana Lucía Benítez", nac:"22/12/2002", tel:"11 6788 4412", email:"analu.benitez@gmail.com",  dom:"Brown 1502, Morón",        desde:"Agosto 2026",     cursos:["basico"],               estado:"beca" },
  { dni:"37119025", nombre:"Federico Luna",     nac:"30/07/1996", tel:"11 5233 6690", email:"fede.luna@gmail.com",      dom:"Córdoba 77, Castelar",     desde:"Agosto 2026",     cursos:["photoshop"],            estado:"ok"   },
  { dni:"31556890", nombre:"Mariana Vega",      nac:"11/02/1986", tel:"11 5901 2277", email:"mariana.vega@gmail.com",   dom:"Yrigoyen 310, Morón",      desde:"Marzo 2026",      cursos:["luz","photoshop"],      estado:"ok"   },
  { dni:"43007712", nombre:"Tomás Ríos",        nac:"05/04/2001", tel:"11 6344 9981", email:"tomasrios01@gmail.com",    dom:"Las Heras 88, El Palomar", desde:"Agosto 2026",     cursos:["basico"],               estado:"mora" },
  { dni:"36772103", nombre:"Juliana Paz",       nac:"16/08/1994", tel:"11 5488 7701", email:"juli.paz@gmail.com",       dom:"Alvear 1201, Morón",       desde:"Marzo 2026",      cursos:["avanzado"],             estado:"ok"   },
  { dni:"32990188", nombre:"Esteban Carrizo",   nac:"24/10/1987", tel:"11 5712 3309", email:"e.carrizo@gmail.com",      dom:"Sarmiento 90, Morón",      desde:"Agosto 2026",     cursos:["luz"],                  estado:"ok"   },
  { dni:"39884215", nombre:"Rocío Ledesma",     nac:"07/12/1997", tel:"11 6155 2240", email:"rocio.ledesma@gmail.com",  dom:"Güemes 450, Haedo",        desde:"Agosto 2026",     cursos:["photoshop"],            estado:"ok"   },
  { dni:"34001997", nombre:"Hernán Quiroga",    nac:"19/05/1990", tel:"11 5399 8812", email:"h.quiroga@gmail.com",      dom:"Castelli 760, Morón",      desde:"Marzo 2026",      cursos:["avanzado","luz"],       estado:"ok"   }
];

/* ------------------------------------------------- fechas de las clases */
const DIAS_SEMANA = ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"];

/** Devuelve las fechas (semanales) de las clases ya dadas de un curso. */
function fechasDeClases(curso){
  const salida = [];
  const d = new Date(curso.inicio + "T12:00:00");
  for (let i = 0; i < curso.dadas; i++){
    salida.push(String(d.getDate()).padStart(2,"0") + "/" + String(d.getMonth()+1).padStart(2,"0"));
    d.setDate(d.getDate() + 7);
  }
  return salida;
}

/** Próxima clase de un curso, en texto. */
function proximaClase(curso){
  const d = new Date(curso.inicio + "T12:00:00");
  d.setDate(d.getDate() + curso.dadas * 7);
  const dia = DIAS_SEMANA[d.getDay()];
  const fecha = String(d.getDate()).padStart(2,"0") + "/" + String(d.getMonth()+1).padStart(2,"0");
  return dia.charAt(0).toUpperCase() + dia.slice(1) + " " + fecha + ", " + curso.horario.split(" a ")[0];
}

/* ----------------------------------------------------------- asistencia
   Se genera una vez al arrancar, siempre igual (no es azar de verdad: sale
   de un número derivado del DNI), y después queda viva en memoria para que
   el profesor pueda tocarla en la demo.                                  */
function numeroDe(texto){
  let h = 7;
  for (const c of texto) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return (h % 1000) / 1000;
}

const ASISTENCIA = {};   // ASISTENCIA[cursoId][dni] = ["presente","ausente",...]

function generarAsistencia(){
  CURSOS.forEach(curso => {
    ASISTENCIA[curso.id] = {};
    ALUMNOS.filter(a => a.cursos.includes(curso.id)).forEach(al => {
      const fila = [];
      for (let i = 0; i < curso.dadas; i++){
        const r = numeroDe(al.dni + curso.id + i);
        fila.push(r < 0.09 ? "ausente" : r < 0.13 ? "justificada" : "presente");
      }
      ASISTENCIA[curso.id][al.dni] = fila;
    });
  });

  // Casos preparados para la demo.
  const martin = ASISTENCIA["basico"]["42118760"];
  martin.fill("presente", 0, 5);
  martin[5] = "presente"; martin[6] = "presente";
  martin[7] = "presente"; martin[8] = "presente";
  martin[9] = "ausente"; martin[10] = "ausente"; martin[11] = "ausente";

  const tomas = ASISTENCIA["basico"]["43007712"];
  tomas[10] = "ausente"; tomas[11] = "ausente";

  const camila = ASISTENCIA["avanzado"]["38452109"];
  camila.fill("presente");
  camila[3] = "ausente"; camila[6] = "justificada";
}
generarAsistencia();

/* --------------------------------------------------------------- pagos
   PAGOS[dni] = [{periodo, monto, medio, fecha}]  ("Pendiente" si no pagó) */
const MESES = ["Agosto 2026","Septiembre 2026","Octubre 2026"];
const PAGOS = {};

ALUMNOS.forEach(al => {
  const cuotaTotal = al.cursos.reduce((t, id) => t + CURSOS.find(c => c.id === id).cuota, 0);
  const lista = [];
  MESES.forEach((mes, i) => {
    const vencido = al.estado === "mora" && i === MESES.length - 1;
    const becado  = al.estado === "beca";
    lista.push({
      periodo: mes,
      monto: becado ? 0 : cuotaTotal,
      medio: becado ? "Beca" : vencido ? "—" : (numeroDe(al.dni + mes) < 0.5 ? "Transferencia" : "Efectivo"),
      fecha: becado ? "Sin cargo" : vencido ? "Pendiente" : "0" + (5 + i) + "/" + String(8 + i).padStart(2,"0") + "/2026"
    });
  });
  PAGOS[al.dni] = lista.reverse();
});

/* ------------------------------------------------------------- avisos */
const AVISOS = [
  ["21/10","Salida fotográfica al Casco Histórico el sábado 8/11 a las 16:00. Confirmá por WhatsApp."],
  ["12/10","Ya está disponible el material de la clase de iluminación en el Drive del taller."],
  ["02/10","Se abrió la inscripción al ciclo de marzo. Los alumnos actuales tienen prioridad hasta el 30/11."]
];
