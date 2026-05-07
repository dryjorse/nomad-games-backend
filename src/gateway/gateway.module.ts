import { Global, Module } from '@nestjs/common';
import { AppGateway } from './app.gateway';
import { JwtModule } from '@nestjs/jwt';

@Global()
@Module({
  imports: [JwtModule],
  providers: [AppGateway],
  exports: [AppGateway],
})
export class GatewayModule {}
