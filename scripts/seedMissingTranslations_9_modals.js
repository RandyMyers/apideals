/**
 * Seed Missing Translations - Part 9: Modal Translations
 * 
 * Usage: node server/scripts/seedMissingTranslations_9_modals.js
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
    key: 'modals.coupon.about',
    category: 'pages',
    en: 'About This Coupon',
    ga: 'Faoi an Cúpón seo',
    de: 'Über diesen Gutschein',
    es: 'Acerca de este cupón',
    it: 'Informazioni su questo coupon',
    no: 'Om denne kupongen',
    fi: 'Tietoja tästä kupongista',
    da: 'Om denne kupon',
    sv: 'Om denna kupong',
    description: 'About coupon section title',
    context: 'couponModal.js',
  },
  {
    key: 'modals.deal.about',
    category: 'pages',
    en: 'About This Deal',
    ga: 'Faoi an Margadh seo',
    de: 'Über dieses Angebot',
    es: 'Acerca de esta oferta',
    it: 'Informazioni su questa offerta',
    no: 'Om dette tilbudet',
    fi: 'Tietoja tästä tarjouksesta',
    da: 'Om dette tilbud',
    sv: 'Om detta erbjudande',
    description: 'About deal section title',
    context: 'dealsModal.js',
  },
  {
    key: 'modals.validUntil',
    category: 'pages',
    en: 'Valid Until',
    ga: 'Bailí Go Dtí',
    de: 'Gültig bis',
    es: 'Válido hasta',
    it: 'Valido fino al',
    no: 'Gyldig til',
    fi: 'Voimassa asti',
    da: 'Gyldig til',
    sv: 'Giltigt till',
    description: 'Valid until label',
    context: 'couponModal.js, dealsModal.js',
  },
  {
    key: 'modals.expired',
    category: 'pages',
    en: 'Expired',
    ga: 'As éag',
    de: 'Abgelaufen',
    es: 'Expirado',
    it: 'Scaduto',
    no: 'Utløpt',
    fi: 'Vanhentunut',
    da: 'Udløbet',
    sv: 'Utgången',
    description: 'Expired label',
    context: 'couponModal.js, dealsModal.js',
  },
  {
    key: 'modals.howToUse',
    category: 'pages',
    en: 'How to Use',
    ga: 'Conas a Úsáid',
    de: 'Wie zu verwenden',
    es: 'Cómo usar',
    it: 'Come usare',
    no: 'Hvordan bruke',
    fi: 'Kuinka käyttää',
    da: 'Sådan bruges',
    sv: 'Hur man använder',
    description: 'How to use section title',
    context: 'couponModal.js, dealsModal.js',
  },
  {
    key: 'modals.follow',
    category: 'buttons',
    en: 'Follow',
    ga: 'Lean',
    de: 'Folgen',
    es: 'Seguir',
    it: 'Segui',
    no: 'Følg',
    fi: 'Seuraa',
    da: 'Følg',
    sv: 'Följ',
    description: 'Follow button',
    context: 'couponModal.js, dealsModal.js',
  },
  {
    key: 'modals.following',
    category: 'buttons',
    en: 'Following',
    ga: 'Ag Leanúint',
    de: 'Wird verfolgt',
    es: 'Siguiendo',
    it: 'Seguendo',
    no: 'Følger',
    fi: 'Seurataan',
    da: 'Følger',
    sv: 'Följer',
    description: 'Following button state',
    context: 'couponModal.js, dealsModal.js',
  },
  {
    key: 'modals.unfollow',
    category: 'buttons',
    en: 'Unfollow',
    ga: 'Díleanúint',
    de: 'Nicht mehr verfolgen',
    es: 'Dejar de seguir',
    it: 'Smetti di seguire',
    no: 'Slutt å følge',
    fi: 'Lopeta seuraaminen',
    da: 'Følg ikke længere',
    sv: 'Sluta följa',
    description: 'Unfollow button',
    context: 'couponModal.js, dealsModal.js',
  },
  {
    key: 'modals.copyCode',
    category: 'buttons',
    en: 'Copy Code',
    ga: 'Cód a Chóipeáil',
    de: 'Code kopieren',
    es: 'Copiar código',
    it: 'Copia codice',
    no: 'Kopier kode',
    fi: 'Kopioi koodi',
    da: 'Kopier kode',
    sv: 'Kopiera kod',
    description: 'Copy code button',
    context: 'couponModal.js',
  },
  {
    key: 'modals.codeCopied',
    category: 'messages',
    en: 'Code Copied!',
    ga: 'Cód Cóipeáilte!',
    de: 'Code kopiert!',
    es: '¡Código copiado!',
    it: 'Codice copiato!',
    no: 'Kode kopiert!',
    fi: 'Koodi kopioitu!',
    da: 'Kode kopieret!',
    sv: 'Kod kopierad!',
    description: 'Code copied message',
    context: 'couponModal.js',
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

    console.log(`\n=== Part 9 Complete ===`);
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

