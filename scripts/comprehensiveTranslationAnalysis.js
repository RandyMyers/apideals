/**
 * Comprehensive Translation Analysis
 * 
 * Analyzes:
 * 1. English placeholders in seed files (fr, pt, nl, etc.)
 * 2. Key mismatches between client usage and seed files (camelCase issues)
 * 3. Missing translations in database
 * 
 * Usage: node server/scripts/comprehensiveTranslationAnalysis.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Translation = require('../models/translation');

const NON_ENGLISH_LANGS = ['fr', 'pt', 'nl', 'ga', 'de', 'es', 'it', 'no', 'fi', 'da', 'sv', 'de-AT'];
const NEW_LANGS = ['fr', 'pt', 'nl', 'en-GB', 'en-AU', 'de-AT']; // Languages that might have placeholders

// Get all seed files
const getSeedFiles = () => {
  return [
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
  ].map(f => path.join(__dirname, f));
};

// Extract translation keys and check for English placeholders
const analyzeSeedFiles = () => {
  const files = getSeedFiles();
  const allKeys = new Set();
  const englishPlaceholders = [];
  const keyToFile = new Map();
  
  files.forEach(filePath => {
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  File not found: ${filePath}`);
      return;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);
    
    // Split by translation objects (look for { key: pattern)
    const parts = content.split(/\{\s*key:\s*['"]/);
    
    parts.forEach((part, idx) => {
      if (idx === 0) return; // Skip first part
      
      // Extract key
      const keyMatch = part.match(/^([^'"]+)['"]/);
      if (!keyMatch) return;
      const key = keyMatch[1].toLowerCase();
      allKeys.add(key);
      keyToFile.set(key, fileName);
      
      // Extract English value
      const enMatch = part.match(/en:\s*['"]([^'"]+)['"]/);
      if (!enMatch) return;
      const enValue = enMatch[1];
      
      // Check each new language for English placeholders
      NEW_LANGS.forEach(lang => {
        let pattern;
        if (lang.includes('-')) {
          // Handle 'en-GB', 'en-AU', 'de-AT'
          pattern = new RegExp(`['"]${lang.replace(/-/g, '\\-')}['"]:\\s*['"]([^'"]+)['"]`, 'i');
        } else {
          pattern = new RegExp(`${lang}:\\s*['"]([^'"]+)['"]`, 'i');
        }
        
        const match = part.match(pattern);
        if (match) {
          const langValue = match[1];
          
          // Check if it's an English copy (exact match, ignoring whitespace)
          if (langValue.trim() === enValue.trim()) {
            englishPlaceholders.push({
              key,
              language: lang,
              englishValue: enValue.length > 60 ? enValue.substring(0, 60) + '...' : enValue,
              file: fileName,
            });
          }
        }
      });
    });
  });
  
  return {
    keys: Array.from(allKeys),
    keyToFile,
    englishPlaceholders,
  };
};

// Extract translation keys from client files
const extractClientKeys = () => {
  const clientDir = path.join(__dirname, '../../client/src');
  const clientKeys = new Set();
  const keyLocations = new Map();
  
  const findFiles = (dir, fileList = []) => {
    if (!fs.existsSync(dir)) return fileList;
    
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      try {
        const stat = fs.statSync(filePath);
        if (stat.isDirectory() && !filePath.includes('node_modules') && !filePath.includes('.git')) {
          findFiles(filePath, fileList);
        } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
          fileList.push(filePath);
        }
      } catch (e) {
        // Skip files we can't read
      }
    });
    return fileList;
  };
  
  const files = findFiles(clientDir);
  
  files.forEach(filePath => {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(clientDir, filePath);
      
      // Match t('key') or t("key") patterns
      const pattern = /t\(['"]([^'"]+)['"]\)/g;
      let match;
      
      while ((match = pattern.exec(content)) !== null) {
        const key = match[1];
        clientKeys.add(key);
        
        if (!keyLocations.has(key)) {
          keyLocations.set(key, []);
        }
        keyLocations.get(key).push(relativePath);
      }
    } catch (e) {
      // Skip files we can't read
    }
  });
  
  return {
    keys: Array.from(clientKeys),
    keyLocations,
  };
};

// Convert key to camelCase (matching translation model logic)
const toCamelCase = (str) => {
  const knownMappings = {
    'activeonly': 'activeOnly',
    'resultsinfo': 'resultsInfo',
    'brandtagline': 'brandTagline',
    'viewall': 'viewAll',
    'resultsfor': 'resultsFor',
    'verifiedonly': 'verifiedOnly',
    'allresults': 'allResults',
    'noresults': 'noResults',
    'emailplaceholder': 'emailPlaceholder',
    'passwordplaceholder': 'passwordPlaceholder',
    'usernameplaceholder': 'usernamePlaceholder',
    'codeplaceholder': 'codePlaceholder',
    'titleplaceholder': 'titlePlaceholder',
    'descriptionplaceholder': 'descriptionPlaceholder',
    'searchplaceholder': 'searchPlaceholder',
    'noactive': 'noActive',
    'tryfilters': 'tryFilters',
    'popularonly': 'popularOnly',
    'searchresults': 'searchResults',
    'nodescription': 'noDescription',
    'expiringsoonsort': 'expiringSoonSort',
    'activecoupons': 'activeCoupons',
    'titlerequired': 'titleRequired',
    'placeholderfull': 'placeholderFull',
    'maxpurchaseplaceholder': 'maxPurchasePlaceholder',
    'prooftitle': 'proofTitle',
    'proofdescription': 'proofDescription',
    'proofdescriptionlabel': 'proofDescriptionLabel',
    'proofdescriptionplaceholder': 'proofDescriptionPlaceholder',
    'termsplaceholder': 'termsPlaceholder',
    'confirmpasswordplaceholder': 'confirmPasswordPlaceholder',
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
    'titlesubtext': 'titleSubtext',
  };
  
  if (knownMappings[str]) {
    return knownMappings[str];
  }
  
  if (str !== str.toLowerCase()) {
    return str; // Already camelCase
  }
  
  // Try common word patterns
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
  const camelLastPart = toCamelCase(lastPart.toLowerCase());
  parts[parts.length - 1] = camelLastPart;
  
  return parts.join('.');
};

// Check database for missing translations
const checkDatabase = async () => {
  const translations = await Translation.find({}).lean();
  const dbKeys = new Set(translations.map(t => t.key));
  
  const missingTranslations = [];
  
  for (const lang of NON_ENGLISH_LANGS) {
    const missing = translations.filter(t => {
      const hasTranslation = t[lang] && t[lang].trim() !== '';
      const isPlaceholder = t[lang] === t.en;
      return !hasTranslation || isPlaceholder;
    });
    
    if (missing.length > 0) {
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
  }
  
  return {
    dbKeys: Array.from(dbKeys),
    totalTranslations: translations.length,
    missingTranslations,
  };
};

// Main analysis
const main = async () => {
  console.log('='.repeat(80));
  console.log('COMPREHENSIVE TRANSLATION ANALYSIS');
  console.log('='.repeat(80));
  console.log();
  
  // Step 1: Analyze seed files
  console.log('📂 Step 1: Analyzing seed files...');
  const seedData = analyzeSeedFiles();
  console.log(`   ✓ Found ${seedData.keys.length} unique keys`);
  console.log(`   ✓ Found ${seedData.englishPlaceholders.length} English placeholders`);
  console.log();
  
  // Step 2: Extract client keys
  console.log('📂 Step 2: Extracting keys from client files...');
  const clientData = extractClientKeys();
  console.log(`   ✓ Found ${clientData.keys.length} unique translation keys in client`);
  console.log();
  
  // Step 3: Check database
  console.log('📂 Step 3: Checking database...');
  await mongoose.connect(process.env.MONGO_URL, { 
    useNewUrlParser: true, 
    useUnifiedTopology: true 
  });
  console.log('   ✓ Connected to MongoDB');
  const dbData = await checkDatabase();
  console.log(`   ✓ Found ${dbData.totalTranslations} translations in database`);
  console.log(`   ✓ Found ${dbData.missingTranslations.length} languages with missing translations`);
  console.log();
  
  // Generate report
  console.log('='.repeat(80));
  console.log('ANALYSIS RESULTS');
  console.log('='.repeat(80));
  console.log();
  
  // Issue 1: English placeholders in seed files
  console.log('🔴 ISSUE 1: English Placeholders in Seed Files');
  console.log('-'.repeat(80));
  
  if (seedData.englishPlaceholders.length > 0) {
    // Group by language
    const byLanguage = {};
    seedData.englishPlaceholders.forEach(item => {
      if (!byLanguage[item.language]) {
        byLanguage[item.language] = [];
      }
      byLanguage[item.language].push(item);
    });
    
    Object.keys(byLanguage).sort().forEach(lang => {
      const items = byLanguage[lang];
      console.log(`\n  ${lang.toUpperCase()}: ${items.length} keys with English placeholders`);
      
      // Group by file
      const byFile = {};
      items.forEach(item => {
        if (!byFile[item.file]) byFile[item.file] = [];
        byFile[item.file].push(item);
      });
      
      Object.keys(byFile).sort().forEach(file => {
        console.log(`\n    ${file} (${byFile[file].length} keys):`);
        byFile[file].slice(0, 5).forEach(item => {
          console.log(`      - ${item.key}`);
          console.log(`        "${item.englishValue}"`);
        });
        if (byFile[file].length > 5) {
          console.log(`      ... and ${byFile[file].length - 5} more`);
        }
      });
    });
  } else {
    console.log('✅ No English placeholders found in seed files');
  }
  
  console.log();
  
  // Issue 2: Missing translations in database
  console.log('🔴 ISSUE 2: Missing Translations in Database');
  console.log('-'.repeat(80));
  
  if (dbData.missingTranslations.length > 0) {
    dbData.missingTranslations.forEach(langData => {
      console.log(`\n  ${langData.language.toUpperCase()}: ${langData.count} keys missing or using placeholders`);
      
      const placeholders = langData.keys.filter(k => k.isPlaceholder);
      const missing = langData.keys.filter(k => !k.hasValue);
      
      if (placeholders.length > 0) {
        console.log(`    - ${placeholders.length} using English placeholders`);
        placeholders.slice(0, 3).forEach(k => {
          console.log(`      • ${k.key}: "${k.currentValue}"`);
        });
        if (placeholders.length > 3) {
          console.log(`      ... and ${placeholders.length - 3} more`);
        }
      }
      
      if (missing.length > 0) {
        console.log(`    - ${missing.length} completely missing`);
        missing.slice(0, 3).forEach(k => {
          console.log(`      • ${k.key}`);
        });
        if (missing.length > 3) {
          console.log(`      ... and ${missing.length - 3} more`);
        }
      }
    });
  } else {
    console.log('✅ All languages have proper translations in database');
  }
  
  console.log();
  
  // Issue 3: Key mismatches (camelCase)
  console.log('🔴 ISSUE 3: Potential Key Mismatches (CamelCase)');
  console.log('-'.repeat(80));
  
  // Convert seed keys to camelCase format
  const seedKeysCamel = new Map();
  seedData.keys.forEach(key => {
    const camelKey = convertKeyToCamelCase(key);
    seedKeysCamel.set(camelKey, key);
  });
  
  // Find mismatches
  const mismatches = [];
  clientData.keys.forEach(clientKey => {
    const clientKeyLower = clientKey.toLowerCase();
    const clientKeyCamel = convertKeyToCamelCase(clientKey);
    
    // Check if it exists in seed files
    const existsInSeed = seedData.keys.includes(clientKeyLower) || 
                         seedKeysCamel.has(clientKeyCamel) ||
                         Array.from(seedKeysCamel.values()).some(sk => convertKeyToCamelCase(sk) === clientKeyCamel);
    
    if (!existsInSeed) {
      mismatches.push({
        clientKey,
        locations: clientData.keyLocations.get(clientKey),
      });
    }
  });
  
  if (mismatches.length > 0) {
    console.log(`\nFound ${mismatches.length} keys used in client but not found in seed files:\n`);
    mismatches.slice(0, 15).forEach(m => {
      console.log(`  - ${m.clientKey}`);
      if (m.locations && m.locations.length > 0) {
        console.log(`    Used in: ${m.locations[0]}`);
      }
    });
    if (mismatches.length > 15) {
      console.log(`\n  ... and ${mismatches.length - 15} more keys`);
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
  console.log(`Seed files:`);
  console.log(`  - Total keys: ${seedData.keys.length}`);
  console.log(`  - English placeholders: ${seedData.englishPlaceholders.length}`);
  console.log();
  console.log(`Client:`);
  console.log(`  - Translation keys used: ${clientData.keys.length}`);
  console.log(`  - Potential mismatches: ${mismatches.length}`);
  console.log();
  console.log(`Database:`);
  console.log(`  - Total translations: ${dbData.totalTranslations}`);
  const totalMissing = dbData.missingTranslations.reduce((sum, lang) => sum + lang.count, 0);
  console.log(`  - Missing translations: ${totalMissing}`);
  console.log();
  
  await mongoose.connection.close();
  console.log('✅ Analysis complete!');
};

main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});



