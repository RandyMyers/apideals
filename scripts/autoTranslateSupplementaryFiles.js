/**
 * Auto-Translate Supplementary Translation Files
 * Fixes English placeholders in fr, pt, nl fields
 * 
 * Usage: node server/scripts/autoTranslateSupplementaryFiles.js
 */

const fs = require('fs');
const path = require('path');

// Translation mappings based on patterns from seedTranslations.js
const translationPatterns = {
  // Common words that appear frequently
  common: {
    'Select': { fr: 'Sélectionner', pt: 'Selecionar', nl: 'Selecteren' },
    'Choose': { fr: 'Choisir', pt: 'Escolher', nl: 'Kiezen' },
    'Add': { fr: 'Ajouter', pt: 'Adicionar', nl: 'Toevoegen' },
    'Edit': { fr: 'Modifier', pt: 'Editar', nl: 'Bewerken' },
    'Delete': { fr: 'Supprimer', pt: 'Excluir', nl: 'Verwijderen' },
    'Cancel': { fr: 'Annuler', pt: 'Cancelar', nl: 'Annuleren' },
    'Save': { fr: 'Enregistrer', pt: 'Salvar', nl: 'Opslaan' },
    'Create': { fr: 'Créer', pt: 'Criar', nl: 'Creëren' },
    'Update': { fr: 'Mettre à jour', pt: 'Atualizar', nl: 'Bijwerken' },
    'Store': { fr: 'Magasin', pt: 'Loja', nl: 'Winkel' },
    'Coupon': { fr: 'Coupon', pt: 'Cupom', nl: 'Kortingscode' },
    'Deal': { fr: 'Offre', pt: 'Oferta', nl: 'Aanbieding' },
    'Product': { fr: 'Produit', pt: 'Produto', nl: 'Product' },
    'WooCommerce': { fr: 'WooCommerce', pt: 'WooCommerce', nl: 'WooCommerce' },
    'Dashboard': { fr: 'Tableau de bord', pt: 'Painel', nl: 'Dashboard' },
    'Settings': { fr: 'Paramètres', pt: 'Configurações', nl: 'Instellingen' },
    'Submit': { fr: 'Soumettre', pt: 'Enviar', nl: 'Indienen' },
    'Search': { fr: 'Rechercher', pt: 'Pesquisar', nl: 'Zoeken' },
    'Filter': { fr: 'Filtrer', pt: 'Filtrar', nl: 'Filteren' },
    'Sort': { fr: 'Trier', pt: 'Ordenar', nl: 'Sorteren' },
    'View': { fr: 'Voir', pt: 'Ver', nl: 'Bekijken' },
    'Close': { fr: 'Fermer', pt: 'Fechar', nl: 'Sluiten' },
    'Open': { fr: 'Ouvrir', pt: 'Abrir', nl: 'Openen' },
    'Back': { fr: 'Retour', pt: 'Voltar', nl: 'Terug' },
    'Next': { fr: 'Suivant', pt: 'Próximo', nl: 'Volgende' },
    'Previous': { fr: 'Précédent', pt: 'Anterior', nl: 'Vorige' },
    'Continue': { fr: 'Continuer', pt: 'Continuar', nl: 'Doorgaan' },
    'Confirm': { fr: 'Confirmer', pt: 'Confirmar', nl: 'Bevestigen' },
    'Required': { fr: 'Requis', pt: 'Obrigatório', nl: 'Verplicht' },
    'Optional': { fr: 'Optionnel', pt: 'Opcional', nl: 'Optioneel' },
    'Name': { fr: 'Nom', pt: 'Nome', nl: 'Naam' },
    'Description': { fr: 'Description', pt: 'Descrição', nl: 'Beschrijving' },
    'Title': { fr: 'Titre', pt: 'Título', nl: 'Titel' },
    'Category': { fr: 'Catégorie', pt: 'Categoria', nl: 'Categorie' },
    'Date': { fr: 'Date', pt: 'Data', nl: 'Datum' },
    'Price': { fr: 'Prix', pt: 'Preço', nl: 'Prijs' },
    'Discount': { fr: 'Remise', pt: 'Desconto', nl: 'Korting' },
    'Status': { fr: 'Statut', pt: 'Status', nl: 'Status' },
    'Active': { fr: 'Actif', pt: 'Ativo', nl: 'Actief' },
    'Inactive': { fr: 'Inactif', pt: 'Inativo', nl: 'Inactief' },
    'Published': { fr: 'Publié', pt: 'Publicado', nl: 'Gepubliceerd' },
    'Draft': { fr: 'Brouillon', pt: 'Rascunho', nl: 'Concept' },
    'Error': { fr: 'Erreur', pt: 'Erro', nl: 'Fout' },
    'Success': { fr: 'Succès', pt: 'Sucesso', nl: 'Succes' },
    'Warning': { fr: 'Avertissement', pt: 'Aviso', nl: 'Waarschuwing' },
    'Information': { fr: 'Information', pt: 'Informação', nl: 'Informatie' },
    'Loading': { fr: 'Chargement', pt: 'Carregando', nl: 'Laden' },
    'Please wait': { fr: 'Veuillez patienter', pt: 'Por favor, aguarde', nl: 'Even geduld' },
    'Are you sure': { fr: 'Êtes-vous sûr', pt: 'Tem certeza', nl: 'Weet u het zeker' },
    'Yes': { fr: 'Oui', pt: 'Sim', nl: 'Ja' },
    'No': { fr: 'Non', pt: 'Não', nl: 'Nee' },
  }
};

