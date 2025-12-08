/**
 * Test script to check translation key conversion
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Translation = require('../models/translation');

async function testKeys() {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGO_URL;
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB\n');

    // Test keys that are failing
    const testKeys = [
      'detail.voting.helpothers',
      'detail.voting.itworked',
      'detail.voting.confirmedbyusers',
      'detail.voting.didntwork',
      'detail.voting.reportedissues',
      'detail.voting.successrate',
      'detail.voting.youconfirmed',
      'detail.reviews.writereview',
      'detail.reviews.submitbutton',
      'detail.quality.usecaution',
      'detail.share.copylink',
      'detail.actions.printdeal',
      'detail.trendingstores',
      'detail.morefrom',
    ];

    console.log('Checking database keys (lowercase):');
    for (const key of testKeys) {
      const t = await Translation.findOne({ key });
      if (t) {
        console.log(`✓ ${key}: PT=${t.pt ? 'YES (' + t.pt.substring(0, 30) + '...)' : 'NO'}, EN=${t.en ? 'YES' : 'NO'}`);
      } else {
        console.log(`✗ ${key}: NOT FOUND in database`);
      }
    }

    // Test the toCamelCase function using the known mappings
    console.log('\n\nTesting toCamelCase conversion (using known mappings):');
    const knownMappings = {
      'helpothers': 'helpOthers', 'itworked': 'itWorked', 'confirmedbyusers': 'confirmedByUsers',
      'didntwork': 'didntWork', 'reportedissues': 'reportedIssues', 'successrate': 'successRate',
      'youconfirmed': 'youConfirmed', 'writereview': 'writeReview', 'submitbutton': 'submitButton',
      'usecaution': 'useCaution', 'copylink': 'copyLink', 'printdeal': 'printDeal',
      'trendingstores': 'trendingStores', 'morefrom': 'moreFrom'
    };
    
    const toCamelCase = function(str) {
      if (str !== str.toLowerCase()) return str;
      return knownMappings[str] || str;
    };

    const lastParts = testKeys.map(k => k.split('.').pop());
    lastParts.forEach(part => {
      const camel = toCamelCase(part);
      console.log(`${part} -> ${camel} ${part === camel ? '(NO CHANGE)' : ''}`);
    });

    // Test what the client expects
    console.log('\n\nClient expects (camelCase):');
    const clientKeys = [
      'detail.voting.helpOthers',
      'detail.voting.itWorked',
      'detail.voting.confirmedByUsers',
      'detail.voting.didntWork',
      'detail.voting.reportedIssues',
      'detail.voting.successRate',
      'detail.voting.youConfirmed',
      'detail.reviews.writeReview',
      'detail.reviews.submitButton',
      'detail.quality.useCaution',
      'detail.share.copyLink',
      'detail.actions.printDeal',
      'detail.trendingStores',
      'detail.moreFrom',
    ];

    clientKeys.forEach(key => {
      const parts = key.split('.');
      const lastPart = parts.pop();
      const dbKey = parts.join('.') + '.' + lastPart.toLowerCase();
      console.log(`Client: ${key} -> DB should be: ${dbKey}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

testKeys();

