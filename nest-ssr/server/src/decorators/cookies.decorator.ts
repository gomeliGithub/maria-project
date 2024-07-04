import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { IRequest } from 'types/global';

export const Cookies = createParamDecorator(
    ( data: string, ctx: ExecutionContext ) => {
        const request: IRequest = ctx.switchToHttp().getRequest<IRequest>();

        return data ? request.cookies?.[data] : request.cookies;
    }
);