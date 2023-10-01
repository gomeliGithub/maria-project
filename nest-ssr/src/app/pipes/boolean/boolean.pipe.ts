import { Pipe, PipeTransform } from '@angular/core';

import { AppService } from '../../app.service';

@Pipe({
    name: 'boolean'
})
export class BooleanPipe implements PipeTransform {
    constructor (private readonly appService: AppService) { }
    
    transform (value: boolean): string {
        return Boolean(value) === true ? this.appService.getTranslations('ADMINPANEL.BOOLEANTRUETEXT') : this.appService.getTranslations('ADMINPANEL.BOOLEANFALSETEXT');
    }
}