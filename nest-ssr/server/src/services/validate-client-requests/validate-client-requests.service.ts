import { Injectable } from '@nestjs/common';

import { Client_order_status } from '@prisma/client';

@Injectable()
export class ValidateClientRequestsService {
    constructor () { }

    public getClientOrdersValidator (options: {}): boolean {
        const memberLogin: string | undefined = options['memberLogin'] ? (options['memberLogin'] as string).trim() : undefined;
        const fromDate: Date | undefined = options['fromDate'] ? new Date(options['fromDate']) : undefined;
        const untilDate: Date | undefined = options['untilDate'] ? new Date(options['untilDate']) : undefined;
        const status: string | undefined = options['status'] ? (options['status'] as string).trim() : undefined;
        const ordersLimit: number | undefined = options['ordersLimit'] ? parseInt(options['ordersLimit'], 10) : undefined;
        const existsCount: number | undefined = options['existsCount'] ? parseInt(options['existsCount'], 10) : undefined;

        let result: boolean = true;

        if ( memberLogin && memberLogin === ''
            || fromDate && fromDate.toString() === 'Invalid Date' 
            || untilDate && untilDate.toString() === 'Invalid Date'
            || status && !( status in Client_order_status )
            || ordersLimit && ( Number.isNaN(ordersLimit) || ordersLimit > 15 )
            || existsCount && Number.isNaN(existsCount)
        ) result = false;

        return result;
    }
}