/**
 * Seed Footer Translations
 * Ensures all footer translation keys are in the database
 * 
 * Usage: node server/scripts/seedMissingTranslations_17_footer.js
 */

require('dotenv').config();
const path = require('path');
const mongoose = require('mongoose');
const Translation = require('../models/translation');

// Connect to MongoDB using the same method as app.js
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

const footerTranslations = [
  {
    key: 'footer.brandTagline',
    category: 'footer',
    en: 'Your Ultimate Savings Destination',
    ga: 'Do Cheann Scríbe Sábhálacha Deiridh',
    de: 'Ihr ultimatives Sparziel',
    es: 'Tu destino definitivo de ahorros',
    it: 'La tua destinazione di risparmio definitiva',
    no: 'Din ultimate sparemålet',
    fi: 'Sinun lopullinen säästöpaikka',
    da: 'Din ultimative sparemål',
    sv: 'Din ultimata besparingsdestination',
    fr: 'Votre destination d\'économies ultime',
    pt: 'Seu destino definitivo de economia',
    nl: 'Uw ultieme besparingsbestemming',
    description: 'Footer brand tagline',
    context: 'footer.js',
  },
  {
    key: 'footer.brandDescription',
    category: 'footer',
    en: 'Discover thousands of verified coupons, exclusive deals, and cashback offers from your favorite stores. Join millions of smart shoppers saving money daily.',
    ga: 'Faigh amach mílte cúpóin fíoraithe, margaí eisiacha, agus tairiscintí airgid ar ais ó do stórais is fearr leat. Bí páirteach le milliúin siopadóirí cliste a shábhálann airgead go laethúil.',
    de: 'Entdecken Sie Tausende von verifizierten Gutscheinen, exklusiven Angeboten und Cashback-Angeboten von Ihren Lieblingsgeschäften. Schließen Sie sich Millionen von klugen Käufern an, die täglich Geld sparen.',
    es: 'Descubre miles de cupones verificados, ofertas exclusivas y ofertas de reembolso de tus tiendas favoritas. Únete a millones de compradores inteligentes que ahorran dinero diariamente.',
    it: 'Scopri migliaia di coupon verificati, offerte esclusive e offerte di cashback dai tuoi negozi preferiti. Unisciti a milioni di acquirenti intelligenti che risparmiano denaro quotidianamente.',
    no: 'Oppdag tusenvis av verifiserte kuponger, eksklusive tilbud og cashback-tilbud fra favorittbutikkene dine. Bli med millioner av smarte shoppere som sparer penger daglig.',
    fi: 'Löydä tuhansia vahvistettuja kupongeja, eksklusiivisia tarjouksia ja cashback-tarjouksia suosikkikauppojesi kautta. Liity miljooniin fiksuihin ostajiin, jotka säästävät rahaa päivittäin.',
    da: 'Oplev tusindvis af verificerede kuponer, eksklusive tilbud og cashback-tilbud fra dine favoritbutikker. Bliv med millioner af smarte shoppere, der sparer penge dagligt.',
    sv: 'Upptäck tusentals verifierade kuponger, exklusiva erbjudanden och cashback-erbjudanden från dina favoritbutiker. Gå med miljoner smarta shoppare som sparar pengar dagligen.',
    fr: 'Découvrez des milliers de coupons vérifiés, des offres exclusives et des offres de cashback de vos magasins préférés. Rejoignez des millions de consommateurs intelligents qui économisent de l\'argent quotidiennement.',
    pt: 'Descubra milhares de cupons verificados, ofertas exclusivas e ofertas de cashback de suas lojas favoritas. Junte-se a milhões de compradores inteligentes que economizam dinheiro diariamente.',
    nl: 'Ontdek duizenden geverifieerde kortingscodes, exclusieve aanbiedingen en cashback-aanbiedingen van uw favoriete winkels. Sluit u aan bij miljoenen slimme shoppers die dagelijks geld besparen.',
    description: 'Footer brand description',
    context: 'footer.js',
  },
  {
    key: 'footer.trust.verified',
    category: 'footer',
    en: '100% Verified',
    ga: 'Fíoraithe 100%',
    de: '100% verifiziert',
    es: '100% Verificado',
    it: '100% Verificato',
    no: '100% Verifisert',
    fi: '100% Vahvistettu',
    da: '100% Verificeret',
    sv: '100% Verifierat',
    fr: '100% Vérifié',
    pt: '100% Verificado',
    nl: '100% Geverifieerd',
    description: 'Footer trust badge verified',
    context: 'footer.js',
  },
  {
    key: 'footer.trust.trusted',
    category: 'footer',
    en: 'Trusted by 1M+',
    ga: 'Muinín ag 1M+',
    de: 'Vertraut von 1M+',
    es: 'De confianza para más de 1M',
    it: 'Fidato da oltre 1M',
    no: 'Stolt på av 1M+',
    fi: 'Yli 1M luottama',
    da: 'Stolt på af 1M+',
    sv: 'Förtroende av 1M+',
    fr: 'Fiable pour plus de 1M',
    pt: 'Confiado por mais de 1M',
    nl: 'Vertrouwd door 1M+',
    description: 'Footer trust badge trusted',
    context: 'footer.js',
  },
  {
    key: 'footer.trust.dailyUpdates',
    category: 'footer',
    en: 'Daily Updates',
    ga: 'Nuashonruithe Laethúla',
    de: 'Tägliche Updates',
    es: 'Actualizaciones diarias',
    it: 'Aggiornamenti giornalieri',
    no: 'Daglige oppdateringer',
    fi: 'Päivittäiset päivitykset',
    da: 'Daglige opdateringer',
    sv: 'Dagliga uppdateringar',
    fr: 'Mises à jour quotidiennes',
    pt: 'Atualizações diárias',
    nl: 'Dagelijkse updates',
    description: 'Footer trust badge daily updates',
    context: 'footer.js',
  },
  {
    key: 'footer.sections.popularStores',
    category: 'footer',
    en: 'Popular Stores',
    ga: 'Stórais Coitianta',
    de: 'Beliebte Geschäfte',
    es: 'Tiendas populares',
    it: 'Negozi popolari',
    no: 'Populære butikker',
    fi: 'Suositut kaupat',
    da: 'Populære butikker',
    sv: 'Populära butiker',
    fr: 'Magasins populaires',
    pt: 'Lojas populares',
    nl: 'Populaire winkels',
    'en-GB': 'Popular Stores',
    'en-AU': 'Popular Stores',
    'de-AT': 'Beliebte Geschäfte',
    description: 'Footer section title for popular stores',
    context: 'footer.js',
  },
  {
    key: 'footer.sections.categories',
    category: 'footer',
    en: 'Categories',
    ga: 'Catagóirí',
    de: 'Kategorien',
    es: 'Categorías',
    it: 'Categorie',
    no: 'Kategorier',
    fi: 'Kategoriat',
    da: 'Kategorier',
    sv: 'Kategorier',
    fr: 'Catégories',
    pt: 'Categorias',
    nl: 'Categorieën',
    'en-GB': 'Categories',
    'en-AU': 'Categories',
    'de-AT': 'Kategorien',
    description: 'Footer section title for categories',
    context: 'footer.js',
  },
  {
    key: 'footer.sections.support',
    category: 'footer',
    en: 'Support',
    ga: 'Tacaíocht',
    de: 'Support',
    es: 'Soporte',
    it: 'Supporto',
    no: 'Støtte',
    fi: 'Tuki',
    da: 'Support',
    sv: 'Support',
    fr: 'Assistance',
    pt: 'Suporte',
    nl: 'Ondersteuning',
    'en-GB': 'Support',
    'en-AU': 'Support',
    'de-AT': 'Unterstützung',
    description: 'Footer section title for support',
    context: 'footer.js',
  },
  {
    key: 'footer.sections.company',
    category: 'footer',
    en: 'Company',
    ga: 'Cuideachta',
    de: 'Unternehmen',
    es: 'Empresa',
    it: 'Azienda',
    no: 'Selskap',
    fi: 'Yritys',
    da: 'Virksomhed',
    sv: 'Företag',
    fr: 'Entreprise',
    pt: 'Empresa',
    nl: 'Bedrijf',
    'en-GB': 'Company',
    'en-AU': 'Company',
    'de-AT': 'Unternehmen',
    description: 'Footer section title for company',
    context: 'footer.js',
  },
  {
    key: 'footer.links.helpCenter',
    category: 'footer',
    en: 'Help Center',
    ga: 'Ionad Cabhrach',
    de: 'Hilfezentrum',
    es: 'Centro de ayuda',
    it: 'Centro assistenza',
    no: 'Hjelpesenter',
    fi: 'Ohjekeskus',
    da: 'Hjælpecenter',
    sv: 'Hjälpcenter',
    fr: 'Centre d\'aide',
    pt: 'Centro de Ajuda',
    nl: 'Helpcentrum',
    'en-GB': 'Help Centre',
    'en-AU': 'Help Centre',
    'de-AT': 'Hilfezentrum',
    description: 'Footer link to help center',
    context: 'footer.js',
  },
  {
    key: 'footer.links.contactUs',
    category: 'footer',
    en: 'Contact Us',
    ga: 'Déan Teagmháil Linn',
    de: 'Kontaktieren Sie uns',
    es: 'Contáctanos',
    it: 'Contattaci',
    no: 'Kontakt oss',
    fi: 'Ota yhteyttä',
    da: 'Kontakt os',
    sv: 'Kontakta oss',
    fr: 'Contactez-nous',
    pt: 'Entre em contato',
    nl: 'Neem contact op',
    'en-GB': 'Contact Us',
    'en-AU': 'Contact Us',
    'de-AT': 'Kontaktieren Sie uns',
    description: 'Footer link to contact page',
    context: 'footer.js',
  },
  {
    key: 'footer.links.faqs',
    category: 'footer',
    en: 'FAQs',
    ga: 'Ceisteanna Coitianta',
    de: 'Häufig gestellte Fragen',
    es: 'Preguntas frecuentes',
    it: 'Domande frequenti',
    no: 'Ofte stilte spørsmål',
    fi: 'Usein kysytyt kysymykset',
    da: 'Ofte stillede spørgsmål',
    sv: 'Vanliga frågor',
    fr: 'FAQ',
    pt: 'Perguntas frequentes',
    nl: 'Veelgestelde vragen',
    'en-GB': 'FAQs',
    'en-AU': 'FAQs',
    'de-AT': 'Häufig gestellte Fragen',
    description: 'Footer link to FAQs',
    context: 'footer.js',
  },
  {
    key: 'footer.links.submitCoupon',
    category: 'footer',
    en: 'Submit Coupon',
    ga: 'Cúpón a Chur Isteach',
    de: 'Gutschein einreichen',
    es: 'Enviar cupón',
    it: 'Invia coupon',
    no: 'Send inn kupong',
    fi: 'Lähetä kuponki',
    da: 'Indsend kupon',
    sv: 'Skicka in kupong',
    fr: 'Soumettre un coupon',
    pt: 'Enviar cupom',
    nl: 'Coupon indienen',
    'en-GB': 'Submit Coupon',
    'en-AU': 'Submit Coupon',
    'de-AT': 'Gutschein einreichen',
    description: 'Footer link to submit coupon',
    context: 'footer.js',
  },
  {
    key: 'footer.links.reportIssue',
    category: 'footer',
    en: 'Report Issue',
    ga: 'Tuairisc a Thabhairt ar Shaincheist',
    de: 'Problem melden',
    es: 'Reportar problema',
    it: 'Segnala problema',
    no: 'Rapporter problem',
    fi: 'Ilmoita ongelma',
    da: 'Rapporter problem',
    sv: 'Rapportera problem',
    fr: 'Signaler un problème',
    pt: 'Relatar problema',
    nl: 'Probleem melden',
    'en-GB': 'Report Issue',
    'en-AU': 'Report Issue',
    'de-AT': 'Problem melden',
    description: 'Footer link to report issue',
    context: 'footer.js',
  },
  {
    key: 'footer.links.feedback',
    category: 'footer',
    en: 'Feedback',
    ga: 'Aiseolas',
    de: 'Feedback',
    es: 'Comentarios',
    it: 'Feedback',
    no: 'Tilbakemelding',
    fi: 'Palaute',
    da: 'Feedback',
    sv: 'Feedback',
    fr: 'Commentaires',
    pt: 'Comentários',
    nl: 'Feedback',
    'en-GB': 'Feedback',
    'en-AU': 'Feedback',
    'de-AT': 'Rückmeldung',
    description: 'Footer link to feedback',
    context: 'footer.js',
  },
  {
    key: 'footer.links.aboutUs',
    category: 'footer',
    en: 'About Us',
    ga: 'Fúinn',
    de: 'Über uns',
    es: 'Acerca de nosotros',
    it: 'Chi siamo',
    no: 'Om oss',
    fi: 'Tietoa meistä',
    da: 'Om os',
    sv: 'Om oss',
    fr: 'À propos',
    pt: 'Sobre nós',
    nl: 'Over ons',
    'en-GB': 'About Us',
    'en-AU': 'About Us',
    'de-AT': 'Über uns',
    description: 'Footer link to about page',
    context: 'footer.js',
  },
  {
    key: 'footer.links.blog',
    category: 'footer',
    en: 'Blog',
    ga: 'Blag',
    de: 'Blog',
    es: 'Blog',
    it: 'Blog',
    no: 'Blogg',
    fi: 'Blogi',
    da: 'Blog',
    sv: 'Blogg',
    fr: 'Blog',
    pt: 'Blog',
    nl: 'Blog',
    'en-GB': 'Blog',
    'en-AU': 'Blog',
    'de-AT': 'Blog',
    description: 'Footer link to blog',
    context: 'footer.js',
  },
  {
    key: 'footer.links.partners',
    category: 'footer',
    en: 'Partners',
    ga: 'Comhpháirtithe',
    de: 'Partner',
    es: 'Socios',
    it: 'Partner',
    no: 'Partnere',
    fi: 'Kumppanit',
    da: 'Partnere',
    sv: 'Partners',
    fr: 'Partenaires',
    pt: 'Parceiros',
    nl: 'Partners',
    'en-GB': 'Partners',
    'en-AU': 'Partners',
    'de-AT': 'Partner',
    description: 'Footer link to partners',
    context: 'footer.js',
  },
  {
    key: 'footer.noStores',
    category: 'footer',
    en: 'No stores available',
    ga: 'Níl aon stórais ar fáil',
    de: 'Keine Geschäfte verfügbar',
    es: 'No hay tiendas disponibles',
    it: 'Nessun negozio disponibile',
    no: 'Ingen butikker tilgjengelig',
    fi: 'Kauppoja ei ole saatavilla',
    da: 'Ingen butikker tilgængelige',
    sv: 'Inga butiker tillgängliga',
    fr: 'Aucun magasin disponible',
    pt: 'Nenhuma loja disponível',
    nl: 'Geen winkels beschikbaar',
    description: 'Footer empty state for stores',
    context: 'footer.js',
  },
  {
    key: 'footer.sections.about',
    category: 'footer',
    en: 'About',
    ga: 'Faoi',
    de: 'Über',
    es: 'Acerca de',
    it: 'Circa',
    no: 'Om',
    fi: 'Tietoja',
    da: 'Om',
    sv: 'Om',
    fr: 'À propos',
    pt: 'Sobre',
    nl: 'Over',
    description: 'Footer section title for about',
    context: 'footer.js',
  },
  {
    key: 'footer.social.followus',
    category: 'footer',
    en: 'Follow Us',
    ga: 'Leanúint Linn',
    de: 'Folgen Sie uns',
    es: 'Síguenos',
    it: 'Seguici',
    no: 'Følg oss',
    fi: 'Seuraa meitä',
    da: 'Følg os',
    sv: 'Följ oss',
    fr: 'Suivez-nous',
    pt: 'Siga-nos',
    nl: 'Volg ons',
    description: 'Footer social media section title',
    context: 'footer.js',
  },
  {
    key: 'footer.nocategories',
    category: 'footer',
    en: 'No categories available',
    ga: 'Níl aon chatagóirí ar fáil',
    de: 'Keine Kategorien verfügbar',
    es: 'No hay categorías disponibles',
    it: 'Nessuna categoria disponibile',
    no: 'Ingen kategorier tilgjengelig',
    fi: 'Ei kategorioita saatavilla',
    da: 'Ingen kategorier tilgængelige',
    sv: 'Inga kategorier tillgängliga',
    fr: 'Aucune catégorie disponible',
    pt: 'Nenhuma categoria disponível',
    nl: 'Geen categorieën beschikbaar',
    description: 'Footer no categories message',
    context: 'footer.js',
  },
];

const seedFooterTranslations = async () => {
  try {
    const connected = await connectDB();
    if (!connected) {
      process.exit(1);
    }

    console.log('Starting to seed footer translations...');
    let added = 0;
    let updated = 0;
    let skipped = 0;

    for (const translation of footerTranslations) {
      try {
        const existing = await Translation.findOne({ key: translation.key });
        
        if (existing) {
          // Update existing translation
          Object.keys(translation).forEach(key => {
            if (key !== '_id' && key !== '__v' && key !== 'createdAt' && key !== 'updatedAt') {
              existing[key] = translation[key];
            }
          });
          await existing.save();
          updated++;
          console.log(`✓ Updated: ${translation.key}`);
        } else {
          // Create new translation
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
    console.log(`Total: ${footerTranslations.length}`);
    console.log('\n✓ Footer translations seeding completed!');

    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding footer translations:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run the seeding function
seedFooterTranslations();

