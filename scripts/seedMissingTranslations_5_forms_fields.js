/**
 * Seed Missing Translations - Part 5: Form Field Labels
 * 
 * Usage: node server/scripts/seedMissingTranslations_5_forms_fields.js
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
    key: 'forms.fields.title',
    category: 'forms',
    en: 'Title',
    ga: 'Teideal',
    de: 'Titel',
    es: 'Título',
    it: 'Titolo',
    no: 'Tittel',
    fi: 'Otsikko',
    da: 'Titel',
    sv: 'Titel',
    description: 'Title field label',
    context: 'ManualCouponForm.js, ManualDealForm.js',
  },
  {
    key: 'forms.fields.couponCode',
    category: 'forms',
    en: 'Coupon Code',
    ga: 'Cód Cúpón',
    de: 'Gutscheincode',
    es: 'Código de cupón',
    it: 'Codice coupon',
    no: 'Kupongkode',
    fi: 'Kupongkoodi',
    da: 'Kuponkode',
    sv: 'Kupongkod',
    description: 'Coupon code field label',
    context: 'ManualCouponForm.js',
  },
  {
    key: 'forms.fields.description',
    category: 'forms',
    en: 'Description',
    ga: 'Cur síos',
    de: 'Beschreibung',
    es: 'Descripción',
    it: 'Descrizione',
    no: 'Beskrivelse',
    fi: 'Kuvaus',
    da: 'Beskrivelse',
    sv: 'Beskrivning',
    description: 'Description field label',
    context: 'ManualCouponForm.js, ManualDealForm.js',
  },
  {
    key: 'forms.fields.store',
    category: 'forms',
    en: 'Store',
    ga: 'Stór',
    de: 'Geschäft',
    es: 'Tienda',
    it: 'Negozio',
    no: 'Butikk',
    fi: 'Kauppa',
    da: 'Butik',
    sv: 'Butik',
    description: 'Store field label',
    context: 'ManualCouponForm.js, ManualDealForm.js',
  },
  {
    key: 'forms.fields.category',
    category: 'forms',
    en: 'Category',
    ga: 'Catagóir',
    de: 'Kategorie',
    es: 'Categoría',
    it: 'Categoria',
    no: 'Kategori',
    fi: 'Kategoria',
    da: 'Kategori',
    sv: 'Kategori',
    description: 'Category field label',
    context: 'ManualCouponForm.js, ManualDealForm.js',
  },
  {
    key: 'forms.fields.discountType',
    category: 'forms',
    en: 'Discount Type',
    ga: 'Cineál Lascaine',
    de: 'Rabattart',
    es: 'Tipo de descuento',
    it: 'Tipo di sconto',
    no: 'Rabatttype',
    fi: 'Alennustyyppi',
    da: 'Rabattype',
    sv: 'Rabatttyp',
    description: 'Discount type field label',
    context: 'ManualCouponForm.js, ManualDealForm.js',
  },
  {
    key: 'forms.fields.discountValue',
    category: 'forms',
    en: 'Discount Value',
    ga: 'Luach Lascaine',
    de: 'Rabattwert',
    es: 'Valor del descuento',
    it: 'Valore sconto',
    no: 'Rabattverdi',
    fi: 'Alennusarvo',
    da: 'Rabatværdi',
    sv: 'Rabattvärde',
    description: 'Discount value field label',
    context: 'ManualCouponForm.js, ManualDealForm.js',
  },
  {
    key: 'forms.fields.startDate',
    category: 'forms',
    en: 'Start Date',
    ga: 'Dáta Tosaigh',
    de: 'Startdatum',
    es: 'Fecha de inicio',
    it: 'Data di inizio',
    no: 'Startdato',
    fi: 'Aloituspäivä',
    da: 'Startdato',
    sv: 'Startdatum',
    description: 'Start date field label',
    context: 'ManualCouponForm.js, ManualDealForm.js',
  },
  {
    key: 'forms.fields.endDate',
    category: 'forms',
    en: 'End Date',
    ga: 'Dáta Deiridh',
    de: 'Enddatum',
    es: 'Fecha de finalización',
    it: 'Data di fine',
    no: 'Sluttdato',
    fi: 'Päättymispäivä',
    da: 'Slutdato',
    sv: 'Slutdatum',
    description: 'End date field label',
    context: 'ManualCouponForm.js, ManualDealForm.js',
  },
  {
    key: 'forms.fields.dealType',
    category: 'forms',
    en: 'Deal Type',
    ga: 'Cineál Margaidh',
    de: 'Angebotsart',
    es: 'Tipo de oferta',
    it: 'Tipo di offerta',
    no: 'Tilbudstype',
    fi: 'Tarjouksen tyyppi',
    da: 'Tilbudstype',
    sv: 'Erbjudandetyp',
    description: 'Deal type field label',
    context: 'ManualDealForm.js',
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

    console.log(`\n=== Part 5 Complete ===`);
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

