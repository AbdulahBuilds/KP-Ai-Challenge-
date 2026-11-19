const REQUIRED = ['DATABASE_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];

export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const errors: string[] = [];
  for (const key of REQUIRED) {
    if (!config[key] || String(config[key]).trim() === '') errors.push(`${key} is required`);
  }
  const isProduction = config.NODE_ENV === 'production';
  if (isProduction) {
    for (const key of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET']) {
      if (String(config[key] ?? '').length < 32) errors.push(`${key} must be at least 32 characters in production`);
    }
    if (String(config.JWT_ACCESS_SECRET) === String(config.JWT_REFRESH_SECRET)) {
      errors.push('JWT access and refresh secrets must differ');
    }
    if (config.EXPOSE_DEV_TOKENS === 'true') {
      errors.push('EXPOSE_DEV_TOKENS must not be enabled in production');
    }
    if (config.HOSPITAL_ADAPTER === 'mock' && config.ALLOW_MOCK_IN_PRODUCTION !== 'true') {
      errors.push('HOSPITAL_ADAPTER=mock is not permitted in production (set ALLOW_MOCK_IN_PRODUCTION only for demos)');
    }
  }
  if (errors.length > 0) {
    throw new Error(`Environment validation failed:\n- ${errors.join('\n- ')}`);
  }
  return config;
}
