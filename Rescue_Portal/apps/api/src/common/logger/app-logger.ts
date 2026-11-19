import type { LoggerService } from '@nestjs/common';

type Level = 'debug' | 'info' | 'warn' | 'error';

export class AppLogger implements LoggerService {
  constructor(private readonly context = 'RescuePortal') {}

  private write(level: Level, message: unknown, context?: string, meta?: unknown): void {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      context: context ?? this.context,
      message: typeof message === 'string' ? message : JSON.stringify(message),
      ...(meta && typeof meta === 'object' ? { meta } : {}),
    };
    const line = JSON.stringify(entry);
    if (level === 'error') console.error(line);
    else if (level === 'warn') console.warn(line);
    else console.log(line);
  }

  log(message: unknown, context?: string): void {
    this.write('info', message, context);
  }
  error(message: unknown, stack?: string, context?: string): void {
    this.write('error', message, context, stack ? { stack } : undefined);
  }
  warn(message: unknown, context?: string): void {
    this.write('warn', message, context);
  }
  debug(message: unknown, context?: string): void {
    if (process.env.NODE_ENV !== 'production') this.write('debug', message, context);
  }
  verbose(message: unknown, context?: string): void {
    if (process.env.NODE_ENV !== 'production') this.write('debug', message, context);
  }
}
