import type { Resolver } from 'awilix';

export interface IServiceProvider {
	provideServices(): Record<string, Resolver<any>> | Promise<Record<string, Resolver<any>>>;
}

export interface IServiceObservable extends IServiceProvider {
	onServiceAdded(listener: (identifier: string, resolver: Resolver<any>) => void): this;
	onServiceChanged(listener: (identifier: string, resolver: Resolver<any>) => void): this;
	onServiceRemoved(listener: (identifier: string, resolver: Resolver<any>) => void): this;
}

export function isServiceProvider(o: any): o is IServiceProvider {
	return (
		o != null
		&& typeof o === 'object'
		&& typeof o.provideRoutes === 'function'
	);
}

export function isServiceObservable(o: any): o is IServiceObservable {
	return (
		isServiceProvider(o)
		&& typeof (o as any).onServiceAdded === 'function'
		&& typeof (o as any).onServiceChanged === 'function'
		&& typeof (o as any).onServiceRemoved === 'function'
	);
}