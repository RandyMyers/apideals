/**
 * Complete Re-seed of All Translations
 * 1. Deletes all existing translations
 * 2. Runs all seed scripts in order
 * 
 * Usage: node server/scripts/reseedAllTranslations.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const Translation = require('../models/translation');
const { execSync } = require('child_process');
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

const deleteAllTranslations = async () => {
  try {
    const count = await Translation.countDocuments();
    console.log(`📊 Found ${count} translations in database`);
    
    if (count === 0) {
      console.log('✅ Database is already empty\n');
      return;
    }
    
    console.log('🗑️  Deleting all translations...\n');
    const result = await Translation.deleteMany({});
    console.log(`✅ Deleted ${result.deletedCount} translations\n`);
  } catch (error) {
    console.error('❌ Error deleting translations:', error);
    throw error;
  }
};

const runSeedScript = (scriptName) => {
  const scriptPath = path.join(__dirname, scriptName);
  console.log(`📝 Running: ${scriptName}...`);
  
  try {
    execSync(`node "${scriptPath}"`, { 
      encoding: 'utf8',
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit' // Show output in real-time
    });
    console.log(`   ✅ Completed\n`);
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}\n`);
    // Continue with other scripts
  }
};

const reseedAll = async () => {
  // Order matters - main seed first, then missing translations
  const seedScripts = [
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
    'seedMissingTranslations_24_used_items.js',
  ];
  
  console.log('='.repeat(80));
  console.log('COMPLETE RE-SEED OF ALL TRANSLATIONS');
  console.log('='.repeat(80));
  console.log();
  
  // Step 1: Delete all translations
  await deleteAllTranslations();
  
  // Step 2: Run all seed scripts
  console.log('🌱 Running seed scripts...\n');
  seedScripts.forEach((script, index) => {
    console.log(`[${index + 1}/${seedScripts.length}]`);
    runSeedScript(script);
  });
  
  // Step 3: Verify
  console.log('\n' + '='.repeat(80));
  console.log('VERIFICATION');
  console.log('='.repeat(80));
  
  const total = await Translation.countDocuments();
  console.log(`📊 Total translations: ${total}`);
  
  const langs = ['en', 'sv', 'no', 'de', 'es', 'it', 'fi', 'da', 'ga', 'fr', 'pt', 'nl', 'en-GB', 'en-AU', 'de-AT'];
  for (const lang of langs) {
    const count = await Translation.countDocuments({ [lang]: { $exists: true, $ne: '' } });
    const percentage = total > 0 ? ((count/total)*100).toFixed(1) : 0;
    console.log(`   ${lang.padEnd(8)}: ${count.toString().padStart(4)}/${total} (${percentage}%)`);
  }
  
  console.log('\n✨ Re-seeding complete!');
  console.log('\n📋 All translations now include:');
  console.log('   - Original languages: en, ga, de, es, it, no, fi, da, sv');
  console.log('   - New languages: fr, pt, nl, en-GB, en-AU, de-AT');
};

const main = async () => {
  if (await connectDB()) {
    try {
      await reseedAll();
    } catch (error) {
      console.error('❌ Fatal error:', error);
    } finally {
      await mongoose.connection.close();
      console.log('\n✅ Database connection closed');
    }
  }
  process.exit(0);
};

main();
