/**
 * Translate All Seed Files
 * Uses a simple translation approach - for now, creates a comprehensive mapping
 * and updates seed files with proper translations
 * 
 * Usage: node server/scripts/translateAllSeedFiles.js
 */

const fs = require('fs');
const path = require('path');

// Comprehensive translation dictionary
// This will be expanded with more translations
const translationDict = {
  // Navigation
  'Home': { fr: 'Accueil', pt: 'Início', nl: 'Home' },
  'Coupons': { fr: 'Coupons', pt: 'Cupons', nl: 'Kortingscodes' },
  'Deals': { fr: 'Offres', pt: 'Ofertas', nl: 'Aanbiedingen' },
  'Stores': { fr: 'Magasins', pt: 'Lojas', nl: 'Winkels' },
  'Categories': { fr: 'Catégories', pt: 'Categorias', nl: 'Categorieën' },
  'Help Center': { fr: 'Centre d\'aide', pt: 'Centro de Ajuda', nl: 'Helpcentrum' },
  'Contact Us': { fr: 'Contactez-nous', pt: 'Entre em contato', nl: 'Neem contact op' },
  'About Us': { fr: 'À propos', pt: 'Sobre nós', nl: 'Over ons' },
  'Submit Coupon': { fr: 'Soumettre un coupon', pt: 'Enviar cupom', nl: 'Coupon indienen' },
  
  // Common actions
  'Add New': { fr: 'Ajouter', pt: 'Adicionar', nl: 'Toevoegen' },
  'Loading...': { fr: 'Chargement...', pt: 'Carregando...', nl: 'Laden...' },
  'Save': { fr: 'Enregistrer', pt: 'Salvar', nl: 'Opslaan' },
  'Cancel': { fr: 'Annuler', pt: 'Cancelar', nl: 'Annuleren' },
  'Edit': { fr: 'Modifier', pt: 'Editar', nl: 'Bewerken' },
  'Delete': { fr: 'Supprimer', pt: 'Excluir', nl: 'Verwijderen' },
  'Search': { fr: 'Rechercher', pt: 'Pesquisar', nl: 'Zoeken' },
  'View All': { fr: 'Voir tout', pt: 'Ver tudo', nl: 'Alles bekijken' },
  'View All Stores': { fr: 'Voir tous les magasins', pt: 'Ver todas as lojas', nl: 'Alle winkels bekijken' },
  
  // Dashboard
  'Overview': { fr: 'Aperçu', pt: 'Visão geral', nl: 'Overzicht' },
  'Submissions': { fr: 'Soumissions', pt: 'Envios', nl: 'Inzendingen' },
  'Campaigns': { fr: 'Campagnes', pt: 'Campanhas', nl: 'Campagnes' },
  'Followed': { fr: 'Suivi', pt: 'Seguidos', nl: 'Gevolgd' },
  'Reviews': { fr: 'Avis', pt: 'Avaliações', nl: 'Beoordelingen' },
  'Alerts': { fr: 'Alertes', pt: 'Alertas', nl: 'Meldingen' },
  'Billing': { fr: 'Facturation', pt: 'Cobrança', nl: 'Facturering' },
  'Sessions': { fr: 'Sessions', pt: 'Sessões', nl: 'Sessies' },
  'Manual': { fr: 'Manuel', pt: 'Manual', nl: 'Handmatig' },
  
  // Forms
  'Create New Coupon': { fr: 'Créer un nouveau coupon', pt: 'Criar novo cupom', nl: 'Nieuwe coupon maken' },
  'Edit Coupon': { fr: 'Modifier le coupon', pt: 'Editar cupom', nl: 'Coupon bewerken' },
  'Create New Deal': { fr: 'Créer une nouvelle offre', pt: 'Criar nova oferta', nl: 'Nieuwe aanbieding maken' },
  'Edit Deal': { fr: 'Modifier l\'offre', pt: 'Editar oferta', nl: 'Aanbieding bewerken' },
  'Basic Info': { fr: 'Informations de base', pt: 'Informações básicas', nl: 'Basisinformatie' },
  'Discount': { fr: 'Remise', pt: 'Desconto', nl: 'Korting' },
  
  // Common status
  'Expired': { fr: 'Expiré', pt: 'Expirado', nl: 'Verlopen' },
  'Verified': { fr: 'Vérifié', pt: 'Verificado', nl: 'Geverifieerd' },
  'Active': { fr: 'Actif', pt: 'Ativo', nl: 'Actief' },
  'Active Only': { fr: 'Actifs uniquement', pt: 'Apenas ativos', nl: 'Alleen actief' },
  
  // Modals
  'Copy Code': { fr: 'Copier le code', pt: 'Copiar código', nl: 'Code kopiëren' },
  'Code Copied': { fr: 'Code copié', pt: 'Código copiado', nl: 'Code gekopieerd' },
  'How to Use': { fr: 'Comment utiliser', pt: 'Como usar', nl: 'Hoe te gebruiken' },
  'Valid Until': { fr: 'Valide jusqu\'au', pt: 'Válido até', nl: 'Geldig tot' },
  'Use Code': { fr: 'Utiliser le code', pt: 'Usar código', nl: 'Code gebruiken' },
  'Get Deal': { fr: 'Obtenir l\'offre', pt: 'Obter oferta', nl: 'Aanbieding krijgen' },
  'Store Unavailable': { fr: 'Magasin indisponible', pt: 'Loja indisponível', nl: 'Winkel niet beschikbaar' },
  'View Store': { fr: 'Voir le magasin', pt: 'Ver loja', nl: 'Winkel bekijken' },
  
  // Settings
  'Settings': { fr: 'Paramètres', pt: 'Configurações', nl: 'Instellingen' },
  'Account': { fr: 'Compte', pt: 'Conta', nl: 'Account' },
  'Email': { fr: 'E-mail', pt: 'E-mail', nl: 'E-mail' },
  'Notifications': { fr: 'Notifications', pt: 'Notificações', nl: 'Meldingen' },
  'Security': { fr: 'Sécurité', pt: 'Segurança', nl: 'Beveiliging' },
  
  // Stores
  'Store': { fr: 'Magasin', pt: 'Loja', nl: 'Winkel' },
  'Visit Store': { fr: 'Visiter le magasin', pt: 'Visitar loja', nl: 'Winkel bezoeken' },
  'Follow Store': { fr: 'Suivre le magasin', pt: 'Seguir loja', nl: 'Winkel volgen' },
  
  // Common phrases
  'No results found': { fr: 'Aucun résultat trouvé', pt: 'Nenhum resultado encontrado', nl: 'Geen resultaten gevonden' },
  'Try different filters': { fr: 'Essayez d\'autres filtres', pt: 'Tente filtros diferentes', nl: 'Probeer andere filters' },
  'Search for coupons, stores, or deals...': { fr: 'Rechercher des coupons, magasins ou offres...', pt: 'Pesquisar cupons, lojas ou ofertas...', nl: 'Zoek naar kortingscodes, winkels of aanbiedingen...' },
  'Search for help articles...': { fr: 'Rechercher des articles d\'aide...', pt: 'Pesquisar artigos de ajuda...', nl: 'Zoek naar helpartikelen...' },
  'Find answers to your questions and learn how to get the most out of DealCouponz': { 
    fr: 'Trouvez des réponses à vos questions et apprenez à tirer le meilleur parti de DealCouponz',
    pt: 'Encontre respostas para suas perguntas e aprenda a aproveitar ao máximo o DealCouponz',
    nl: 'Vind antwoorden op uw vragen en leer hoe u het meeste uit DealCouponz haalt'
  },
};

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
];

