const mongoose = require('mongoose');
const Translation = require('../models/translation');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const translations = [
  // Used Items Section - Stats
  {
    key: 'dashboard.usedItems.totalSaved',
    category: 'pages',
    en: 'Total Saved',
    ga: 'Coigilteas Iomlán',
    de: 'Gespart gesamt',
    es: 'Total Ahorrado',
    it: 'Totale Risparmiato',
    no: 'Totalt Spart',
    fi: 'Yhteensä Säästetty',
    da: 'Samlet Sparet',
    sv: 'Totalt Sparat',
    fr: 'Total économisé',
    pt: 'Total economizado',
    nl: 'Totaal bespaard',
    'en-GB': 'Total Saved',
    'en-AU': 'Total Saved',
    'de-AT': 'Gespart gesamt',
    description: 'Total saved label in used items stats',
    context: 'UsedItemsTable.js'
  },
  {
    key: 'dashboard.usedItems.couponsUsed',
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
    description: 'Coupons used count label',
    context: 'UsedItemsTable.js'
  },
  {
    key: 'dashboard.usedItems.dealsUsed',
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
    description: 'Deals used count label',
    context: 'UsedItemsTable.js'
  },
  {
    key: 'dashboard.usedItems.totalItems',
    category: 'pages',
    en: 'Total Items',
    ga: 'Míreanna Iomlána',
    de: 'Gesamtanzahl',
    es: 'Total de Artículos',
    it: 'Totale Articoli',
    no: 'Totalt Antall',
    fi: 'Yhteensä Kohteita',
    da: 'Samlet Antal',
    sv: 'Totalt Antal',
    fr: 'Total d\'articles',
    pt: 'Total de itens',
    nl: 'Totaal aantal items',
    'en-GB': 'Total Items',
    'en-AU': 'Total Items',
    'de-AT': 'Gesamtanzahl',
    description: 'Total items count label',
    context: 'UsedItemsTable.js'
  },
  // Used Items Section - Filters
  {
    key: 'dashboard.usedItems.all',
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
    description: 'All filter tab label',
    context: 'UsedItemsTable.js'
  },
  {
    key: 'dashboard.usedItems.coupons',
    category: 'pages',
    en: 'Coupons',
    ga: 'Cúpóin',
    de: 'Gutscheine',
    es: 'Cupones',
    it: 'Coupon',
    no: 'Kuponger',
    fi: 'Kupongit',
    da: 'Kuponer',
    sv: 'Kuponger',
    fr: 'Coupons',
    pt: 'Cupons',
    nl: 'Kortingscodes',
    'en-GB': 'Coupons',
    'en-AU': 'Coupons',
    'de-AT': 'Gutscheine',
    description: 'Coupons filter tab label',
    context: 'UsedItemsTable.js'
  },
  {
    key: 'dashboard.usedItems.deals',
    category: 'pages',
    en: 'Deals',
    ga: 'Margadh',
    de: 'Angebote',
    es: 'Ofertas',
    it: 'Offerte',
    no: 'Tilbud',
    fi: 'Tarjoukset',
    da: 'Tilbud',
    sv: 'Erbjudanden',
    fr: 'Offres',
    pt: 'Ofertas',
    nl: 'Aanbiedingen',
    'en-GB': 'Deals',
    'en-AU': 'Deals',
    'de-AT': 'Angebote',
    description: 'Deals filter tab label',
    context: 'UsedItemsTable.js'
  },
  // Used Items Section - Table Headers
  {
    key: 'dashboard.usedItems.item',
    category: 'pages',
    en: 'Item',
    ga: 'Mír',
    de: 'Artikel',
    es: 'Artículo',
    it: 'Articolo',
    no: 'Vare',
    fi: 'Kohde',
    da: 'Vare',
    sv: 'Artikel',
    fr: 'Article',
    pt: 'Item',
    nl: 'Item',
    'en-GB': 'Item',
    'en-AU': 'Item',
    'de-AT': 'Artikel',
    description: 'Item table header',
    context: 'UsedItemsTable.js'
  },
  {
    key: 'dashboard.usedItems.store',
    category: 'pages',
    en: 'Store',
    ga: 'Siopa',
    de: 'Geschäft',
    es: 'Tienda',
    it: 'Negozio',
    no: 'Butikk',
    fi: 'Kauppa',
    da: 'Butik',
    sv: 'Butik',
    fr: 'Magasin',
    pt: 'Loja',
    nl: 'Winkel',
    'en-GB': 'Store',
    'en-AU': 'Store',
    'de-AT': 'Geschäft',
    description: 'Store table header',
    context: 'UsedItemsTable.js'
  },
  {
    key: 'dashboard.usedItems.savings',
    category: 'pages',
    en: 'Savings',
    ga: 'Coigilteas',
    de: 'Ersparnisse',
    es: 'Ahorros',
    it: 'Risparmi',
    no: 'Besparelser',
    fi: 'Säästöt',
    da: 'Besparelser',
    sv: 'Besparingar',
    fr: 'Économies',
    pt: 'Economias',
    nl: 'Besparingen',
    'en-GB': 'Savings',
    'en-AU': 'Savings',
    'de-AT': 'Ersparnisse',
    description: 'Savings table header',
    context: 'UsedItemsTable.js'
  },
  {
    key: 'dashboard.usedItems.date',
    category: 'pages',
    en: 'Date Used',
    ga: 'Dáta a Úsáidtear',
    de: 'Verwendungsdatum',
    es: 'Fecha de Uso',
    it: 'Data di Utilizzo',
    no: 'Bruksdato',
    fi: 'Käyttöpäivä',
    da: 'Brugsdato',
    sv: 'Användningsdatum',
    fr: 'Date d\'utilisation',
    pt: 'Data de uso',
    nl: 'Gebruiksdatum',
    'en-GB': 'Date Used',
    'en-AU': 'Date Used',
    'de-AT': 'Verwendungsdatum',
    description: 'Date used table header',
    context: 'UsedItemsTable.js'
  },
  {
    key: 'dashboard.usedItems.type',
    category: 'pages',
    en: 'Type',
    ga: 'Cineál',
    de: 'Typ',
    es: 'Tipo',
    it: 'Tipo',
    no: 'Type',
    fi: 'Tyyppi',
    da: 'Type',
    sv: 'Typ',
    fr: 'Type',
    pt: 'Tipo',
    nl: 'Type',
    'en-GB': 'Type',
    'en-AU': 'Type',
    'de-AT': 'Typ',
    description: 'Type table header',
    context: 'UsedItemsTable.js'
  },
  // Used Items Section - Type Badges
  {
    key: 'dashboard.usedItems.coupon',
    category: 'pages',
    en: 'Coupon',
    ga: 'Cúpón',
    de: 'Gutschein',
    es: 'Cupón',
    it: 'Coupon',
    no: 'Kupong',
    fi: 'Kupongki',
    da: 'Kupon',
    sv: 'Kupong',
    fr: 'Coupon',
    pt: 'Cupom',
    nl: 'Kortingscode',
    'en-GB': 'Coupon',
    'en-AU': 'Coupon',
    'de-AT': 'Gutschein',
    description: 'Coupon type badge',
    context: 'UsedItemsTable.js'
  },
  {
    key: 'dashboard.usedItems.deal',
    category: 'pages',
    en: 'Deal',
    ga: 'Margadh',
    de: 'Angebot',
    es: 'Oferta',
    it: 'Offerta',
    no: 'Tilbud',
    fi: 'Tarjous',
    da: 'Tilbud',
    sv: 'Erbjudande',
    fr: 'Offre',
    pt: 'Oferta',
    nl: 'Aanbieding',
    'en-GB': 'Deal',
    'en-AU': 'Deal',
    'de-AT': 'Angebot',
    description: 'Deal type badge',
    context: 'UsedItemsTable.js'
  },
  // Used Items Section - Login Required
  {
    key: 'dashboard.usedItems.loginRequired',
    category: 'pages',
    en: 'Please log in to view your used items.',
    ga: 'Logáil isteach le do mhíreanna úsáidte a fheiceáil.',
    de: 'Bitte melden Sie sich an, um Ihre verwendeten Artikel anzuzeigen.',
    es: 'Por favor, inicie sesión para ver sus artículos usados.',
    it: 'Accedi per visualizzare i tuoi articoli utilizzati.',
    no: 'Vennligst logg inn for å se dine brukte varer.',
    fi: 'Kirjaudu sisään nähdäksesi käyttämäsi kohteet.',
    da: 'Log venligst ind for at se dine brugte varer.',
    sv: 'Logga in för att se dina använda artiklar.',
    fr: 'Veuillez vous connecter pour voir vos articles utilisés.',
    pt: 'Por favor, faça login para ver seus itens usados.',
    nl: 'Log in om uw gebruikte items te bekijken.',
    'en-GB': 'Please log in to view your used items.',
    'en-AU': 'Please log in to view your used items.',
    'de-AT': 'Bitte melden Sie sich an, um Ihre verwendeten Artikel anzuzeigen.',
    description: 'Login required message for used items',
    context: 'UsedItemsTable.js'
  },
  // Used Items Section - Empty State
  {
    key: 'dashboard.usedItems.noItems',
    category: 'pages',
    en: 'No used items yet. Click thumbs up on coupons or deals to track your savings!',
    ga: 'Níl aon mhíreanna úsáidte fós. Cliceáil thumbs up ar chúpóin nó margadh chun do choigilteas a rianú!',
    de: 'Noch keine verwendeten Artikel. Klicken Sie auf Daumen hoch bei Gutscheinen oder Angeboten, um Ihre Ersparnisse zu verfolgen!',
    es: 'Aún no hay artículos usados. ¡Haz clic en pulgar arriba en cupones u ofertas para rastrear tus ahorros!',
    it: 'Nessun articolo utilizzato ancora. Clicca su pollice in su su coupon o offerte per tracciare i tuoi risparmi!',
    no: 'Ingen brukte varer ennå. Klikk tommel opp på kuponger eller tilbud for å spore besparelsene dine!',
    fi: 'Ei vielä käytettyjä kohteita. Klikkaa peukalo ylös kuponkeihin tai tarjouksiin seurataksesi säästöjäsi!',
    da: 'Ingen brugte varer endnu. Klik på tommelfinger op på kuponer eller tilbud for at spore dine besparelser!',
    sv: 'Inga använda artiklar ännu. Klicka på tumme upp på kuponger eller erbjudanden för att spåra dina besparingar!',
    fr: 'Aucun article utilisé pour le moment. Cliquez sur pouce vers le haut sur les coupons ou les offres pour suivre vos économies !',
    pt: 'Nenhum item usado ainda. Clique em polegar para cima em cupons ou ofertas para rastrear suas economias!',
    nl: 'Nog geen gebruikte items. Klik op duim omhoog op kortingscodes of aanbiedingen om uw besparingen bij te houden!',
    'en-GB': 'No used items yet. Click thumbs up on coupons or deals to track your savings!',
    'en-AU': 'No used items yet. Click thumbs up on coupons or deals to track your savings!',
    'de-AT': 'Noch keine verwendeten Artikel. Klicken Sie auf Daumen hoch bei Gutscheinen oder Angeboten, um Ihre Ersparnisse zu verfolgen!',
    description: 'Empty state message for used items',
    context: 'UsedItemsTable.js'
  },
];

