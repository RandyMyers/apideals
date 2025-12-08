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
  // DashboardPage notification keys
  {
    key: 'dashboard.notifications.title',
    category: 'pages',
    en: 'Notifications',
    ga: 'Fógraí',
    de: 'Benachrichtigungen',
    es: 'Notificaciones',
    it: 'Notifiche',
    no: 'Varsler',
    fi: 'Ilmoitukset',
    da: 'Notifikationer',
    sv: 'Notifikationer',
    fr: 'Notifications',
    pt: 'Notificações',
    nl: 'Meldingen',
    'en-GB': 'Notifications',
    'en-AU': 'Notifications',
    'de-AT': 'Benachrichtigungen',
    description: 'Dashboard notifications section title',
    context: 'DashboardPage.js',
  },
  {
    key: 'notifications.markAllRead',
    category: 'buttons',
    en: 'Mark all as read',
    ga: 'Marcáil go léir mar léite',
    de: 'Alle als gelesen markieren',
    es: 'Marcar todo como leído',
    it: 'Segna tutto come letto',
    no: 'Merk alle som lest',
    fi: 'Merkitse kaikki luetuksi',
    da: 'Markér alle som læst',
    sv: 'Markera alla som lästa',
    fr: 'Tout marquer comme lu',
    pt: 'Marcar todas como lidas',
    nl: 'Alles als gelezen markeren',
    'en-GB': 'Mark all as read',
    'en-AU': 'Mark all as read',
    'de-AT': 'Alle als gelesen markieren',
    description: 'Mark all notifications as read button',
    context: 'DashboardPage.js',
  },
  {
    key: 'notifications.markedAllRead',
    category: 'messages',
    en: 'All notifications marked as read',
    ga: 'Marcáilte go léir mar léite',
    de: 'Alle Benachrichtigungen als gelesen markiert',
    es: 'Todas las notificaciones marcadas como leídas',
    it: 'Tutte le notifiche segnate come lette',
    no: 'Alle varsler merket som lest',
    fi: 'Kaikki ilmoitukset merkitty luetuksi',
    da: 'Alle notifikationer markeret som læst',
    sv: 'Alla notifikationer markerade som lästa',
    fr: 'Toutes les notifications marquées comme lues',
    pt: 'Todas as notificações marcadas como lidas',
    nl: 'Alle meldingen gemarkeerd als gelezen',
    'en-GB': 'All notifications marked as read',
    'en-AU': 'All notifications marked as read',
    'de-AT': 'Alle Benachrichtigungen als gelesen markiert',
    description: 'Success message when all notifications marked as read',
    context: 'DashboardPage.js',
  },
  {
    key: 'notifications.filter.all',
    category: 'buttons',
    en: 'All',
    ga: 'Uile',
    de: 'Alle',
    es: 'Todas',
    it: 'Tutte',
    no: 'Alle',
    fi: 'Kaikki',
    da: 'Alle',
    sv: 'Alla',
    fr: 'Toutes',
    pt: 'Todas',
    nl: 'Alle',
    'en-GB': 'All',
    'en-AU': 'All',
    'de-AT': 'Alle',
    description: 'Filter all notifications',
    context: 'DashboardPage.js',
  },
  {
    key: 'notifications.filter.unread',
    category: 'buttons',
    en: 'Unread',
    ga: 'Neamhléite',
    de: 'Ungelesen',
    es: 'No leídas',
    it: 'Non lette',
    no: 'Uleste',
    fi: 'Lukemattomat',
    da: 'Ulæste',
    sv: 'Olästa',
    fr: 'Non lues',
    pt: 'Não lidas',
    nl: 'Ongelezen',
    'en-GB': 'Unread',
    'en-AU': 'Unread',
    'de-AT': 'Ungelesen',
    description: 'Filter unread notifications',
    context: 'DashboardPage.js',
  },
  {
    key: 'notifications.filter.read',
    category: 'buttons',
    en: 'Read',
    ga: 'Léite',
    de: 'Gelesen',
    es: 'Leídas',
    it: 'Lette',
    no: 'Leste',
    fi: 'Luettu',
    da: 'Læste',
    sv: 'Lästa',
    fr: 'Lues',
    pt: 'Lidas',
    nl: 'Gelezen',
    'en-GB': 'Read',
    'en-AU': 'Read',
    'de-AT': 'Gelesen',
    description: 'Filter read notifications',
    context: 'DashboardPage.js',
  },
  {
    key: 'notifications.loading',
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
    context: 'DashboardPage.js',
  },
  {
    key: 'notifications.empty.title',
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
    context: 'DashboardPage.js',
  },
  {
    key: 'notifications.empty.unread',
    category: 'messages',
    en: 'You\'re all caught up! No unread notifications.',
    ga: 'Tá tú suas chun dáta! Níl aon fhógraí neamhléite.',
    de: 'Sie sind auf dem neuesten Stand! Keine ungelesenen Benachrichtigungen.',
    es: '¡Estás al día! No hay notificaciones sin leer.',
    it: 'Sei aggiornato! Nessuna notifica non letta.',
    no: 'Du er oppdatert! Ingen uleste varsler.',
    fi: 'Olet ajan tasalla! Ei lukemattomia ilmoituksia.',
    da: 'Du er opdateret! Ingen ulæste notifikationer.',
    sv: 'Du är uppdaterad! Inga olästa notifikationer.',
    fr: 'Vous êtes à jour ! Aucune notification non lue.',
    pt: 'Você está em dia! Nenhuma notificação não lida.',
    nl: 'U bent helemaal bij! Geen ongelezen meldingen.',
    'en-GB': 'You\'re all caught up! No unread notifications.',
    'en-AU': 'You\'re all caught up! No unread notifications.',
    'de-AT': 'Sie sind auf dem neuesten Stand! Keine ungelesenen Benachrichtigungen.',
    description: 'Empty unread notifications message',
    context: 'DashboardPage.js',
  },
  {
    key: 'notifications.empty.read',
    category: 'messages',
    en: 'No read notifications yet.',
    ga: 'Níl aon fhógraí léite fós.',
    de: 'Noch keine gelesenen Benachrichtigungen.',
    es: 'Aún no hay notificaciones leídas.',
    it: 'Nessuna notifica letta ancora.',
    no: 'Ingen leste varsler ennå.',
    fi: 'Ei vielä luettuja ilmoituksia.',
    da: 'Ingen læste notifikationer endnu.',
    sv: 'Inga lästa notifikationer ännu.',
    fr: 'Aucune notification lue pour le moment.',
    pt: 'Nenhuma notificação lida ainda.',
    nl: 'Nog geen gelezen meldingen.',
    'en-GB': 'No read notifications yet.',
    'en-AU': 'No read notifications yet.',
    'de-AT': 'Noch keine gelesenen Benachrichtigungen.',
    description: 'Empty read notifications message',
    context: 'DashboardPage.js',
  },
  {
    key: 'notifications.empty.all',
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
    description: 'Empty all notifications message',
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

