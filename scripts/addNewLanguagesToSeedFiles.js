/**
 * Add New Languages to All Seed Files
 * Adds fr, pt, nl, en-GB, en-AU, de-AT after sv: in all translation objects
 * 
 * Usage: node server/scripts/addNewLanguagesToSeedFiles.js
 */

const fs = require('fs');
const path = require('path');

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

// Function to escape single quotes in strings
function escapeQuote(str) {
  return str.replace(/'/g, "\\'");
}

// Function to add new languages to a translation object
function addNewLanguages(content) {
  // Pattern: Find sv: '...', followed by description or context or closing brace
  // We want to insert new languages after sv: but before description/context/}
  
  // More specific pattern: sv: '...',\n    description: or sv: '...',\n    context: or sv: '...',\n  },
  const pattern = /(sv:\s*['"]([^'"]+)['"],)\s*\n(\s*)(description:|context:|\},)/g;
  
  let lastMatchIndex = 0;
  
  return content.replace(pattern, (match, svLine, svValue, indent, nextField) => {
    const matchIndex = content.indexOf(match, lastMatchIndex);
    lastMatchIndex = matchIndex + 1;
    
    // Check if new languages already exist (look for fr: in the next 10 lines)
    const linesAfter = content.substring(matchIndex + match.length, matchIndex + match.length + 500);
    if (linesAfter.includes("fr:") || linesAfter.includes("'fr':") || linesAfter.includes('"fr":')) {
      return match; // Already has new languages
    }
    
    // Get the full translation object to find English value
    // Look backwards from sv: to find the start of this object and find en:
    // Find the opening brace of this translation object (look backwards for { that starts a new object)
    let objStart = matchIndex;
    let braceCount = 0;
    let foundStart = false;
    
    for (let i = matchIndex - 1; i >= 0 && i >= matchIndex - 2000; i--) {
      if (content[i] === '}') {
        braceCount++;
      } else if (content[i] === '{') {
        if (braceCount === 0) {
          objStart = i;
          foundStart = true;
          break;
        }
        braceCount--;
      }
    }
    
    // Extract the object content
    const objContent = foundStart ? content.substring(objStart, matchIndex) : content.substring(Math.max(0, matchIndex - 500), matchIndex);
    
    // Find English value in this object
    const enMatch = objContent.match(/en:\s*['"]([^'"]+)['"]/);
    const enValue = enMatch ? enMatch[1] : svValue;
    
    // Get German value for de-AT
    const deMatch = objContent.match(/de:\s*['"]([^'"]+)['"]/);
    const deValue = deMatch ? deMatch[1] : enValue;
    
    // Build new language lines
    const newLangs = [
      `fr: '${escapeQuote(enValue)}',`,
      `pt: '${escapeQuote(enValue)}',`,
      `nl: '${escapeQuote(enValue)}',`,
      `'en-GB': '${escapeQuote(enValue)}',`,
      `'en-AU': '${escapeQuote(enValue)}',`,
      `'de-AT': '${escapeQuote(deValue)}',`
    ].map(line => indent + line).join('\n');
    
    return svLine + '\n' + newLangs + '\n' + indent + nextField;
  });
}

// Update a single file
function updateFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Add new languages
    content = addNewLanguages(content);
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    }
    return false;
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
    return false;
  }
}

// Main
const scriptsDir = path.join(__dirname);
let updated = 0;
let skipped = 0;

console.log('🔍 Updating seed files with new languages...\n');

seedFiles.forEach(fileName => {
  const filePath = path.join(scriptsDir, fileName);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Not found: ${fileName}`);
    return;
  }
  
  console.log(`📝 ${fileName}...`);
  const changed = updateFile(filePath);
  
  if (changed) {
    console.log(`   ✅ Updated`);
    updated++;
  } else {
    console.log(`   ⏭️  Already has new languages`);
    skipped++;
  }
});

console.log('\n' + '='.repeat(80));
console.log(`✅ Updated: ${updated} files`);
console.log(`⏭️  Skipped: ${skipped} files`);
console.log('\n✨ Done! All seed files updated.');
console.log('\n📋 Next steps:');
console.log('   1. Run: node server/scripts/deleteAllTranslations.js');
console.log('   2. Run: node server/scripts/seedTranslations.js');
console.log('   3. Run all seedMissingTranslations_*.js files');