function escapeQuote(str) {
  return str.replace(/'/g, "\\'");
}

function getTranslation(enValue, lang) {
  // Exact match
  if (translationDict[enValue] && translationDict[enValue][lang]) {
    return translationDict[enValue][lang];
  }
  
  // Try to find partial matches and replace
  for (const [key, translations] of Object.entries(translationDict)) {
    if (enValue.includes(key)) {
      const replacement = translations[lang];
      if (replacement) {
        return enValue.replace(key, replacement);
      }
    }
  }
  
  // No translation found - return null (will keep English for now)
  return null;
}

function translateFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    let changed = false;
    
    // Pattern: Match fr:, pt:, nl: that have English values
    // We need to find translation objects and replace the values
    const pattern = /(en:\s*['"]([^'"]+)['"][^}]*?)(fr:\s*['"])([^'"]+)(['"][^}]*?)(pt:\s*['"])([^'"]+)(['"][^}]*?)(nl:\s*['"])([^'"]+)(['"])/g;
    
    content = content.replace(pattern, (match, beforeEn, enValue, frStart, frValue, frEnd, ptStart, ptValue, ptEnd, nlStart, nlValue, nlEnd) => {
      // Only translate if the value equals English
      if (frValue === enValue && ptValue === enValue && nlValue === enValue) {
        const frTrans = getTranslation(enValue, 'fr');
        const ptTrans = getTranslation(enValue, 'pt');
        const nlTrans = getTranslation(enValue, 'nl');
        
        // Only update if we have translations
        if (frTrans || ptTrans || nlTrans) {
          changed = true;
          return beforeEn + 
            frStart + escapeQuote(frTrans || enValue) + frEnd +
            ptStart + escapeQuote(ptTrans || enValue) + ptEnd +
            nlStart + escapeQuote(nlTrans || enValue) + nlEnd;
        }
      }
      
      return match;
    });
    
    if (changed && content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    }
    return false;
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    return false;
  }
}

// Main
const scriptsDir = path.join(__dirname);
let updated = 0;
let skipped = 0;

console.log('🌍 Translating seed files...\n');
console.log('⚠️  Note: This script uses a limited translation dictionary.');
console.log('   Many keys may still need manual translation.\n');

seedFiles.forEach(fileName => {
  const filePath = path.join(scriptsDir, fileName);
  
  if (!fs.existsSync(filePath)) {
    return;
  }
  
  console.log(`📝 ${fileName}...`);
  const changed = translateFile(filePath);
  
  if (changed) {
    console.log(`   ✅ Updated with translations`);
    updated++;
  } else {
    console.log(`   ⏭️  No changes (already translated or no matches)`);
    skipped++;
  }
});

console.log('\n' + '='.repeat(80));
console.log(`✅ Updated: ${updated} files`);
console.log(`⏭️  Skipped: ${skipped} files`);
console.log('\n⚠️  Many keys still need proper translations.');
console.log('   Consider using a translation API or manual review.');







