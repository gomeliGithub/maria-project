import { Test, TestingModule } from '@nestjs/testing';
import { ValidateClientRequestsService } from './validate-client-requests.service';

describe('ValidateClientRequestsService', () => {
    let service: ValidateClientRequestsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [ValidateClientRequestsService],
        }).compile();

        service = module.get<ValidateClientRequestsService>(ValidateClientRequestsService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});