import { TestBed } from '@angular/core/testing';

import { BrowserStateInterceptor } from './browser-state.interceptor';

describe('BrowserStateInterceptor', () => {
    beforeEach(() => TestBed.configureTestingModule({
        providers: [
            BrowserStateInterceptor
        ]
    }));

    it('should be created', () => {
        const interceptor: BrowserStateInterceptor = TestBed.inject(BrowserStateInterceptor);
        expect(interceptor).toBeTruthy();
    });
});