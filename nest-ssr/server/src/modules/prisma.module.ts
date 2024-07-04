import { Module } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

@Module({
    providers: [PrismaService],
    exports: [PrismaService]
})
export class PrismaModule {}

// npx prisma generate --schema=server/prisma/schema.prisma
// npx prisma migrate dev --schema=server/prisma/schema.prisma