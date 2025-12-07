/**
 * Update All Seed Files to Include New Languages
 * Adds fr, pt, nl, en-GB, en-AU, de-AT to all seed translation files
 * 
 * Usage: node server/scripts/updateAllSeedFilesWithNewLanguages.js
 */

const fs = require('fs');
const path = require('path');

// List of all seed files
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

// New languages to add (with fallback strategy)
const newLanguages = {
  'fr': 'en',      // French - use English as fallback
  'pt': 'en',      // Portuguese - use English as fallback
  'nl': 'en',      // Dutch - use English as fallback
  'en-GB': 'en',   // UK English - use English as fallback
  'en-AU': 'en',   // Australian English - use English as fallback
  'de-AT': 'de',   // Austrian German - use German as fallback, or English
};

// Function to add new languages to a translation object
function addNewLanguagesToTranslation(transObj) {
  // Check if it already has new languages
  const hasNewLangs = Object.keys(newLanguages).some(lang => transObj[lang]);
  if (hasNewLangs) {
    return transObj; // Already has new languages
  }
  
  // Get fallback value
  const fallbackLang = transObj['de'] ? 'de' : 'en';
  
  // Add new languages using fallback
  Object.keys(newLanguages).forEach(newLang => {
    const fallback = newLanguages[newLang];
    if (fallback === 'de' && transObj['de']) {
      transObj[newLang] = transObj['de'];
    } else if (fallback === 'en' && transObj['en']) {
      transObj[newLang] = transObj['en'];
    } else if (fallback === 'de' && !transObj['de'] && transObj['en']) {
      // de-AT fallback: use German if available, otherwise English
      transObj[newLang] = transObj['en'];
    }
  });
  
  return transObj;
}

// Function to update a seed file
function updateSeedFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Find all translation objects in the file
    // Pattern: { key: '...', category: '...', en: '...', ... }
    // We need to add new languages before the closing brace
    
    // Match translation objects - look for patterns like:
    // { key: '...', ... en: '...', sv: '...', }
    const translationPattern = /(\{[^}]*key:\s*['"][^'"]+['"][^}]*)(\})/g;
    
    let updated = false;
    content = content.replace(translationPattern, (match, before, closing) => {
      // Check if this object already has new languages
      if (match.includes("'fr':") || match.includes('"fr":') || 
          match.includes("'pt':") || match.includes('"pt":') ||
          match.includes("'nl':") || match.includes('"nl":')) {
        return match; // Already has new languages
      }
      
      // Find the last language field before the closing brace
      // Look for pattern like: sv: '...', or sv: "...",
      const lastLangPattern = /([a-z-]+):\s*['"]([^'"]+)['"],?\s*$/i;
      const lastLangMatch = before.match(lastLangPattern);
      
      if (lastLangMatch) {
        const lastLang = lastLangMatch[1];
        const lastValue = lastLangMatch[2];
        
        // Determine fallback
        let fallbackValue = lastValue;
        if (lastLang === 'de') {
          // For de-AT, use German; for others, use English if available
          const enMatch = before.match(/en:\s*['"]([^'"]+)['"]/);
          if (enMatch) {
            fallbackValue = enMatch[1];
          }
        }
        
        // Build new language entries
        const newLangEntries = [];
        Object.keys(newLanguages).forEach(newLang => {
          const fallback = newLanguages[newLang];
          let value = fallbackValue;
          
          if (fallback === 'de' && lastLang === 'de') {
            value = lastValue; // Use German for de-AT
          } else if (fallback === 'en') {
            const enMatch = before.match(/en:\s*['"]([^'"]+)['"]/);
            if (enMatch) {
              value = enMatch[1]; // Use English
            }
          }
          
          newLangEntries.push(`    ${newLang}: '${value.replace(/'/g, "\\'")}',`);
        });
        
        // Insert new languages before closing brace
        const newContent = before + '\n' + newLangEntries.join('\n') + '\n  ' + closing;
        updated = true;
        return newContent;
      }
      
      return match;
    });
    
    if (updated) {
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
    return false;
  }
}

// Main function
function updateAllSeedFiles() {
  const scriptsDir = path.join(__dirname);
  let updatedCount = 0;
  let skippedCount = 0;
  
  console.log('🔍 Updating all seed files with new languages...\n');
  
  seedFiles.forEach(fileName => {
    const filePath = path.join(scriptsDir, fileName);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${fileName}`);
      return;
    }
    
    console.log(`📝 Processing: ${fileName}...`);
    const updated = updateSeedFile(filePath);
    
    if (updated) {
      console.log(`   ✅ Updated`);
      updatedCount++;
    } else {
      console.log(`   ⏭️  Already has new languages or no changes needed`);
      skippedCount++;
    }
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`✅ Updated: ${updatedCount} files`);
  console.log(`⏭️  Skipped: ${skippedCount} files`);
  console.log('\n✨ Done! All seed files have been updated.');
  console.log('\n⚠️  Note: This script uses fallback values (English/German).');
  console.log('   You may want to add proper translations later.');
}

// Run
updateAllSeedFiles();







