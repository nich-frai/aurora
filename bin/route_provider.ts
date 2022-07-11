import { EventEmitter } from "node:events";
import type { Route } from "route/route.class";

export interface IRouteProvider {
	provideRoutes(): Route[] | Promise<Route[]>;
}

export interface IRouteObservable extends IRouteProvider {
	onRouteAdded(listener: (route: Route) => void): this;
	onRouteChanged(listener: (route: Route) => void): this;
	onRouteRemoved(listener: (route: Route) => void): this;
}

export function isRouteProvider(o: any): o is IRouteProvider {
	return (
		o != null
		&& typeof o === 'object'
		&& typeof o.provideRoutes === 'function'
	);
}

export function isRouteObservable<T>(o: any): o is IRouteObservable {
	return (
		isRouteProvider(o)
		&& typeof (o as any).onRouteAdded === 'function'
		&& typeof (o as any).onRouteChanged === 'function'
		&& typeof (o as any).onRouteRemoved === 'function'
	);
}

export type TFilenameMatcher = string | string[] | RegExp | RegExp[];

const DEFAULT_ROUTE_MATCHER : TFilenameMatcher = /.+\.\.(t|j)s$/;
const DEFAULT_CONTROLLER_MATCHER : TFilenameMatcher = /__\.controller\.(t|j)s$/;
const DEFAULT_INDEX_PATTERN : string | RegExp = 'index';

export class AuroraRouteAutoloader extends EventEmitter implements IRouteObservable {

	routeMatcher : TFilenameMatcher = DEFAULT_ROUTE_MATCHER;
	
	controllerMatcher : TFilenameMatcher = DEFAULT_CONTROLLER_MATCHER;

	indexPattern : string | RegExp = DEFAULT_INDEX_PATTERN;

	watch : boolean = true;

	constructor(
		private root: string
	) {
		super();
	}

	async provideRoutes(): Promise<Route[]> {
		throw new Error("Method not implemented.");
	}

	onRouteChanged(listener: (route: Route) => void): this {
		this.on('route-changed', listener);
		return this;
	}

	onRouteAdded(listener: (route: Route) => void): this {
		this.on('route-added', listener);
		return this;
	}

	onRouteRemoved(listener: (route: Route) => void): this {
		this.on('route-removed', listener);
		return this;	
	}
}