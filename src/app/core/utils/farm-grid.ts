/**
 * Reticolo geometrico del terreno (coordinate percentuali).
 * Il passo è metà della distanza standard tra le piante: ogni maglia "principale"
 * (6% x 8%) è divisa in 4, così si possono disporre le file sfalsate.
 * Condiviso da mappa, generazione piante e posizionamento automatico.
 */
export const GRID_X_MIN = 5;
export const GRID_X_MAX = 95;
export const GRID_Y_MIN = 7;
export const GRID_Y_MAX = 95;
/** Distanza standard tra due piante. */
export const PLANT_X_SPACING = 6;
export const PLANT_Y_SPACING = 8;
export const GRID_X_STEP = PLANT_X_SPACING / 2;
export const GRID_Y_STEP = PLANT_Y_SPACING / 2;
export const GRID_COLS = Math.round((GRID_X_MAX - GRID_X_MIN) / GRID_X_STEP) + 1;
export const GRID_ROWS = Math.round((GRID_Y_MAX - GRID_Y_MIN) / GRID_Y_STEP) + 1;

export interface GridPoint {
	x: number;
	y: number;
}

export interface Positioned {
	id?: string;
	position_x: number;
	position_y: number;
}

const round2 = (n: number) => parseFloat(n.toFixed(2));

export interface GridLine {
	pos: number;
	/** Linea della maglia principale (distanza standard tra piante) o intermedia. */
	major: boolean;
}

export const GRID_COL_LINES: GridLine[] = Array.from({ length: GRID_COLS }, (_, i) => ({ pos: round2(GRID_X_MIN + i * GRID_X_STEP), major: i % 2 === 0 }));
export const GRID_ROW_LINES: GridLine[] = Array.from({ length: GRID_ROWS }, (_, i) => ({ pos: round2(GRID_Y_MIN + i * GRID_Y_STEP), major: i % 2 === 0 }));

export const GRID_NODES: (GridPoint & { major: boolean })[] = GRID_ROW_LINES.flatMap(row =>
	GRID_COL_LINES.map(col => ({ x: col.pos, y: row.pos, major: row.major && col.major }))
);
/** Nodi della maglia principale: posizioni a distanza standard, usate per i posizionamenti automatici. */
export const MAJOR_GRID_NODES: GridPoint[] = GRID_NODES.filter(n => n.major).map(({ x, y }) => ({ x, y }));

export function snapToGrid(rawX: number, rawY: number): GridPoint {
	const col = Math.max(0, Math.min(GRID_COLS - 1, Math.round((rawX - GRID_X_MIN) / GRID_X_STEP)));
	const row = Math.max(0, Math.min(GRID_ROWS - 1, Math.round((rawY - GRID_Y_MIN) / GRID_Y_STEP)));
	return { x: round2(GRID_X_MIN + col * GRID_X_STEP), y: round2(GRID_Y_MIN + row * GRID_Y_STEP) };
}

export function isNodeOccupied(plants: Positioned[], x: number, y: number, excludeId?: string): boolean {
	return plants.some(p => p.id !== excludeId && Math.abs(p.position_x - x) < GRID_X_STEP / 2 && Math.abs(p.position_y - y) < GRID_Y_STEP / 2);
}

/**
 * Trova nodi liberi partendo dall'angolo in basso a destra (zona "parcheggio" per le nuove piante,
 * da cui l'utente le sposta poi nel punto corretto).
 */
export function findFreeSlotsFromBottomRight(plants: Positioned[], count: number): GridPoint[] {
	const ordered = [...MAJOR_GRID_NODES].sort((a, b) => b.y - a.y || b.x - a.x);
	const taken: Positioned[] = [...plants];
	const result: GridPoint[] = [];
	for (const node of ordered) {
		if (result.length === count) break;
		if (!isNodeOccupied(taken, node.x, node.y)) {
			result.push(node);
			taken.push({ position_x: node.x, position_y: node.y });
		}
	}
	return result;
}

/** Assegna a ogni pianta il nodo libero più vicino (allineamento globale). */
export function alignToGrid<T extends Positioned>(plants: T[]): { id: string; x: number; y: number }[] {
	const used = new Set<string>();
	const updates: { id: string; x: number; y: number }[] = [];
	for (const plant of plants) {
		if (!plant.id) continue;
		let best = GRID_NODES[0];
		let bestDist = Infinity;
		for (const node of GRID_NODES) {
			if (used.has(`${node.x}_${node.y}`)) continue;
			const dx = plant.position_x - node.x;
			const dy = (plant.position_y - node.y) * 0.75;
			const dist = dx * dx + dy * dy;
			if (dist < bestDist) {
				bestDist = dist;
				best = node;
			}
		}
		used.add(`${best.x}_${best.y}`);
		updates.push({ id: plant.id, x: best.x, y: best.y });
	}
	return updates;
}
