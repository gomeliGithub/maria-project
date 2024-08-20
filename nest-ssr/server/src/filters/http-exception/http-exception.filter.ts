import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { Response } from 'express';

import { 
    PrismaClientInitializationError, 
    PrismaClientKnownRequestError, 
    PrismaClientRustPanicError, 
    PrismaClientUnknownRequestError, 
    PrismaClientValidationError 
} from '@prisma/client/runtime/library';

import { AppService } from '../../app.service';

import { IRequest } from 'types/global';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
    constructor (private readonly _appService: AppService) { }

    async catch (exception: HttpException, host: ArgumentsHost) {
        const ctx: HttpArgumentsHost = host.switchToHttp();
        const response: Response = ctx.getResponse<Response>();
        const request: IRequest = ctx.getRequest<IRequest>();
        const status: number = exception.getStatus();

        let errorMessage: unknown;
        let httpStatus: number;

        if ( exception instanceof PrismaClientRustPanicError ) {
            httpStatus = 400;
            errorMessage = exception.message;
        } else if ( exception instanceof PrismaClientValidationError ) {
            httpStatus = 422;
            errorMessage = exception.message;
        } else if ( exception instanceof PrismaClientKnownRequestError ) {
            httpStatus = 400;
            errorMessage = exception.message;
        } else if ( exception instanceof PrismaClientUnknownRequestError ) {
            httpStatus = 400;
            errorMessage = exception.message;
        } else if ( exception instanceof PrismaClientInitializationError ) {
            httpStatus = 400;
            errorMessage = exception.message;
        } else if ( status && status >= 400 && status <= 499 ) {
            httpStatus = status;
            errorMessage = exception.message;
        } else {
            httpStatus = 500;
            errorMessage = exception.message ?? [
                'Sorry! Something went to wrong. Please try again later',
            ];
        }

        if ( ( request.hasOwnProperty('validatedRequest') && request.validatedRequest === false ) || !request.hasOwnProperty('validatedRequest') ) await this._appService.logLineAsync(`${ process.env.SERVER_DOMAIN } [${ process.env.SERVER_API_PORT }] ${ status } ${ errorMessage }`, true, 'http');

        response.status(status).json({
            statusCode: httpStatus,
            error: typeof errorMessage === 'string' ? [errorMessage] : errorMessage,
            timestamp: new Date().toISOString(),
            path: request.url,
        });
    }
}