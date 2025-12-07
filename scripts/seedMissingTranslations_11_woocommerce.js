/**
 * Seed Missing Translations - Part 11: WooCommerce Wizard Translations
 * 
 * Usage: node server/scripts/seedMissingTranslations_11_woocommerce.js
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
    key: 'woocommerce.wizard.selectStore.title',
    category: 'pages',
    en: 'Select a WooCommerce Store',
    ga: 'Roghnaigh Stór WooCommerce',
    de: 'WooCommerce-Geschäft auswählen',
    es: 'Selecciona una tienda WooCommerce',
    it: 'Seleziona un negozio WooCommerce',
    no: 'Velg en WooCommerce-butikk',
    fi: 'Valitse WooCommerce-kauppa',
    da: 'Vælg en WooCommerce-butik',
    sv: 'Välj en WooCommerce-butik',
    fr: 'Sélectionner un magasin WooCommerce',
    pt: 'Selecionar uma loja WooCommerce',
    nl: 'Selecteer een WooCommerce-winkel',
    'en-GB': 'Select a WooCommerce Store',
    'en-AU': 'Select a WooCommerce Store',
    'de-AT': 'WooCommerce-Geschäft auswählen',
    description: 'Select store step title',
    context: 'StoreSelectionStep.js',
  },
  {
    key: 'woocommerce.wizard.selectStore.subtitle',
    category: 'pages',
    en: 'Choose a store to sync coupons or deals from',
    ga: 'Roghnaigh stór chun cúpóin nó mhargaí a shioncronú uaidh',
    de: 'Wählen Sie ein Geschäft aus, von dem Gutscheine oder Angebote synchronisiert werden sollen',
    es: 'Elige una tienda para sincronizar cupones u ofertas',
    it: 'Scegli un negozio da cui sincronizzare coupon o offerte',
    no: 'Velg en butikk å synkronisere kuponger eller tilbud fra',
    fi: 'Valitse kauppa, josta synkronoidaan kupongit tai tarjoukset',
    da: 'Vælg en butik at synkronisere kuponer eller tilbud fra',
    sv: 'Välj en butik att synkronisera kuponger eller erbjudanden från',
    fr: 'Choisissez un magasin pour synchroniser les coupons ou offres',
    pt: 'Escolha uma loja para sincronizar cupons ou ofertas',
    nl: 'Kies een winkel om kortingscodes of aanbiedingen te synchroniseren',
    'en-GB': 'Choose a store to sync coupons or deals from',
    'en-AU': 'Choose a store to sync coupons or deals from',
    'de-AT': 'Wählen Sie ein Geschäft aus, von dem Gutscheine oder Angebote synchronisiert werden sollen',
    description: 'Select store step subtitle',
    context: 'StoreSelectionStep.js',
  },
  {
    key: 'woocommerce.wizard.addStore',
    category: 'buttons',
    en: 'Add Store',
    ga: 'Cuir Stór',
    de: 'Geschäft hinzufügen',
    es: 'Agregar tienda',
    it: 'Aggiungi negozio',
    no: 'Legg til butikk',
    fi: 'Lisää kauppa',
    da: 'Tilføj butik',
    sv: 'Lägg till butik',
    fr: 'Ajouter un magasin',
    pt: 'Adicionar loja',
    nl: 'Winkel toevoegen',
    'en-GB': 'Add Store',
    'en-AU': 'Add Store',
    'de-AT': 'Geschäft hinzufügen',
    description: 'Add store button',
    context: 'StoreSelectionStep.js',
  },
  {
    key: 'woocommerce.wizard.cancel',
    category: 'buttons',
    en: 'Cancel',
    ga: 'Cealaigh',
    de: 'Abbrechen',
    es: 'Cancelar',
    it: 'Annulla',
    no: 'Avbryt',
    fi: 'Peruuta',
    da: 'Annuller',
    sv: 'Avbryt',
    fr: 'Annuler',
    pt: 'Cancelar',
    nl: 'Annuleren',
    'en-GB': 'Cancel',
    'en-AU': 'Cancel',
    'de-AT': 'Abbrechen',
    description: 'Cancel button',
    context: 'StoreSelectionStep.js',
  },
  {
    key: 'woocommerce.wizard.connect.title',
    category: 'pages',
    en: 'Connect WooCommerce Store',
    ga: 'Stór WooCommerce a Nascadh',
    de: 'WooCommerce-Geschäft verbinden',
    es: 'Conectar tienda WooCommerce',
    it: 'Collega negozio WooCommerce',
    no: 'Koble til WooCommerce-butikk',
    fi: 'Yhdistä WooCommerce-kauppa',
    da: 'Forbind WooCommerce-butik',
    sv: 'Anslut WooCommerce-butik',
    fr: 'Connecter le magasin WooCommerce',
    pt: 'Conectar loja WooCommerce',
    nl: 'WooCommerce-winkel verbinden',
    'en-GB': 'Connect WooCommerce Store',
    'en-AU': 'Connect WooCommerce Store',
    'de-AT': 'WooCommerce-Geschäft verbinden',
    description: 'Connect store form title',
    context: 'StoreSelectionStep.js',
  },
  {
    key: 'woocommerce.wizard.connect.subtitle',
    category: 'pages',
    en: 'Enter your WooCommerce store credentials to connect',
    ga: 'Cuir isteach d\'fhíordheimhnithe stórais WooCommerce chun nascadh',
    de: 'Geben Sie Ihre WooCommerce-Geschäftsanmeldedaten ein, um eine Verbindung herzustellen',
    es: 'Ingresa las credenciales de tu tienda WooCommerce para conectar',
    it: 'Inserisci le credenziali del tuo negozio WooCommerce per connettere',
    no: 'Skriv inn WooCommerce-butikkens legitimasjon for å koble til',
    fi: 'Syötä WooCommerce-kaupan tunnistetiedot yhdistääksesi',
    da: 'Indtast dine WooCommerce-butiks legitimationsoplysninger for at forbinde',
    sv: 'Ange dina WooCommerce-butikens inloggningsuppgifter för att ansluta',
    fr: 'Entrez les identifiants de votre magasin WooCommerce pour vous connecter',
    pt: 'Digite as credenciais da sua loja WooCommerce para conectar',
    nl: 'Voer uw WooCommerce-winkelgegevens in om verbinding te maken',
    'en-GB': 'Enter your WooCommerce store credentials to connect',
    'en-AU': 'Enter your WooCommerce store credentials to connect',
    'de-AT': 'Geben Sie Ihre WooCommerce-Geschäftsanmeldedaten ein, um eine Verbindung herzustellen',
    description: 'Connect store form subtitle',
    context: 'StoreSelectionStep.js',
  },
  {
    key: 'woocommerce.wizard.empty',
    category: 'messages',
    en: 'Click "Add Store" above to connect your first WooCommerce store',
    ga: 'Cliceáil "Cuir Stór" thuas chun do chéad stór WooCommerce a nascadh',
    de: 'Klicken Sie oben auf "Geschäft hinzufügen", um Ihr erstes WooCommerce-Geschäft zu verbinden',
    es: 'Haz clic en "Agregar tienda" arriba para conectar tu primera tienda WooCommerce',
    it: 'Clicca su "Aggiungi negozio" sopra per collegare il tuo primo negozio WooCommerce',
    no: 'Klikk "Legg til butikk" over for å koble til din første WooCommerce-butikk',
    fi: 'Klikkaa "Lisää kauppa" yllä yhdistääksesi ensimmäisen WooCommerce-kaupasi',
    da: 'Klik på "Tilføj butik" ovenfor for at forbinde din første WooCommerce-butik',
    sv: 'Klicka på "Lägg till butik" ovan för att ansluta din första WooCommerce-butik',
    fr: 'Cliquez sur "Ajouter un magasin" ci-dessus pour connecter votre premier magasin WooCommerce',
    pt: 'Clique em "Adicionar loja" acima para conectar sua primeira loja WooCommerce',
    nl: 'Klik hierboven op "Winkel toevoegen" om uw eerste WooCommerce-winkel te verbinden',
    'en-GB': 'Click "Add Store" above to connect your first WooCommerce store',
    'en-AU': 'Click "Add Store" above to connect your first WooCommerce store',
    'de-AT': 'Klicken Sie oben auf "Geschäft hinzufügen", um Ihr erstes WooCommerce-Geschäft zu verbinden',
    description: 'Empty stores message',
    context: 'StoreSelectionStep.js',
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

    console.log(`\n=== Part 11 Complete ===`);
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

