/**
 * Fix English Placeholders in Seed Files
 * Automatically replaces English placeholders with proper translations
 * 
 * Usage: node server/scripts/fixEnglishPlaceholders.js
 */

const fs = require('fs');
const path = require('path');

// Translation mappings for common English placeholders
const translations = {
  fr: {
    'No sponsored stores available': 'Aucun magasin sponsorisé disponible',
    'No top stores available': 'Aucun magasin de premier plan disponible',
    'Newest First': 'Plus récents d\'abord',
    'Most Viewed': 'Les plus consultés',
    'Highest Rated': 'Les mieux notés',
    'Name (A-Z)': 'Nom (A-Z)',
    'No stores found': 'Aucun magasin trouvé',
    '⭐ Sponsored': '⭐ Sponsorisé',
    '{{count}} coupons': '{{count}} coupons',
    'Store Details': 'Détails du magasin',
    'Visit Website': 'Visiter le site web',
    'Saving Tips': 'Conseils d\'économie',
    'Sign up for the store newsletter to receive exclusive discounts': 'Inscrivez-vous à la newsletter du magasin pour recevoir des réductions exclusives',
    'Look for free shipping codes to save on delivery costs': 'Recherchez des codes de livraison gratuite pour économiser sur les frais de livraison',
    'Combine multiple coupons when possible for maximum savings': 'Combinez plusieurs coupons lorsque possible pour des économies maximales',
    'Check coupon expiry dates before using them': 'Vérifiez les dates d\'expiration des coupons avant de les utiliser',
    'Related Stores': 'Magasins similaires',
    'Facebook': 'Facebook',
    'Twitter': 'Twitter',
    'Email': 'Email',
    'Tags': 'Étiquettes',
    'Excellent': 'Excellent',
    'Support': 'Support',
    'Blog': 'Blog',
    'Feedback': 'Commentaires',
    'Coupons': 'Coupons',
    'Sessions': 'Sessions',
    'Interactions': 'Interactions',
    'Activity Log': 'Journal d\'activité',
    'Total Savings': 'Économies totales',
    'Restrictions': 'Restrictions',
    'Dates & Links': 'Dates et liens',
    'Description': 'Description',
    'Manual': 'Manuel',
  },
  pt: {
    'No sponsored stores available': 'Nenhuma loja patrocinada disponível',
    'No top stores available': 'Nenhuma loja top disponível',
    'Newest First': 'Mais recentes primeiro',
    'Most Viewed': 'Mais visualizados',
    'Highest Rated': 'Melhor avaliados',
    'Name (A-Z)': 'Nome (A-Z)',
    'No stores found': 'Nenhuma loja encontrada',
    '⭐ Sponsored': '⭐ Patrocinado',
    '{{count}} coupons': '{{count}} cupons',
    'Store Details': 'Detalhes da loja',
    'Visit Website': 'Visitar site',
    'Saving Tips': 'Dicas de economia',
    'Sign up for the store newsletter to receive exclusive discounts': 'Inscreva-se na newsletter da loja para receber descontos exclusivos',
    'Look for free shipping codes to save on delivery costs': 'Procure códigos de frete grátis para economizar nos custos de entrega',
    'Combine multiple coupons when possible for maximum savings': 'Combine vários cupons quando possível para economias máximas',
    'Check coupon expiry dates before using them': 'Verifique as datas de validade dos cupons antes de usá-los',
    'Related Stores': 'Lojas relacionadas',
    'Facebook': 'Facebook',
    'Twitter': 'Twitter',
    'Tags': 'Tags',
    'Support': 'Suporte',
    'Blog': 'Blog',
    'Feedback': 'Feedback',
    'Coupons': 'Cupons',
    'Interactions': 'Interações',
    'Activity Log': 'Registro de atividades',
    'Total Savings': 'Economias totais',
    'Restrictions': 'Restrições',
    'Dates & Links': 'Datas e links',
    'Description': 'Descrição',
    'Manual': 'Manual',
  },
  nl: {
    'No sponsored stores available': 'Geen gesponsorde winkels beschikbaar',
    'No top stores available': 'Geen top winkels beschikbaar',
    'Newest First': 'Nieuwste eerst',
    'Most Viewed': 'Meest bekeken',
    'Highest Rated': 'Hoogst beoordeeld',
    'Name (A-Z)': 'Naam (A-Z)',
    'No stores found': 'Geen winkels gevonden',
    '⭐ Sponsored': '⭐ Gesponsord',
    '{{count}} coupons': '{{count}} kortingscodes',
    'Store Details': 'Winkeldetails',
    'Visit Website': 'Bezoek website',
    'Saving Tips': 'Bespaartips',
    'Sign up for the store newsletter to receive exclusive discounts': 'Meld je aan voor de nieuwsbrief van de winkel om exclusieve kortingen te ontvangen',
    'Look for free shipping codes to save on delivery costs': 'Zoek naar gratis verzendcodes om te besparen op bezorgkosten',
    'Combine multiple coupons when possible for maximum savings': 'Combineer meerdere kortingscodes wanneer mogelijk voor maximale besparingen',
    'Check coupon expiry dates before using them': 'Controleer de vervaldatums van kortingscodes voordat je ze gebruikt',
    'Related Stores': 'Gerelateerde winkels',
    'Facebook': 'Facebook',
    'Twitter': 'Twitter',
    'Tags': 'Tags',
    'Support': 'Ondersteuning',
    'Blog': 'Blog',
    'Feedback': 'Feedback',
    'Partners': 'Partners',
    'Coupons': 'Kortingscodes',
    'Interactions': 'Interacties',
    'Activity Log': 'Activiteitenlogboek',
    'Total Savings': 'Totale besparingen',
    'Restrictions': 'Beperkingen',
    'Dates & Links': 'Data en links',
    'Description': 'Beschrijving',
    'Dashboard': 'Dashboard',
    'Filters': 'Filters',
    'Account': 'Account',
    'Privacy': 'Privacy',
    'HOT': 'HEET',
  },
  'de-AT': {
    'Support': 'Unterstützung',
    'Feedback': 'Rückmeldung',
    'Blog': 'Blog',
    'Name (A-Z)': 'Name (A-Z)',
    'Consumer Key *': 'Consumer Key *',
    'Consumer Secret *': 'Consumer Secret *',
  }
};

