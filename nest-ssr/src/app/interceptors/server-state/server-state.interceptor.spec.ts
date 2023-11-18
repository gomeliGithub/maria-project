import { TestBed } from '@angular/core/testing';

import { ServerStateInterceptor } from './server-state.interceptor';

describe('ServerStateInterceptor', () => {
    beforeEach(() => TestBed.configureTestingModule({
        providers: [
            ServerStateInterceptor
        ]
    }));

    it('should be created', () => {
        const interceptor: ServerStateInterceptor = TestBed.inject(ServerStateInterceptor);
        expect(interceptor).toBeTruthy();
    });
});