import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { requestId?: string }>();
    const requestId = request.requestId ?? request.header('x-request-id') ?? undefined;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'An unexpected error occurred';
    let error = 'Internal Server Error';
    let details: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (body && typeof body === 'object') {
        const obj = body as Record<string, unknown>;
        message = (obj.message as string | string[]) ?? exception.message;
        error = (obj.error as string) ?? exception.name;
        details = obj.details;
      }
      error = exception.name;
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        status = HttpStatus.CONFLICT;
        error = 'Conflict';
        message = 'A record with these unique values already exists';
        details = { fields: exception.meta?.target };
      } else if (exception.code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        error = 'Not Found';
        message = 'The requested record was not found';
      } else if (exception.code === 'P2003') {
        status = HttpStatus.BAD_REQUEST;
        error = 'Bad Request';
        message = 'Related record constraint failed';
      }
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      error = 'Validation Error';
      message = 'Invalid data supplied';
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      level: status >= 500 ? 'error' : 'warn',
      context: 'ExceptionFilter',
      requestId,
      method: request.method,
      path: request.originalUrl?.split('?')[0],
      status,
      error,
      message,
    };
    if (status >= 500) this.logger.error(JSON.stringify(logEntry), exception instanceof Error ? exception.stack : undefined);
    else this.logger.warn(JSON.stringify(logEntry));

    response.status(status).json({
      statusCode: status,
      error,
      message,
      ...(details ? { details } : {}),
      ...(requestId ? { requestId } : {}),
      path: request.originalUrl?.split('?')[0],
      timestamp: new Date().toISOString(),
    });
  }
}
