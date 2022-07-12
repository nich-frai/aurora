import { asValue, createContainer, type AwilixContainer } from "awilix";
import createRouter, { HTTPMethod } from 'find-my-way';
import type { Server as HttpServer } from "node:http";
import type { Server as HttpsServer } from "node:https";
import { Logger } from "../../src/logger";
import { defaultConfig } from "../../src/config/default.config";
import { resolveHttpServer } from "../../src/utils/resolve_to_http_server";
import { type IRouteObservable, type IRouteProvider, isRouteProvider, AuroraRouteAutoloader } from "../route_provider";
import { type IServiceObservable, type IServiceProvider, isServiceProvider } from "../service_provider";
import { HTTPHandler } from "../../src/handler/handler.class";

export class DevelopmentEnvironment {

	#container?: AwilixContainer;

	#server?: Server;

	#projectRoot?: string;

	routeProvider?: IRouteObservable | IRouteProvider;

	serviceProvider?: IServiceObservable | IServiceProvider;

	get root() {
		if (this.#projectRoot == null) {
			this.#projectRoot = process.cwd();
		}

		return this.#projectRoot;
	}

	set root(root: string) {
		this.#projectRoot = root;
	}

	get dependencyContainer() {
		if (this.#container == null) {
			this.#container = createContainer(defaultConfig.dependencyInjection);
		}
		return this.#container;
	}

	set dependencyContainer(container: AwilixContainer) {
		this.#container = container;
	}

	#config?: IDevelopmentEnvironmentOptions;

	constructor(options?: IDevelopmentEnvironmentOptions) {
		this.#config = options;

		this.#projectRoot = options?.projectRoot;
		this.#container = options?.container;
		this.routeProvider = options?.routeProvider;
		this.serviceProvider = options?.serviceProvider;
	}

	async start() {

		// unless specified, enable development logs for stdout
		if (this.#config?.enableDevLogger !== false) {
			Logger.enableDevOutput();
		}

		const container = this.dependencyContainer;

		// register configuration
		container.register({
			"aurora.logger.config": asValue(defaultConfig.logger),
			"aurora.dev_script.config": asValue(defaultConfig.app),
		});

		const httpRouter = createRouter(defaultConfig.http.router);
		const httpServer = await resolveHttpServer(this.#server ?? true);
		httpServer.on('request', httpRouter.lookup.bind(httpRouter));

		// register core functionalities
		container.register({
			"aurora.container.instance": asValue(container),
			"aurora.logger.instance": asValue(new Logger(container, "aurora")),
			"aurora.http.server.instance": asValue(httpServer),
			"aurora.http.router.instance": asValue(httpRouter),
		});

		const logger = container.resolve<Logger>("aurora.logger.instance");

		// lookup for routes and services

		if (isServiceProvider(this.serviceProvider)) {
			const services = await this.serviceProvider.provideServices();
			container.register(services);
		}

		if (isRouteProvider(this.routeProvider)) {
			const routes = await this.routeProvider.provideRoutes();
			console.log(routes.map(r => `${r.method}::/${r.url}`))
			for (let route of routes) {
				const handler = new HTTPHandler(
					container,
					route
				);

				httpRouter.on(
					route.method?.toLocaleUpperCase() as HTTPMethod ?? 'GET',
					route.url?.charAt(0) === '/' ? route.url : '/' + route.url ?? '/',
					handler.handle.bind(handler)
				);
			}
		}

		return new Promise<void>((resolve, reject) => {
			httpServer.listen(defaultConfig.http.listen, () => {
				logger.log("Http server started listening at", httpServer.address());
				resolve();
			});

			httpServer.once("error", (e) => {
				reject(e);
			});
		});
	}
}

interface IDevelopmentEnvironmentOptions {
	projectRoot?: string;
	container?: AwilixContainer;
	enableDevLogger?: boolean;
	routeProvider?: IRouteProvider | IRouteObservable;
	serviceProvider?: IServiceProvider | IServiceObservable;
	watch?: boolean;
}

interface IServiceAutoloaderOptions {

}
interface IRouteAutoloaderOptions {
	controllerMatcher?: AuroraRouteAutoloader['controllerMatcher'];
	routeMatcher?: AuroraRouteAutoloader['routeMatcher'];
	watchChanges?: AuroraRouteAutoloader['watch'];
	indexPattern?: AuroraRouteAutoloader['indexPattern'];
}

type Server = HttpServer | HttpsServer

