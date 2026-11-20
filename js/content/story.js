/* Star Nova — la historia (datos puros): capítulos de las escenas animadas, recuerdos de Nova
 * y lo que cuenta la Abuela Lechuza según el avance. Todo es original de Star Nova.
 *
 * Resumen: Nova, la estrella pequeña, alumbraba las islas desde su santuario y su amigo el Guardián la
 * cuidaba. Bajo las islas dormía la Penumbra (sombras con hambre de luz). Una noche subieron todas a la
 * vez; para que no la devoraran, Nova se rompió en fragmentos. El Guardián se tragó la Penumbra para
 * que no cayera sobre las islas y por eso ya no recuerda quién es. Pip reúne los fragmentos (cada uno
 * guarda un recuerdo), despierta al Guardián y devuelve a Nova al cielo. */

/* Capítulos, en el orden en que suelen verse. id = escena de js/cinema.js. */
export const CHAPTERS = [
  // ----- Islas del Cielo (Galaxia Nova) -----
  { id: 'prologo', world: 'islas', n: 'Prólogo', title: 'La noche en que cayó Nova', sum: 'La Penumbra subió desde debajo de las islas y Nova se rompió para que no la devoraran. Pip lo vio todo desde El Claro.' },
  { id: 'recuerdo1', world: 'islas', n: 'Capítulo 1', title: 'Primer recuerdo: las campanas', sum: 'Las campanas le cantaban a Nova cada tarde: así sabía que las islas seguían despiertas.' },
  { id: 'recuerdo2', world: 'islas', n: 'Capítulo 2', title: 'Segundo recuerdo: las mensajeras', sum: 'Las luciérnagas llevaban la luz de Nova a cada rincón. Las sombras no nacieron malas: son luz que alguien olvidó.' },
  { id: 'recuerdo3', world: 'islas', n: 'Capítulo 3', title: 'Tercer recuerdo: la promesa', sum: 'El Guardián era el mejor amigo de Nova. Prometió cuidarla mientras ella durmiera.' },
  { id: 'porton', world: 'islas', n: 'Capítulo 4', title: 'El portón despierta', sum: 'Con tres fragmentos, el portón del Santuario de Nova se abre al sur del Claro.' },
  { id: 'recuerdo4', world: 'islas', n: 'Capítulo secreto', title: 'Cuarto recuerdo: la verdad del Guardián', sum: 'Cuando Nova se rompió, el Guardián se tragó la Penumbra para proteger las islas. Por eso ya no recuerda quién es.' },
  { id: 'guardian', world: 'islas', n: 'Capítulo 5', title: 'El que cuida la estrella', sum: 'El Guardián ya no reconoce a nadie: solo ve sombras. No hay que vencerlo… hay que despertarlo.' },
  { id: 'final', world: 'islas', n: 'Capítulo 6', title: 'Una noche con estrellas', sum: 'La Penumbra salió del Guardián, Nova volvió a su lugar y las islas tuvieron, por primera vez, una noche con estrellas.' },
  { id: 'cohete', world: 'islas', n: 'Capítulo 7', title: 'El Cohete Avellana', sum: 'Nova cuenta que sus hermanas de otras galaxias también perdieron su luz. Brío destapa el cohete que armó con pedacitos de estrella.' },
  // ----- Viaje a la Galaxia Gemini -----
  { id: 'viaje_gemini', world: 'viaje', n: 'Viaje 1', title: 'Rumbo a Gemini', sum: 'El Cohete Avellana despega. Nova explica que en Gemini brillaban dos gemelas, Alba y Ocaso, y que la Penumbra las separó.' },
  { id: 'llegada_gemini', world: 'gemini', n: 'Gemini · Capítulo 1', title: 'Planeta Verdalia', sum: 'Pip aterriza en un planeta verde y vivo. El Abuelo Sauce le cuenta que el bosque se apaga un poco cada noche.' },
  { id: 'gemini_recuerdo1', world: 'gemini', n: 'Gemini · Capítulo 2', title: 'Recuerdo de Alba: las flores', sum: 'Alba despertaba las flores cada mañana; Ocaso las arropaba cada tarde. Nunca una sin la otra.' },
  { id: 'gemini_recuerdo2', world: 'gemini', n: 'Gemini · Capítulo 3', title: 'Recuerdo de Ocaso: el lago', sum: 'Ocaso se miraba en el Lago Espejo y solo veía la sombra de su hermana. Ahí empezó a escuchar a la Penumbra.' },
  { id: 'gemini_recuerdo3', world: 'gemini', n: 'Gemini · Capítulo 4', title: 'Recuerdo de las dos: la cadena', sum: 'La Penumbra ató a los dos tótems que las cuidaban con una cadena de sombra. Así nacieron los Gemelos de Raíz.' },
  { id: 'gemini_puerta', world: 'gemini', n: 'Gemini · Capítulo 5', title: 'La Puerta de Raíces', sum: 'Con tres fragmentos, las raíces se apartan y se abre el camino al Claro de los Gemelos.' },
  { id: 'gemini_jefe', world: 'gemini', n: 'Gemini · Capítulo 6', title: 'Los Gemelos de Raíz', sum: 'Dos tótems del bosque, atados por la Penumbra, giran sin poder soltarse. Hay que romper la cadena.' },
  { id: 'gemini_final', world: 'gemini', n: 'Gemini · Capítulo 7', title: 'Alba y Ocaso', sum: 'La cadena se rompe. Alba y Ocaso suben juntas al cielo y le dan a Pip el camino hacia la Galaxia Soledad.' },
  // ----- Viaje a la Galaxia Soledad -----
  { id: 'viaje_soledad', world: 'viaje', n: 'Viaje 2', title: 'Rumbo a Soledad', sum: 'Las gemelas alumbran la ruta. En el borde del universo vive Sola, una estrella que pinta arcoíris para que alguien la encuentre.' },
  { id: 'llegada_soledad', world: 'soledad', n: 'Soledad · Capítulo 1', title: 'Planeta Prismara', sum: 'Un planeta de arcoíris y suelos de mercurio que cantan al pisarlos. Eco, un espíritu que solo sabía repetir, recibe a Pip.' },
  { id: 'soledad_recuerdo1', world: 'soledad', n: 'Soledad · Capítulo 2', title: 'Recuerdo de Sola: el primer arcoíris', sum: 'Sola pintó su primer arcoíris para que alguien, desde muy lejos, supiera que aquí había una amiga.' },
  { id: 'soledad_recuerdo2', world: 'soledad', n: 'Soledad · Capítulo 3', title: 'Recuerdo de Sola: la espera', sum: 'Pasaron mil años. Sola pintaba y esperaba. La Penumbra le susurró: «nadie vendrá».' },
  { id: 'soledad_recuerdo3', world: 'soledad', n: 'Soledad · Capítulo 4', title: 'Recuerdo de Sola: el arcoíris roto', sum: 'Sola lloró y el arcoíris se rompió en notas de color. Su tristeza tomó forma de polilla.' },
  { id: 'soledad_puerta', world: 'soledad', n: 'Soledad · Capítulo 5', title: 'La Puerta Eclipse', sum: 'Los faros y las campanas devuelven el color. La Puerta Eclipse se abre hacia el Trono de la Soledad.' },
  { id: 'soledad_jefe', world: 'soledad', n: 'Soledad · Capítulo 6', title: 'La Polilla de la Soledad', sum: 'Nacida de la tristeza de Sola, la Polilla aparta a todo el que se acerca. Esta vez alguien no se va a ir.' },
  { id: 'soledad_final', world: 'soledad', n: 'Epílogo', title: 'Cuatro estrellas, tres galaxias', sum: 'Sola ya no está sola. Nova, Alba, Ocaso y Sola brillan juntas y la Penumbra vuelve a dormir. Fin del gran viaje.' },
];


