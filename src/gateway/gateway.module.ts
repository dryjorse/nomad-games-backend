import { Global, Module } from '@nestjs/common';
import { AppGateway } from './app.gateway';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
      }),
    }),
  ],
  providers: [AppGateway],
  exports: [AppGateway],
})
export class GatewayModule {}
