/**
 * Translation Gap Analysis Script
 * Analyzes all seed translation files and compares with actual client usage
 * Identifies missing translations for each language
 * 
 * Usage: node server/scripts/analyzeTranslationGaps.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Translation = require('../models/translation');
const fs = require('fs');
const path = require('path');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL, { 
      useNewUrlParser: true, 
      useUnifiedTopology: true 
    });
    console.log('✅ Connected to MongoDB');
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    return false;
  }
};

// Supported languages (current + new ones)
const SUPPORTED_LANGUAGES = ['en', 'ga', 'de', 'es', 'it', 'no', 'fi', 'da', 'sv', 'fr', 'pt', 'nl'];
const LANGUAGE_VARIANTS = {
  'en-GB': 'en', // UK English uses base English
  'en-AU': 'en', // Australian English uses base English
  'de-AT': 'de', // Austrian German uses base German
};

// Extract all translation keys from seed files
const extractSeededKeys = () => {
  const scriptsDir = path.join(__dirname);
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
  
  const seededKeys = new Map(); // key -> { translations object, file }
  
  seedFiles.forEach(fileName => {
    const filePath = path.join(scriptsDir, fileName);
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${fileName}`);
      return;
    }
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Extract translation arrays from the file
      // Look for patterns like: const translations = [...] or const XTranslations = [...]
      const arrayPattern = /const\s+\w+Translations\s*=\s*\[([\s\S]*?)\];/g;
      let match;
      
      while ((match = arrayPattern.exec(content)) !== null) {
        const arrayContent = match[1];
        
        // Extract individual translation objects
        const objectPattern = /\{[\s\S]*?key:\s*['"]([^'"]+)['"][\s\S]*?\}/g;
        let objMatch;
        
        while ((objMatch = objectPattern.exec(arrayContent)) !== null) {
          const fullObject = objMatch[0];
          const key = objMatch[1];
          
          // Extract all language values
          const translations = {};
          SUPPORTED_LANGUAGES.forEach(lang => {
            const langPattern = new RegExp(`${lang}:\\s*['"]([^'"]+)['"]`, 'i');
            const langMatch = fullObject.match(langPattern);
            if (langMatch) {
              translations[lang] = langMatch[1];
            }
          });
          
          // Also check for 'en' which is required
          const enPattern = /en:\s*['"]([^'"]+)['"]/i;
          const enMatch = fullObject.match(enPattern);
          if (enMatch) {
            translations.en = enMatch[1];
          }
          
          if (!seededKeys.has(key)) {
            seededKeys.set(key, {
              translations,
              file: fileName,
              fullObject
            });
          }
        }
      }
      
      // Also try to match the main seedTranslations.js format
      if (fileName === 'seedTranslations.js') {
        // Look for the initialTranslations array
        const mainPattern = /const\s+initialTranslations\s*=\s*\[([\s\S]*?)\];/s;
        const mainMatch = content.match(mainPattern);
        if (mainMatch) {
          const arrayContent = mainMatch[1];
          const objectPattern = /\{[\s\S]*?key:\s*['"]([^'"]+)['"][\s\S]*?\}/g;
          let objMatch;
          
          while ((objMatch = objectPattern.exec(arrayContent)) !== null) {
            const fullObject = objMatch[0];
            const key = objMatch[1];
            
            const translations = {};
            SUPPORTED_LANGUAGES.forEach(lang => {
              const langPattern = new RegExp(`${lang}:\\s*['"]([^'"]+)['"]`, 'i');
              const langMatch = fullObject.match(langPattern);
              if (langMatch) {
                translations[lang] = langMatch[1];
              }
            });
            
            const enPattern = /en:\s*['"]([^'"]+)['"]/i;
            const enMatch = fullObject.match(enPattern);
            if (enMatch) {
              translations.en = enMatch[1];
            }
            
            if (!seededKeys.has(key)) {
              seededKeys.set(key, {
                translations,
                file: fileName,
                fullObject
              });
            }
          }
        }
      }
    } catch (error) {
      console.error(`❌ Error reading ${fileName}:`, error.message);
    }
  });
  
  return seededKeys;
};

// Extract translation keys from client files
const extractClientTranslationKeys = () => {
  const clientDir = path.join(__dirname, '../../client/src');
  const files = scanDirectory(clientDir);
  
  // Filter out admin files
  const clientFiles = files.filter(file => {
    const relativePath = path.relative(clientDir, file);
    return !relativePath.includes('admin') && 
           !relativePath.includes('__tests__') &&
           !relativePath.includes('.test.') &&
           !relativePath.includes('.spec.');
  });
  
  const usedKeys = new Set();
  const keyUsage = {};
  
  clientFiles.forEach(filePath => {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const keys = extractTranslationKeys(filePath, content);
      
      keys.forEach(key => {
        usedKeys.add(key);
        if (!keyUsage[key]) {
          keyUsage[key] = [];
        }
        const relativePath = path.relative(clientDir, filePath);
        keyUsage[key].push(relativePath);
      });
    } catch (error) {
      // Skip files we can't read
    }
  });
  
  return { usedKeys, keyUsage };
};

// Recursively scan directory
const scanDirectory = (dir, fileList = []) => {
  try {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        if (!file.includes('node_modules') && 
            !file.includes('build') && 
            !file.includes('.git') &&
            !file.includes('__tests__') &&
            !file.includes('.next')) {
          scanDirectory(filePath, fileList);
        }
      } else if ((file.endsWith('.js') || file.endsWith('.jsx')) && 
                 !file.includes('.test.') && 
                 !file.includes('.spec.')) {
        fileList.push(filePath);
      }
    });
  } catch (error) {
    // Skip directories we can't read
  }
  
  return fileList;
};

// Extract translation keys from file content
const extractTranslationKeys = (filePath, content) => {
  const keys = new Set();
  
  // Pattern: t('key') or t("key") - must look like a translation key
  const pattern1 = /t\(['"]([a-z][a-z0-9._-]+)['"]\)/g;
  let match;
  while ((match = pattern1.exec(content)) !== null) {
    const key = match[1];
    if (isValidTranslationKey(key)) {
      keys.add(key);
    }
  }
  
  // Pattern: t(`key`) - template literals
  const pattern2 = /t\(`([a-z][a-z0-9._-]+)`\)/g;
  while ((match = pattern2.exec(content)) !== null) {
    const key = match[1];
    if (isValidTranslationKey(key)) {
      keys.add(key);
    }
  }
  
  // Pattern: i18n.t('key')
  const pattern3 = /i18n\.t\(['"]([a-z][a-z0-9._-]+)['"]\)/g;
  while ((match = pattern3.exec(content)) !== null) {
    const key = match[1];
    if (isValidTranslationKey(key)) {
      keys.add(key);
    }
  }
  
  // Pattern: {t('key')} in JSX
  const pattern4 = /\{t\(['"]([a-z][a-z0-9._-]+)['"]\)\}/g;
  while ((match = pattern4.exec(content)) !== null) {
    const key = match[1];
    if (isValidTranslationKey(key)) {
      keys.add(key);
    }
  }
  
  return Array.from(keys);
};

// Validate translation key
const isValidTranslationKey = (key) => {
  if (key.length < 3) return false;
  if (!/^[a-z]/.test(key)) return false;
  
  const commonSingleWords = ['home', 'about', 'contact', 'login', 'register', 'search', 'filter', 'sort', 'submit', 'cancel', 'save', 'delete', 'edit', 'view', 'back', 'next', 'prev', 'close', 'open', 'yes', 'no', 'ok', 'error', 'success', 'loading', 'empty', 'all', 'none'];
  
  if (commonSingleWords.includes(key)) return true;
  if (!/[._-]/.test(key)) return false;
  
  const excludedPatterns = [
    /^ref$/,
    /^token$/,
    /^type$/,
    /^store$/,
    /^config$/,
    /^script$/,
    /^q$/,
    /^[,\/\.\-]$/,
    /^@$/,
    /^text$/,
    /^textarea$/,
    /^none$/,
    /^next$/,
    /^prev$/,
    /^web-vitals$/,
    /^tx_ref$/,
    /^[a-z]$/,
    /^[0-9]+$/,
    /^https?:\/\//,
    /^\.\./,
    /^\/api\//,
    /^\$\{/,
    /\[data-/,
  ];
  
  for (const pattern of excludedPatterns) {
    if (pattern.test(key)) return false;
  }
  
  return true;
};

// Main analysis
const analyzeGaps = async () => {
  console.log('\n🔍 Starting Translation Gap Analysis...\n');
  
  // 1. Get seeded keys from all seed files
  console.log('📚 Analyzing seed translation files...');
  const seededKeys = extractSeededKeys();
  console.log(`   Found ${seededKeys.size} translation keys in seed files\n`);
  
  // 2. Get keys used in client code
  console.log('📂 Scanning client files for translation usage...');
  const { usedKeys, keyUsage } = extractClientTranslationKeys();
  console.log(`   Found ${usedKeys.size} unique translation keys used in client code\n`);
  
  // 3. Get keys from database
  console.log('📊 Fetching translations from database...');
  const dbTranslations = await Translation.find({}).lean();
  const dbKeys = new Set(dbTranslations.map(t => t.key));
  const dbTranslationsMap = {};
  dbTranslations.forEach(t => {
    dbTranslationsMap[t.key] = t;
  });
  console.log(`   Found ${dbTranslations.length} translation keys in database\n`);
  
  // 4. Find missing translations
  console.log('🔎 Analyzing missing translations...\n');
  
  const missingTranslations = {};
  const keysUsedInClient = Array.from(usedKeys);
  
  SUPPORTED_LANGUAGES.forEach(lang => {
    missingTranslations[lang] = [];
    
    keysUsedInClient.forEach(key => {
      // Check if key exists in database
      const dbTrans = dbTranslationsMap[key];
      
      if (dbTrans) {
        // Key exists in DB, check if translation is missing
        if (!dbTrans[lang] || dbTrans[lang].trim() === '') {
          missingTranslations[lang].push({
            key,
            category: dbTrans.category || 'common',
            english: dbTrans.en || 'N/A',
            context: keyUsage[key] || ['unknown'],
            seeded: seededKeys.has(key),
            seedFile: seededKeys.get(key)?.file
          });
        }
      } else {
        // Key not in database at all
        if (lang === 'en') {
          // Only report missing English keys (which means key not in DB)
          missingTranslations[lang].push({
            key,
            category: 'common',
            english: 'NOT IN DATABASE',
            context: keyUsage[key] || ['unknown'],
            seeded: seededKeys.has(key),
            seedFile: seededKeys.get(key)?.file
          });
        }
      }
    });
  });
  
  // 5. Generate report
  console.log('📝 Generating Gap Analysis Report...\n');
  console.log('='.repeat(80));
  console.log('TRANSLATION GAP ANALYSIS REPORT');
  console.log('='.repeat(80));
  console.log();
  
  // Summary
  console.log('📊 SUMMARY');
  console.log('-'.repeat(80));
  console.log(`Keys in seed files:           ${seededKeys.size}`);
  console.log(`Keys in database:             ${dbKeys.size}`);
  console.log(`Keys used in client code:    ${usedKeys.size}`);
  console.log(`Keys used but not in DB:     ${keysUsedInClient.filter(k => !dbKeys.has(k)).length}`);
  console.log();
  
  // Missing translations by language
  console.log('🌍 MISSING TRANSLATIONS BY LANGUAGE');
  console.log('-'.repeat(80));
  
  const langNames = {
    en: 'English',
    ga: 'Irish',
    de: 'German',
    es: 'Spanish',
    it: 'Italian',
    no: 'Norwegian',
    fi: 'Finnish',
    da: 'Danish',
    sv: 'Swedish',
    fr: 'French',
    pt: 'Portuguese',
    nl: 'Dutch'
  };
  
  SUPPORTED_LANGUAGES.forEach(lang => {
    const missing = missingTranslations[lang];
    console.log(`\n${langNames[lang]} (${lang}): ${missing.length} missing`);
    
    if (missing.length > 0) {
      console.log('  Top 30 missing keys:');
      missing.slice(0, 30).forEach(item => {
        console.log(`    - ${item.key} (${item.category})`);
        console.log(`      English: "${item.english}"`);
        if (item.seeded) {
          console.log(`      ⚠️  In seed file: ${item.seedFile} but missing ${lang} translation`);
        } else {
          console.log(`      ⚠️  Not in any seed file`);
        }
        console.log(`      Used in: ${item.context.slice(0, 2).join(', ')}`);
      });
      if (missing.length > 30) {
        console.log(`    ... and ${missing.length - 30} more`);
      }
    }
  });
  
  // Keys in seed files but not in database
  const seededButNotInDB = Array.from(seededKeys.keys()).filter(k => !dbKeys.has(k));
  if (seededButNotInDB.length > 0) {
    console.log('\n⚠️  KEYS IN SEED FILES BUT NOT IN DATABASE');
    console.log('-'.repeat(80));
    console.log(`  Total: ${seededButNotInDB.length} keys`);
    console.log('  These need to be seeded to the database');
    seededButNotInDB.slice(0, 20).forEach(key => {
      const seedInfo = seededKeys.get(key);
      console.log(`    - ${key} (from ${seedInfo.file})`);
    });
    if (seededButNotInDB.length > 20) {
      console.log(`    ... and ${seededButNotInDB.length - 20} more`);
    }
    console.log();
  }
  
  // Generate detailed JSON report
  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      seededKeys: seededKeys.size,
      dbKeys: dbKeys.size,
      usedKeys: usedKeys.size,
      missingInDB: keysUsedInClient.filter(k => !dbKeys.has(k)).length
    },
    missingTranslations,
    seededButNotInDB: seededButNotInDB.slice(0, 100),
    keyUsage: Object.fromEntries(
      Object.entries(keyUsage).map(([key, files]) => [key, files.slice(0, 5)])
    )
  };
  
  const reportPath = path.join(__dirname, 'translation_gap_analysis.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n💾 Detailed report saved to: ${reportPath}`);
  
  // Generate CSV for missing translations
  const csvLines = ['Language,Key,Category,English Translation,In Seed File,Seed File,Files Using Key'];
  
  SUPPORTED_LANGUAGES.forEach(lang => {
    missingTranslations[lang].forEach(item => {
      const files = item.context.join('; ');
      const inSeed = item.seeded ? 'Yes' : 'No';
      const seedFile = item.seedFile || 'N/A';
      csvLines.push(`"${lang}","${item.key}","${item.category}","${item.english.replace(/"/g, '""')}","${inSeed}","${seedFile}","${files}"`);
    });
  });
  
  const csvPath = path.join(__dirname, 'translation_gaps.csv');
  fs.writeFileSync(csvPath, csvLines.join('\n'));
  console.log(`📄 CSV report saved to: ${csvPath}`);
  
  console.log('\n✅ Analysis complete!\n');
  
  return report;
};

// Run analysis
(async () => {
  const connected = await connectDB();
  if (!connected) {
    process.exit(1);
  }
  
  try {
    await analyzeGaps();
  } catch (error) {
    console.error('❌ Error during analysis:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
})();







