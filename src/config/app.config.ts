export const AppConfiguration = {
  autoload: {
    routes: './routes',
    services : './services'
  }
};

export type TAppConfiguration = {
  autoload : Partial<TAutoloadFrom> | true;
};

type TAutoloadFrom = {
  routes : string;
  services : string;
}