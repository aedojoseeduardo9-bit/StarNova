/* Star Nova — (provisional: se completa en este mismo cambio) */
import islas from './islas.js';
export default Object.assign({}, islas, { id: 'gemini', order: 'gemini' === 'gemini' ? 1 : 2, name: 'gemini', galaxy: 'Galaxia gemini', scenes: Object.assign({}, islas.scenes, { rocket: null }) });
