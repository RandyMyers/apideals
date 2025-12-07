const mongoose = require('mongoose');
const Translation = require('../models/translation');
require('dotenv').config();

const translations = [
  // Dashboard Settings Section
  {
    key: 'dashboard.sections.settings',
    category: 'pages',
    en: 'Settings',
    ga: 'Socruithe',
    de: 'Einstellungen',
    es: 'Configuración',
    it: 'Impostazioni',
    no: 'Innstillinger',
    fi: 'Asetukset',
    da: 'Indstillinger',
    sv: 'Inställningar',
    fr: 'Paramètres',
    pt: 'Configurações',
    nl: 'Instellingen',
    'en-GB': 'Settings',
    'en-AU': 'Settings',
    'de-AT': 'Einstellungen',
    description: 'Settings section in dashboard',
    context: 'DashboardPage.js'
  },
  
  // Settings - Email Preferences
  {
    key: 'settings.emailPreferences.title',
    category: 'pages',
    translations: {
      en: 'Email Preferences',
      ga: 'Roghanna Ríomhphoist',
      de: 'E-Mail-Einstellungen',
      es: 'Preferencias de Correo',
      it: 'Preferenze Email',
      no: 'E-postinnstillinger',
      fi: 'Sähköpostiasetukset',
      da: 'E-mail-indstillinger',
      sv: 'E-postinställningar'
    }
  },
  {
    key: 'settings.emailPreferences.description',
    category: 'pages',
    translations: {
      en: 'Manage what emails you receive from us',
      ga: 'Bainistigh na ríomhphoist a fhaigheann tú uainn',
      de: 'Verwalten Sie, welche E-Mails Sie von uns erhalten',
      es: 'Gestiona qué correos recibes de nosotros',
      it: 'Gestisci quali email ricevi da noi',
      no: 'Administrer hvilke e-poster du mottar fra oss',
      fi: 'Hallitse, mitä sähköposteja saat meiltä',
      da: 'Administrer, hvilke e-mails du modtager fra os',
      sv: 'Hantera vilka e-postmeddelanden du får från oss'
    }
  },
  {
    key: 'settings.emailPreferences.newsletter',
    category: 'pages',
    translations: {
      en: 'Newsletter',
      ga: 'Nuachtlitir',
      de: 'Newsletter',
      es: 'Boletín',
      it: 'Newsletter',
      no: 'Nyhetsbrev',
      fi: 'Uutiskirje',
      da: 'Nyhedsbrev',
      sv: 'Nyhetsbrev'
    }
  },
  {
    key: 'settings.emailPreferences.newsletterDesc',
    category: 'pages',
    translations: {
      en: 'Weekly updates with the best deals and coupons',
      ga: 'Nuashonruithe seachtainiúla leis na margaí agus cupóin is fearr',
      de: 'Wöchentliche Updates mit den besten Angeboten und Gutscheinen',
      es: 'Actualizaciones semanales con las mejores ofertas y cupones',
      it: 'Aggiornamenti settimanali con le migliori offerte e coupon',
      no: 'Ukentlige oppdateringer med de beste tilbudene og kupongene',
      fi: 'Viikoittaiset päivitykset parhailla tarjouksilla ja kuponkeilla',
      da: 'Ugentlige opdateringer med de bedste tilbud og kuponer',
      sv: 'Veckovisa uppdateringar med de bästa erbjudandena och kupongerna'
    }
  },
  {
    key: 'settings.emailPreferences.emailNotifications',
    category: 'pages',
    translations: {
      en: 'Email Notifications',
      ga: 'Fógraí Ríomhphoist',
      de: 'E-Mail-Benachrichtigungen',
      es: 'Notificaciones por Correo',
      it: 'Notifiche Email',
      no: 'E-postvarsler',
      fi: 'Sähköposti-ilmoitukset',
      da: 'E-mail-beskeder',
      sv: 'E-postmeddelanden'
    }
  },
  {
    key: 'settings.emailPreferences.emailNotificationsDesc',
    category: 'pages',
    translations: {
      en: 'Receive notifications via email',
      ga: 'Faigh fógraí trí ríomhphost',
      de: 'Benachrichtigungen per E-Mail erhalten',
      es: 'Recibir notificaciones por correo',
      it: 'Ricevi notifiche via email',
      no: 'Motta varsler via e-post',
      fi: 'Vastaanota ilmoituksia sähköpostitse',
      da: 'Modtag notifikationer via e-mail',
      sv: 'Ta emot meddelanden via e-post'
    }
  },
  {
    key: 'settings.emailPreferences.dealAlerts',
    category: 'pages',
    translations: {
      en: 'Deal Alerts',
      ga: 'Foláirimh Margaí',
      de: 'Angebotsbenachrichtigungen',
      es: 'Alertas de Ofertas',
      it: 'Avvisi Offerte',
      no: 'Tilbudsvarsler',
      fi: 'Tarjousilmoitukset',
      da: 'Tilbudsbeskeder',
      sv: 'Erbjudandevarningar'
    }
  },
  {
    key: 'settings.emailPreferences.dealAlertsDesc',
    category: 'pages',
    translations: {
      en: 'Get notified about new deals from your followed stores',
      ga: 'Faigh fógra faoi mhargaí nua ó na siopaí a leanann tú',
      de: 'Benachrichtigungen über neue Angebote von Ihren verfolgten Geschäften erhalten',
      es: 'Recibe notificaciones sobre nuevas ofertas de tus tiendas seguidas',
      it: 'Ricevi notifiche su nuove offerte dai negozi che segui',
      no: 'Få varsler om nye tilbud fra butikkene du følger',
      fi: 'Saa ilmoituksia uusista tarjouksista seuraamistasi kaupoista',
      da: 'Få besked om nye tilbud fra butikkerne du følger',
      sv: 'Få meddelanden om nya erbjudanden från butikerna du följer'
    }
  },
  {
    key: 'settings.emailPreferences.promotional',
    category: 'pages',
    translations: {
      en: 'Promotional Emails',
      ga: 'Ríomhphoist Promóideacha',
      de: 'Werbe-E-Mails',
      es: 'Correos Promocionales',
      it: 'Email Promozionali',
      no: 'Promoterings-e-poster',
      fi: 'Mainosviestit',
      da: 'Promoverings-e-mails',
      sv: 'Reklammeddelanden'
    }
  },
  {
    key: 'settings.emailPreferences.promotionalDesc',
    category: 'pages',
    translations: {
      en: 'Special offers and promotions',
      ga: 'Tairiscintí speisialta agus promóidí',
      de: 'Sonderangebote und Werbeaktionen',
      es: 'Ofertas especiales y promociones',
      it: 'Offerte speciali e promozioni',
      no: 'Spesialtilbud og kampanjer',
      fi: 'Erikoistarjoukset ja kampanjat',
      da: 'Særlige tilbud og kampagner',
      sv: 'Specialerbjudanden och kampanjer'
    }
  },
  
  // Settings - Notification Preferences
  {
    key: 'settings.notificationPreferences.title',
    category: 'pages',
    translations: {
      en: 'Notification Preferences',
      ga: 'Roghanna Fógraí',
      de: 'Benachrichtigungseinstellungen',
      es: 'Preferencias de Notificaciones',
      it: 'Preferenze Notifiche',
      no: 'Varslingsinnstillinger',
      fi: 'Ilmoitusasetukset',
      da: 'Notifikationsindstillinger',
      sv: 'Meddelandeinställningar'
    }
  },
  {
    key: 'settings.notificationPreferences.description',
    category: 'pages',
    translations: {
      en: 'Choose how you want to receive notifications',
      ga: 'Roghnaigh conas is mian leat fógraí a fháil',
      de: 'Wählen Sie, wie Sie Benachrichtigungen erhalten möchten',
      es: 'Elige cómo quieres recibir notificaciones',
      it: 'Scegli come vuoi ricevere le notifiche',
      no: 'Velg hvordan du vil motta varsler',
      fi: 'Valitse, miten haluat vastaanottaa ilmoituksia',
      da: 'Vælg, hvordan du vil modtage notifikationer',
      sv: 'Välj hur du vill ta emot meddelanden'
    }
  },
  {
    key: 'settings.notificationPreferences.email',
    category: 'pages',
    translations: {
      en: 'Email Notifications',
      ga: 'Fógraí Ríomhphoist',
      de: 'E-Mail-Benachrichtigungen',
      es: 'Notificaciones por Correo',
      it: 'Notifiche Email',
      no: 'E-postvarsler',
      fi: 'Sähköposti-ilmoitukset',
      da: 'E-mail-beskeder',
      sv: 'E-postmeddelanden'
    }
  },
  {
    key: 'settings.notificationPreferences.emailDesc',
    category: 'pages',
    translations: {
      en: 'Receive notifications via email',
      ga: 'Faigh fógraí trí ríomhphost',
      de: 'Benachrichtigungen per E-Mail erhalten',
      es: 'Recibir notificaciones por correo',
      it: 'Ricevi notifiche via email',
      no: 'Motta varsler via e-post',
      fi: 'Vastaanota ilmoituksia sähköpostitse',
      da: 'Modtag notifikationer via e-mail',
      sv: 'Ta emot meddelanden via e-post'
    }
  },
  {
    key: 'settings.notificationPreferences.inApp',
    category: 'pages',
    translations: {
      en: 'In-App Notifications',
      ga: 'Fógraí San Aip',
      de: 'In-App-Benachrichtigungen',
      es: 'Notificaciones en la App',
      it: 'Notifiche In-App',
      no: 'Inn-app-varsler',
      fi: 'Sovelluksen ilmoitukset',
      da: 'In-app-beskeder',
      sv: 'In-app-meddelanden'
    }
  },
  {
    key: 'settings.notificationPreferences.inAppDesc',
    category: 'pages',
    translations: {
      en: 'Receive notifications within the app',
      ga: 'Faigh fógraí laistigh den aip',
      de: 'Benachrichtigungen innerhalb der App erhalten',
      es: 'Recibir notificaciones dentro de la app',
      it: 'Ricevi notifiche all\'interno dell\'app',
      no: 'Motta varsler i appen',
      fi: 'Vastaanota ilmoituksia sovelluksen sisällä',
      da: 'Modtag notifikationer i appen',
      sv: 'Ta emot meddelanden i appen'
    }
  },
  
  // Settings - General
  {
    key: 'settings.saving',
    category: 'pages',
    translations: {
      en: 'Saving...',
      ga: 'Á shábháil...',
      de: 'Wird gespeichert...',
      es: 'Guardando...',
      it: 'Salvataggio...',
      no: 'Lagrer...',
      fi: 'Tallennetaan...',
      da: 'Gemmer...',
      sv: 'Sparar...'
    }
  },
  {
    key: 'settings.save',
    category: 'pages',
    translations: {
      en: 'Save Preferences',
      ga: 'Roghanna a Shábháil',
      de: 'Einstellungen speichern',
      es: 'Guardar Preferencias',
      it: 'Salva Preferenze',
      no: 'Lagre innstillinger',
      fi: 'Tallenna asetukset',
      da: 'Gem indstillinger',
      sv: 'Spara inställningar'
    }
  },
  {
    key: 'settings.preferences.saved',
    category: 'pages',
    translations: {
      en: 'Preferences saved successfully',
      ga: 'Roghanna sábháladh go rathúil',
      de: 'Einstellungen erfolgreich gespeichert',
      es: 'Preferencias guardadas exitosamente',
      it: 'Preferenze salvate con successo',
      no: 'Innstillinger lagret',
      fi: 'Asetukset tallennettu onnistuneesti',
      da: 'Indstillinger gemt',
      sv: 'Inställningar sparade'
    }
  },
  {
    key: 'settings.preferences.saveFailed',
    category: 'pages',
    translations: {
      en: 'Failed to save preferences',
      ga: 'Theip ar roghanna a shábháil',
      de: 'Einstellungen konnten nicht gespeichert werden',
      es: 'Error al guardar preferencias',
      it: 'Impossibile salvare le preferenze',
      no: 'Kunne ikke lagre innstillinger',
      fi: 'Asetusten tallennus epäonnistui',
      da: 'Kunne ikke gemme indstillinger',
      sv: 'Kunde inte spara inställningar'
    }
  },
  
  // Settings - Security
  {
    key: 'settings.security.title',
    category: 'pages',
    translations: {
      en: 'Security',
      ga: 'Slándáil',
      de: 'Sicherheit',
      es: 'Seguridad',
      it: 'Sicurezza',
      no: 'Sikkerhet',
      fi: 'Turvallisuus',
      da: 'Sikkerhed',
      sv: 'Säkerhet'
    }
  },
  {
    key: 'settings.security.description',
    category: 'pages',
    translations: {
      en: 'Manage your account security and password',
      ga: 'Bainistigh slándáil do chuntais agus do phasfhocail',
      de: 'Verwalten Sie Ihre Kontosicherheit und Ihr Passwort',
      es: 'Gestiona la seguridad de tu cuenta y contraseña',
      it: 'Gestisci la sicurezza del tuo account e la password',
      no: 'Administrer kontosikkerheten og passordet ditt',
      fi: 'Hallitse tilisi turvallisuutta ja salasanaa',
      da: 'Administrer din kontosikkerhed og adgangskode',
      sv: 'Hantera din kontosäkerhet och lösenord'
    }
  },
  {
    key: 'settings.security.currentPassword',
    category: 'pages',
    translations: {
      en: 'Current Password',
      ga: 'Pasfhocal Reatha',
      de: 'Aktuelles Passwort',
      es: 'Contraseña Actual',
      it: 'Password Attuale',
      no: 'Nåværende passord',
      fi: 'Nykyinen salasana',
      da: 'Nuværende adgangskode',
      sv: 'Nuvarande lösenord'
    }
  },
  {
    key: 'settings.security.currentPasswordPlaceholder',
    category: 'pages',
    translations: {
      en: 'Enter current password',
      ga: 'Iontráil pasfhocal reatha',
      de: 'Aktuelles Passwort eingeben',
      es: 'Ingresa tu contraseña actual',
      it: 'Inserisci la password attuale',
      no: 'Skriv inn nåværende passord',
      fi: 'Syötä nykyinen salasana',
      da: 'Indtast nuværende adgangskode',
      sv: 'Ange nuvarande lösenord'
    }
  },
  {
    key: 'settings.security.newPassword',
    category: 'pages',
    translations: {
      en: 'New Password',
      ga: 'Pasfhocal Nua',
      de: 'Neues Passwort',
      es: 'Nueva Contraseña',
      it: 'Nuova Password',
      no: 'Nytt passord',
      fi: 'Uusi salasana',
      da: 'Ny adgangskode',
      sv: 'Nytt lösenord'
    }
  },
  {
    key: 'settings.security.newPasswordPlaceholder',
    category: 'pages',
    translations: {
      en: 'Enter new password (min 8 characters)',
      ga: 'Iontráil pasfhocal nua (ar a laghad 8 carachtar)',
      de: 'Neues Passwort eingeben (mind. 8 Zeichen)',
      es: 'Ingresa nueva contraseña (mín. 8 caracteres)',
      it: 'Inserisci nuova password (min 8 caratteri)',
      no: 'Skriv inn nytt passord (min. 8 tegn)',
      fi: 'Syötä uusi salasana (vähintään 8 merkkiä)',
      da: 'Indtast ny adgangskode (min. 8 tegn)',
      sv: 'Ange nytt lösenord (minst 8 tecken)'
    }
  },
  {
    key: 'settings.security.confirmPassword',
    category: 'pages',
    translations: {
      en: 'Confirm New Password',
      ga: 'Deimhnigh Pasfhocal Nua',
      de: 'Neues Passwort bestätigen',
      es: 'Confirmar Nueva Contraseña',
      it: 'Conferma Nuova Password',
      no: 'Bekreft nytt passord',
      fi: 'Vahvista uusi salasana',
      da: 'Bekræft ny adgangskode',
      sv: 'Bekräfta nytt lösenord'
    }
  },
  {
    key: 'settings.security.confirmPasswordPlaceholder',
    category: 'pages',
    translations: {
      en: 'Confirm new password',
      ga: 'Deimhnigh pasfhocal nua',
      de: 'Neues Passwort bestätigen',
      es: 'Confirma tu nueva contraseña',
      it: 'Conferma la nuova password',
      no: 'Bekreft nytt passord',
      fi: 'Vahvista uusi salasana',
      da: 'Bekræft ny adgangskode',
      sv: 'Bekräfta nytt lösenord'
    }
  },
  {
    key: 'settings.security.changing',
    category: 'pages',
    translations: {
      en: 'Changing...',
      ga: 'Á athrú...',
      de: 'Wird geändert...',
      es: 'Cambiando...',
      it: 'Modifica in corso...',
      no: 'Endrer...',
      fi: 'Vaihdetaan...',
      da: 'Ændrer...',
      sv: 'Ändrar...'
    }
  },
  {
    key: 'settings.security.changePassword',
    category: 'pages',
    translations: {
      en: 'Change Password',
      ga: 'Athraigh Pasfhocal',
      de: 'Passwort ändern',
      es: 'Cambiar Contraseña',
      it: 'Cambia Password',
      no: 'Endre passord',
      fi: 'Vaihda salasana',
      da: 'Ændre adgangskode',
      sv: 'Ändra lösenord'
    }
  },
  {
    key: 'settings.security.passwordsDoNotMatch',
    category: 'pages',
    translations: {
      en: 'Passwords do not match',
      ga: 'Ní bhíonn na pasfhocail comhoiriúnach',
      de: 'Passwörter stimmen nicht überein',
      es: 'Las contraseñas no coinciden',
      it: 'Le password non corrispondono',
      no: 'Passordene stemmer ikke',
      fi: 'Salasanat eivät täsmää',
      da: 'Adgangskoderne stemmer ikke overens',
      sv: 'Lösenorden matchar inte'
    }
  },
  {
    key: 'settings.security.passwordTooShort',
    category: 'pages',
    translations: {
      en: 'Password must be at least 8 characters',
      ga: 'Ní mór pasfhocal a bheith ar a laghad 8 carachtar',
      de: 'Passwort muss mindestens 8 Zeichen lang sein',
      es: 'La contraseña debe tener al menos 8 caracteres',
      it: 'La password deve essere di almeno 8 caratteri',
      no: 'Passordet må være minst 8 tegn',
      fi: 'Salasanan on oltava vähintään 8 merkkiä',
      da: 'Adgangskoden skal være mindst 8 tegn',
      sv: 'Lösenordet måste vara minst 8 tecken'
    }
  },
  {
    key: 'settings.security.passwordChanged',
    category: 'pages',
    translations: {
      en: 'Password changed successfully',
      ga: 'Athraíodh an pasfhocal go rathúil',
      de: 'Passwort erfolgreich geändert',
      es: 'Contraseña cambiada exitosamente',
      it: 'Password modificata con successo',
      no: 'Passord endret',
      fi: 'Salasana vaihdettu onnistuneesti',
      da: 'Adgangskode ændret',
      sv: 'Lösenordet ändrades'
    }
  },
  {
    key: 'settings.security.passwordChangeFailed',
    category: 'pages',
    translations: {
      en: 'Failed to change password',
      ga: 'Theip ar an pasfhocal a athrú',
      de: 'Passwort konnte nicht geändert werden',
      es: 'Error al cambiar contraseña',
      it: 'Impossibile modificare la password',
      no: 'Kunne ikke endre passord',
      fi: 'Salasanan vaihto epäonnistui',
      da: 'Kunne ikke ændre adgangskode',
      sv: 'Kunde inte ändra lösenordet'
    }
  },
  
  // Settings - Delete Account
  {
    key: 'settings.deleteAccount.title',
    category: 'pages',
    translations: {
      en: 'Delete Account',
      ga: 'Scrios Cuntas',
      de: 'Konto löschen',
      es: 'Eliminar Cuenta',
      it: 'Elimina Account',
      no: 'Slett konto',
      fi: 'Poista tili',
      da: 'Slet konto',
      sv: 'Ta bort konto'
    }
  },
  {
    key: 'settings.deleteAccount.description',
    category: 'pages',
    translations: {
      en: 'Once you delete your account, there is no going back. Please be certain.',
      ga: 'Nuair a scriosann tú do chuntas, níl aon dul siar. Bí cinnte le do thoil.',
      de: 'Sobald Sie Ihr Konto löschen, gibt es kein Zurück. Bitte seien Sie sich sicher.',
      es: 'Una vez que elimines tu cuenta, no hay vuelta atrás. Por favor, ten certeza.',
      it: 'Una volta eliminato il tuo account, non c\'è modo di tornare indietro. Sii certo.',
      no: 'Når du sletter kontoen din, er det ingen vei tilbake. Vær sikker.',
      fi: 'Kun poistat tilisi, ei ole paluuta. Ole varma.',
      da: 'Når du sletter din konto, er der ingen vej tilbage. Vær sikker.',
      sv: 'När du tar bort ditt konto finns det ingen återvändo. Var säker.'
    }
  },
  {
    key: 'settings.deleteAccount.deleteButton',
    category: 'pages',
    translations: {
      en: 'Delete My Account',
      ga: 'Scrios Mo Chuntas',
      de: 'Mein Konto löschen',
      es: 'Eliminar Mi Cuenta',
      it: 'Elimina Il Mio Account',
      no: 'Slett min konto',
      fi: 'Poista tilini',
      da: 'Slet min konto',
      sv: 'Ta bort mitt konto'
    }
  },
  {
    key: 'settings.deleteAccount.confirmLabel',
    category: 'pages',
    translations: {
      en: 'Type "DELETE" to confirm',
      ga: 'Clóscríobh "DELETE" chun deimhniú',
      de: 'Geben Sie "DELETE" ein, um zu bestätigen',
      es: 'Escribe "DELETE" para confirmar',
      it: 'Digita "DELETE" per confermare',
      no: 'Skriv "DELETE" for å bekrefte',
      fi: 'Kirjoita "DELETE" vahvistaaksesi',
      da: 'Skriv "DELETE" for at bekræfte',
      sv: 'Skriv "DELETE" för att bekräfta'
    }
  },
  {
    key: 'settings.deleteAccount.confirmButton',
    category: 'pages',
    translations: {
      en: 'Confirm Deletion',
      ga: 'Deimhnigh Scriosadh',
      de: 'Löschung bestätigen',
      es: 'Confirmar Eliminación',
      it: 'Conferma Eliminazione',
      no: 'Bekreft sletting',
      fi: 'Vahvista poisto',
      da: 'Bekræft sletning',
      sv: 'Bekräfta borttagning'
    }
  },
  {
    key: 'settings.deleteAccount.confirmText',
    category: 'pages',
    translations: {
      en: 'Please type "DELETE" to confirm',
      ga: 'Clóscríobh "DELETE" le do thoil chun deimhniú',
      de: 'Bitte geben Sie "DELETE" ein, um zu bestätigen',
      es: 'Por favor escribe "DELETE" para confirmar',
      it: 'Per favore digita "DELETE" per confermare',
      no: 'Vennligst skriv "DELETE" for å bekrefte',
      fi: 'Kirjoita "DELETE" vahvistaaksesi',
      da: 'Indtast venligst "DELETE" for at bekræfte',
      sv: 'Vänligen skriv "DELETE" för att bekräfta'
    }
  },
  {
    key: 'settings.deleteAccount.notImplemented',
    category: 'pages',
    translations: {
      en: 'Account deletion is not yet available. Please contact support.',
      ga: 'Níl scriosadh cuntais ar fáil fós. Déan teagmháil le tacaíocht le do thoil.',
      de: 'Kontolöschung ist noch nicht verfügbar. Bitte kontaktieren Sie den Support.',
      es: 'La eliminación de cuenta aún no está disponible. Por favor, contacta con soporte.',
      it: 'L\'eliminazione dell\'account non è ancora disponibile. Contatta il supporto.',
      no: 'Kontosletting er ikke tilgjengelig ennå. Kontakt støtte.',
      fi: 'Tilin poistaminen ei ole vielä käytettävissä. Ota yhteyttä tukeen.',
      da: 'Kontosletning er ikke tilgængelig endnu. Kontakt support.',
      sv: 'Kontoborttagning är inte tillgänglig ännu. Kontakta support.'
    }
  },
  {
    key: 'settings.deleteAccount.failed',
    category: 'pages',
    translations: {
      en: 'Failed to delete account',
      ga: 'Theip ar an gcuntas a scriosadh',
      de: 'Konto konnte nicht gelöscht werden',
      es: 'Error al eliminar cuenta',
      it: 'Impossibile eliminare l\'account',
      no: 'Kunne ikke slette konto',
      fi: 'Tilin poistaminen epäonnistui',
      da: 'Kunne ikke slette konto',
      sv: 'Kunde inte ta bort kontot'
    }
  }
];

