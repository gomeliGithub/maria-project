import { Body, Controller, Get, Param, Req } from '@nestjs/common';

import * as fsPromises from 'fs/promises';

import { ClientTypes } from './decorators/client.types.decorator';

import { IRequest, IRequestBody } from 'types/global';

@Controller('/main')
export class AppController {
    constructor () { }

    @Get('/checkAccess')
    @ClientTypes('admin', 'member')
    async checkAccess (): Promise<boolean> {
        return true;
    }

    @Get('/getMainPage/:pageName')
    async getMainPage (@Req() request: IRequest, @Body() requestBody: IRequestBody, @Param() params: any): Promise<string> {
        console.log(request.url);
        console.log(requestBody);
        console.log(params.pageName);

        const page = await fsPromises.readFile('../nginx/home.html', { encoding: 'utf8' });

        return page;
    }
}