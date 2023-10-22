import { TestBed } from '@angular/core/testing';

import { TranslateInterceptor } from './translate.interceptor';

describe('TranslateInterceptor', () => {
    beforeEach(() => TestBed.configureTestingModule({
        providers: [
            TranslateInterceptor
        ]
    }));

    it('should be created', () => {
        const interceptor: TranslateInterceptor = TestBed.inject(TranslateInterceptor);
        expect(interceptor).toBeTruthy();
    });
});