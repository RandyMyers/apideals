/**
 * Seed Missing Translations - Part 15: Toast Messages
 * 
 * Usage: node server/scripts/seedMissingTranslations_15_toast.js
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
    key: 'toast.success.linkCopied',
    category: 'messages',
    en: 'Link copied to clipboard!',
    ga: 'Nasc cóipeáilte go dtí an ghearrthaisce!',
    de: 'Link in die Zwischenablage kopiert!',
    es: '¡Enlace copiado al portapapeles!',
    it: 'Link copiato negli appunti!',
    no: 'Lenke kopiert til utklippstavlen!',
    fi: 'Linkki kopioitu leikepöydälle!',
    da: 'Link kopieret til udklipsholder!',
    sv: 'Länk kopierad till urklipp!',
    fr: 'Lien copié dans le presse-papiers !',
    pt: 'Link copiado para a área de transferência!',
    nl: 'Link gekopieerd naar klembord!',
    'en-GB': 'Link copied to clipboard!',
    'en-AU': 'Link copied to clipboard!',
    'de-AT': 'Link in die Zwischenablage kopiert!',
    description: 'Link copied success message',
    context: 'share.js',
  },
  {
    key: 'toast.info.loginRequired',
    category: 'messages',
    en: 'Please login to follow coupons/deals',
    ga: 'Logáil isteach le do thoil chun cúpóin/mhargaí a leanúint',
    de: 'Bitte melden Sie sich an, um Gutscheine/Angebote zu verfolgen',
    es: 'Por favor, inicia sesión para seguir cupones/ofertas',
    it: 'Accedi per seguire coupon/offerte',
    no: 'Vennligst logg inn for å følge kuponger/tilbud',
    fi: 'Kirjaudu sisään seurataksesi kupongkeja/tarjouksia',
    da: 'Log venligst ind for at følge kuponer/tilbud',
    sv: 'Logga in för att följa kuponger/erbjudanden',
    fr: 'Veuillez vous connecter pour suivre les coupons/offres',
    pt: 'Por favor, faça login para seguir cupons/ofertas',
    nl: 'Log in om kortingscodes/aanbiedingen te volgen',
    'en-GB': 'Please login to follow coupons/deals',
    'en-AU': 'Please login to follow coupons/deals',
    'de-AT': 'Bitte melden Sie sich an, um Gutscheine/Angebote zu verfolgen',
    description: 'Login required message',
    context: 'couponCard.js, couponModal.js',
  },
  {
    key: 'toast.info.loginRequiredDeals',
    category: 'messages',
    en: 'Please login to follow deals',
    ga: 'Logáil isteach le do thoil chun margaí a leanúint',
    de: 'Bitte melden Sie sich an, um Angebote zu verfolgen',
    es: 'Por favor, inicia sesión para seguir ofertas',
    it: 'Accedi per seguire offerte',
    no: 'Vennligst logg inn for å følge tilbud',
    fi: 'Kirjaudu sisään seurataksesi tarjouksia',
    da: 'Log venligst ind for at følge tilbud',
    sv: 'Logga in för att följa erbjudanden',
    fr: 'Veuillez vous connecter pour suivre les offres',
    pt: 'Por favor, faça login para seguir ofertas',
    nl: 'Log in om aanbiedingen te volgen',
    'en-GB': 'Please login to follow deals',
    'en-AU': 'Please login to follow deals',
    'de-AT': 'Bitte melden Sie sich an, um Angebote zu verfolgen',
    description: 'Login required for deals message',
    context: 'dealCard.js, dealsModal.js',
  },
  {
    key: 'toast.error.followFailed',
    category: 'messages',
    en: 'Failed to update follow status',
    ga: 'Theip ar stádas leanúna a nuashonrú',
    de: 'Fehler beim Aktualisieren des Verfolgungsstatus',
    es: 'Error al actualizar el estado de seguimiento',
    it: 'Impossibile aggiornare lo stato di follow',
    no: 'Kunne ikke oppdatere følgestatus',
    fi: 'Seuraustilan päivitys epäonnistui',
    da: 'Kunne ikke opdatere følgestatus',
    sv: 'Kunde inte uppdatera följstatus',
    fr: 'Échec de la mise à jour du statut de suivi',
    pt: 'Falha ao atualizar status de seguimento',
    nl: 'Kon volgstatus niet bijwerken',
    'en-GB': 'Failed to update follow status',
    'en-AU': 'Failed to update follow status',
    'de-AT': 'Fehler beim Aktualisieren des Verfolgungsstatus',
    description: 'Follow status update failed',
    context: 'couponCard.js, dealCard.js, couponModal.js, dealsModal.js',
  },
  {
    key: 'toast.error.connectionTestFailed',
    category: 'messages',
    en: 'Connection test failed',
    ga: 'Theip ar thástáil nasc',
    de: 'Verbindungstest fehlgeschlagen',
    es: 'Prueba de conexión fallida',
    it: 'Test di connessione fallito',
    no: 'Tilkoblingstest mislyktes',
    fi: 'Yhteyden testaus epäonnistui',
    da: 'Forbindelsestest mislykkedes',
    sv: 'Anslutningstest misslyckades',
    fr: 'Test de connexion échoué',
    pt: 'Teste de conexão falhou',
    nl: 'Verbindingstest mislukt',
    'en-GB': 'Connection test failed',
    'en-AU': 'Connection test failed',
    'de-AT': 'Verbindungstest fehlgeschlagen',
    description: 'Connection test failed message',
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

    console.log(`\n=== Part 15 Complete ===`);
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

