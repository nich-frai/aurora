import type { HTTPMethod } from "find-my-way";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import { default as path } from 'node:path';
import { pathToFileURL } from "node:url";
import { defaultModuleLoader } from "../src/utils/module_loader";
import { z } from "zod";
import { Controller } from "../src/controller/controller.class";
import { Route } from "../src/route/route.class";

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

export type TFilenameMatcher = string | string[] | RegExp | RegExp[] | Array<string | RegExp>;

const HttpMethods = [
  "ACL",
  "BIND",
  'CHECKOUT',
  'CONNECT',
  'COPY',
  'DELETE',
  'GET',
  'HEAD',
  'LINK',
  'LOCK',
  'M-SEARCH',
  'MERGE',
  'MKACTIVITY',
  'MKCALENDAR',
  'MKCOL',
  'MOVE',
  'NOTIFY',
  'OPTIONS',
  'PATCH',
  'POST',
  'PROPFIND',
  'PROPPATCH',
  'PURGE',
  'PUT',
  "REBIND",
  "REPORT",
  "SEARCH",
  "SOURCE",
  "SUBSCRIBE",
  "TRACE",
  "UNBIND",
  "UNLINK",
  "UNLOCK",
  "UNSUBSCRIBE"
] as HTTPMethod[];

const DEFAULT_ROUTE_MATCHER : TFilenameMatcher = new RegExp(`(?<name>.+?)\\.(?<method>${[
  // route will be the "generic" route, no method inferred
  'route', 'resource',
  // load all methods
  ...HttpMethods
].map(m => m.toLocaleLowerCase()).join('|')
  })\\.(m|c)?(j|t)s$` // load extensions .mts .cts .mjs .cjs .ts .js
);

const DEFAULT_CONTROLLER_MATCHER : TFilenameMatcher = /__(controller|middleware)\.(t|j)s$/;
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
		return this.autoloadHttpRoutes(this.root, this.root);
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

	async autoloadHttpRoutes(from: string, baseDir: string = '') {

		const currentDir = fs.readdirSync(from, { withFileTypes: true });
		const allRoutes: Route[] = [];
		const allControllers: Controller[] = [];
	
		for (let entry of currentDir) {
			if (entry.isDirectory()) {
				let loadedRoutes = await this.autoloadHttpRoutes(
					`${from}${path.sep}${entry.name}`,
					path.join(baseDir, entry.name)
				);
	
				// transform directories into new ones
				let resolvedDirName = convertFilenameToURLParameters(entry.name);
	
				// if the directory contains an url parameter we need to add it to the schema!
				if (resolvedDirName != entry.name) {
					const addUrlParameterToSchemaController = new Controller<any, any, any, any, any>();
					addUrlParameterToSchemaController.urlParams = {};
					const findOptionalNamedParameters = entry.name.match(/\[_(.+)\]/g);
					const findRequiredNamedParameters = entry.name.replace(/\[_(.+)\]/g, '').match(/\[(.+)\]/g);
					
					if (findOptionalNamedParameters != null) {
						findOptionalNamedParameters.forEach(n => {
							n = n.replace(/\[_(.+)\]/, '$1');
							addUrlParameterToSchemaController.urlParams![n] = z.string().optional();
						})
					}
	
					if (findRequiredNamedParameters != null) {
						findRequiredNamedParameters.forEach(n => {
							n = n.replace(/\[(.+)\]/, '$1');
							addUrlParameterToSchemaController.urlParams![n] = z.string();
						})
					}
					//@ts-ignore
					allControllers.push(addUrlParameterToSchemaController);
				}
				// append directory name
				loadedRoutes.forEach(r => {
					r.url = r.url == null ? path.posix.join(resolvedDirName, '') : path.posix.join(resolvedDirName, r.url);
				});
	
				allRoutes.push(...loadedRoutes);
			}
	
			if (entry.isFile()) {
				// check if it is a route
				let matchesRoute = matchesWithFileMatcher(this.routeMatcher, entry.name);
				if (matchesRoute != null) {
					let loadedRoutes = await defaultRouteModuleLoader(
						this.routeMatcher,
						`${from}${path.sep}${entry.name}`,
					);
					allRoutes.push(...loadedRoutes);
				}
	
				// chekc if it is a controller
				let matchesController = matchesWithFileMatcher(this.controllerMatcher, entry.name);
				if (matchesController != null) {
					let loadedControllers = await defaultModuleLoader(
						`${from}${path.sep}${entry.name}`,
						function (m: unknown): m is Controller { return m instanceof Controller },
					);
					allControllers.push(...loadedControllers);
				}
			}
		}
	
		for (let controller of allControllers) {
			controller.applyToRoute(...allRoutes);
		}
		return allRoutes;
	}
}

function matchesWithFileMatcher(matcher : TFilenameMatcher, filename : string) : true | null | RegExpMatchArray {
	if(typeof matcher === filename) {
		return matcher === filename ? true : null;
	}

	if(matcher instanceof RegExp) {
		return filename.match(matcher);
	}

	if(Array.isArray(matcher)) {
		for(let innerMatcher of matcher) {
			let matches = matchesWithFileMatcher(innerMatcher, filename);
			if(matches == null) continue;
			return matches;
		}
	}
	return null;

}

export async function defaultRouteModuleLoader(
	matcher : TFilenameMatcher,
  filepath: string
) {
  const fileURL = pathToFileURL(filepath);
	let hasRegExp = matchesWithFileMatcher(matcher, path.basename(filepath));
	let name : string;
	let method : string;

	if(hasRegExp !== true) {
		name = hasRegExp!.groups!.name;
		method = hasRegExp!.groups!.method;
	}
  // replace [] with named params
  name = convertFilenameToURLParameters(name! ?? '');

  // check if importing a directory
  const statFromFilepath = fs.statSync(filepath);
  if (statFromFilepath.isDirectory()) {
    filepath = `${filepath}${path.sep}index.js`;
  }

  return import(fileURL.toString())
    .then(exportedModules => {
      let allMatchedModules: Route[] = [];
      for (let namedExport in exportedModules) {
        let exportedModule = exportedModules[namedExport];
        // Fix "default" import
        if (namedExport === 'default' && exportedModule != null && exportedModule.default != null) exportedModule = exportedModule.default;

        if (exportedModule instanceof Route) {
					//@ts-ignore
          allMatchedModules.push(exportedModule);
        }
      }

      allMatchedModules.forEach(r => {
        r.method = r.method == null ? (method === 'route' ? 'get' : method as Lowercase<HTTPMethod>) : r.method;
        r.url = r.url == null ? (name === 'index' ? '' : name) : r.url
      });

      return allMatchedModules;
    });
}

export function convertFilenameToURLParameters(name: string) {
  return name
    .replace(/\[_(.+)\]/g, ':$1?') // replace [_urlParams] into {:urlParams}? (optional)
    .replace(/\[(.+)\]/g, ':$1'); // replace [urlParams] into {:urlParams}
}