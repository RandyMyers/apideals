/**
 * Seed Missing Translations - Part 2: Dashboard Submissions
 * 
 * Usage: node server/scripts/seedMissingTranslations_2_dashboard_submissions.js
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
    key: 'dashboard.submissions.addNew',
    category: 'buttons',
    en: 'Add New',
    ga: 'Cuir Nua',
    de: 'Neu hinzufügen',
    es: 'Agregar nuevo',
    it: 'Aggiungi nuovo',
    no: 'Legg til ny',
    fi: 'Lisää uusi',
    da: 'Tilføj ny',
    sv: 'Lägg till ny',
    description: 'Add new submission button',
    context: 'DashboardPage.js',
  },
  {
    key: 'dashboard.submissions.manual',
    category: 'buttons',
    en: 'Manual',
    ga: 'Lámhleabhar',
    de: 'Manuell',
    es: 'Manual',
    it: 'Manuale',
    no: 'Manuell',
    fi: 'Manuaalinen',
    da: 'Manuel',
    sv: 'Manuell',
    description: 'Manual submission button',
    context: 'DashboardPage.js',
  },
  {
    key: 'dashboard.submissions.loading',
    category: 'messages',
    en: 'Loading...',
    ga: 'Ag luchtú...',
    de: 'Lädt...',
    es: 'Cargando...',
    it: 'Caricamento...',
    no: 'Laster...',
    fi: 'Ladataan...',
    da: 'Indlæser...',
    sv: 'Laddar...',
    description: 'Loading submissions message',
    context: 'DashboardPage.js',
  },
  {
    key: 'dashboard.submissions.empty',
    category: 'messages',
    en: 'No {type} yet. Use "Add New" to sync from WooCommerce or create manually.',
    ga: 'Níl {type} fós. Úsáid "Cuir Nua" chun sioncronú ó WooCommerce nó cruthaigh go láimhe.',
    de: 'Noch keine {type}. Verwenden Sie "Neu hinzufügen", um von WooCommerce zu synchronisieren oder manuell zu erstellen.',
    es: 'Aún no hay {type}. Use "Agregar nuevo" para sincronizar desde WooCommerce o crear manualmente.',
    it: 'Nessun {type} ancora. Usa "Aggiungi nuovo" per sincronizzare da WooCommerce o creare manualmente.',
    no: 'Ingen {type} ennå. Bruk "Legg til ny" for å synkronisere fra WooCommerce eller opprett manuelt.',
    fi: 'Ei {type} vielä. Käytä "Lisää uusi" synkronoidaksesi WooCommercesta tai luo manuaalisesti.',
    da: 'Ingen {type} endnu. Brug "Tilføj ny" til at synkronisere fra WooCommerce eller opret manuelt.',
    sv: 'Inga {type} ännu. Använd "Lägg till ny" för att synkronisera från WooCommerce eller skapa manuellt.',
    description: 'Empty submissions message',
    context: 'DashboardPage.js',
  },
  {
    key: 'dashboard.submissions.tabs.coupons',
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
    description: 'Submissions coupons tab',
    context: 'DashboardPage.js',
  },
  {
    key: 'dashboard.submissions.tabs.deals',
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
    description: 'Submissions deals tab',
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

    console.log(`\n=== Part 2 Complete ===`);
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

