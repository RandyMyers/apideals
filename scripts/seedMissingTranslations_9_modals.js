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
    fr: 'À propos de ce coupon',
    pt: 'Sobre este cupom',
    nl: 'Over deze kortingscode',
    'en-GB': 'About This Coupon',
    'en-AU': 'About This Coupon',
    'de-AT': 'Über diesen Gutschein',
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
    fr: 'À propos de cette offre',
    pt: 'Sobre esta oferta',
    nl: 'Over deze aanbieding',
    'en-GB': 'About This Deal',
    'en-AU': 'About This Deal',
    'de-AT': 'Über dieses Angebot',
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
    fr: 'Valide jusqu\'au',
    pt: 'Válido até',
    nl: 'Geldig tot',
    'en-GB': 'Valid Until',
    'en-AU': 'Valid Until',
    'de-AT': 'Gültig bis',
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
    fr: 'Expiré',
    pt: 'Expirado',
    nl: 'Verlopen',
    'en-GB': 'Expired',
    'en-AU': 'Expired',
    'de-AT': 'Abgelaufen',
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
    fr: 'Comment utiliser',
    pt: 'Como usar',
    nl: 'Hoe te gebruiken',
    'en-GB': 'How to Use',
    'en-AU': 'How to Use',
    'de-AT': 'Wie zu verwenden',
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
    fr: 'Suivre',
    pt: 'Seguir',
    nl: 'Volgen',
    'en-GB': 'Follow',
    'en-AU': 'Follow',
    'de-AT': 'Folgen',
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
    fr: 'Suivi',
    pt: 'Seguindo',
    nl: 'Volgend',
    'en-GB': 'Following',
    'en-AU': 'Following',
    'de-AT': 'Wird verfolgt',
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
    fr: 'Ne plus suivre',
    pt: 'Deixar de seguir',
    nl: 'Ontvolgen',
    'en-GB': 'Unfollow',
    'en-AU': 'Unfollow',
    'de-AT': 'Nicht mehr verfolgen',
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
    fr: 'Copier le code',
    pt: 'Copiar código',
    nl: 'Code kopiëren',
    'en-GB': 'Copy Code',
    'en-AU': 'Copy Code',
    'de-AT': 'Code kopieren',
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
    fr: 'Code copié!',
    pt: 'Código copiado!',
    nl: 'Code gekopieerd!',
    'en-GB': 'Code Copied!',
    'en-AU': 'Code Copied!',
    'de-AT': 'Code kopiert!',
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

