import { Test, TestingModule } from '@nestjs/testing';
import { ImageControlService } from './image-control.service';

describe('ImageControlService', () => {
    let service: ImageControlService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [ImageControlService],
        }).compile();

        service = module.get<ImageControlService>(ImageControlService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});