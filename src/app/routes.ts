export type RouteName = 'explore' | 'osmosis' | 'mitosis' | 'missions' | 'teacher';

export interface Route {
  name: RouteName;
  missionId: string | null;
}

export const ROUTE_TITLES: Record<RouteName, string> = {
  explore: '세포 탐구',
  osmosis: '삼투 실험',
  mitosis: '분열 실험',
  missions: '미션',
  teacher: '교사용',
};

export const ROUTE_PATHS: Record<RouteName, string> = {
  explore: '#/explore',
  osmosis: '#/osmosis',
  mitosis: '#/mitosis',
  missions: '#/missions',
  teacher: '#/teacher',
};

const ROUTE_NAMES: RouteName[] = ['explore', 'osmosis', 'mitosis', 'missions', 'teacher'];

export function parseRoute(hash: string): Route {
  const cleaned = hash.replace(/^#\/?/, '').replace(/\/+$/, '');
  if (!cleaned) return { name: 'explore', missionId: null };
  const [first, second] = cleaned.split('/');
  if (first === 'missions' && second) {
    return { name: 'missions', missionId: decodeURIComponent(second) };
  }
  if (ROUTE_NAMES.includes(first as RouteName)) {
    return { name: first as RouteName, missionId: null };
  }
  return { name: 'explore', missionId: null };
}

export function routeToHash(route: Route): string {
  if (route.name === 'missions' && route.missionId) {
    return `#/missions/${encodeURIComponent(route.missionId)}`;
  }
  return ROUTE_PATHS[route.name];
}

export function navigateToRoute(route: Route): void {
  const hash = routeToHash(route);
  if (window.location.hash !== hash) {
    window.location.hash = hash;
  }
}

export function navigate(name: RouteName, missionId: string | null = null): void {
  navigateToRoute({ name, missionId });
}
