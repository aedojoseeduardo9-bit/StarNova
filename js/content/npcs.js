/* Star Nova — personajes no jugables (PNJ) de cada mundo: nombre, especie, qué cuentan según el avance y,
 * si son tenderos, qué ropa venden (solo ellos la venden: ver js/entities/outfits.js, campo shop).
 * lines(g) devuelve las frases de la charla según el avance de la partida (g = el juego). */
const frags = (g) => g.missions.fragments();
const gateOpen = (g) => !!(g.props.gate && g.props.gate.open);

export const NPCS = {
  /* ----- Islas del Cielo ----- */
  brio: {
    name: 'Brío', title: 'topo mecánico', kind: 'topo', world: 'islas',
    lines: (g) => g.bossDone ? [
      '¡Ahí está! El Cohete Avellana. Lo armé con los pedacitos de estrella que llovieron sobre el Claro.',
      'Funciona con luz de estrella: Nova le dio un empujoncito. Súbete cuando quieras y elige una galaxia en el mapa.',
      'Si una galaxia sale bloqueada es porque todavía no conocemos el camino. Cada estrella que rescates nos dará el siguiente.',
    ] : frags(g) >= 2 ? [
      'Escucha esto, Pip: cuando Nova se rompió, no todos los pedazos cayeron aquí. Algunos salieron disparados lejos, muy lejos.',
      'Estoy armando algo con lo que encuentro bajo esa lona. Algo que vuela. ¡Pero todavía me falta luz de estrella!',
    ] : [
      '¡Hola, pequeña! Soy Brío. Cavo, atornillo y arreglo cosas. Bueno… sobre todo cavo.',
      'Desde que cayó Nova, el suelo del Claro está lleno de pedacitos que brillan. Los estoy juntando para un proyecto secreto.',
      'No mires debajo de la lona, ¿eh? ¡Es una sorpresa!',
    ],
  },
  ovillo: {
    name: 'Doña Ovillo', title: 'erizo tejedora', kind: 'erizo', world: 'islas', shop: true,
    colors: { body: '#c9a58a', spikes: '#8a6a5a', extra: '#ef9a8f' },
    lines: () => ['¡Bienvenida a mi tiendita! Tejo con hilo de nube y lana de farolillo. Lo que ves aquí no lo encontrarás en ninguna otra galaxia.'],
  },

  /* ----- Galaxia Gemini · planeta Verdalia ----- */
  sauce: {
    name: 'Abuelo Sauce', title: 'tortuga sabia', kind: 'tortuga', world: 'gemini',
    lines: (g) => g.bossDone ? [
      'Alba y Ocaso vuelven a brillar juntas. Hacía mil estaciones que el bosque no cantaba así.',
      'Ocaso no era mala, Pip: la Penumbra le susurró que solo era la sombra de su hermana. Y se lo creyó.',
      'Dicen que más allá, en la Galaxia Soledad, una estrella pinta arcoíris para que alguien la encuentre. Tu cohete ya conoce el camino.',
    ] : gateOpen(g) ? [
      'La Puerta de Raíces se abrió. Al sur te esperan los Gemelos de Raíz.',
      'No son monstruos: son las raíces que cuidaban a las gemelas, atadas por una cadena de Penumbra. Rómpela y las liberarás.',
    ] : frags(g) >= 1 ? [
      '¡Ya tienes un fragmento! Las gemelas se separaron al caer: Alba quedó en el agua y en las flores, Ocaso se escondió en la sombra del bosque.',
      'Cada fragmento que juntes despierta un recuerdo suyo. Escúchalos: te dirán qué pasó.',
    ] : [
      'Vaya, vaya. Una ardilla que cae del cielo en un cohete. Eso no se ve todos los siglos. Soy el Abuelo Sauce.',
      'Esto es Verdalia, el planeta de la Galaxia Gemini. Aquí brillaban dos estrellas gemelas: Alba, la luz de la mañana, y Ocaso, la de la tarde.',
      'La Penumbra llegó hasta aquí y las separó. Desde entonces el bosque se apaga un poco cada noche.',
      'Al oeste, en el Bosque Susurro, cuelgan tres Flores Campana. Al norte, en el Lago Espejo, se perdieron las Semillas de Luz.',
      'Y al este, cruzando el Río Cantarín, dos Flores de Cristal saben despertar un puente de lianas. Con tres fragmentos se abrirá la Puerta de Raíces, al sur.',
    ],
  },
  musgo: {
    name: 'Musgo', title: 'erizo jardinero', kind: 'erizo', world: 'gemini', shop: true,
    colors: { body: '#a8c08a', spikes: '#5a8a4a', extra: '#e8705a' },
    lines: () => ['¡Psst! Ropa del bosque, cosida con hojas que no se marchitan. Solo aquí, solo en Verdalia.'],
  },
  tilo: {
    name: 'Tilo', title: 'cervatillo curioso', kind: 'ciervo', world: 'gemini',
    lines: (g) => g.bossDone ? [
      '¡Lo vi todo desde la colina! ¡Las gemelas se abrazaron en el cielo! ¿Me llevas en tu cohete algún día?',
    ] : [
      '¿Ves la cascada del norte? Mi mamá dice que detrás del agua hay una Semilla de Luz. ¡Yo no me atrevo a ir!',
      'Cuidado con el lago: el agua es muy honda. Salta por las hojas de nenúfar, que aguantan muy bien.',
      'Y si quieres subir a lo alto de la cascada, no trepes la pared: da la vuelta por la loma del este.',
      'Y si ves sombras en el bosque, no te quedes quieta: llegan en olas y luego descansan un rato.',
    ],
  },

  /* ----- Galaxia Soledad · planeta Prismara ----- */
  eco: {
    name: 'Eco', title: 'espíritu del eco', kind: 'espiritu', world: 'soledad',
    lines: (g) => g.bossDone ? [
      'Sola ya no está sola. Y yo… yo ya no tengo que repetir las palabras de nadie. Ahora tengo las mías.',
      'Gracias, Pip. Tres galaxias, tres estrellas. La Penumbra vuelve a dormir, y esta vez no despertará sola.',
    ] : gateOpen(g) ? [
      'La Puerta Eclipse se abrió… al sur, en el Trono de la Soledad, te espera la Polilla.',
      'No es Sola, pero nació de su tristeza. Si la vences, Sola podrá verte por fin.',
    ] : [
      '…hola… hola… ¡Ay! Perdón. Soy Eco. Antes solo repetía lo último que decían los demás. Pero hace mucho que nadie dice nada aquí.',
      'Esto es Prismara, en la Galaxia Soledad. Aquí vive Sola, una estrella que pintaba arcoíris para que alguien la encontrara.',
      'Nadie vino. La Penumbra le dijo que nadie vendría nunca. Sola lloró tanto que su arcoíris se rompió en notas de color.',
      'Junta las Notas de Color en el Mar de Mercurio, haz sonar las Campanas de Cristal en los Anillos Prisma y enciende los Faros del Jardín Aurora.',
      'Para saltar entre los anillos usa los Impulsores Cometa: párate en la estrella y pulsa Impulsar. ¡Es como volar!',
    ],
  },
  lumen: {
    name: 'Lumen', title: 'pulpo de mercurio', kind: 'pulpo', world: 'soledad', shop: true,
    lines: () => ['¡Bienvenida a la Boutique Mercurio! Ocho brazos, ocho veces más amable. Ropa espacial que solo vendo aquí.'],
  },
  vela: {
    name: 'Capitana Vela', title: 'zorra astronauta', kind: 'zorra', world: 'soledad',
    lines: (g) => g.bossDone ? [
      'Registro de vuelo, último día: la ardilla salvó tres galaxias. Nadie me lo va a creer en la base.',
    ] : [
      'Capitana Vela, exploradora estelar. Me quedé varada aquí cuando el arcoíris se rompió: sin color, mis motores no encuentran el camino.',
      'Consejo de piloto: el suelo de mercurio es seguro, solo hace ondas. Lo que no es seguro es caerse de los anillos.',
      'Hay polvo de estrella flotando por todas partes. Cada pizca vale unas chispas.',
    ],
  },
};
