import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'replace'
})
export class ReplacePipe implements PipeTransform {
    transform (value: string, searchValue: string | RegExp, replaceValue: string): string {
        return value.replace(searchValue, replaceValue);
    }
}