/**
 * Fix Remaining English Placeholders
 * Fixes common placeholders that are still in English
 */

const fs = require('fs');
const path = require('path');

const fixes = [
  // Footer links
  { pattern: /fr:\s*'Blog'/, replacement: "fr: 'Blog'" }, // Blog is often kept as-is
  { pattern: /pt:\s*'Blog'/, replacement: "pt: 'Blog'" },
  { pattern: /nl:\s*'Blog'/, replacement: "nl: 'Blog'" },
  { pattern: /pt:\s*'Feedback'/, replacement: "pt: 'Comentários'" },
  { pattern: /nl:\s*'Feedback'/, replacement: "nl: 'Feedback'" }, // Feedback is often kept
  
  // Common words that should be translated
  { pattern: /fr:\s*'Coupons'/, replacement: "fr: 'Coupons'" }, // Coupons is often kept
  { pattern: /pt:\s*'Coupons'/, replacement: "pt: 'Cupons'" },
  { pattern: /nl:\s*'Coupons'/, replacement: "nl: 'Kortingscodes'" },
  
  { pattern: /fr:\s*'Dashboard'/, replacement: "fr: 'Tableau de bord'" },
  { pattern: /pt:\s*'Dashboard'/, replacement: "pt: 'Painel'" },
  { pattern: /nl:\s*'Dashboard'/, replacement: "nl: 'Dashboard'" },
  
  { pattern: /fr:\s*'Filters'/, replacement: "fr: 'Filtres'" },
  { pattern: /pt:\s*'Filters'/, replacement: "pt: 'Filtros'" },
  { pattern: /nl:\s*'Filters'/, replacement: "nl: 'Filters'" },
  
  { pattern: /fr:\s*'Account'/, replacement: "fr: 'Compte'" },
  { pattern: /pt:\s*'Account'/, replacement: "pt: 'Conta'" },
  { pattern: /nl:\s*'Account'/, replacement: "nl: 'Account'" },
  
  { pattern: /fr:\s*'Privacy'/, replacement: "fr: 'Confidentialité'" },
  { pattern: /pt:\s*'Privacy'/, replacement: "pt: 'Privacidade'" },
  { pattern: /nl:\s*'Privacy'/, replacement: "nl: 'Privacy'" },
  
  { pattern: /fr:\s*'Password'/, replacement: "fr: 'Mot de passe'" },
  { pattern: /pt:\s*'Password'/, replacement: "pt: 'Senha'" },
  { pattern: /nl:\s*'Password'/, replacement: "nl: 'Wachtwoord'" },
  
  { pattern: /fr:\s*'Email'/, replacement: "fr: 'Email'" }, // Email is often kept
  { pattern: /pt:\s*'Email'/, replacement: "pt: 'E-mail'" },
  { pattern: /nl:\s*'Email'/, replacement: "nl: 'E-mail'" },
  
  { pattern: /fr:\s*'General'/, replacement: "fr: 'Général'" },
  { pattern: /pt:\s*'General'/, replacement: "pt: 'Geral'" },
  { pattern: /nl:\s*'General'/, replacement: "nl: 'Algemeen'" },
  
  { pattern: /fr:\s*'Manual'/, replacement: "fr: 'Manuel'" },
  { pattern: /pt:\s*'Manual'/, replacement: "pt: 'Manual'" },
  { pattern: /nl:\s*'Manual'/, replacement: "nl: 'Handmatig'" },
  
  { pattern: /fr:\s*'Sessions'/, replacement: "fr: 'Sessions'" },
  { pattern: /pt:\s*'Sessions'/, replacement: "pt: 'Sessões'" },
  { pattern: /nl:\s*'Sessions'/, replacement: "nl: 'Sessies'" },
  
  { pattern: /fr:\s*'Interactions'/, replacement: "fr: 'Interactions'" },
  { pattern: /pt:\s*'Interactions'/, replacement: "pt: 'Interações'" },
  { pattern: /nl:\s*'Interactions'/, replacement: "nl: 'Interacties'" },
  
  { pattern: /fr:\s*'Activity Log'/, replacement: "fr: 'Journal d\'activité'" },
  { pattern: /pt:\s*'Activity Log'/, replacement: "pt: 'Registro de atividades'" },
  { pattern: /nl:\s*'Activity Log'/, replacement: "nl: 'Activiteitenlogboek'" },
  
  { pattern: /fr:\s*'Total Savings'/, replacement: "fr: 'Économies totales'" },
  { pattern: /pt:\s*'Total Savings'/, replacement: "pt: 'Economias totais'" },
  { pattern: /nl:\s*'Total Savings'/, replacement: "nl: 'Totale besparingen'" },
  
  { pattern: /fr:\s*'Restrictions'/, replacement: "fr: 'Restrictions'" },
  { pattern: /pt:\s*'Restrictions'/, replacement: "pt: 'Restrições'" },
  { pattern: /nl:\s*'Restrictions'/, replacement: "nl: 'Beperkingen'" },
  
  { pattern: /fr:\s*'Dates & Links'/, replacement: "fr: 'Dates et liens'" },
  { pattern: /pt:\s*'Dates & Links'/, replacement: "pt: 'Datas e links'" },
  { pattern: /nl:\s*'Dates & Links'/, replacement: "nl: 'Data en links'" },
  
  { pattern: /fr:\s*'Description'/, replacement: "fr: 'Description'" },
  { pattern: /pt:\s*'Description'/, replacement: "pt: 'Descrição'" },
  { pattern: /nl:\s*'Description'/, replacement: "nl: 'Beschrijving'" },
  
  { pattern: /fr:\s*'Partners'/, replacement: "fr: 'Partenaires'" },
  { pattern: /pt:\s*'Partners'/, replacement: "pt: 'Parceiros'" },
  { pattern: /nl:\s*'Partners'/, replacement: "nl: 'Partners'" },
  
  { pattern: /fr:\s*'Support'/, replacement: "fr: 'Assistance'" },
  { pattern: /pt:\s*'Support'/, replacement: "pt: 'Suporte'" },
  { pattern: /nl:\s*'Support'/, replacement: "nl: 'Ondersteuning'" },
  
  // de-AT specific
  { pattern: /'de-AT':\s*'Support'/, replacement: "'de-AT': 'Unterstützung'" },
  { pattern: /'de-AT':\s*'Feedback'/, replacement: "'de-AT': 'Rückmeldung'" },
  { pattern: /'de-AT':\s*'Blog'/, replacement: "'de-AT': 'Blog'" },
  { pattern: /'de-AT':\s*'Name \(A-Z\)'/, replacement: "'de-AT': 'Name (A-Z)'" },
];

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

const main = () => {
  console.log('🔧 Fixing remaining English placeholders...\n');
  
  const scriptsDir = __dirname;
  let totalFixed = 0;
  
  seedFiles.forEach(fileName => {
    const filePath = path.join(scriptsDir, fileName);
    
    if (!fs.existsSync(filePath)) {
      return;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    let fileFixed = 0;
    
    fixes.forEach(({ pattern, replacement }) => {
      const matches = content.match(pattern);
      if (matches) {
        content = content.replace(pattern, replacement);
        fileFixed += matches.length;
        totalFixed += matches.length;
      }
    });
    
    if (fileFixed > 0) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✓ ${fileName}: Fixed ${fileFixed} placeholders`);
    }
  });
  
  console.log(`\n✅ Fixed ${totalFixed} placeholders total\n`);
};

main();



