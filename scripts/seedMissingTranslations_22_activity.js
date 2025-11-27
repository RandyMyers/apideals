const mongoose = require('mongoose');
const Translation = require('../models/translation');
require('dotenv').config();

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

seedActivityTranslations();

