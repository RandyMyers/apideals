/**
 * Seed Store Detail Page Extra Translations
 * Adds translations for additional store detail page components
 * 
 * Usage: node server/scripts/seedMissingTranslations_20_stores_detail_extras.js
 */

require('dotenv').config();
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

const extraTranslations = [
  {
    key: 'stores.detail.stats',
    category: 'pages',
    en: 'Store Stats',
    ga: 'Staitisticí Siopa',
    de: 'Geschäftsstatistiken',
    es: 'Estadísticas de la Tienda',
    it: 'Statistiche Negozio',
    no: 'Butikkstatistikk',
    fi: 'Kaupan Tilastot',
    da: 'Butiksstatistikker',
    sv: 'Butiksstatistik',
    description: 'Store stats section title',
    context: 'StoreDetailPage.js',
  },
  {
    key: 'stores.detail.stats.views',
    category: 'pages',
    en: 'Views',
    ga: 'Amhairc',
    de: 'Aufrufe',
    es: 'Vistas',
    it: 'Visualizzazioni',
    no: 'Visninger',
    fi: 'Katselut',
    da: 'Visninger',
    sv: 'Visningar',
    description: 'Views stat label',
    context: 'StoreDetailPage.js',
  },
  {
    key: 'stores.detail.stats.followers',
    category: 'pages',
    en: 'Followers',
    ga: 'Leanúnaithe',
    de: 'Follower',
    es: 'Seguidores',
    it: 'Follower',
    no: 'Følgere',
    fi: 'Seuraajat',
    da: 'Følgere',
    sv: 'Följare',
    description: 'Followers stat label',
    context: 'StoreDetailPage.js',
  },
  {
    key: 'stores.detail.stats.rating',
    category: 'pages',
    en: 'Rating',
    ga: 'Rátáil',
    de: 'Bewertung',
    es: 'Calificación',
    it: 'Valutazione',
    no: 'Vurdering',
    fi: 'Arvostelu',
    da: 'Vurdering',
    sv: 'Betyg',
    description: 'Rating stat label',
    context: 'StoreDetailPage.js',
  },
  {
    key: 'stores.detail.stats.coupons',
    category: 'pages',
    en: 'Coupons',
    ga: 'Cúpóin',
    de: 'Gutscheine',
    es: 'Cupones',
    it: 'Coupon',
    no: 'Kuponger',
    fi: 'Kuponkit',
    da: 'Kuponer',
    sv: 'Kuponger',
    description: 'Coupons stat label',
    context: 'StoreDetailPage.js',
  },
  {
    key: 'stores.detail.links',
    category: 'pages',
    en: 'Store Links',
    ga: 'Naisc Siopa',
    de: 'Geschäftslinks',
    es: 'Enlaces de la Tienda',
    it: 'Link Negozio',
    no: 'Butikklenker',
    fi: 'Kaupan Linkit',
    da: 'Butikslinks',
    sv: 'Butikslänkar',
    description: 'Store links section title',
    context: 'StoreDetailPage.js',
  },
  {
    key: 'stores.detail.visitWebsite',
    category: 'pages',
    en: 'Visit Website',
    ga: 'Tabhair Cuairt ar an Láithreán Gréasáin',
    de: 'Website besuchen',
    es: 'Visitar Sitio Web',
    it: 'Visita Sito Web',
    no: 'Besøk Nettsted',
    fi: 'Vieraile Verkkosivustolla',
    da: 'Besøg Hjemmeside',
    sv: 'Besök Webbplats',
    description: 'Visit website link',
    context: 'StoreDetailPage.js',
  },
  {
    key: 'stores.detail.related',
    category: 'pages',
    en: 'Related Stores',
    ga: 'Siopaí Gaolmhara',
    de: 'Ähnliche Geschäfte',
    es: 'Tiendas Relacionadas',
    it: 'Negozi Correlati',
    no: 'Relaterte Butikker',
    fi: 'Liittyvät Kaupat',
    da: 'Relaterede Butikker',
    sv: 'Relaterade Butiker',
    description: 'Related stores section title',
    context: 'StoreDetailPage.js',
  },
  {
    key: 'stores.detail.savingTips',
    category: 'pages',
    en: 'Saving Tips',
    ga: 'Leideanna Coigilte',
    de: 'Spartipps',
    es: 'Consejos de Ahorro',
    it: 'Consigli per Risparmiare',
    no: 'Spartips',
    fi: 'Säästövinkit',
    da: 'Spareråd',
    sv: 'Spartips',
    description: 'Saving tips section title',
    context: 'StoreDetailPage.js',
  },
  {
    key: 'stores.detail.tips.signup',
    category: 'pages',
    en: 'Sign up for the store newsletter to receive exclusive discounts',
    ga: 'Cláraigh le haghaidh nuachtlitir an siopa chun lascainí eisiacha a fháil',
    de: 'Melden Sie sich für den Store-Newsletter an, um exklusive Rabatte zu erhalten',
    es: 'Suscríbete al boletín de la tienda para recibir descuentos exclusivos',
    it: 'Iscriviti alla newsletter del negozio per ricevere sconti esclusivi',
    no: 'Meld deg på butikkens nyhetsbrev for å motta eksklusive rabatter',
    fi: 'Tilaa kaupan uutiskirje saadaksesi eksklusiivisia alennuksia',
    da: 'Tilmeld dig butikkens nyhedsbrev for at modtage eksklusive rabatter',
    sv: 'Prenumerera på butikens nyhetsbrev för att få exklusiva rabatter',
    description: 'Newsletter signup tip',
    context: 'StoreDetailPage.js',
  },
  {
    key: 'stores.detail.tips.freeShipping',
    category: 'pages',
    en: 'Look for free shipping codes to save on delivery costs',
    ga: 'Cuardaigh cóid loingseoireachta saor in aisce chun costais seachadta a shábháil',
    de: 'Suchen Sie nach kostenlosen Versandcodes, um Versandkosten zu sparen',
    es: 'Busca códigos de envío gratis para ahorrar en costos de entrega',
    it: 'Cerca codici di spedizione gratuita per risparmiare sui costi di consegna',
    no: 'Se etter gratis fraktkoder for å spare på leveringskostnader',
    fi: 'Etsi ilmaisia toimituskoodeja säästääksesi toimituskustannuksissa',
    da: 'Søg efter gratis forsendelseskoder for at spare på leveringsomkostninger',
    sv: 'Leta efter gratis fraktkoder för att spara på leveranskostnader',
    description: 'Free shipping tip',
    context: 'StoreDetailPage.js',
  },
  {
    key: 'stores.detail.tips.combine',
    category: 'pages',
    en: 'Combine multiple coupons when possible for maximum savings',
    ga: 'Comhcheangail cúpóin iolracha nuair is féidir chun coigiltis uasta a fháil',
    de: 'Kombinieren Sie mehrere Gutscheine, wenn möglich, für maximale Ersparnisse',
    es: 'Combina múltiples cupones cuando sea posible para maximizar los ahorros',
    it: 'Combina più coupon quando possibile per massimizzare i risparmi',
    no: 'Kombiner flere kuponger når det er mulig for maksimal besparelse',
    fi: 'Yhdistä useita kuponkeja kun mahdollista saavuttaaksesi maksimaaliset säästöt',
    da: 'Kombiner flere kuponer når det er muligt for maksimal besparelse',
    sv: 'Kombinera flera kuponger när det är möjligt för maximala besparingar',
    description: 'Combine coupons tip',
    context: 'StoreDetailPage.js',
  },
  {
    key: 'stores.detail.tips.expiry',
    category: 'pages',
    en: 'Check coupon expiry dates before using them',
    ga: 'Seiceáil dáta éaga cúpóin sula n-úsáideann tú iad',
    de: 'Überprüfen Sie die Ablaufdaten der Gutscheine, bevor Sie sie verwenden',
    es: 'Verifica las fechas de vencimiento de los cupones antes de usarlos',
    it: 'Controlla le date di scadenza dei coupon prima di usarli',
    no: 'Sjekk kupongens utløpsdatoer før du bruker dem',
    fi: 'Tarkista kuponkien viimeinen voimassaolopäivä ennen käyttöä',
    da: 'Tjek kuponernes udløbsdatoer før brug',
    sv: 'Kontrollera kupongernas utgångsdatum innan användning',
    description: 'Check expiry tip',
    context: 'StoreDetailPage.js',
  },
];

const seedExtraTranslations = async () => {
  try {
    const connected = await connectDB();
    if (!connected) {
      process.exit(1);
    }

    console.log('Starting to seed store detail extra translations...');
    let added = 0;
    let updated = 0;
    let skipped = 0;

    for (const translation of extraTranslations) {
      try {
        const existing = await Translation.findOne({ key: translation.key });
        
        if (existing) {
          Object.keys(translation).forEach(key => {
            if (key !== '_id' && key !== '__v' && key !== 'createdAt' && key !== 'updatedAt') {
              existing[key] = translation[key];
            }
          });
          await existing.save();
          updated++;
          console.log(`✓ Updated: ${translation.key}`);
        } else {
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
    console.log(`Total: ${extraTranslations.length}`);
    console.log('\n✓ Store detail extra translations seeding completed!');

    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding translations:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

seedExtraTranslations();

