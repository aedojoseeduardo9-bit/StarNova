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
  { id: 'prologo', n: 'Prólogo', title: 'La noche en que cayó Nova', sum: 'La Penumbra subió desde debajo de las islas y Nova se rompió para que no la devoraran. Pip lo vio todo desde El Claro.' },
  { id: 'recuerdo1', n: 'Capítulo 1', title: 'Primer recuerdo: las campanas', sum: 'Las campanas le cantaban a Nova cada tarde: así sabía que las islas seguían despiertas.' },
  { id: 'recuerdo2', n: 'Capítulo 2', title: 'Segundo recuerdo: las mensajeras', sum: 'Las luciérnagas llevaban la luz de Nova a cada rincón. Las sombras no nacieron malas: son luz que alguien olvidó.' },
  { id: 'recuerdo3', n: 'Capítulo 3', title: 'Tercer recuerdo: la promesa', sum: 'El Guardián era el mejor amigo de Nova. Prometió cuidarla mientras ella durmiera.' },
  { id: 'porton', n: 'Capítulo 4', title: 'El portón despierta', sum: 'Con tres fragmentos, el portón del Santuario de Nova se abre al sur del Claro.' },
  { id: 'recuerdo4', n: 'Capítulo secreto', title: 'Cuarto recuerdo: la verdad del Guardián', sum: 'Cuando Nova se rompió, el Guardián se tragó la Penumbra para proteger las islas. Por eso ya no recuerda quién es.' },
  { id: 'guardian', n: 'Capítulo 5', title: 'El que cuida la estrella', sum: 'El Guardián ya no reconoce a nadie: solo ve sombras. No hay que vencerlo… hay que despertarlo.' },
  { id: 'final', n: 'Final', title: 'Una noche con estrellas', sum: 'La Penumbra salió del Guardián, Nova volvió a su lugar y las islas tuvieron, por primera vez, una noche con estrellas.' },
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
