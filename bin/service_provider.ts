import { asClass, asFunction, asValue, AwilixContainer, Lifetime, Resolver } from 'awilix';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { isClass } from '../src/utils/is_class';
import { pathToFileURL } from 'node:url';
import { isFunction } from '../src/utils/is_function';
import { toDependencyResolver } from '../src/utils/to_dependency_resolver';
import { DependencyLifetime, DependencyName } from '../src/aurora.lib';
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
		&& typeof o.provideServices=== 'function'
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

const isServiceFile = /(?<name>.+)\.service\.(m|c)?(j|t)s$/;

export class AuroraServiceProvider implements IServiceProvider {

	constructor(private container: AwilixContainer, private root : string) { }

	async provideServices(): Promise<Record<string, Resolver<any>>> {
		return this.autoloadServices(
			this.container,
			this.root
		);
	}

	async autoloadServices(
		into: AwilixContainer,
		from: string
	) {

		const currentDir = await fs.readdir(from, { withFileTypes: true });
		let allServices: Record<string, Resolver<any>> = {};

		for (let entry of currentDir) {
			if (entry.isDirectory()) {
				let loaded = await this.autoloadServices(
					into,
					`${from}${path.sep}${entry.name}`
				);
				allServices = {
					...allServices,
					...loaded
				}
			}

			if (entry.isFile()) {
				const matchesWithService = entry.name.match(isServiceFile);
				if (matchesWithService != null) {
					let loadedServices = await defaultServiceLoader(
						`${from}${path.sep}${entry.name}`,
						matchesWithService.groups!.name
					);
					allServices = {
						...allServices,
						...loadedServices,
					};
				}
			}
		}

		return allServices;
	}

}

export const toCamelCase = (text: string): string => {
	return text
		.replace(/(?:^\w|[A-Z]|\b\w)/g, (leftTrim: string, index: number) =>
			index === 0 ? leftTrim.toLowerCase() : leftTrim.toUpperCase(),
		)
		.replace(/\s+/g, "");
};

export async function defaultServiceLoader<T = unknown>(
	filepath: string,
	name: string = '',
) {

	//  convert path to url so we can import it!
	const fileUrl = pathToFileURL(filepath);

	// check if importing a directory
	const statFromFilepath = await fs.stat(filepath);
	if (statFromFilepath.isDirectory()) {
		filepath = `${filepath}${path.sep}'index.js`;
	}

	return import(fileUrl.toString())
		.then(exportedModules => {
			let allMatchedModules: Record<string, Resolver<any>> = {};

			for (let namedExport in exportedModules) {
				let exportedModule = exportedModules[namedExport];
				// Fix "default" import
				if (namedExport === 'default') exportedModule = exportedModule.default;

				// if it is a value (not a function nor a class) record it as { name, value }
				if (!isClass(exportedModule) && !isFunction(exportedModule)) {
					allMatchedModules[namedExport] = toDependencyResolver(exportedModule);
				}
				let service = exportedModule;

				if (isClass(service)) {
					// check if it has a resolver name
					let name: string = Object.getOwnPropertySymbols(service).includes(DependencyName)
						? (service as any)[DependencyName]
						: toCamelCase(service.name);

					let lifetime = Object.getOwnPropertySymbols(service).includes(DependencyLifetime)
						? ['SINGLETON', 'TRANSIENT', 'SCOPED'].includes((service as any)[DependencyLifetime])
							? (service as any)[DependencyLifetime]
							: Lifetime.SINGLETON
						: Lifetime.SINGLETON;

					allMatchedModules[name] = asClass(service, { lifetime, });
					continue;
				}

				if (isFunction(service)) {
					allMatchedModules[toCamelCase(service.name)] = asFunction(service);
					continue;
				}

				if (
					service != null
					&& typeof service === 'object'
					&& "name" in service
					&& typeof (service as any).name === 'string'
					&& "value" in service
					&& (service as any).value !== undefined
				) {
					allMatchedModules[toCamelCase(namedExport)] = asValue((service as any).value);
				}

			}
			return allMatchedModules;
		});
}