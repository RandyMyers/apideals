/**
 * Seed Missing Translations - Part 6: Form Placeholders and Select Options
 * 
 * Usage: node server/scripts/seedMissingTranslations_6_forms_placeholders.js
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
    key: 'forms.placeholders.title',
    category: 'forms',
    en: 'e.g., Summer Sale 2024',
    ga: 'm.sh., Díol Samhraidh 2024',
    de: 'z.B. Sommerschlussverkauf 2024',
    es: 'ej., Venta de verano 2024',
    it: 'es., Vendita estiva 2024',
    no: 'f.eks., Sommersalg 2024',
    fi: 'esim. Kesämyynti 2024',
    da: 'f.eks., Sommersalg 2024',
    sv: 't.ex., Sommarrea 2024',
    description: 'Title placeholder',
    context: 'ManualCouponForm.js, ManualDealForm.js',
  },
  {
    key: 'forms.placeholders.couponCode',
    category: 'forms',
    en: 'e.g., SUMMER20',
    ga: 'm.sh., SUMMER20',
    de: 'z.B. SOMMER20',
    es: 'ej., VERANO20',
    it: 'es., ESTATE20',
    no: 'f.eks., SOMMER20',
    fi: 'esim. KESÄ20',
    da: 'f.eks., SOMMER20',
    sv: 't.ex., SOMMAR20',
    description: 'Coupon code placeholder',
    context: 'ManualCouponForm.js',
  },
  {
    key: 'forms.placeholders.description',
    category: 'forms',
    en: 'Describe what this coupon offers...',
    ga: 'Déan cur síos ar a sholáthraíonn an cúpón seo...',
    de: 'Beschreiben Sie, was dieser Gutschein bietet...',
    es: 'Describe lo que ofrece este cupón...',
    it: 'Descrivi cosa offre questo coupon...',
    no: 'Beskriv hva denne kupongen tilbyr...',
    fi: 'Kuvaile mitä tämä kupongki tarjoaa...',
    da: 'Beskriv hvad denne kupon tilbyder...',
    sv: 'Beskriv vad denna kupong erbjuder...',
    description: 'Coupon description placeholder',
    context: 'ManualCouponForm.js',
  },
  {
    key: 'forms.placeholders.dealDescription',
    category: 'forms',
    en: 'Describe this deal...',
    ga: 'Déan cur síos ar an margadh seo...',
    de: 'Beschreiben Sie dieses Angebot...',
    es: 'Describe esta oferta...',
    it: 'Descrivi questa offerta...',
    no: 'Beskriv dette tilbudet...',
    fi: 'Kuvaile tämä tarjous...',
    da: 'Beskriv dette tilbud...',
    sv: 'Beskriv detta erbjudande...',
    description: 'Deal description placeholder',
    context: 'ManualDealForm.js',
  },
  {
    key: 'forms.select.selectStore',
    category: 'forms',
    en: 'Select a store',
    ga: 'Roghnaigh stór',
    de: 'Geschäft auswählen',
    es: 'Selecciona una tienda',
    it: 'Seleziona un negozio',
    no: 'Velg en butikk',
    fi: 'Valitse kauppa',
    da: 'Vælg en butik',
    sv: 'Välj en butik',
    description: 'Select store option',
    context: 'ManualCouponForm.js, ManualDealForm.js',
  },
  {
    key: 'forms.select.selectCategory',
    category: 'forms',
    en: 'Select a category',
    ga: 'Roghnaigh catagóir',
    de: 'Kategorie auswählen',
    es: 'Selecciona una categoría',
    it: 'Seleziona una categoria',
    no: 'Velg en kategori',
    fi: 'Valitse kategoria',
    da: 'Vælg en kategori',
    sv: 'Välj en kategori',
    description: 'Select category option',
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

    console.log(`\n=== Part 6 Complete ===`);
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

