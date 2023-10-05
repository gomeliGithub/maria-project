import { Test, TestingModule } from '@nestjs/testing';
import { SeoManagementService } from './seo-management.service';

describe('SeoManagementService', () => {
    let service: SeoManagementService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [SeoManagementService],
        }).compile();

        service = module.get<SeoManagementService>(SeoManagementService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});