import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configuración de Swagger
  const config = new DocumentBuilder()
    .setTitle('CEA - Agricultura de Ambiente Controlado')
    .setDescription(
      'API para monitoreo, automatización y análisis predictivo de cultivos',
    )
    .setVersion('0.1.0')
    .addTag('health', 'Endpoint de salud del sistema')
    .addTag('telemetry', 'Consulta de telemetría de sensores')
    .addTag('devices', 'Gestión de dispositivos ESP32')
    .addTag('sensors', 'Gestión de sensores')
    .addTag('actuators', 'Control de actuadores')
    .addTag('config', 'Configuración de sensores')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document); // Swagger UI en /api/docs

  await app.listen(3000);

  console.log(`Aplicación corriendo en http://localhost:3000`);
  console.log(`Swagger UI disponible en http://localhost:3000/api/docs`);
}
bootstrap();
