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

