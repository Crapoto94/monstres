const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');
const { WhatsAppService } = require('./dist/whatsapp/whatsapp.service');

(async () => {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['warn', 'error', 'log'] });
  const whatsapp = app.get(WhatsAppService);
  try {
    await whatsapp.sendNotification('+33650175343', 'Ceci est un test de notification Les Monstres.');
    console.log('Message envoyé avec succès.');
  } catch (e) {
    console.error('Échec:', e.message);
  }
  await app.close();
})();
