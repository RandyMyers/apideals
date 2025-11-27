/**
 * Seed Missing Translations - Part 13: Error Boundary Translations
 * 
 * Usage: node server/scripts/seedMissingTranslations_13_error_boundary.js
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
    key: 'errors.boundary.title',
    category: 'messages',
    en: 'Something went wrong',
    ga: 'Chuaigh rud éigin mícheart',
    de: 'Etwas ist schief gelaufen',
    es: 'Algo salió mal',
    it: 'Qualcosa è andato storto',
    no: 'Noe gikk galt',
    fi: 'Jotain meni pieleen',
    da: 'Noget gik galt',
    sv: 'Något gick fel',
    description: 'Error boundary title',
    context: 'ErrorBoundary.js',
  },
  {
    key: 'errors.boundary.message',
    category: 'messages',
    en: 'We encountered an unexpected error. Please try refreshing the page.',
    ga: 'Bhuail earráid gan choinne linn. Déan iarracht an leathanach a athnuachan.',
    de: 'Wir sind auf einen unerwarteten Fehler gestoßen. Bitte versuchen Sie, die Seite zu aktualisieren.',
    es: 'Encontramos un error inesperado. Por favor, intenta actualizar la página.',
    it: 'Abbiamo riscontrato un errore imprevisto. Prova ad aggiornare la pagina.',
    no: 'Vi støtte på en uventet feil. Prøv å oppdatere siden.',
    fi: 'Kohtasimme odottamattoman virheen. Yritä päivittää sivu.',
    da: 'Vi stødte på en uventet fejl. Prøv at opdatere siden.',
    sv: 'Vi stötte på ett oväntat fel. Försök att uppdatera sidan.',
    description: 'Error boundary message',
    context: 'ErrorBoundary.js',
  },
  {
    key: 'errors.boundary.details',
    category: 'messages',
    en: 'Error Details (Development Only):',
    ga: 'Sonraí Earráide (Forbairt Amháin):',
    de: 'Fehlerdetails (Nur Entwicklung):',
    es: 'Detalles del error (Solo desarrollo):',
    it: 'Dettagli errore (Solo sviluppo):',
    no: 'Feildetaljer (Kun utvikling):',
    fi: 'Virheen tiedot (Vain kehitys):',
    da: 'Fejldetaljer (Kun udvikling):',
    sv: 'Felinformation (Endast utveckling):',
    description: 'Error details label',
    context: 'ErrorBoundary.js',
  },
  {
    key: 'errors.boundary.reload',
    category: 'buttons',
    en: 'Reload Page',
    ga: 'Athlódáil Leathanach',
    de: 'Seite neu laden',
    es: 'Recargar página',
    it: 'Ricarica pagina',
    no: 'Last inn siden på nytt',
    fi: 'Lataa sivu uudelleen',
    da: 'Genindlæs side',
    sv: 'Ladda om sidan',
    description: 'Reload page button',
    context: 'ErrorBoundary.js',
  },
  {
    key: 'errors.boundary.goHome',
    category: 'buttons',
    en: 'Go Home',
    ga: 'Téigh Abhaile',
    de: 'Zur Startseite',
    es: 'Ir a inicio',
    it: 'Vai alla home',
    no: 'Gå til hjem',
    fi: 'Siirry etusivulle',
    da: 'Gå til hjem',
    sv: 'Gå till hem',
    description: 'Go home button',
    context: 'ErrorBoundary.js',
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

    console.log(`\n=== Part 13 Complete ===`);
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

