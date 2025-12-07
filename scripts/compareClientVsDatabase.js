/**
 * Compare Client Translation Keys vs Database
 * Identifies missing keys and creates a report
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const Translation = require('../models/translation');
const fs = require('fs');
const path = require('path');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL, { 
      useNewUrlParser: true, 
      useUnifiedTopology: true 
    });
    console.log('✅ Connected to MongoDB\n');
    return true;
  } catch (error) {
    console.error('❌ Failed to connect:', error.message);
    return false;
  }
};

const compareKeys = async () => {
  // Load client keys from JSON file
  const clientKeysFile = path.join(__dirname, '../../CLIENT_TRANSLATION_KEYS.json');
  if (!fs.existsSync(clientKeysFile)) {
    console.error('❌ CLIENT_TRANSLATION_KEYS.json not found. Run findAllClientTranslationKeys.js first.');
    process.exit(1);
  }
  
  const clientData = JSON.parse(fs.readFileSync(clientKeysFile, 'utf8'));
  const clientKeys = new Set(clientData.keys.map(k => k.key.toLowerCase()));
  
  console.log(`📊 Client has ${clientKeys.size} unique translation keys\n`);
  
  // Get all database keys
  const dbTranslations = await Translation.find({}).select('key').lean();
  const dbKeys = new Set(dbTranslations.map(t => t.key.toLowerCase()));
  
  console.log(`📊 Database has ${dbKeys.size} unique translation keys\n`);
  
  // Find missing keys
  const missingKeys = [];
  clientKeys.forEach(key => {
    if (!dbKeys.has(key)) {
      missingKeys.push(key);
    }
  });
  
  // Find extra keys in database (not used in client)
  const extraKeys = [];
  dbKeys.forEach(key => {
    if (!clientKeys.has(key)) {
      extraKeys.push(key);
    }
  });
  
  console.log('='.repeat(80));
  console.log('COMPARISON RESULTS');
  console.log('='.repeat(80));
  console.log(`✅ Keys in both: ${clientKeys.size - missingKeys.length}`);
  console.log(`❌ Missing in database: ${missingKeys.length}`);
  console.log(`ℹ️  Extra in database (not used): ${extraKeys.length}`);
  console.log();
  
  if (missingKeys.length > 0) {
    console.log('='.repeat(80));
    console.log(`MISSING KEYS IN DATABASE (${missingKeys.length} keys)`);
    console.log('='.repeat(80));
    
    // Group by category
    const byCategory = {};
    missingKeys.forEach(key => {
      const category = key.split('.')[0] || 'other';
      if (!byCategory[category]) {
        byCategory[category] = [];
      }
      byCategory[category].push(key);
    });
    
    Object.keys(byCategory).sort().forEach(category => {
      console.log(`\n📂 ${category.toUpperCase()} (${byCategory[category].length} missing):`);
      byCategory[category].slice(0, 20).forEach(key => {
        console.log(`  - ${key}`);
      });
      if (byCategory[category].length > 20) {
        console.log(`  ... and ${byCategory[category].length - 20} more`);
      }
    });
    
    // Save missing keys to file
    const outputFile = path.join(__dirname, '../../MISSING_TRANSLATION_KEYS.json');
    fs.writeFileSync(outputFile, JSON.stringify({
      totalMissing: missingKeys.length,
      missingKeys: missingKeys.sort(),
      byCategory: Object.keys(byCategory).reduce((acc, cat) => {
        acc[cat] = byCategory[cat].length;
        return acc;
      }, {})
    }, null, 2));
    console.log(`\n✅ Missing keys saved to: ${outputFile}`);
  }
  
  if (extraKeys.length > 0 && extraKeys.length < 50) {
    console.log('\n' + '='.repeat(80));
    console.log(`EXTRA KEYS IN DATABASE (not used in client) - ${extraKeys.length} keys`);
    console.log('='.repeat(80));
    extraKeys.slice(0, 20).forEach(key => {
      console.log(`  - ${key}`);
    });
    if (extraKeys.length > 20) {
      console.log(`  ... and ${extraKeys.length - 20} more`);
    }
  }
  
  return { missingKeys, extraKeys };
};

const main = async () => {
  if (await connectDB()) {
    await compareKeys();
    await mongoose.connection.close();
    console.log('\n✅ Done!');
  }
  process.exit(0);
};

main();







