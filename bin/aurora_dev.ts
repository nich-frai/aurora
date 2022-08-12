#!/usr/bin/env node --loader tsx
import { DevelopmentEnvironment } from './scripts/dev';
import { print, println } from './utils/print';
import kleur from 'kleur';
import { performance } from 'node:perf_hooks';
import { createContainer, InjectionMode } from 'awilix';
import { AuroraRouteAutoloader } from './route_provider';
import { AuroraServiceProvider } from './service_provider';
import path from 'node:path';

println(`🌄 aurora:cli - ${kleur.gray('development')}\n`);

const startTime = performance.now();

const container = createContainer({
	injectionMode : InjectionMode.CLASSIC
});

const env = new DevelopmentEnvironment({
  container,
  routeProvider: new AuroraRouteAutoloader(
    path.join(process.cwd(), 'src', 'routes')
  ),
  serviceProvider: new AuroraServiceProvider(
    container,
    path.join(process.cwd(), 'src', 'services')
  )
});


env
  .start()
  .then((_) => {
    print(`✔️ done bootstrapping the development server! took ${(performance.now() - startTime).toFixed(2)}ms\n`);
  })
  .catch((err) => {
    print(err);
    process.exit();
  });
