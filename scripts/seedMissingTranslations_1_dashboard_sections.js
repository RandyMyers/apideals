/**
 * Seed Missing Translations - Part 1: Dashboard Sections
 * Adds dashboard section name translations
 * 
 * Usage: node server/scripts/seedMissingTranslations_1_dashboard_sections.js
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
    key: 'dashboard.sections.overview',
    category: 'pages',
    en: 'Overview',
    ga: 'Forbhreathnú',
    de: 'Übersicht',
    es: 'Resumen',
    it: 'Panoramica',
    no: 'Oversikt',
    fi: 'Yleiskatsaus',
    da: 'Oversigt',
    sv: 'Översikt',
    fr: 'Aperçu',
    pt: 'Visão geral',
    nl: 'Overzicht',
    'en-GB': 'Overview',
    'en-AU': 'Overview',
    'de-AT': 'Übersicht',
    description: 'Dashboard overview section',
    context: 'DashboardPage.js',
  },
  {
    key: 'dashboard.sections.submissions',
    category: 'pages',
    en: 'Submissions',
    ga: 'Aisíocaí',
    de: 'Einreichungen',
    es: 'Envíos',
    it: 'Invii',
    no: 'Innsendinger',
    fi: 'Lähetykset',
    da: 'Indsendelser',
    sv: 'Inlämningar',
    fr: 'Soumissions',
    pt: 'Envios',
    nl: 'Inzendingen',
    'en-GB': 'Submissions',
    'en-AU': 'Submissions',
    'de-AT': 'Einreichungen',
    description: 'Dashboard submissions section',
    context: 'DashboardPage.js',
  },
  {
    key: 'dashboard.sections.stores',
    category: 'pages',
    en: 'Stores',
    ga: 'Stórais',
    de: 'Geschäfte',
    es: 'Tiendas',
    it: 'Negozi',
    no: 'Butikker',
    fi: 'Kaupat',
    da: 'Butikker',
    sv: 'Butiker',
    fr: 'Magasins',
    pt: 'Lojas',
    nl: 'Winkels',
    'en-GB': 'Stores',
    'en-AU': 'Stores',
    'de-AT': 'Geschäfte',
    description: 'Dashboard stores section',
    context: 'DashboardPage.js',
  },
  {
    key: 'dashboard.sections.campaigns',
    category: 'pages',
    en: 'Campaigns',
    ga: 'Feachtais',
    de: 'Kampagnen',
    es: 'Campañas',
    it: 'Campagne',
    no: 'Kampanjer',
    fi: 'Kampanjat',
    da: 'Kampagner',
    sv: 'Kampanjer',
    fr: 'Campagnes',
    pt: 'Campanhas',
    nl: 'Campagnes',
    'en-GB': 'Campaigns',
    'en-AU': 'Campaigns',
    'de-AT': 'Kampagnen',
    description: 'Dashboard campaigns section',
    context: 'DashboardPage.js',
  },
  {
    key: 'dashboard.sections.followed',
    category: 'pages',
    en: 'Followed',
    ga: 'Leanúint',
    de: 'Verfolgt',
    es: 'Seguidos',
    it: 'Seguiti',
    no: 'Fulgte',
    fi: 'Seuratut',
    da: 'Følgt',
    sv: 'Följda',
    fr: 'Suivi',
    pt: 'Seguidos',
    nl: 'Gevolgd',
    'en-GB': 'Followed',
    'en-AU': 'Followed',
    'de-AT': 'Verfolgt',
    description: 'Dashboard followed section',
    context: 'DashboardPage.js',
  },
  {
    key: 'dashboard.sections.reviews',
    category: 'pages',
    en: 'Reviews',
    ga: 'Léirmheasanna',
    de: 'Bewertungen',
    es: 'Reseñas',
    it: 'Recensioni',
    no: 'Anmeldelser',
    fi: 'Arvostelut',
    da: 'Anmeldelser',
    sv: 'Recensioner',
    fr: 'Avis',
    pt: 'Avaliações',
    nl: 'Beoordelingen',
    'en-GB': 'Reviews',
    'en-AU': 'Reviews',
    'de-AT': 'Bewertungen',
    description: 'Dashboard reviews section',
    context: 'DashboardPage.js',
  },
  {
    key: 'dashboard.sections.alerts',
    category: 'pages',
    en: 'Alerts',
    ga: 'Foláirimh',
    de: 'Warnungen',
    es: 'Alertas',
    it: 'Avvisi',
    no: 'Varsler',
    fi: 'Hälytykset',
    da: 'Advarsler',
    sv: 'Varningar',
    fr: 'Alertes',
    pt: 'Alertas',
    nl: 'Meldingen',
    'en-GB': 'Alerts',
    'en-AU': 'Alerts',
    'de-AT': 'Warnungen',
    description: 'Dashboard alerts section',
    context: 'DashboardPage.js',
  },
  {
    key: 'dashboard.sections.billing',
    category: 'pages',
    en: 'Billing',
    ga: 'Billeáil',
    de: 'Abrechnung',
    es: 'Facturación',
    it: 'Fatturazione',
    no: 'Fakturering',
    fi: 'Laskutus',
    da: 'Fakturering',
    sv: 'Fakturering',
    fr: 'Facturation',
    pt: 'Cobrança',
    nl: 'Facturering',
    'en-GB': 'Billing',
    'en-AU': 'Billing',
    'de-AT': 'Abrechnung',
    description: 'Dashboard billing section',
    context: 'DashboardPage.js',
  },
  {
    key: 'dashboard.sections.sessions',
    category: 'pages',
    en: 'Sessions',
    ga: 'Seisiúin',
    de: 'Sitzungen',
    es: 'Sesiones',
    it: 'Sessioni',
    no: 'Økter',
    fi: 'Istunnot',
    da: 'Sessioner',
    sv: 'Sessioner',
    fr: 'Sessions',
    pt: 'Sessões',
    nl: 'Sessies',
    'en-GB': 'Sessions',
    'en-AU': 'Sessions',
    'de-AT': 'Sitzungen',
    description: 'Dashboard sessions section',
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

    console.log(`\n=== Part 1 Complete ===`);
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

