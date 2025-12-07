/**
 * Seed Missing Translations - Part 12: WooCommerce Wizard Field Labels
 * 
 * Usage: node server/scripts/seedMissingTranslations_12_woocommerce_fields.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Translation = require('../models/translation');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL, { 
      useNewUrlParser: true, 
      useUnifiedTopology: true 
    });
    console.log('Connected to MongoDB');
    return true;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error.message);
    return false;
  }
};

const translations = [
  {
    key: 'woocommerce.wizard.fields.storeUrl',
    category: 'forms',
    en: 'Store URL *',
    ga: 'URL Stórais *',
    de: 'Geschäfts-URL *',
    es: 'URL de la tienda *',
    it: 'URL negozio *',
    no: 'Butikk-URL *',
    fi: 'Kaupan URL *',
    da: 'Butiks-URL *',
    sv: 'Butiks-URL *',
    fr: 'URL du magasin *',
    pt: 'URL da loja *',
    nl: 'Winkel-URL *',
    'en-GB': 'Store URL *',
    'en-AU': 'Store URL *',
    'de-AT': 'Geschäfts-URL *',
    description: 'Store URL field label',
    context: 'StoreSelectionStep.js',
  },
  {
    key: 'woocommerce.wizard.fields.consumerKey',
    category: 'forms',
    en: 'Consumer Key *',
    ga: 'Eochair Tomhaltóra *',
    de: 'Consumer Key *',
    es: 'Clave de consumidor *',
    it: 'Chiave consumer *',
    no: 'Forbruker-nøkkel *',
    fi: 'Kuluttaja-avain *',
    da: 'Forbruger-nøgle *',
    sv: 'Konsumentnyckel *',
    fr: 'Clé client *',
    pt: 'Chave do consumidor *',
    nl: 'Consumentensleutel *',
    'en-GB': 'Consumer Key *',
    'en-AU': 'Consumer Key *',
    'de-AT': 'Consumer Key *',
    description: 'Consumer key field label',
    context: 'StoreSelectionStep.js',
  },
  {
    key: 'woocommerce.wizard.fields.consumerSecret',
    category: 'forms',
    en: 'Consumer Secret *',
    ga: 'Rún Tomhaltóra *',
    de: 'Consumer Secret *',
    es: 'Secreto de consumidor *',
    it: 'Segreto consumer *',
    no: 'Forbruker-hemmelighet *',
    fi: 'Kuluttaja-salaisuus *',
    da: 'Forbruger-hemmelighed *',
    sv: 'Konsumenthemlighet *',
    fr: 'Secret client *',
    pt: 'Segredo do consumidor *',
    nl: 'Consumentengeheim *',
    'en-GB': 'Consumer Secret *',
    'en-AU': 'Consumer Secret *',
    'de-AT': 'Consumer Secret *',
    description: 'Consumer secret field label',
    context: 'StoreSelectionStep.js',
  },
  {
    key: 'woocommerce.wizard.fields.syncDirection',
    category: 'forms',
    en: 'Sync Direction',
    ga: 'Treo Sioncronaithe',
    de: 'Synchronisierungsrichtung',
    es: 'Dirección de sincronización',
    it: 'Direzione sincronizzazione',
    no: 'Synkroniseringsretning',
    fi: 'Synkronointisuunta',
    da: 'Synkroniseringsretning',
    sv: 'Synkroniseringsriktning',
    fr: 'Direction de synchronisation',
    pt: 'Direção de sincronização',
    nl: 'Synchronisatierichting',
    'en-GB': 'Sync Direction',
    'en-AU': 'Sync Direction',
    'de-AT': 'Synchronisierungsrichtung',
    description: 'Sync direction field label',
    context: 'StoreSelectionStep.js',
  },
  {
    key: 'woocommerce.wizard.fields.webhookSecret',
    category: 'forms',
    en: 'Webhook Secret',
    ga: 'Rún Webhook',
    de: 'Webhook-Geheimnis',
    es: 'Secreto de webhook',
    it: 'Segreto webhook',
    no: 'Webhook-hemmelighet',
    fi: 'Webhook-salaisuus',
    da: 'Webhook-hemmelighed',
    sv: 'Webhook-hemlighet',
    fr: 'Secret webhook',
    pt: 'Segredo do webhook',
    nl: 'Webhook-geheim',
    'en-GB': 'Webhook Secret',
    'en-AU': 'Webhook Secret',
    'de-AT': 'Webhook-Geheimnis',
    description: 'Webhook secret field label',
    context: 'StoreSelectionStep.js',
  },
  {
    key: 'woocommerce.wizard.testConnection',
    category: 'buttons',
    en: 'Test Connection',
    ga: 'Tástáil Nasc',
    de: 'Verbindung testen',
    es: 'Probar conexión',
    it: 'Testa connessione',
    no: 'Test tilkobling',
    fi: 'Testaa yhteys',
    da: 'Test forbindelse',
    sv: 'Testa anslutning',
    fr: 'Tester la connexion',
    pt: 'Testar conexão',
    nl: 'Verbinding testen',
    'en-GB': 'Test Connection',
    'en-AU': 'Test Connection',
    'de-AT': 'Verbindung testen',
    description: 'Test connection button',
    context: 'StoreSelectionStep.js',
  },
  {
    key: 'woocommerce.wizard.connectionSuccess',
    category: 'messages',
    en: 'Connection successful!',
    ga: 'Nasc rathúil!',
    de: 'Verbindung erfolgreich!',
    es: '¡Conexión exitosa!',
    it: 'Connessione riuscita!',
    no: 'Tilkobling vellykket!',
    fi: 'Yhteys onnistui!',
    da: 'Forbindelse lykkedes!',
    sv: 'Anslutning lyckades!',
    fr: 'Connexion réussie !',
    pt: 'Conexão bem-sucedida!',
    nl: 'Verbinding geslaagd!',
    'en-GB': 'Connection successful!',
    'en-AU': 'Connection successful!',
    'de-AT': 'Verbindung erfolgreich!',
    description: 'Connection success message',
    context: 'StoreSelectionStep.js',
  },
  {
    key: 'woocommerce.wizard.connectionFailed',
    category: 'messages',
    en: 'Connection failed',
    ga: 'Theip ar an nasc',
    de: 'Verbindung fehlgeschlagen',
    es: 'Conexión fallida',
    it: 'Connessione fallita',
    no: 'Tilkobling mislyktes',
    fi: 'Yhteys epäonnistui',
    da: 'Forbindelse mislykkedes',
    sv: 'Anslutning misslyckades',
    fr: 'Connexion échouée',
    pt: 'Conexão falhou',
    nl: 'Verbinding mislukt',
    'en-GB': 'Connection failed',
    'en-AU': 'Connection failed',
    'de-AT': 'Verbindung fehlgeschlagen',
    description: 'Connection failed message',
    context: 'StoreSelectionStep.js',
  },
];

const seed = async () => {
  try {
    const connected = await connectDB();
    if (!connected) {
      process.exit(1);
    }

    let created = 0;
    let updated = 0;

    for (const translation of translations) {
      const existing = await Translation.findOne({ key: translation.key });
      
      if (existing) {
        await Translation.findOneAndUpdate(
          { key: translation.key },
          { $set: translation },
          { runValidators: true }
        );
        updated++;
        console.log(`✓ Updated: ${translation.key}`);
      } else {
        await Translation.create(translation);
        created++;
        console.log(`✓ Created: ${translation.key}`);
      }
    }

    console.log(`\n=== Part 12 Complete ===`);
    console.log(`Created: ${created}, Updated: ${updated}, Total: ${translations.length}`);

    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

seed();

