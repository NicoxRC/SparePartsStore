import { Module } from '@nestjs/common';
import { DataicoModule } from '../dataico/dataico.module';
import { ThirdPartiesController } from './third-parties.controller';
import { ThirdPartiesService } from './third-parties.service';

@Module({
  imports: [DataicoModule],
  controllers: [ThirdPartiesController],
  providers: [ThirdPartiesService],
})
export class ThirdPartiesModule {}
