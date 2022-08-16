import { ContainerOptions, InjectionMode } from "awilix";
import type { HTTPVersion } from "find-my-way";
import type Router from "find-my-way";
import type { ListenOptions } from "node:net";
import type { TransportMultiOptions } from "pino";
import type { TAppConfiguration } from "./app.config";

const AppConfig : Required<TAppConfiguration> = {
	autoload : {
		routes : './routes',
		services : './services'
	}
};

const DependencyInjectionConfig : ContainerOptions = {
	injectionMode : InjectionMode.CLASSIC
};

const HttpServerListenConfig : ListenOptions = {
	host : 'localhost',
	port : 4000,
};

const HttpRouterConfig : Router.Config<HTTPVersion.V1> = {
	allowUnsafeRegex : false,
	caseSensitive : true,
	ignoreDuplicateSlashes : true,
	ignoreTrailingSlash : true,
	defaultRoute(req, res) {
		res.statusCode = 404;
		res.end('The requested resource ([' + req.method + '] ' + req.url + ') does not exist in this server!');
	}
};

const LoggerTransports : TransportMultiOptions['targets'] = [
	{
		level : 'info',
		target : 'pino/file',
		options : {
			destination : './logs/all_app_logs.log'
		}
	},
	 {
		level : 'warn',
		target : 'pino/file',
		options : {
			destination : './logs/app_errors.log'
		}
	 }
];

export const defaultConfig = {
	app : AppConfig,
	dependencyInjection : DependencyInjectionConfig,
	logger : {
		targets : LoggerTransports
	},
	http : {
		listen : HttpServerListenConfig,
		router : HttpRouterConfig,
	}
};
