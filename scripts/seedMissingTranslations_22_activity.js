require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const Translation = require('../models/translation');

const translations = [
  // Activity Log
  {
    key: 'dashboard.activity.title',
    category: 'pages',
    en: 'Activity Log',
    ga: 'Loga Gníomhaíochta',
    de: 'Aktivitätsprotokoll',
    es: 'Registro de Actividad',
    it: 'Registro Attività',
    no: 'Aktivitetslogg',
    fi: 'Toimintaloki',
    da: 'Aktivitetslog',
    sv: 'Aktivitetslogg',
    fr: 'Journal d\'activité',
    pt: 'Registro de atividades',
    nl: 'Activiteitenlogboek',
    'en-GB': 'Activity Log',
    'en-AU': 'Activity Log',
    'de-AT': 'Aktivitätsprotokoll',
    description: 'Activity log title',
    context: 'ActivityLog.js'
  },
  {
    key: 'activity.all',
    category: 'pages',
    en: 'All',
    ga: 'Uile',
    de: 'Alle',
    es: 'Todos',
    it: 'Tutti',
    no: 'Alle',
    fi: 'Kaikki',
    da: 'Alle',
    sv: 'Alla',
    fr: 'Tous',
    pt: 'Todos',
    nl: 'Alle',
    'en-GB': 'All',
    'en-AU': 'All',
    'de-AT': 'Alle',
    description: 'All activities filter',
    context: 'ActivityLog.js'
  },
  {
    key: 'activity.usage',
    category: 'pages',
    en: 'Usage',
    ga: 'Úsáid',
    de: 'Nutzung',
    es: 'Uso',
    it: 'Utilizzo',
    no: 'Bruk',
    fi: 'Käyttö',
    da: 'Brug',
    sv: 'Användning',
    fr: 'Utilisation',
    pt: 'Uso',
    nl: 'Gebruik',
    'en-GB': 'Usage',
    'en-AU': 'Usage',
    'de-AT': 'Nutzung',
    description: 'Usage filter',
    context: 'ActivityLog.js'
  },
  {
    key: 'activity.views',
    category: 'pages',
    en: 'Views',
    ga: 'Radhairc',
    de: 'Ansichten',
    es: 'Vistas',
    it: 'Visualizzazioni',
    no: 'Visninger',
    fi: 'Katselut',
    da: 'Visninger',
    sv: 'Visningar',
    fr: 'Vues',
    pt: 'Visualizações',
    nl: 'Weergaven',
    'en-GB': 'Views',
    'en-AU': 'Views',
    'de-AT': 'Ansichten',
    description: 'Views filter',
    context: 'ActivityLog.js'
  },
  {
    key: 'activity.interactions',
    category: 'pages',
    en: 'Interactions',
    ga: 'Idirghníomhartha',
    de: 'Interaktionen',
    es: 'Interacciones',
    it: 'Interazioni',
    no: 'Interaksjoner',
    fi: 'Vuorovaikutukset',
    da: 'Interaktioner',
    sv: 'Interaktioner',
    fr: 'Interactions',
    pt: 'Interações',
    nl: 'Interacties',
    'en-GB': 'Interactions',
    'en-AU': 'Interactions',
    'de-AT': 'Interaktionen',
    description: 'Interactions filter',
    context: 'ActivityLog.js'
  },
  {
    key: 'activity.used',
    category: 'pages',
    en: 'Used {{entityType}}',
    ga: 'Úsáidtear {{entityType}}',
    de: '{{entityType}} verwendet',
    es: '{{entityType}} usado',
    it: '{{entityType}} utilizzato',
    no: '{{entityType}} brukt',
    fi: '{{entityType}} käytetty',
    da: '{{entityType}} brugt',
    sv: '{{entityType}} använt',
    fr: '{{entityType}} utilisé',
    pt: '{{entityType}} usado',
    nl: '{{entityType}} gebruikt',
    'en-GB': 'Used {{entityType}}',
    'en-AU': 'Used {{entityType}}',
    'de-AT': '{{entityType}} verwendet',
    description: 'Used activity label',
    context: 'ActivityLog.js'
  },
  {
    key: 'activity.viewed',
    category: 'pages',
    en: 'Viewed {{entityType}}',
    ga: 'Breathnaíodh {{entityType}}',
    de: '{{entityType}} angesehen',
    es: '{{entityType}} visto',
    it: '{{entityType}} visualizzato',
    no: '{{entityType}} vist',
    fi: '{{entityType}} katsottu',
    da: '{{entityType}} set',
    sv: '{{entityType}} visad',
    fr: '{{entityType}} vu',
    pt: '{{entityType}} visualizado',
    nl: '{{entityType}} bekeken',
    'en-GB': 'Viewed {{entityType}}',
    'en-AU': 'Viewed {{entityType}}',
    'de-AT': '{{entityType}} angesehen',
    description: 'Viewed activity label',
    context: 'ActivityLog.js'
  },
  {
    key: 'activity.followed',
    category: 'pages',
    en: 'Followed {{entityType}}',
    ga: 'Lean {{entityType}}',
    de: '{{entityType}} gefolgt',
    es: '{{entityType}} seguido',
    it: '{{entityType}} seguito',
    no: '{{entityType}} fulgt',
    fi: '{{entityType}} seurattu',
    da: '{{entityType}} fulgt',
    sv: '{{entityType}} följd',
    fr: '{{entityType}} suivi',
    pt: '{{entityType}} seguido',
    nl: '{{entityType}} gevolgd',
    'en-GB': 'Followed {{entityType}}',
    'en-AU': 'Followed {{entityType}}',
    'de-AT': '{{entityType}} gefolgt',
    description: 'Followed activity label',
    context: 'ActivityLog.js'
  },
  {
    key: 'activity.shared',
    category: 'pages',
    en: 'Shared {{entityType}}',
    ga: 'Roinn {{entityType}}',
    de: '{{entityType}} geteilt',
    es: '{{entityType}} compartido',
    it: '{{entityType}} condiviso',
    no: '{{entityType}} delt',
    fi: '{{entityType}} jaettu',
    da: '{{entityType}} delt',
    sv: '{{entityType}} delad',
    fr: '{{entityType}} partagé',
    pt: '{{entityType}} compartilhado',
    nl: '{{entityType}} gedeeld',
    'en-GB': 'Shared {{entityType}}',
    'en-AU': 'Shared {{entityType}}',
    'de-AT': '{{entityType}} geteilt',
    description: 'Shared activity label',
    context: 'ActivityLog.js'
  },
  {
    key: 'activity.activity',
    category: 'pages',
    en: 'Activity',
    ga: 'Gníomhaíocht',
    de: 'Aktivität',
    es: 'Actividad',
    it: 'Attività',
    no: 'Aktivitet',
    fi: 'Toiminta',
    da: 'Aktivitet',
    sv: 'Aktivitet',
    fr: 'Activité',
    pt: 'Atividade',
    nl: 'Activiteit',
    'en-GB': 'Activity',
    'en-AU': 'Activity',
    'de-AT': 'Aktivität',
    description: 'Generic activity label',
    context: 'ActivityLog.js'
  },
  {
    key: 'activity.today',
    category: 'pages',
    en: 'Today',
    ga: 'Inniu',
    de: 'Heute',
    es: 'Hoy',
    it: 'Oggi',
    no: 'I dag',
    fi: 'Tänään',
    da: 'I dag',
    sv: 'Idag',
    fr: 'Aujourd\'hui',
    pt: 'Hoje',
    nl: 'Vandaag',
    'en-GB': 'Today',
    'en-AU': 'Today',
    'de-AT': 'Heute',
    description: 'Today label',
    context: 'ActivityLog.js'
  },
  {
    key: 'activity.yesterday',
    category: 'pages',
    en: 'Yesterday',
    ga: 'Inné',
    de: 'Gestern',
    es: 'Ayer',
    it: 'Ieri',
    no: 'I går',
    fi: 'Eilen',
    da: 'I går',
    sv: 'Igår',
    fr: 'Hier',
    pt: 'Ontem',
    nl: 'Gisteren',
    'en-GB': 'Yesterday',
    'en-AU': 'Yesterday',
    'de-AT': 'Gestern',
    description: 'Yesterday label',
    context: 'ActivityLog.js'
  },
  {
    key: 'activity.daysAgo',
    category: 'pages',
    en: '{{days}} days ago',
    ga: '{{days}} lá ó shin',
    de: 'vor {{days}} Tagen',
    es: 'hace {{days}} días',
    it: '{{days}} giorni fa',
    no: '{{days}} dager siden',
    fi: '{{days}} päivää sitten',
    da: '{{days}} dage siden',
    sv: '{{days}} dagar sedan',
    fr: 'Il y a {{days}} jours',
    pt: 'Há {{days}} dias',
    nl: '{{days}} dagen geleden',
    'en-GB': '{{days}} days ago',
    'en-AU': '{{days}} days ago',
    'de-AT': 'vor {{days}} Tagen',
    description: 'Days ago label',
    context: 'ActivityLog.js'
  },
  {
    key: 'activity.noActivity',
    category: 'pages',
    en: 'No activity yet',
    ga: 'Níl aon ghníomhaíocht fós',
    de: 'Noch keine Aktivität',
    es: 'Aún no hay actividad',
    it: 'Nessuna attività ancora',
    no: 'Ingen aktivitet ennå',
    fi: 'Ei vielä toimintaa',
    da: 'Ingen aktivitet endnu',
    sv: 'Ingen aktivitet ännu',
    fr: 'Aucune activité pour le moment',
    pt: 'Nenhuma atividade ainda',
    nl: 'Nog geen activiteit',
    'en-GB': 'No activity yet',
    'en-AU': 'No activity yet',
    'de-AT': 'Noch keine Aktivität',
    description: 'No activity message',
    context: 'ActivityLog.js'
  },
  {
    key: 'activity.unknown',
    category: 'pages',
    en: 'Unknown',
    ga: 'Anaithnid',
    de: 'Unbekannt',
    es: 'Desconocido',
    it: 'Sconosciuto',
    no: 'Ukjent',
    fi: 'Tuntematon',
    da: 'Ukendt',
    sv: 'Okänd',
    fr: 'Inconnu',
    pt: 'Desconhecido',
    nl: 'Onbekend',
    'en-GB': 'Unknown',
    'en-AU': 'Unknown',
    'de-AT': 'Unbekannt',
    description: 'Unknown entity label',
    context: 'ActivityLog.js'
  },
  {
    key: 'activity.saved',
    category: 'pages',
    en: 'Saved',
    ga: 'Sábháladh',
    de: 'Gespart',
    es: 'Ahorrado',
    it: 'Risparmiato',
    no: 'Spart',
    fi: 'Säästetty',
    da: 'Sparret',
    sv: 'Sparad',
    fr: 'Enregistré',
    pt: 'Salvo',
    nl: 'Opgeslagen',
    'en-GB': 'Saved',
    'en-AU': 'Saved',
    'de-AT': 'Gespart',
    description: 'Saved label',
    context: 'ActivityLog.js'
  }
];

async function seedActivityTranslations() {
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
          // Update existing translation with all languages
          await Translation.findOneAndUpdate(
            { key: translation.key },
            { $set: translation },
            { runValidators: true }
          );
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

seedActivityTranslations();

