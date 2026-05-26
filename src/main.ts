import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: 'http://localhost:5173',
    credentials: true,
  });

  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const config = new DocumentBuilder()
    .setTitle('Toguz Korgool API')
    .setDescription('API документация')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      urls: [
        {
          url: '/api-json',
          name: 'OpenAPI JSON',
        },
      ],
    },
  });

  app
    .getHttpAdapter()
    .getInstance()
    .get('/api-json', (req, res) => {
      res.json(document);
    });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
