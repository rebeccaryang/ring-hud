export type Config = {
  global: { ring: any[] };
  apps?: Record<string, { ring: any[] }>;
};

export async function loadConfig(): Promise<Config> {
  const resp = await fetch('/config.json');
  if (!resp.ok) throw new Error('Failed to load config.json');
  return resp.json();
}

export async function configForBundleId(cfg: Config, bundleId?: string) {
  if (!bundleId) return cfg.global;
  const appCfg = cfg.apps?.[bundleId];
  return appCfg ?? cfg.global;
}
