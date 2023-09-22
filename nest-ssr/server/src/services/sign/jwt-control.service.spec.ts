import { Test, TestingModule } from '@nestjs/testing';
import { JwtControlService } from './jwt-control.service';

describe('JwtControlService', () => {
    let service: JwtControlService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [JwtControlService],
        }).compile();

        service = module.get<JwtControlService>(JwtControlService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});