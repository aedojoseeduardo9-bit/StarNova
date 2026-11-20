/* Star Nova — (provisional: se completa en este mismo cambio) */
import islas from './islas.js';
export default Object.assign({}, islas, { id: 'soledad', order: 'soledad' === 'gemini' ? 1 : 2, name: 'soledad', galaxy: 'Galaxia soledad', scenes: Object.assign({}, islas.scenes, { rocket: null }) });
