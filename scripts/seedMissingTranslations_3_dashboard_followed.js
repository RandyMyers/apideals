/**
 * Seed Missing Translations - Part 3: Dashboard Followed Section
 * 
 * Usage: node server/scripts/seedMissingTranslations_3_dashboard_followed.js
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
    key: 'dashboard.followed.tabs.all',
    category: 'navigation',
    en: 'All',
    ga: 'Gach',
    de: 'Alle',
    es: 'Todos',
    it: 'Tutti',
    no: 'Alle',
    fi: 'Kaikki',
    da: 'Alle',
    sv: 'Alla',
    description: 'All followed items tab',
    context: 'DashboardPage.js',
  },
  {
    key: 'dashboard.followed.tabs.coupons',
    category: 'navigation',
    en: 'Coupons',
    ga: 'Cúpóin',
    de: 'Gutscheine',
    es: 'Cupones',
    it: 'Coupon',
    no: 'Kuponger',
    fi: 'Kupongit',
    da: 'Kuponer',
    sv: 'Kuponger',
    description: 'Followed coupons tab',
    context: 'DashboardPage.js',
  },
  {
    key: 'dashboard.followed.tabs.deals',
    category: 'navigation',
    en: 'Deals',
    ga: 'Margadh',
    de: 'Angebote',
    es: 'Ofertas',
    it: 'Offerte',
    no: 'Tilbud',
    fi: 'Tarjoukset',
    da: 'Tilbud',
    sv: 'Erbjudanden',
    description: 'Followed deals tab',
    context: 'DashboardPage.js',
  },
  {
    key: 'dashboard.followed.title',
    category: 'pages',
    en: 'Followed Coupons & Deals',
    ga: 'Cúpóin agus Margaí a Leanúint',
    de: 'Verfolgte Gutscheine & Angebote',
    es: 'Cupones y Ofertas Seguidos',
    it: 'Coupon e Offerte Seguiti',
    no: 'Fulgte Kuponger og Tilbud',
    fi: 'Seuratut Kupongit ja Tarjoukset',
    da: 'Følgte Kuponer og Tilbud',
    sv: 'Följda Kuponger och Erbjudanden',
    description: 'Followed section title',
    context: 'DashboardPage.js',
  },
  {
    key: 'dashboard.followed.empty',
    category: 'messages',
    en: 'You haven\'t followed any coupons or deals yet',
    ga: 'Níl aon chúpóin nó mhargaí leanúint agat fós',
    de: 'Sie haben noch keine Gutscheine oder Angebote verfolgt',
    es: 'Aún no has seguido ningún cupón u oferta',
    it: 'Non hai ancora seguito nessun coupon o offerta',
    no: 'Du har ikke fulgt noen kuponger eller tilbud ennå',
    fi: 'Et ole vielä seurannut yhtään kupongkia tai tarjousta',
    da: 'Du har ikke fulgt nogen kuponer eller tilbud endnu',
    sv: 'Du har inte följt några kuponger eller erbjudanden ännu',
    description: 'Empty followed items message',
    context: 'DashboardPage.js',
  },
  {
    key: 'dashboard.followed.unfollow',
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
    context: 'DashboardPage.js',
  },
  {
    key: 'dashboard.followed.view',
    category: 'buttons',
    en: 'View',
    ga: 'Amharc',
    de: 'Ansehen',
    es: 'Ver',
    it: 'Visualizza',
    no: 'Se',
    fi: 'Näytä',
    da: 'Se',
    sv: 'Visa',
    description: 'View button',
    context: 'DashboardPage.js',
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

    console.log(`\n=== Part 3 Complete ===`);
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