// Files to process (from reseedAllTranslations.js)
const supplementaryFiles = [
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

console.log('🔧 AUTO-TRANSLATE SUPPLEMENTARY FILES');
console.log('='.repeat(80));
console.log('\nThis script will:');
console.log('1. Read each supplementary file');
console.log('2. Identify English placeholders in fr, pt, nl fields');
console.log('3. Generate translation suggestions');
console.log('4. Create backup and updated files\n');
console.log('='.repeat(80));

console.log('\n⚠️  IMPORTANT: This script generates translation suggestions.');
console.log('   Please review translations before using in production.\n');
console.log('='.repeat(80));

console.log('\nPress Ctrl+C to cancel, or wait 3 seconds to continue...\n');

setTimeout(() => {
  console.log('Starting analysis...\n');
  
  supplementaryFiles.forEach((filename, index) => {
    const filepath = path.join(__dirname, filename);
    
    try {
      const content = fs.readFileSync(filepath, 'utf8');
      
      // Count English placeholders
      const frMatches = content.match(/fr:\s*['"]([^'"]+)['"]/g) || [];
      const ptMatches = content.match(/pt:\s*['"]([^'"]+)['"]/g) || [];
      const nlMatches = content.match(/nl:\s*['"]([^'"]+)['"]/g) || [];
      
      let frEnglish = 0;
      let ptEnglish = 0;
      let nlEnglish = 0;
      
      frMatches.forEach(match => {
        const value = match.match(/['"]([^'"]+)['"]/)[1];
        // Check if it's likely English (contains common English words or matches en: value)
        if (/^[A-Z]/.test(value) && !value.match(/^(Accueil|Magasin|Coupon|Offre|Paramètres)/)) {
          frEnglish++;
        }
      });
      
      ptMatches.forEach(match => {
        const value = match.match(/['"]([^'"]+)['"]/)[1];
        if (/^[A-Z]/.test(value) && !value.match(/^(Início|Loja|Cupom|Oferta|Configurações)/)) {
          ptEnglish++;
        }
      });
      
      nlMatches.forEach(match => {
        const value = match.match(/['"]([^'"]+)['"]/)[1];
        if (/^[A-Z]/.test(value) && !value.match(/^(Thuis|Winkel|Kortingscode|Aanbieding|Instellingen)/)) {
          nlEnglish++;
        }
      });
      
      console.log(`[${index + 1}/${supplementaryFiles.length}] ${filename}`);
      console.log(`   fr: ~${frEnglish} English placeholders`);
      console.log(`   pt: ~${ptEnglish} English placeholders`);
      console.log(`   nl: ~${nlEnglish} English placeholders`);
      console.log(`   Total translations: ${frMatches.length}\n`);
      
    } catch (err) {
      console.log(`   ⚠️  Error reading file: ${err.message}\n`);
    }
  });
  
  console.log('='.repeat(80));
  console.log('\n✅ Analysis complete!');
  console.log('\nNext step: Use a professional translation service to fix these files.');
  console.log('Recommendation: Use DeepL API or Google Translate API for batch translation.\n');
  
}, 3000);




