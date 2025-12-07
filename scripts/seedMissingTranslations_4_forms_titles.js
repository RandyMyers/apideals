/**
 * Seed Missing Translations - Part 4: Form Titles and Tabs
 * 
 * Usage: node server/scripts/seedMissingTranslations_4_forms_titles.js
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
    key: 'forms.coupon.title.create',
    category: 'forms',
    en: 'Create New Coupon',
    ga: 'Cruthaigh Cúpón Nua',
    de: 'Neuen Gutschein erstellen',
    es: 'Crear nuevo cupón',
    it: 'Crea nuovo coupon',
    no: 'Opprett ny kupong',
    fi: 'Luo uusi kupongki',
    da: 'Opret ny kupon',
    sv: 'Skapa ny kupong',
    fr: 'Créer un nouveau coupon',
    pt: 'Criar novo cupom',
    nl: 'Nieuwe coupon maken',
    'en-GB': 'Create New Coupon',
    'en-AU': 'Create New Coupon',
    'de-AT': 'Neuen Gutschein erstellen',
    description: 'Create coupon form title',
    context: 'ManualCouponForm.js',
  },
  {
    key: 'forms.coupon.title.edit',
    category: 'forms',
    en: 'Edit Coupon',
    ga: 'Cuir Cúpón in Eagar',
    de: 'Gutschein bearbeiten',
    es: 'Editar cupón',
    it: 'Modifica coupon',
    no: 'Rediger kupong',
    fi: 'Muokkaa kupongkia',
    da: 'Rediger kupon',
    sv: 'Redigera kupong',
    fr: 'Modifier le coupon',
    pt: 'Editar cupom',
    nl: 'Coupon bewerken',
    'en-GB': 'Edit Coupon',
    'en-AU': 'Edit Coupon',
    'de-AT': 'Gutschein bearbeiten',
    description: 'Edit coupon form title',
    context: 'ManualCouponForm.js',
  },
  {
    key: 'forms.deal.title.create',
    category: 'forms',
    en: 'Create New Deal',
    ga: 'Cruthaigh Margadh Nua',
    de: 'Neues Angebot erstellen',
    es: 'Crear nueva oferta',
    it: 'Crea nuova offerta',
    no: 'Opprett nytt tilbud',
    fi: 'Luo uusi tarjous',
    da: 'Opret nyt tilbud',
    sv: 'Skapa nytt erbjudande',
    fr: 'Créer une nouvelle offre',
    pt: 'Criar nova oferta',
    nl: 'Nieuwe aanbieding maken',
    'en-GB': 'Create New Deal',
    'en-AU': 'Create New Deal',
    'de-AT': 'Neues Angebot erstellen',
    description: 'Create deal form title',
    context: 'ManualDealForm.js',
  },
  {
    key: 'forms.deal.title.edit',
    category: 'forms',
    en: 'Edit Deal',
    ga: 'Cuir Margadh in Eagar',
    de: 'Angebot bearbeiten',
    es: 'Editar oferta',
    it: 'Modifica offerta',
    no: 'Rediger tilbud',
    fi: 'Muokkaa tarjousta',
    da: 'Rediger tilbud',
    sv: 'Redigera erbjudande',
    fr: 'Modifier l\'offre',
    pt: 'Editar oferta',
    nl: 'Aanbieding bewerken',
    'en-GB': 'Edit Deal',
    'en-AU': 'Edit Deal',
    'de-AT': 'Angebot bearbeiten',
    description: 'Edit deal form title',
    context: 'ManualDealForm.js',
  },
  {
    key: 'forms.tabs.basic',
    category: 'forms',
    en: 'Basic Info',
    ga: 'Eolas Bunúsach',
    de: 'Grundinformationen',
    es: 'Información básica',
    it: 'Informazioni di base',
    no: 'Grunnleggende info',
    fi: 'Perustiedot',
    da: 'Grundlæggende info',
    sv: 'Grundläggande info',
    fr: 'Informations de base',
    pt: 'Informações básicas',
    nl: 'Basisinformatie',
    'en-GB': 'Basic Info',
    'en-AU': 'Basic Info',
    'de-AT': 'Grundinformationen',
    description: 'Basic info tab',
    context: 'ManualCouponForm.js, ManualDealForm.js',
  },
  {
    key: 'forms.tabs.discount',
    category: 'forms',
    en: 'Discount',
    ga: 'Lascaine',
    de: 'Rabatt',
    es: 'Descuento',
    it: 'Sconto',
    no: 'Rabatt',
    fi: 'Alennus',
    da: 'Rabat',
    sv: 'Rabatt',
    fr: 'Remise',
    pt: 'Desconto',
    nl: 'Korting',
    'en-GB': 'Discount',
    'en-AU': 'Discount',
    'de-AT': 'Rabatt',
    description: 'Discount tab',
    context: 'ManualCouponForm.js, ManualDealForm.js',
  },
  {
    key: 'forms.tabs.restrictions',
    category: 'forms',
    en: 'Restrictions',
    ga: 'Sriain',
    de: 'Einschränkungen',
    es: 'Restricciones',
    it: 'Restrizioni',
    no: 'Begrensninger',
    fi: 'Rajoitukset',
    da: 'Begrænsninger',
    sv: 'Begränsningar',
    fr: 'Restrictions',
    pt: 'Restrições',
    nl: 'Beperkingen',
    'en-GB': 'Restrictions',
    'en-AU': 'Restrictions',
    'de-AT': 'Einschränkungen',
    description: 'Restrictions tab',
    context: 'ManualCouponForm.js',
  },
  {
    key: 'forms.tabs.dates',
    category: 'forms',
    en: 'Dates & Links',
    ga: 'Dátaí agus Naisc',
    de: 'Daten & Links',
    es: 'Fechas y enlaces',
    it: 'Date e link',
    no: 'Datoer og lenker',
    fi: 'Päivämäärät ja linkit',
    da: 'Datoer og links',
    sv: 'Datum och länkar',
    fr: 'Dates et liens',
    pt: 'Datas e links',
    nl: 'Data en links',
    'en-GB': 'Dates & Links',
    'en-AU': 'Dates & Links',
    'de-AT': 'Daten & Links',
    description: 'Dates and links tab',
    context: 'ManualCouponForm.js, ManualDealForm.js',
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

    console.log(`\n=== Part 4 Complete ===`);
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

