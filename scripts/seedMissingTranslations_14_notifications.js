/**
 * Seed Missing Translations - Part 14: Notification Center Translations
 * 
 * Usage: node server/scripts/seedMissingTranslations_14_notifications.js
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
    key: 'notifications.center.loading',
    category: 'messages',
    en: 'Loading notifications...',
    ga: 'Ag luchtú fógraí...',
    de: 'Benachrichtigungen werden geladen...',
    es: 'Cargando notificaciones...',
    it: 'Caricamento notifiche...',
    no: 'Laster varsler...',
    fi: 'Ladataan ilmoituksia...',
    da: 'Indlæser notifikationer...',
    sv: 'Laddar notifikationer...',
    fr: 'Chargement des notifications...',
    pt: 'Carregando notificações...',
    nl: 'Meldingen laden...',
    'en-GB': 'Loading notifications...',
    'en-AU': 'Loading notifications...',
    'de-AT': 'Benachrichtigungen werden geladen...',
    description: 'Loading notifications message',
    context: 'notificationCenter.js',
  },
  {
    key: 'notifications.center.empty.title',
    category: 'messages',
    en: 'No notifications',
    ga: 'Níl aon fhógraí',
    de: 'Keine Benachrichtigungen',
    es: 'Sin notificaciones',
    it: 'Nessuna notifica',
    no: 'Ingen varsler',
    fi: 'Ei ilmoituksia',
    da: 'Ingen notifikationer',
    sv: 'Inga notifikationer',
    fr: 'Aucune notification',
    pt: 'Sem notificações',
    nl: 'Geen meldingen',
    'en-GB': 'No notifications',
    'en-AU': 'No notifications',
    'de-AT': 'Keine Benachrichtigungen',
    description: 'Empty notifications title',
    context: 'notificationCenter.js',
  },
  {
    key: 'notifications.center.empty.text',
    category: 'messages',
    en: 'You\'re all caught up!',
    ga: 'Tá tú suas chun dáta!',
    de: 'Sie sind auf dem neuesten Stand!',
    es: '¡Estás al día!',
    it: 'Sei aggiornato!',
    no: 'Du er oppdatert!',
    fi: 'Olet ajan tasalla!',
    da: 'Du er opdateret!',
    sv: 'Du är uppdaterad!',
    fr: 'Vous êtes à jour !',
    pt: 'Você está em dia!',
    nl: 'U bent helemaal bij!',
    'en-GB': 'You\'re all caught up!',
    'en-AU': 'You\'re all caught up!',
    'de-AT': 'Sie sind auf dem neuesten Stand!',
    description: 'Empty notifications text',
    context: 'notificationCenter.js',
  },
  {
    key: 'notifications.center.retry',
    category: 'buttons',
    en: 'Retry',
    ga: 'Athiarracht',
    de: 'Wiederholen',
    es: 'Reintentar',
    it: 'Riprova',
    no: 'Prøv igjen',
    fi: 'Yritä uudelleen',
    da: 'Prøv igen',
    sv: 'Försök igen',
    fr: 'Réessayer',
    pt: 'Tentar novamente',
    nl: 'Opnieuw proberen',
    'en-GB': 'Retry',
    'en-AU': 'Retry',
    'de-AT': 'Wiederholen',
    description: 'Retry button',
    context: 'notificationCenter.js',
  },
  {
    key: 'notifications.center.viewAll',
    category: 'buttons',
    en: 'View All Notifications',
    ga: 'Féach ar Gach Fógra',
    de: 'Alle Benachrichtigungen anzeigen',
    es: 'Ver todas las notificaciones',
    it: 'Visualizza tutte le notifiche',
    no: 'Se alle varsler',
    fi: 'Näytä kaikki ilmoitukset',
    da: 'Se alle notifikationer',
    sv: 'Visa alla notifikationer',
    fr: 'Voir toutes les notifications',
    pt: 'Ver todas as notificações',
    nl: 'Alle meldingen bekijken',
    'en-GB': 'View All Notifications',
    'en-AU': 'View All Notifications',
    'de-AT': 'Alle Benachrichtigungen anzeigen',
    description: 'View all notifications button',
    context: 'notificationCenter.js',
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

    console.log(`\n=== Part 14 Complete ===`);
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

