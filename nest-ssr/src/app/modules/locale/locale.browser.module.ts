import { HttpClient } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { TranslateCacheService, TranslateCacheSettings } from 'ngx-translate-cache';

@NgModule({
    imports: [
        TranslateModule.forRoot({
            loader: {
                provide: TranslateLoader,
                useFactory: translateLoaderFactory,
                deps: [HttpClient]
            }
        }),
        /*TranslateCacheModule.forRoot({
            cacheService: {
                provide: TranslateCacheService,
                useFactory: translateCacheFactory,
                deps: [TranslateService, TranslateCacheSettings]
            },
            cacheMechanism: 'Cookie'
        })*/
    ]
})
export class I18nBrowserModule {
    constructor (
        translate: TranslateService,
        translateCacheService: TranslateCacheService
    ) {  
        translateCacheService.init();
        translate.addLangs(['en', 'ru']);

        const browserLang = translateCacheService.getCachedLanguage() || translate.getBrowserLang();
        translate.use(browserLang.match(/en | ru/) ? browserLang : 'en');
    }
}

export function translateLoaderFactory(httpClient: HttpClient) {
    return new TranslateHttpLoader(httpClient);
}

export function translateCacheFactory(translateService: TranslateService, translateCacheSettings: TranslateCacheSettings) {
    return new TranslateCacheService(translateService, translateCacheSettings);
}