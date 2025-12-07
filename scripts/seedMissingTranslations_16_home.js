/**
 * Seed Missing Home Page Translations
 * Adds translations for Popular Stores and Trending Coupons sections
 * 
 * Usage: node server/scripts/seedMissingTranslations_16_home.js
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

const homeTranslations = [
  // Popular Stores Section
  {
    key: 'home.stores.title',
    category: 'pages',
    en: 'Popular Stores',
    ga: 'Stórais Coitianta',
    de: 'Beliebte Geschäfte',
    es: 'Tiendas Populares',
    it: 'Negozi Popolari',
    no: 'Populære Butikker',
    fi: 'Suositut Kaupat',
    da: 'Populære Butikker',
    sv: 'Populära Butiker',
    fr: 'Magasins populaires',
    pt: 'Lojas populares',
    nl: 'Populaire winkels',
    'en-GB': 'Popular Stores',
    'en-AU': 'Popular Stores',
    'de-AT': 'Beliebte Geschäfte',
    description: 'Title for Popular Stores section on home page',
    context: 'popularStores.js',
  },
  {
    key: 'home.stores.subtitle',
    category: 'pages',
    en: 'Shop from thousands of verified stores with exclusive deals and discounts',
    ga: 'Siopadóireacht ó na mílte stór vérifithe le margaí agus lascainní eisiacha',
    de: 'Einkaufen Sie bei Tausenden von verifizierten Geschäften mit exklusiven Angeboten und Rabatten',
    es: 'Compra en miles de tiendas verificadas con ofertas y descuentos exclusivos',
    it: 'Acquista da migliaia di negozi verificati con offerte e sconti esclusivi',
    no: 'Handle fra tusenvis av verifiserte butikker med eksklusive tilbud og rabatter',
    fi: 'Osta tuhansista vahvistetuista kaupoista yksinoikeuksilla ja alennuksilla',
    da: 'Shop fra tusindvis af verificerede butikker med eksklusive tilbud og rabatter',
    sv: 'Handla från tusentals verifierade butiker med exklusiva erbjudanden och rabatter',
    fr: 'Achetez dans des milliers de magasins vérifiés avec des offres et réductions exclusives',
    pt: 'Compre em milhares de lojas verificadas com ofertas e descontos exclusivos',
    nl: 'Shop bij duizenden geverifieerde winkels met exclusieve aanbiedingen en kortingen',
    'en-GB': 'Shop from thousands of verified stores with exclusive deals and discounts',
    'en-AU': 'Shop from thousands of verified stores with exclusive deals and discounts',
    'de-AT': 'Einkaufen Sie bei Tausenden von verifizierten Geschäften mit exklusiven Angeboten und Rabatten',
    description: 'Subtitle for Popular Stores section',
    context: 'popularStores.js',
  },
  {
    key: 'home.stores.viewAll',
    category: 'pages',
    en: 'View All Stores',
    ga: 'Féach ar Gach Stór',
    de: 'Alle Geschäfte anzeigen',
    es: 'Ver Todas las Tiendas',
    it: 'Visualizza Tutti i Negozi',
    no: 'Se Alle Butikker',
    fi: 'Näytä Kaikki Kaupat',
    da: 'Se Alle Butikker',
    sv: 'Visa Alla Butiker',
    fr: 'Voir tous les magasins',
    pt: 'Ver todas as lojas',
    nl: 'Alle winkels bekijken',
    'en-GB': 'View All Stores',
    'en-AU': 'View All Stores',
    'de-AT': 'Alle Geschäfte anzeigen',
    description: 'Link text to view all stores',
    context: 'popularStores.js',
  },
  {
    key: 'home.stores.loading',
    category: 'pages',
    en: 'Loading stores...',
    ga: 'Stórais á lódáil...',
    de: 'Geschäfte werden geladen...',
    es: 'Cargando tiendas...',
    it: 'Caricamento negozi...',
    no: 'Laster butikker...',
    fi: 'Ladataan kauppoja...',
    da: 'Indlæser butikker...',
    sv: 'Laddar butiker...',
    fr: 'Chargement des magasins...',
    pt: 'Carregando lojas...',
    nl: 'Winkels laden...',
    'en-GB': 'Loading stores...',
    'en-AU': 'Loading stores...',
    'de-AT': 'Geschäfte werden geladen...',
    description: 'Loading state message for stores',
    context: 'popularStores.js',
  },
  {
    key: 'home.stores.empty',
    category: 'pages',
    en: 'No stores available at the moment.',
    ga: 'Níl aon stórais ar fáil faoi láthair.',
    de: 'Derzeit sind keine Geschäfte verfügbar.',
    es: 'No hay tiendas disponibles en este momento.',
    it: 'Nessun negozio disponibile al momento.',
    no: 'Ingen butikker tilgjengelig for øyeblikket.',
    fi: 'Kauppoja ei ole tällä hetkellä saatavilla.',
    da: 'Ingen butikker tilgængelige i øjeblikket.',
    sv: 'Inga butiker tillgängliga för tillfället.',
    fr: 'Aucun magasin disponible pour le moment.',
    pt: 'Nenhuma loja disponível no momento.',
    nl: 'Momenteel geen winkels beschikbaar.',
    'en-GB': 'No stores available at the moment.',
    'en-AU': 'No stores available at the moment.',
    'de-AT': 'Derzeit sind keine Geschäfte verfügbar.',
    description: 'Empty state message when no stores available',
    context: 'popularStores.js',
  },
  // Trending Coupons Section
  {
    key: 'home.coupons.trending.title',
    category: 'pages',
    en: "Today's Trending Coupons",
    ga: 'Cúpóin Treochta an Lae',
    de: 'Heutige Trend-Gutscheine',
    es: 'Cupones en Tendencia de Hoy',
    it: 'Coupon di Tendenza di Oggi',
    no: 'Dagens Trendende Kuponger',
    fi: 'Tämän Päivän Trendikupongit',
    da: 'Dagens Trendende Kuponer',
    sv: 'Dagens Trendande Kuponger',
    fr: 'Coupons tendance d\'aujourd\'hui',
    pt: 'Cupons em alta hoje',
    nl: 'Trending kortingscodes van vandaag',
    'en-GB': 'Today',
    'en-AU': 'Today',
    'de-AT': 'Heutige Trend-Gutscheine',
    description: 'Title for Trending Coupons section',
    context: 'trendingCoupon.js',
  },
  {
    key: 'home.coupons.trending.loading',
    category: 'pages',
    en: 'Loading trending coupons...',
    ga: 'Cúpóin treochta á lódáil...',
    de: 'Trend-Gutscheine werden geladen...',
    es: 'Cargando cupones en tendencia...',
    it: 'Caricamento coupon di tendenza...',
    no: 'Laster trendende kuponger...',
    fi: 'Ladataan trendikupongeja...',
    da: 'Indlæser trendende kuponer...',
    sv: 'Laddar trendande kuponger...',
    fr: 'Chargement des coupons tendance...',
    pt: 'Carregando cupons em alta...',
    nl: 'Trending kortingscodes laden...',
    'en-GB': 'Loading trending coupons...',
    'en-AU': 'Loading trending coupons...',
    'de-AT': 'Trend-Gutscheine werden geladen...',
    description: 'Loading state message for trending coupons',
    context: 'trendingCoupon.js',
  },
  {
    key: 'home.coupons.trending.empty',
    category: 'pages',
    en: 'No trending coupons available at the moment.',
    ga: 'Níl aon chúpóin treochta ar fáil faoi láthair.',
    de: 'Derzeit sind keine Trend-Gutscheine verfügbar.',
    es: 'No hay cupones en tendencia disponibles en este momento.',
    it: 'Nessun coupon di tendenza disponibile al momento.',
    no: 'Ingen trendende kuponger tilgjengelig for øyeblikket.',
    fi: 'Trendikupongeja ei ole tällä hetkellä saatavilla.',
    da: 'Ingen trendende kuponer tilgængelige i øjeblikket.',
    sv: 'Inga trendande kuponger tillgängliga för tillfället.',
    fr: 'Aucun coupon tendance disponible pour le moment.',
    pt: 'Nenhum cupom em alta disponível no momento.',
    nl: 'Momenteel geen trending kortingscodes beschikbaar.',
    'en-GB': 'No trending coupons available at the moment.',
    'en-AU': 'No trending coupons available at the moment.',
    'de-AT': 'Derzeit sind keine Trend-Gutscheine verfügbar.',
    description: 'Empty state message when no trending coupons available',
    context: 'trendingCoupon.js',
  },
];

const seedHomeTranslations = async () => {
  try {
    const connected = await connectDB();
    if (!connected) {
      process.exit(1);
    }

    console.log('Starting to seed home page translations...');
    let added = 0;
    let updated = 0;
    let skipped = 0;

    for (const translation of homeTranslations) {
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
    console.log(`Total: ${homeTranslations.length}`);
    console.log('\n✓ Home page translations seeding completed!');

    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding home page translations:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run the seeding function
seedHomeTranslations();

