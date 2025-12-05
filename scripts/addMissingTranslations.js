/**
 * Add Missing Translations for New Languages
 * Adds translations for fr, pt, nl, enGB, enAU, deAT to existing keys
 * 
 * Usage: node server/scripts/addMissingTranslations.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Translation = require('../models/translation');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL, { 
      useNewUrlParser: true, 
      useUnifiedTopology: true 
    });
    console.log('✅ Connected to MongoDB\n');
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    return false;
  }
};

// Translation mappings for new languages
// These will be added to keys that already have English translations
const newLanguageTranslations = {
  // French translations
  fr: {
    'deals.filter.activeOnly': 'Actifs uniquement',
    'deals.resultsInfo': 'Affichage de {from} à {to} sur {total} offres',
    'footer.brandTagline': 'Votre destination d\'économies ultime',
    'footer.brandDescription': 'Découvrez des milliers de coupons vérifiés, des offres exclusives et des offres de remise en argent de vos magasins préférés. Rejoignez des millions d\'acheteurs intelligents qui économisent de l\'argent quotidiennement.',
  },
  // Portuguese translations
  pt: {
    'deals.filter.activeOnly': 'Apenas ativos',
    'deals.resultsInfo': 'Mostrando {from} a {to} de {total} ofertas',
    'footer.brandTagline': 'Seu destino definitivo de economia',
    'footer.brandDescription': 'Descubra milhares de cupons verificados, ofertas exclusivas e ofertas de cashback de suas lojas favoritas. Junte-se a milhões de compradores inteligentes que economizam dinheiro diariamente.',
  },
  // Dutch translations
  nl: {
    'deals.filter.activeOnly': 'Alleen actief',
    'deals.resultsInfo': 'Toont {from} tot {to} van {total} aanbiedingen',
    'footer.brandTagline': 'Uw ultieme besparingsbestemming',
    'footer.brandDescription': 'Ontdek duizenden geverifieerde coupons, exclusieve deals en cashback-aanbiedingen van uw favoriete winkels. Sluit u aan bij miljoenen slimme shoppers die dagelijks geld besparen.',
  },
  // English UK (same as English for most, but can be customized)
  enGB: {
    'deals.filter.activeOnly': 'Active Only',
    'deals.resultsInfo': 'Showing {from} to {to} of {total} deals',
    'footer.brandTagline': 'Your Ultimate Savings Destination',
    'footer.brandDescription': 'Discover thousands of verified coupons, exclusive deals, and cashback offers from your favourite stores. Join millions of smart shoppers saving money daily.',
  },
  // English Australia (same as English for most, but can be customized)
  enAU: {
    'deals.filter.activeOnly': 'Active Only',
    'deals.resultsInfo': 'Showing {from} to {to} of {total} deals',
    'footer.brandTagline': 'Your Ultimate Savings Destination',
    'footer.brandDescription': 'Discover thousands of verified coupons, exclusive deals, and cashback offers from your favourite stores. Join millions of smart shoppers saving money daily.',
  },
  // German Austria (same as German for most, but can be customized)
  deAT: {
    'deals.filter.activeOnly': 'Nur aktive',
    'deals.resultsInfo': 'Zeige {from} bis {to} von {total} Angeboten',
    'footer.brandTagline': 'Ihr ultimatives Sparziel',
    'footer.brandDescription': 'Entdecken Sie Tausende von verifizierten Gutscheinen, exklusiven Angeboten und Cashback-Angeboten von Ihren Lieblingsgeschäften. Schließen Sie sich Millionen von klugen Käufern an, die täglich Geld sparen.',
  },
};

const addMissingTranslations = async () => {
  try {
    console.log('🔍 Checking for missing translations...\n');

    // Get all translations
    const allTranslations = await Translation.find({});
    console.log(`📊 Found ${allTranslations.length} translations in database\n`);

    let updatedCount = 0;
    let createdCount = 0;

    // Process each translation key
    for (const trans of allTranslations) {
      let updated = false;
      const updates = {};

      // Check each new language
      Object.keys(newLanguageTranslations).forEach(langCode => {
        // Map language codes to model field names
        const fieldName = langCode === 'enGB' ? 'en-GB' : 
                         langCode === 'enAU' ? 'en-AU' : 
                         langCode === 'deAT' ? 'de-AT' : langCode;

        // Check if translation is missing
        const currentValue = trans[fieldName];
        if (!currentValue || currentValue.trim() === '') {
          // Check if we have a specific translation for this key
          const specificTranslation = newLanguageTranslations[langCode][trans.key];
          
          if (specificTranslation) {
            // Use specific translation
            updates[fieldName] = specificTranslation;
            updated = true;
          } else if (trans.en) {
            // For variant languages, use base language as fallback
            if (langCode === 'enGB' || langCode === 'enAU') {
              updates[fieldName] = trans.en; // Use English as base
              updated = true;
            } else if (langCode === 'deAT' && trans.de) {
              updates[fieldName] = trans.de; // Use German as base
              updated = true;
            } else {
              // For fr, pt, nl - we'll need to add translations manually or use English
              // For now, skip if no specific translation exists
              console.log(`⚠️  No translation for ${trans.key} in ${langCode}, skipping`);
            }
          }
        }
      });

      // Update if there are changes
      if (updated) {
        await Translation.updateOne(
          { _id: trans._id },
          { $set: updates }
        );
        updatedCount++;
        console.log(`✅ Updated: ${trans.key} - Added ${Object.keys(updates).join(', ')}`);
      }
    }

    // Also check for the specific keys mentioned in console errors
    const specificKeys = [
      'deals.filter.activeOnly',
      'deals.resultsInfo',
      'footer.brandTagline',
      'footer.brandDescription'
    ];

    console.log('\n🔍 Checking specific keys from console errors...\n');
    
    for (const key of specificKeys) {
      let trans = await Translation.findOne({ key });
      
      if (!trans) {
        console.log(`❌ Key "${key}" does not exist in database - creating...`);
        // Create new translation entry
        const newTrans = {
          key,
          category: key.startsWith('deals') ? 'pages' : 'footer',
          en: 'Placeholder', // Will be updated
        };

        // Add English value based on key
        if (key === 'deals.filter.activeOnly') {
          newTrans.en = 'Active Only';
        } else if (key === 'deals.resultsInfo') {
          newTrans.en = 'Showing {from} to {to} of {total} deals';
        } else if (key === 'footer.brandTagline') {
          newTrans.en = 'Your Ultimate Savings Destination';
        } else if (key === 'footer.brandDescription') {
          newTrans.en = 'Discover thousands of verified coupons, exclusive deals, and cashback offers from your favorite stores. Join millions of smart shoppers saving money daily.';
        }

        // Add all new language translations
        Object.keys(newLanguageTranslations).forEach(langCode => {
          const fieldName = langCode === 'enGB' ? 'en-GB' : 
                           langCode === 'enAU' ? 'en-AU' : 
                           langCode === 'deAT' ? 'de-AT' : langCode;
          const translation = newLanguageTranslations[langCode][key];
          if (translation) {
            newTrans[fieldName] = translation;
          }
        });

        trans = await Translation.create(newTrans);
        createdCount++;
        console.log(`✅ Created: ${key}`);
      } else {
        // Update existing translation with missing languages
        const updates = {};
        Object.keys(newLanguageTranslations).forEach(langCode => {
          const fieldName = langCode === 'enGB' ? 'en-GB' : 
                           langCode === 'enAU' ? 'en-AU' : 
                           langCode === 'deAT' ? 'de-AT' : langCode;
          
          if (!trans[fieldName] || trans[fieldName].trim() === '') {
            const translation = newLanguageTranslations[langCode][key];
            if (translation) {
              updates[fieldName] = translation;
            }
          }
        });

        if (Object.keys(updates).length > 0) {
          await Translation.updateOne(
            { _id: trans._id },
            { $set: updates }
          );
          updatedCount++;
          console.log(`✅ Updated: ${key} - Added ${Object.keys(updates).join(', ')}`);
        } else {
          console.log(`✅ ${key} - Already has all translations`);
        }
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log(`✅ Updated: ${updatedCount} translations`);
    console.log(`✅ Created: ${createdCount} translations`);
    console.log('\n✨ Done! Missing translations have been added.');

  } catch (error) {
    console.error('❌ Error adding missing translations:', error);
  }
};

const main = async () => {
  const connected = await connectDB();
  if (!connected) {
    process.exit(1);
  }

  await addMissingTranslations();

  await mongoose.connection.close();
  console.log('\n✅ Database connection closed');
  process.exit(0);
};

main();