// Files to process
const seedFiles = [
  'seedTranslations.js',
  'seedMissingTranslations_1_dashboard_sections.js',
  'seedMissingTranslations_2_dashboard_submissions.js',
  'seedMissingTranslations_3_dashboard_followed.js',
  'seedMissingTranslations_4_forms_titles.js',
  'seedMissingTranslations_5_forms_fields.js',
  'seedMissingTranslations_6_forms_placeholders.js',
  'seedMissingTranslations_7_forms_validation1.js',
  'seedMissingTranslations_8_forms_validation2.js',
  'seedMissingTranslations_9_modals.js',
  'seedMissingTranslations_10_modals2.js',
  'seedMissingTranslations_11_woocommerce.js',
  'seedMissingTranslations_12_woocommerce_fields.js',
  'seedMissingTranslations_13_error_boundary.js',
  'seedMissingTranslations_14_notifications.js',
  'seedMissingTranslations_15_toast.js',
  'seedMissingTranslations_16_home.js',
  'seedMissingTranslations_17_footer.js',
  'seedMissingTranslations_18_cards.js',
  'seedMissingTranslations_19_stores.js',
  'seedMissingTranslations_20_stores_detail_extras.js',
  'seedMissingTranslations_20_settings.js',
  'seedMissingTranslations_21_savings_stats.js',
  'seedMissingTranslations_22_activity.js',
  'seedMissingTranslations_23_detail_pages.js',
];

const fixFile = (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  let fixed = 0;
  
  // For each language
  Object.keys(translations).forEach(lang => {
    const langTranslations = translations[lang];
    
    // For each English placeholder
    Object.keys(langTranslations).forEach(englishText => {
      const translatedText = langTranslations[englishText];
      
      // Create regex pattern to match the placeholder
      // Match: lang: 'English text' or lang: "English text"
      const escapedEnglish = englishText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(`(['"])${lang}(['"]):\\s*['"]${escapedEnglish}['"]`, 'g');
      
      // Replace with translated text
      const replacement = `$1${lang}$2: '${translatedText}'`;
      const matches = content.match(pattern);
      
      if (matches) {
        content = content.replace(pattern, replacement);
        fixed += matches.length;
      }
    });
  });
  
  // Also fix patterns like: fr: 'English', (where English matches en: value)
  // This is more complex - we need to find objects and check if fr/pt/nl matches en
  
  return { content, fixed };
};

const main = () => {
  console.log('🔧 Fixing English placeholders in seed files...\n');
  
  const scriptsDir = __dirname;
  let totalFixed = 0;
  const results = [];
  
  seedFiles.forEach(fileName => {
    const filePath = path.join(scriptsDir, fileName);
    
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  File not found: ${fileName}`);
      return;
    }
    
    const { content, fixed } = fixFile(filePath);
    
    if (fixed > 0) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✓ ${fileName}: Fixed ${fixed} placeholders`);
      totalFixed += fixed;
      results.push({ file: fileName, fixed });
    } else {
      console.log(`  ${fileName}: No fixes needed`);
    }
  });
  
  console.log('\n' + '='.repeat(80));
  console.log(`✅ Fixed ${totalFixed} English placeholders across ${results.length} files`);
  console.log('='.repeat(80));
  
  if (results.length > 0) {
    console.log('\nFiles updated:');
    results.forEach(r => {
      console.log(`  - ${r.file}: ${r.fixed} fixes`);
    });
  }
  
  console.log('\n⚠️  Note: Some placeholders may need manual review for context-specific translations.');
  console.log('Run the analysis script again to verify fixes.\n');
};

main();



