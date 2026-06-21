import { getMapProvider, type LatLng, type MapProvider } from './maps';

/** A stop to be visited, identified by its package id. */
export interface OptimizerStop {
  id: string;
  lat: number;
  lng: number;
}

/** A stop placed into the optimised visiting order. */
export interface OptimizedStop {
  id: string;
  orderIndex: number;
  /** Cumulative estimated travel time from the start, in seconds. */
  etaSeconds: number;
}

/**
 * Dynamic Nearest Neighbour route optimisation.
 *
 * Builds a travel-time matrix over [current, ...stops] via the MapProvider,
 * then greedily walks from the current location to the nearest unvisited stop
 * until every stop is ordered. Returns each stop with its 0-based orderIndex
 * and a cumulative ETA.
 *
 * Re-run after every delivery outcome with the new current location — see
 * session.service.ts.
 */
export async function optimizeRoute(
  current: LatLng,
  stops: OptimizerStop[],
  provider: MapProvider = getMapProvider(),
): Promise<OptimizedStop[]> {
  if (stops.length === 0) return [];
  if (stops.length === 1) {
    return [{ id: stops[0].id, orderIndex: 0, etaSeconds: 0 }];
  }

  // Index 0 is the current location; indices 1..n map to stops[0..n-1].
  const points: LatLng[] = [current, ...stops.map((s) => ({ lat: s.lat, lng: s.lng }))];
  const matrix = await provider.distanceMatrix(points, points);

  const n = stops.length;
  const visited = new Array<boolean>(n).fill(false);
  const ordered: OptimizedStop[] = [];

  let currentIdx = 0; // position within `points`
  let cumulative = 0;

  for (let step = 0; step < n; step++) {
    let bestStop = -1;
    let bestTime = Number.POSITIVE_INFINITY;

    for (let j = 0; j < n; j++) {
      if (visited[j]) continue;
      const time = matrix[currentIdx]?.[j + 1] ?? Number.POSITIVE_INFINITY;
      if (time < bestTime) {
        bestTime = time;
        bestStop = j;
      }
    }

    // All remaining pairs unreachable — append the rest in their given order.
    if (bestStop === -1) {
      for (let j = 0; j < n; j++) {
        if (!visited[j]) {
          visited[j] = true;
          ordered.push({ id: stops[j].id, orderIndex: ordered.length, etaSeconds: Math.round(cumulative) });
        }
      }
      break;
    }

    visited[bestStop] = true;
    cumulative += Number.isFinite(bestTime) ? bestTime : 0;
    ordered.push({ id: stops[bestStop].id, orderIndex: step, etaSeconds: Math.round(cumulative) });
    currentIdx = bestStop + 1;
  }

  return ordered;
}
