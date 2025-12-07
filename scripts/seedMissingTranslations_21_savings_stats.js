const mongoose = require('mongoose');
const Translation = require('../models/translation');
require('dotenv').config();

const translations = [
  // Savings Statistics
  {
    key: 'dashboard.savings.total',
    category: 'pages',
    en: 'Total Savings',
    ga: 'Coigilteas Iomlán',
    de: 'Gesamtersparnisse',
    es: 'Ahorros Totales',
    it: 'Risparmi Totali',
    no: 'Totale Besparelser',
    fi: 'Kokonaissäästöt',
    da: 'Samlede Besparelser',
    sv: 'Totala Besparingar',
    fr: 'Économies totales',
    pt: 'Economias totais',
    nl: 'Totale besparingen',
    'en-GB': 'Total Savings',
    'en-AU': 'Total Savings',
    'de-AT': 'Gesamtersparnisse',
    description: 'Total savings label in dashboard',
    context: 'UserSavingsStats.js'
  },
  {
    key: 'dashboard.savings.monthly',
    category: 'pages',
    en: 'This Month',
    ga: 'An Mhí Seo',
    de: 'Diesen Monat',
    es: 'Este Mes',
    it: 'Questo Mese',
    no: 'Denne Måneden',
    fi: 'Tässä Kuussa',
    da: 'Denne Måned',
    sv: 'Denna Månad',
    fr: 'Ce mois-ci',
    pt: 'Este mês',
    nl: 'Deze maand',
    'en-GB': 'This Month',
    'en-AU': 'This Month',
    'de-AT': 'Diesen Monat',
    description: 'Monthly savings label',
    context: 'UserSavingsStats.js'
  },
  {
    key: 'dashboard.savings.yearly',
    category: 'pages',
    en: 'Yearly Estimate',
    ga: 'Meastachán Bliantúil',
    de: 'Jährliche Schätzung',
    es: 'Estimación Anual',
    it: 'Stima Annuale',
    no: 'Årlig Estimering',
    fi: 'Vuosiarvio',
    da: 'Årlig Estimering',
    sv: 'Årlig Uppskattning',
    fr: 'Estimation annuelle',
    pt: 'Estimativa anual',
    nl: 'Jaarlijkse schatting',
    'en-GB': 'Yearly Estimate',
    'en-AU': 'Yearly Estimate',
    'de-AT': 'Jährliche Schätzung',
    description: 'Yearly estimate label',
    context: 'UserSavingsStats.js'
  },
  {
    key: 'dashboard.usage.title',
    category: 'pages',
    en: 'Usage Statistics',
    ga: 'Staitisticí Úsáide',
    de: 'Nutzungsstatistiken',
    es: 'Estadísticas de Uso',
    it: 'Statistiche di Utilizzo',
    no: 'Bruksstatistikk',
    fi: 'Käyttötilastot',
    da: 'Brugsstatistik',
    sv: 'Användningsstatistik',
    fr: 'Statistiques d\'utilisation',
    pt: 'Estatísticas de uso',
    nl: 'Gebruiksstatistieken',
    'en-GB': 'Usage Statistics',
    'en-AU': 'Usage Statistics',
    'de-AT': 'Nutzungsstatistiken',
    description: 'Usage statistics title',
    context: 'UserSavingsStats.js'
  },
  {
    key: 'dashboard.usage.couponsUsed',
    category: 'pages',
    en: 'Coupons Used',
    ga: 'Cúpóin a Úsáidtear',
    de: 'Verwendete Gutscheine',
    es: 'Cupones Usados',
    it: 'Coupon Utilizzati',
    no: 'Brukte Kuponger',
    fi: 'Käytetyt Kupongit',
    da: 'Brugte Kuponer',
    sv: 'Använda Kuponger',
    fr: 'Coupons utilisés',
    pt: 'Cupons usados',
    nl: 'Gebruikte kortingscodes',
    'en-GB': 'Coupons Used',
    'en-AU': 'Coupons Used',
    'de-AT': 'Verwendete Gutscheine',
    description: 'Coupons used label',
    context: 'UserSavingsStats.js'
  },
  {
    key: 'dashboard.usage.dealsUsed',
    category: 'pages',
    en: 'Deals Used',
    ga: 'Margadh a Úsáidtear',
    de: 'Verwendete Angebote',
    es: 'Ofertas Usadas',
    it: 'Offerte Utilizzate',
    no: 'Brukte Tilbud',
    fi: 'Käytetyt Tarjoukset',
    da: 'Brugte Tilbud',
    sv: 'Använda Erbjudanden',
    fr: 'Offres utilisées',
    pt: 'Ofertas usadas',
    nl: 'Gebruikte aanbiedingen',
    'en-GB': 'Deals Used',
    'en-AU': 'Deals Used',
    'de-AT': 'Verwendete Angebote',
    description: 'Deals used label',
    context: 'UserSavingsStats.js'
  },
  {
    key: 'dashboard.usage.totalUsed',
    category: 'pages',
    en: 'Total Used',
    ga: 'Iomlán a Úsáidtear',
    de: 'Gesamt Verwendet',
    es: 'Total Usado',
    it: 'Totale Utilizzato',
    no: 'Totalt Brukt',
    fi: 'Yhteensä Käytetty',
    da: 'Samlet Brugt',
    sv: 'Totalt Använt',
    fr: 'Total utilisé',
    pt: 'Total usado',
    nl: 'Totaal gebruikt',
    'en-GB': 'Total Used',
    'en-AU': 'Total Used',
    'de-AT': 'Gesamt Verwendet',
    description: 'Total used label',
    context: 'UserSavingsStats.js'
  },
  {
    key: 'dashboard.topCategories',
    category: 'pages',
    en: 'Top Categories',
    ga: 'Catagóirí Barr',
    de: 'Top-Kategorien',
    es: 'Categorías Principales',
    it: 'Categorie Principali',
    no: 'Toppkategorier',
    fi: 'Parhaat Kategoriat',
    da: 'Top Kategorier',
    sv: 'Toppkategorier',
    fr: 'Meilleures catégories',
    pt: 'Melhores categorias',
    nl: 'Top categorieën',
    'en-GB': 'Top Categories',
    'en-AU': 'Top Categories',
    'de-AT': 'Top-Kategorien',
    description: 'Top categories label',
    context: 'UserSavingsStats.js'
  },
  {
    key: 'dashboard.topStores',
    category: 'pages',
    en: 'Top Stores',
    ga: 'Siopaí Barr',
    de: 'Top-Shops',
    es: 'Tiendas Principales',
    it: 'Negozi Principali',
    no: 'Toppbutikker',
    fi: 'Parhaat Kaupat',
    da: 'Top Butikker',
    sv: 'Toppbutiker',
    fr: 'Meilleurs magasins',
    pt: 'Melhores lojas',
    nl: 'Top winkels',
    'en-GB': 'Top Stores',
    'en-AU': 'Top Stores',
    'de-AT': 'Top-Shops',
    description: 'Top stores label',
    context: 'UserSavingsStats.js'
  },
  {
    key: 'dashboard.used',
    category: 'pages',
    en: 'used',
    ga: 'úsáidtear',
    de: 'verwendet',
    es: 'usado',
    it: 'utilizzato',
    no: 'brukt',
    fi: 'käytetty',
    da: 'brugt',
    sv: 'använt',
    fr: 'utilisé',
    pt: 'usado',
    nl: 'gebruikt',
    'en-GB': 'used',
    'en-AU': 'used',
    'de-AT': 'verwendet',
    description: 'Used label',
    context: 'UserSavingsStats.js'
  }
];

async function seedSavingsStatsTranslations() {
  try {
    await mongoose.connect(process.env.MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const translation of translations) {
      try {
        const existing = await Translation.findOne({ key: translation.key });

        if (existing) {
          // Update existing translation
          Object.keys(translation).forEach((lang) => {
            if (['en', 'ga', 'de', 'es', 'it', 'no', 'fi', 'da', 'sv'].includes(lang)) {
              existing[lang] = translation[lang];
            }
          });
          if (translation.description) existing.description = translation.description;
          if (translation.context) existing.context = translation.context;
          await existing.save();
          updated++;
          console.log(`Updated: ${translation.key}`);
        } else {
          // Create new translation
          await Translation.create(translation);
          created++;
          console.log(`Created: ${translation.key}`);
        }
      } catch (error) {
        console.error(`Error processing ${translation.key}:`, error.message);
        skipped++;
      }
    }

    console.log('\n=== Seeding Complete ===');
    console.log(`Created: ${created}`);
    console.log(`Updated: ${updated}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Total: ${translations.length}`);

    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  } catch (error) {
    console.error('Error seeding translations:', error);
    process.exit(1);
  }
}

seedSavingsStatsTranslations();