/* Recuerdos que guarda cada fragmento (según cuántos lleva Pip). place = dónde ocurre la visión. */
export const MEMORIES = [
  null,
  { place: 'coral', lines: ['«Las campanas me cantaban cada tarde.»', '«Así sabía que las islas seguían despiertas… y yo podía dormir tranquila.»'], end: 'Quedan más fragmentos. Sigue su brillo.' },
  { place: 'menta', lines: ['«Las luciérnagas eran mis mensajeras: llevaban mi luz a cada rincón.»', '«Hasta a las sombras. No nacieron malas, Pip: son luz que alguien olvidó.»'], end: 'Las sombras tienen hambre de luz… igual que las islas.' },
  { place: 'lavanda', lines: ['«El Guardián era mi mejor amigo.»', '«Prometió cuidarme mientras yo durmiera. Nunca rompió una promesa.»'], end: 'Tres fragmentos: el santuario ya te reconoce.' },
  { place: 'nova', lines: ['«Cuando me rompí, él se tragó la Penumbra para que no cayera sobre las islas.»', '«Por eso ya no recuerda quién es. No lo venzas, Pip… despiértalo.»'], end: 'Ahora sabes la verdad del Guardián.' },
];

/* Primera charla con la Abuela Lechuza (también enseña a jugar). */
export const OWL_INTRO = [
  '¡Pip! Qué bueno que despertaste. Soy la Abuela Lechuza, guardiana del Claro.',
  'Anoche la Penumbra subió desde debajo de las islas. Nova, para que no la devoraran, se rompió en fragmentos.',
  'Cada fragmento guarda un recuerdo suyo. Si los reúnes, quizá Nova recuerde también el camino de vuelta al cielo.',
  'Al oeste, en el Jardín de Coral, tres campanas esperan que alguien las haga sonar.',
  'Al norte, en las Torres de Menta, se perdieron tres luciérnagas… y las sombras andan inquietas.',
  'Al este, el Puente de Lavanda duerme. Dicen que dos cristales saben despertarlo.',
  'Con tres fragmentos, el portón del Santuario de Nova, al sur, se abrirá. Cuidado: el Guardián vigila… y ya no es el de antes.',
  'Los cofres cambian con el tiempo: mientras más avances, más poderosos serán. ¡Ábrelos con chispas!',
  'Con chispas también puedes estrenar trajes: míralos en el menú, en la página Trajes.',
  'Las sombras se hacen más fuertes con el tiempo. ¡Buen viaje, pequeña!',
];

