import { SetMetadata } from '@nestjs/common';

export const ClientTypes = (...clientTypes: string[]) => SetMetadata('client-types', clientTypes);