async function seedTranslations() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URL;
    if (!mongoUri) {
      throw new Error('MONGO_URL environment variable is not set');
    }

    await mongoose.connect(mongoUri, {
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
            if (['en', 'ga', 'de', 'es', 'it', 'no', 'fi', 'da', 'sv', 'fr', 'pt', 'nl', 'en-GB', 'en-AU', 'de-AT'].includes(lang)) {
              existing[lang] = translation[lang];
            }
          });
          if (translation.description) existing.description = translation.description;
          if (translation.context) existing.context = translation.context;
          if (translation.category) existing.category = translation.category;
          await existing.save();
          updated++;
          console.log(`Updated: ${translation.key}`);
        } else {
          // Create new translation
          const newTranslation = new Translation(translation);
          await newTranslation.save();
          created++;
          console.log(`Created: ${translation.key}`);
        }
      } catch (error) {
        console.error(`Error processing translation key "${translation.key}":`, error.message);
        skipped++;
      }
    }

    console.log('\n=== Translation Seeding Complete ===');
    console.log(`Created: ${created}`);
    console.log(`Updated: ${updated}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Total: ${translations.length}`);

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error seeding translations:', error);
    process.exit(1);
  }
}

// Run the seeding function
if (require.main === module) {
  seedTranslations();
}

module.exports = { translations, seedTranslations };