/* Charlas siguientes: la lechuza cuenta más de la historia según el avance. */
export function owlLines(frags, gateOpen, bossDone) {
  if (bossDone) return [
    '¿La ves allá arriba? Hacía tanto que no dormía con esa luz en la ventana…',
    'El Guardián pasó a saludar. Le cuesta hablar todavía, pero ya recuerda mi nombre.',
    'La Penumbra no se fue, Pip: aprendió a dormir. Mientras duerma, alguien tiene que seguir cuidando la luz.',
    'Quedan sombras sueltas y cofres por abrir. Las islas siguen siendo tuyas, pequeña.',
  ];
  if (gateOpen) return [
    'El portón está abierto. Lo oí bajar desde aquí: suena igual que hace cien años.',
    'Te contaré algo: yo conocí al Guardián cuando reía. Jugaba a esconder la luz de Nova entre sus bloques.',
    'Lo que hay ahora en el santuario no es maldad. Es alguien que aguantó demasiado tiempo él solo.',
    'Cuando lo tengas delante, recuerda quién fue. Y esquiva: pega fuerte.',
  ];
  if (frags >= 2) return [
    'Dos fragmentos ya… Se te nota en los ojos: has visto sus recuerdos, ¿verdad?',
    'Las sombras de ahí fuera son trocitos de la Penumbra. Tienen hambre de luz, por eso persiguen todo lo que brilla.',
    'Antes las islas eran una sola tierra. Cuando Nova se rompió, se separaron como un plato caído.',
    'Uno más y el portón del sur despertará.',
  ];
  if (frags >= 1) return [
    '¡Tu primer fragmento! Abrígalo bien: los recuerdos se enfrían rápido.',
    'Nova nunca fue una estrella grande. Era pequeña, como tú. Por eso alumbraba tan de cerca.',
    'Sigue: cada fragmento que reúnas le devuelve un poco de memoria.',
  ];
  return [
    'Sigue el brillo de la misión que elegiste, Pip. El marcador dorado te lleva.',
    'Si te lastiman, vuelve a la hoguera: su calor cura.',
    'Y no gastes todas las chispas en cofres… hay trajes muy bonitos esperando en el menú.',
  ];
}

/* ----- Recuerdos de las otras galaxias (los fragmentos de cada mundo) ----- */
export const MEMORIES_GEMINI = [
  null,
  { who: 'Alba', lines: ['«Cada mañana yo despertaba las flores, y cada tarde mi hermana Ocaso las arropaba.»', '«Nunca una sin la otra. Así crecía Verdalia: con luz y con sombra.»'], end: 'Quedan más recuerdos entre los árboles.' },
  { who: 'Ocaso', lines: ['«Me miraba en el Lago Espejo y solo veía la sombra de mi hermana.»', '«Una voz me dijo que yo no era nadie sin ella. Y le creí.»'], end: 'Ocaso no era mala. Solo estaba triste.' },
  { who: 'Alba y Ocaso', lines: ['«La Penumbra ató a nuestros dos guardianes con una cadena de sombra.»', '«Desde entonces giran sin poder soltarse. Libéralos, Pip… y nos liberarás a nosotras.»'], end: 'Tres fragmentos: la Puerta de Raíces te reconoce.' },
];
export const MEMORIES_SOLEDAD = [
  null,
  { who: 'Sola', lines: ['«Pinté mi primer arcoíris para que alguien, desde muy lejos, supiera que aquí había una amiga.»', '«Lo hice tan grande que daba la vuelta al planeta.»'], end: 'Quedan más colores por juntar.' },
  { who: 'Sola', lines: ['«Pasaron mil años. Yo pintaba, y esperaba, y pintaba.»', '«La Penumbra me susurró: “nadie vendrá nunca”.»'], end: 'Sola esperó más que nadie en el universo.' },
  { who: 'Sola', lines: ['«Lloré tanto que mi arcoíris se rompió en notas de color.»', '«Y mi tristeza se volvió una polilla que aparta a todo el que se acerca. Por favor… no te vayas.»'], end: 'Tres fragmentos: la Puerta Eclipse te espera.' },
];

/* Lo que dicen las estrellas por la radio del cohete durante cada viaje. */
export const TRAVEL_LINES = {
  gemini: [
    ['Nova', '«Pip, ¿me oyes? La Galaxia Gemini está a tres saltos de luz.»'],
    ['Nova', '«Allí brillaban dos gemelas, Alba y Ocaso. La Penumbra llegó hasta ellas y las separó.»'],
    ['', 'Pip va a rescatar los otros cristales de estrella, uno por uno. Su bellota está lista.'],
  ],
  soledad: [
    ['Alba y Ocaso', '«¡Te alumbramos el camino, Pip! La Galaxia Soledad está en el borde de todo.»'],
    ['Nova', '«Allí vive Sola. Pinta arcoíris para que alguien la encuentre… pero nadie llegó nunca.»'],
    ['', 'Hasta hoy. El último cristal de estrella espera al final del viaje.'],
  ],
};
