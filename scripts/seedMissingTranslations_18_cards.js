/**
 * Seed Card Component Translations
 * Adds translations for coupon and deal cards
 * 
 * Usage: node server/scripts/seedMissingTranslations_18_cards.js
 */

require('dotenv').config();
const path = require('path');
const mongoose = require('mongoose');
const Translation = require('../models/translation');

// Connect to MongoDB using the same method as app.js
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

const cardTranslations = [
  {
    key: 'cards.expired',
    category: 'common',
    en: 'Expired',
    ga: 'As feidhme',
    de: 'Abgelaufen',
    es: 'Expirado',
    it: 'Scaduto',
    no: 'Utløpt',
    fi: 'Vanhentunut',
    da: 'Udløbet',
    sv: 'Utgången',
    description: 'Expired status for coupons/deals',
    context: 'couponCard.js, dealCard.js',
  },
  {
    key: 'cards.verified',
    category: 'common',
    en: 'Verified {{time}}',
    ga: 'Fíoraithe {{time}}',
    de: 'Verifiziert {{time}}',
    es: 'Verificado {{time}}',
    it: 'Verificato {{time}}',
    no: 'Verifisert {{time}}',
    fi: 'Vahvistettu {{time}}',
    da: 'Verificeret {{time}}',
    sv: 'Verifierad {{time}}',
    description: 'Verified label with time',
    context: 'couponCard.js',
  },
  {
    key: 'cards.unverified',
    category: 'common',
    en: 'Unverified',
    ga: 'Neamhfíoraithe',
    de: 'Nicht verifiziert',
    es: 'No verificado',
    it: 'Non verificato',
    no: 'Ikke verifisert',
    fi: 'Ei vahvistettu',
    da: 'Ikke verificeret',
    sv: 'Inte verifierad',
    description: 'Unverified status',
    context: 'couponCard.js',
  },
  {
    key: 'cards.timeleft.dayshours',
    category: 'common',
    en: '{{days}}d {{hours}}h left',
    ga: '{{days}}l {{hours}}u fágtha',
    de: '{{days}}T {{hours}}h übrig',
    es: 'Quedan {{days}}d {{hours}}h',
    it: 'Rimangono {{days}}g {{hours}}h',
    no: '{{days}}d {{hours}}t igjen',
    fi: '{{days}}p {{hours}}t jäljellä',
    da: '{{days}}d {{hours}}t tilbage',
    sv: '{{days}}d {{hours}}h kvar',
    description: 'Time left with days and hours',
    context: 'couponCard.js',
  },
  {
    key: 'cards.timeleft.hours',
    category: 'common',
    en: '{{hours}}h left',
    ga: '{{hours}}u fágtha',
    de: '{{hours}}h übrig',
    es: 'Quedan {{hours}}h',
    it: 'Rimangono {{hours}}h',
    no: '{{hours}}t igjen',
    fi: '{{hours}}t jäljellä',
    da: '{{hours}}t tilbage',
    sv: '{{hours}}h kvar',
    description: 'Time left with hours only',
    context: 'couponCard.js',
  },
  {
    key: 'cards.successrate',
    category: 'common',
    en: '{{percent}}% success',
    ga: '{{percent}}% rath',
    de: '{{percent}}% Erfolg',
    es: '{{percent}}% éxito',
    it: '{{percent}}% successo',
    no: '{{percent}}% suksess',
    fi: '{{percent}}% onnistuminen',
    da: '{{percent}}% succes',
    sv: '{{percent}}% framgång',
    description: 'Success rate percentage',
    context: 'couponCard.js',
  },
  {
    key: 'cards.getdeal',
    category: 'common',
    en: 'GET DEAL',
    ga: 'FAIGH MARGADH',
    de: 'ANGEBOT ERHALTEN',
    es: 'OBTENER OFERTA',
    it: 'OTTIENI OFFERTA',
    no: 'FÅ TILBUD',
    fi: 'HANKI TARJOUS',
    da: 'FÅ TILBUD',
    sv: 'FÅ ERBJUDANDE',
    description: 'Get deal button text',
    context: 'couponCard.js, dealCard.js',
  },
  {
    key: 'cards.couponcode',
    category: 'common',
    en: 'COUPON CODE',
    ga: 'CÓD CÚPÓIN',
    de: 'GUTSCHEINCODE',
    es: 'CÓDIGO DE CUPÓN',
    it: 'CODICE COUPON',
    no: 'KUPONGKODE',
    fi: 'KUPONGKODI',
    da: 'KUPONKODE',
    sv: 'KUPONGKOD',
    description: 'Coupon code button text',
    context: 'couponCard.js',
  },
  {
    key: 'cards.applyon',
    category: 'common',
    en: 'Apply on: {{product}}',
    ga: 'Cuir i bhfeidhm ar: {{product}}',
    de: 'Anwenden auf: {{product}}',
    es: 'Aplicar en: {{product}}',
    it: 'Applica su: {{product}}',
    no: 'Bruk på: {{product}}',
    fi: 'Käytä: {{product}}',
    da: 'Anvend på: {{product}}',
    sv: 'Tillämpa på: {{product}}',
    description: 'Apply coupon on product',
    context: 'couponCard.js',
  },
  {
    key: 'cards.expirestoday',
    category: 'common',
    en: 'Expires Today',
    ga: 'Éiríonn sé as inniu',
    de: 'Läuft heute ab',
    es: 'Expira hoy',
    it: 'Scade oggi',
    no: 'Utløper i dag',
    fi: 'Vanhenee tänään',
    da: 'Udløber i dag',
    sv: 'Förfaller idag',
    description: 'Expires today text',
    context: 'dealCard.js',
  },
  {
    key: 'cards.expirestomorrow',
    category: 'common',
    en: 'Expires Tomorrow',
    ga: 'Éiríonn sé as amárach',
    de: 'Läuft morgen ab',
    es: 'Expira mañana',
    it: 'Scade domani',
    no: 'Utløper i morgen',
    fi: 'Vanhenee huomenna',
    da: 'Udløber i morgen',
    sv: 'Förfaller imorgon',
    description: 'Expires tomorrow text',
    context: 'dealCard.js',
  },
  {
    key: 'cards.daysleft',
    category: 'common',
    en: '{{days}} Days Left',
    ga: '{{days}} Lá Fágtha',
    de: '{{days}} Tage übrig',
    es: 'Quedan {{days}} días',
    it: 'Rimangono {{days}} giorni',
    no: '{{days}} dager igjen',
    fi: '{{days}} päivää jäljellä',
    da: '{{days}} dage tilbage',
    sv: '{{days}} dagar kvar',
    description: 'Days left text',
    context: 'dealCard.js',
  },
  {
    key: 'cards.discountoff',
    category: 'common',
    en: '{{discount}}% OFF',
    ga: '{{discount}}% AS',
    de: '{{discount}}% RABATT',
    es: '{{discount}}% DESCUENTO',
    it: '{{discount}}% SCONTO',
    no: '{{discount}}% AV',
    fi: '{{discount}}% ALE',
    da: '{{discount}}% RABAT',
    sv: '{{discount}}% RABATT',
    description: 'Discount off badge',
    context: 'dealCard.js',
  },
  {
    key: 'cards.viewdeal',
    category: 'common',
    en: 'View Deal',
    ga: 'Féach ar Mhargadh',
    de: 'Angebot ansehen',
    es: 'Ver oferta',
    it: 'Visualizza offerta',
    no: 'Se tilbud',
    fi: 'Näytä tarjous',
    da: 'Se tilbud',
    sv: 'Visa erbjudande',
    description: 'View deal button',
    context: 'dealCard.js',
  },
];

const seedCardTranslations = async () => {
  try {
    const connected = await connectDB();
    if (!connected) {
      process.exit(1);
    }

    console.log('Starting to seed card translations...');
    let added = 0;
    let updated = 0;
    let skipped = 0;

    for (const translation of cardTranslations) {
      try {
        const existing = await Translation.findOne({ key: translation.key });
        
        if (existing) {
          // Update existing translation
          Object.keys(translation).forEach(key => {
            if (key !== '_id' && key !== '__v' && key !== 'createdAt' && key !== 'updatedAt') {
              existing[key] = translation[key];
            }
          });
          await existing.save();
          updated++;
          console.log(`✓ Updated: ${translation.key}`);
        } else {
          // Create new translation
          await Translation.create(translation);
          added++;
          console.log(`✓ Added: ${translation.key}`);
        }
      } catch (error) {
        console.error(`✗ Error processing ${translation.key}:`, error.message);
        skipped++;
      }
    }

    console.log('\n=== Seeding Summary ===');
    console.log(`Added: ${added}`);
    console.log(`Updated: ${updated}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Total: ${cardTranslations.length}`);
    console.log('\n✓ Card translations seeding completed!');

    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding card translations:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run the seeding function
seedCardTranslations();