const seedSettingsTranslations = async () => {
  try {
    // Connect to MongoDB using the same method as app.js
    await mongoose.connect(process.env.MONGO_URL, { 
      useNewUrlParser: true, 
      useUnifiedTopology: true 
    });
    console.log('Connected to MongoDB');

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const translation of translations) {
      // Extract translations object if nested, otherwise use flat structure
      const { key, category, translations: langTranslations, description, context, ...flatTranslations } = translation;
      
      // Use flat structure if available, otherwise extract from nested translations
      const translationData = langTranslations ? { ...langTranslations } : flatTranslations;
      
      // Remove non-language fields
      delete translationData.key;
      delete translationData.category;
      delete translationData.description;
      delete translationData.context;

      // Check if translation exists
      const existing = await Translation.findOne({ key, category });

      if (existing) {
        // Update existing translation
        let hasChanges = false;
        for (const [lang, value] of Object.entries(translationData)) {
          if (existing[lang] !== value) {
            existing[lang] = value;
            hasChanges = true;
          }
        }
        
        if (description && existing.description !== description) {
          existing.description = description;
          hasChanges = true;
        }
        
        if (context && existing.context !== context) {
          existing.context = context;
          hasChanges = true;
        }

        if (hasChanges) {
          await existing.save();
          updated++;
          console.log(`Updated: ${key}`);
        } else {
          skipped++;
          console.log(`Skipped (no changes): ${key}`);
        }
      } else {
        // Create new translation
        const newTranslation = new Translation({
          key,
          category,
          ...translationData,
          description,
          context
        });
        await newTranslation.save();
        created++;
        console.log(`Created: ${key}`);
      }
    }

    console.log('\n=== Seeding Complete ===');
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
};

// Run the seed function
if (require.main === module) {
  seedSettingsTranslations();
}

module.exports = seedSettingsTranslations;

