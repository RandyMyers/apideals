/**
 * Comprehensive Translation Analysis Script
 * 
 * Analyzes:
 * 1. English placeholders in non-English languages
 * 2. Key mismatches (camelCase vs lowercase) between seed files and client usage
 * 
 * Usage: node server/scripts/analyzeTranslationIssues.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Translation = require('../models/translation');

// Languages to check (excluding English variants)
const NON_ENGLISH_LANGS = ['ga', 'de', 'es', 'it', 'no', 'fi', 'da', 'sv', 'fr', 'pt', 'nl', 'de-AT'];

// All supported languages
const ALL_LANGS = ['en', 'ga', 'de', 'es', 'it', 'no', 'fi', 'da', 'sv', 'fr', 'pt', 'nl', 'en-GB', 'en-AU', 'de-AT'];

// Get all seed translation files
const getSeedFiles = () => {
  const scriptsDir = __dirname;
  const files = [
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
  
  return files.map(file => path.join(scriptsDir, file));
};

// Extract translation keys from seed files
const extractKeysFromSeedFiles = () => {
  const seedFiles = getSeedFiles();
  const allKeys = new Set();
  const keyToFile = new Map();
  const englishPlaceholders = [];
  
  seedFiles.forEach(filePath => {
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  File not found: ${filePath}`);
      return;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);
    
    // Extract translation objects (looking for patterns like { key: '...', en: '...', fr: '...' })
    // This is a simplified parser - it looks for objects with 'key' property
    const translationPattern = /key:\s*['"]([^'"]+)['"]/g;
    let match;
    
    while ((match = translationPattern.exec(content)) !== null) {
      const key = match[1].toLowerCase(); // Keys are stored lowercase in DB
      allKeys.add(key);
      keyToFile.set(key, fileName);
      
      // Check for English placeholders in non-English languages
      // Look for the translation object containing this key
      const keyIndex = match.index;
      const beforeKey = content.substring(Math.max(0, keyIndex - 100), keyIndex);
      const afterKey = content.substring(keyIndex, Math.min(content.length, keyIndex + 2000));
      const fullContext = beforeKey + afterKey;
      
      // Extract the full object (simplified - looks for the object containing this key)
      const objStart = fullContext.lastIndexOf('{');
      const objEnd = fullContext.indexOf('}', objStart);
      if (objStart !== -1 && objEnd !== -1) {
        const objStr = fullContext.substring(objStart, objEnd);
        
        // Check each non-English language
        NON_ENGLISH_LANGS.forEach(lang => {
          // Look for lang: 'English text' pattern
          const langPattern = new RegExp(`${lang}:\\s*['"]([^'"]+)['"]`, 'i');
          const langMatch = objStr.match(langPattern);
          
          if (langMatch) {
            const translation = langMatch[1];
            const englishValue = objStr.match(/en:\s*['"]([^'"]+)['"]/i);
            
            if (englishValue && translation === englishValue[1]) {
              // This language has the same value as English - likely a placeholder
              englishPlaceholders.push({
                key,
                language: lang,
                value: translation,
                file: fileName,
              });
            }
          }
        });
      }
    }
  });
  
  return {
    keys: Array.from(allKeys),
    keyToFile,
    englishPlaceholders,
  };
};

// Extract translation keys from client files
const extractKeysFromClient = () => {
  const clientDir = path.join(__dirname, '../../client/src');
  const clientKeys = new Set();
  const keyLocations = new Map();
  
  // Recursively find all .js and .jsx files
  const findFiles = (dir, fileList = []) => {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory() && !filePath.includes('node_modules')) {
        findFiles(filePath, fileList);
      } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
        fileList.push(filePath);
      }
    });
    return fileList;
  };
  
  const files = findFiles(clientDir);
  
  files.forEach(filePath => {
    const content = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(clientDir, filePath);
    
    // Match t('key') or t("key") patterns
    const patterns = [
      /t\(['"]([^'"]+)['"]\)/g,
      /i18n\.t\(['"]([^'"]+)['"]\)/g,
      /useTranslation\(\)/g, // Also track files using translations
    ];
    
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        if (match[1]) {
          const key = match[1].toLowerCase();
          clientKeys.add(key);
          
          if (!keyLocations.has(key)) {
            keyLocations.set(key, []);
          }
          keyLocations.get(key).push(relativePath);
        }
      }
    });
  });
  
  return {
    keys: Array.from(clientKeys),
    keyLocations,
  };
};

// Convert key to camelCase format (matching the model's toCamelCase function)
const toCamelCase = (str) => {
  // Known mappings from translation model
  const knownMappings = {
    'activeonly': 'activeOnly',
    'resultsinfo': 'resultsInfo',
    'brandtagline': 'brandTagline',
    'branddescription': 'brandDescription',
    'searchplaceholder': 'searchPlaceholder',
    'titlesubtext': 'titleSubtext',
    'activecoupons': 'activeCoupons',
    'titleplaceholder': 'titlePlaceholder',
    'titlerequired': 'titleRequired',
    'descriptionplaceholder': 'descriptionPlaceholder',
    'placeholderfull': 'placeholderFull',
    'viewall': 'viewAll',
    'resultsfor': 'resultsFor',
    'verifiedonly': 'verifiedOnly',
    'allresults': 'allResults',
    'expiringsoonsort': 'expiringSoonSort',
    'noresults': 'noResults',
    'emailplaceholder': 'emailPlaceholder',
    'passwordplaceholder': 'passwordPlaceholder',
    'usernameplaceholder': 'usernamePlaceholder',
    'confirmpasswordplaceholder': 'confirmPasswordPlaceholder',
    'codeplaceholder': 'codePlaceholder',
    'termsplaceholder': 'termsPlaceholder',
    'maxpurchaseplaceholder': 'maxPurchasePlaceholder',
    'prooftitle': 'proofTitle',
    'proofdescription': 'proofDescription',
    'proofdescriptionlabel': 'proofDescriptionLabel',
    'proofdescriptionplaceholder': 'proofDescriptionPlaceholder',
    'noactive': 'noActive',
    'tryfilters': 'tryFilters',
    'popularonly': 'popularOnly',
    'searchresults': 'searchResults',
    'nodescription': 'noDescription',
    'ogdescription': 'ogDescription',
    'subjectplaceholder': 'subjectPlaceholder',
    'missiontitle': 'missionTitle',
    'visiontitle': 'visionTitle',
    'valuestitle': 'valuesTitle',
    'dealdescription': 'dealDescription',
    'titleornamerequired': 'titleOrNameRequired',
    'seodescription': 'seoDescription',
    'seotitle': 'seoTitle',
    'seotitledefault': 'seoTitleDefault',
    'seodescriptionfallback': 'seoDescriptionFallback',
    'seodescriptiondefault': 'seoDescriptionDefault',
    'sortlabel': 'sortLabel',
    'descriptionfallback': 'descriptionFallback',
  };
  
  if (knownMappings[str]) {
    return knownMappings[str];
  }
  
  // If already has uppercase, return as-is
  if (str !== str.toLowerCase()) {
    return str;
  }
  
  // Try to detect word boundaries
  const commonWords = ['active', 'only', 'results', 'info', 'brand', 'tagline', 'description', 
                       'filter', 'sort', 'empty', 'no', 'title', 'subtitle', 'search', 'placeholder',
                       'view', 'grid', 'list', 'newest', 'discount', 'expiring', 'price', 'low', 'high',
                       'email', 'password', 'username', 'confirm', 'code', 'terms', 'max', 'purchase',
                       'proof', 'label', 'try', 'popular', 'subject', 'mission', 'vision', 'values',
                       'deal', 'name', 'required', 'seo', 'default', 'fallback'];
  
  for (const word of commonWords) {
    if (str.startsWith(word) && str.length > word.length) {
      return word + str.charAt(word.length).toUpperCase() + str.slice(word.length + 1);
    }
  }
  
  return str;
};

// Convert full key path to camelCase format (only last segment)
const convertKeyToCamelCase = (key) => {
  const parts = key.split('.');
  if (parts.length === 0) return key;
  
  const lastPart = parts[parts.length - 1];
  const camelLastPart = toCamelCase(lastPart);
  parts[parts.length - 1] = camelLastPart;
  
  return parts.join('.');
};

// Check database for missing translations
const checkDatabaseTranslations = async () => {
  const translations = await Translation.find({}).lean();
  const dbKeys = new Set(translations.map(t => t.key));
  
  const missingInDb = [];
  const missingTranslations = [];
  
  // Check each language
  for (const lang of NON_ENGLISH_LANGS) {
    const missing = translations.filter(t => {
      // Check if translation exists and is not empty
      const hasTranslation = t[lang] && t[lang].trim() !== '';
      // Check if it's the same as English (placeholder)
      const isPlaceholder = t[lang] === t.en;
      return !hasTranslation || isPlaceholder;
    });
    
    missingTranslations.push({
      language: lang,
      count: missing.length,
      keys: missing.map(t => ({
        key: t.key,
        hasValue: !!(t[lang] && t[lang].trim() !== ''),
        isPlaceholder: t[lang] === t.en,
        englishValue: t.en,
        currentValue: t[lang] || '(missing)',
      })),
    });
  }
  
  return {
    dbKeys: Array.from(dbKeys),
    missingTranslations,
  };
};

// Main analysis function
const analyze = async () => {
  console.log('='.repeat(80));
  console.log('TRANSLATION ANALYSIS');
  console.log('='.repeat(80));
  console.log();
  
  console.log('📂 Step 1: Extracting keys from seed files...');
  const seedData = extractKeysFromSeedFiles();
  console.log(`   Found ${seedData.keys.length} unique keys in seed files`);
  console.log(`   Found ${seedData.englishPlaceholders.length} potential English placeholders`);
  console.log();
  
  console.log('📂 Step 2: Extracting keys from client files...');
  const clientData = extractKeysFromClient();
  console.log(`   Found ${clientData.keys.length} unique translation keys in client`);
  console.log();
  
  console.log('📂 Step 3: Checking database translations...');
  await mongoose.connect(process.env.MONGO_URL, { 
    useNewUrlParser: true, 
    useUnifiedTopology: true 
  });
  console.log('   Connected to MongoDB');
  const dbData = await checkDatabaseTranslations();
  console.log(`   Found ${dbData.dbKeys.length} keys in database`);
  console.log();
  
  // Generate report
  console.log('='.repeat(80));
  console.log('ANALYSIS RESULTS');
  console.log('='.repeat(80));
  console.log();
  
  // Issue 1: English placeholders
  console.log('🔴 ISSUE 1: English Placeholders in Non-English Languages');
  console.log('-'.repeat(80));
  
  if (seedData.englishPlaceholders.length > 0) {
    console.log(`\nFound ${seedData.englishPlaceholders.length} keys with English placeholders:\n`);
    
    // Group by language
    const byLanguage = {};
    seedData.englishPlaceholders.forEach(item => {
      if (!byLanguage[item.language]) {
        byLanguage[item.language] = [];
      }
      byLanguage[item.language].push(item);
    });
    
    Object.keys(byLanguage).sort().forEach(lang => {
      console.log(`\n  ${lang.toUpperCase()} (${byLanguage[lang].length} keys):`);
      byLanguage[lang].slice(0, 10).forEach(item => {
        console.log(`    - ${item.key} (in ${item.file})`);
        console.log(`      Value: "${item.value}"`);
      });
      if (byLanguage[lang].length > 10) {
        console.log(`    ... and ${byLanguage[lang].length - 10} more`);
      }
    });
  } else {
    console.log('✅ No English placeholders found in seed files');
  }
  
  console.log();
  
  // Issue 2: Database missing translations
  console.log('🔴 ISSUE 2: Missing Translations in Database');
  console.log('-'.repeat(80));
  
  dbData.missingTranslations.forEach(langData => {
    if (langData.count > 0) {
      console.log(`\n  ${langData.language.toUpperCase()}: ${langData.count} keys missing or using placeholders`);
      const placeholders = langData.keys.filter(k => k.isPlaceholder);
      const missing = langData.keys.filter(k => !k.hasValue);
      
      if (placeholders.length > 0) {
        console.log(`    - ${placeholders.length} using English placeholders:`);
        placeholders.slice(0, 5).forEach(k => {
          console.log(`      • ${k.key}: "${k.currentValue}"`);
        });
        if (placeholders.length > 5) {
          console.log(`      ... and ${placeholders.length - 5} more`);
        }
      }
      
      if (missing.length > 0) {
        console.log(`    - ${missing.length} completely missing:`);
        missing.slice(0, 5).forEach(k => {
          console.log(`      • ${k.key}`);
        });
        if (missing.length > 5) {
          console.log(`      ... and ${missing.length - 5} more`);
        }
      }
    }
  });
  
  console.log();
  
  // Issue 3: Key mismatches (camelCase)
  console.log('🔴 ISSUE 3: Potential Key Mismatches (CamelCase)');
  console.log('-'.repeat(80));
  
  // Convert seed keys to camelCase format
  const seedKeysCamel = new Set(seedData.keys.map(k => convertKeyToCamelCase(k)));
  const clientKeysSet = new Set(clientData.keys);
  
  // Find keys in client that don't match seed format
  const mismatches = [];
  clientData.keys.forEach(clientKey => {
    const clientKeyLower = clientKey.toLowerCase();
    const clientKeyCamel = convertKeyToCamelCase(clientKey);
    
    // Check if it exists in seed files (either as-is or converted)
    const existsInSeed = seedData.keys.includes(clientKeyLower) || 
                         seedKeysCamel.has(clientKeyCamel) ||
                         seedData.keys.some(sk => convertKeyToCamelCase(sk) === clientKeyCamel);
    
    if (!existsInSeed) {
      mismatches.push({
        clientKey,
        locations: clientData.keyLocations.get(clientKey),
      });
    }
  });
  
  if (mismatches.length > 0) {
    console.log(`\nFound ${mismatches.length} keys used in client but not found in seed files:\n`);
    mismatches.slice(0, 20).forEach(m => {
      console.log(`  - ${m.clientKey}`);
      if (m.locations && m.locations.length > 0) {
        console.log(`    Used in: ${m.locations[0]}`);
        if (m.locations.length > 1) {
          console.log(`    ... and ${m.locations.length - 1} more files`);
        }
      }
    });
    if (mismatches.length > 20) {
      console.log(`\n  ... and ${mismatches.length - 20} more keys`);
    }
  } else {
    console.log('✅ All client keys found in seed files');
  }
  
  console.log();
  
  // Summary
  console.log('='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log();
  console.log(`Total keys in seed files: ${seedData.keys.length}`);
  console.log(`Total keys in client: ${clientData.keys.length}`);
  console.log(`Total keys in database: ${dbData.dbKeys.length}`);
  console.log();
  console.log(`English placeholders found: ${seedData.englishPlaceholders.length}`);
  console.log(`Potential key mismatches: ${mismatches.length}`);
  
  const totalMissing = dbData.missingTranslations.reduce((sum, lang) => sum + lang.count, 0);
  console.log(`Total missing translations in DB: ${totalMissing}`);
  console.log();
  
  await mongoose.connection.close();
};

// Run analysis
analyze().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});



