import { asValue, createContainer, type AwilixContainer } from "awilix";
import createRouter from 'find-my-way';
import type { Server as HttpServer } from "node:http";
import type { Server as HttpsServer } from "node:https";
import { Logger } from "../../src/logger";
import { defaultConfig } from "../../src/config/default.config";
import { resolveHttpServer } from "../../src/utils/resolve_to_http_server";
import { type IRouteObservable, type IRouteProvider, isRouteProvider, AuroraRouteAutoloader } from "../route_provider";
import { type IServiceObservable, type IServiceProvider, isServiceProvider } from "../service_provider";

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

	#config? : IDevelopmentEnvironmentOptions;

	constructor(options?: IDevelopmentEnvironmentOptions) {
		this.#config = options;
		
		this.#projectRoot = options?.projectRoot;
		this.#container = options?.container;
	}

	async start() {
		
		// unless specified, enable development logs for stdout
		if(this.#config?.enableDevLogger !== false) {
			Logger.enableDevOutput();
		}

		const container = this.dependencyContainer;

		// register configuration
		container.register({
			"aurora.logger.config": asValue(defaultConfig.logger),
			"aurora.dev_script.config" : asValue(defaultConfig.app), 
		});

		const httpRouter = createRouter(defaultConfig.http.router);
		const httpServer = await resolveHttpServer(this.#server ?? true);

		// register core functionalities
		container.register({
			"aurora.container.instance": asValue(container),
			"aurora.logger.instance": asValue(new Logger(container, "aurora")),
			"aurora.http.server.instance": asValue(httpServer),
			"aurora.http.router.instance": asValue(httpRouter),
		});

		const logger = container.resolve<Logger>("aurora.logger.instance");

		// lookup for routes and services

		if (isRouteProvider(this.routeProvider)) {
			const routes = await this.routeProvider.provideRoutes();
		}

		if (isServiceProvider(this.serviceProvider)) {
			const services = await this.serviceProvider.provideServices();
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
	projectRoot? : string;
	container?: AwilixContainer;
	enableDevLogger? : boolean;
	routeAutoloader? : IRouteAutoloaderOptions;
	serviceAutoloader? : IServiceAutoloaderOptions;
	watch? : boolean;
}

interface IServiceAutoloaderOptions {

}
interface IRouteAutoloaderOptions {
	controllerMatcher? : AuroraRouteAutoloader['controllerMatcher'];
	routeMatcher? : AuroraRouteAutoloader['routeMatcher'];
	watchChanges? : AuroraRouteAutoloader['watch'];
	indexPattern? : AuroraRouteAutoloader['indexPattern'];
}

type Server = HttpServer | HttpsServer

