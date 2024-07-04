import { Pipe, PipeTransform } from '@angular/core';

import { AppService } from '../../app.service';

@Pipe({
    name: 'imageSize',
    standalone: true
})
export class ImageSizePipe implements PipeTransform {
    constructor (private readonly _appService: AppService) { }

    transform (value: number, decimals: number = 2): string {
        const kb: number = 1024;
        const dm: number = decimals < 0 ? 0 : decimals;

		const sizeNumber: number = Math.floor(Math.log(value) / Math.log(kb));
        
        let resultSizeName: string = '';

        switch ( sizeNumber ) {
            case 0: { resultSizeName = this._appService.getTranslations('ADMINPANEL.IMAGESIZES.BYTE'); break; }
            case 1: { resultSizeName = this._appService.getTranslations('ADMINPANEL.IMAGESIZES.KBYTE'); break; }
            case 2: { resultSizeName = this._appService.getTranslations('ADMINPANEL.IMAGESIZES.MBYTE'); break; }
            case 3: { resultSizeName = this._appService.getTranslations('ADMINPANEL.IMAGESIZES.GBYTE'); break; }
            case 4: { resultSizeName = this._appService.getTranslations('ADMINPANEL.IMAGESIZES.TBYTE'); break; }
        }

        return `${ parseFloat((value / Math.pow(kb, sizeNumber)).toFixed(dm)) } ${ resultSizeName }`;
    }
}