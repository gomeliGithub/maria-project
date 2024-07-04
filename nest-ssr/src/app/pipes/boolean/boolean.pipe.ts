import { Pipe, PipeTransform } from '@angular/core';

import { AppService } from '../../app.service';

@Pipe({
    name: 'boolean',
    standalone: true
})
export class BooleanPipe implements PipeTransform {
    constructor (private readonly _appService: AppService) { }
    
    transform (value: boolean): string {
        return Boolean(value) === true ? this._appService.getTranslations('ADMINPANEL.BOOLEANTRUETEXT') : this._appService.getTranslations('ADMINPANEL.BOOLEANFALSETEXT');
    }
}