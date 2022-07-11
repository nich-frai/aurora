import { DevelopmentEnvironment } from './runners/dev';
import { print, println } from './utils/print';
import kleur from 'kleur';
import { performance } from 'node:perf_hooks';

println(`🌄 aurora:cli - ${kleur.gray('development')}\n`);

const startTime = performance.now();

const env = new DevelopmentEnvironment;
env
  .start()
  .then((_) => {
		print(`✔️ done bootstrapping the development env! took ${(performance.now() - startTime).toFixed(2)}ms\n`);
	})
  .catch((err) => {
    print(err);
    process.exit();
  });
