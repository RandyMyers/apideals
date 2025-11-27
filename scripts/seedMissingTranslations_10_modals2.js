/**
 * Seed Missing Translations - Part 10: Modal Translations (Part 2)
 * 
 * Usage: node server/scripts/seedMissingTranslations_10_modals2.js
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
    key: 'modals.viewStore',
    category: 'buttons',
    en: 'View Store',
    ga: 'Stór a Fheiceáil',
    de: 'Geschäft ansehen',
    es: 'Ver tienda',
    it: 'Visualizza negozio',
    no: 'Se butikk',
    fi: 'Näytä kauppa',
    da: 'Se butik',
    sv: 'Visa butik',
    description: 'View store button',
    context: 'couponModal.js, dealsModal.js',
  },
  {
    key: 'modals.getDeal',
    category: 'buttons',
    en: 'Get Deal',
    ga: 'Faigh Margadh',
    de: 'Angebot erhalten',
    es: 'Obtener oferta',
    it: 'Ottieni offerta',
    no: 'Få tilbud',
    fi: 'Hae tarjous',
    da: 'Få tilbud',
    sv: 'Få erbjudande',
    description: 'Get deal button',
    context: 'dealsModal.js',
  },
  {
    key: 'modals.verified',
    category: 'common',
    en: 'Verified',
    ga: 'Fíoraithe',
    de: 'Verifiziert',
    es: 'Verificado',
    it: 'Verificato',
    no: 'Verifisert',
    fi: 'Vahvistettu',
    da: 'Verificeret',
    sv: 'Verifierad',
    description: 'Verified badge',
    context: 'couponModal.js, dealsModal.js',
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

    console.log(`\n=== Part 10 Complete ===`);
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

