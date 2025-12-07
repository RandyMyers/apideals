/**
 * Delete All Translations from Database
 * WARNING: This will delete ALL translation entries
 * 
 * Usage: node server/scripts/deleteAllTranslations.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const Translation = require('../models/translation');

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
      console.log('✅ Database is already empty');
      return;
    }
    
    console.log('\n⚠️  WARNING: This will delete ALL translations!');
    console.log('Deleting all translations...\n');
    
    const result = await Translation.deleteMany({});
    
    console.log(`✅ Deleted ${result.deletedCount} translations`);
    console.log('\n✨ Database is now empty and ready for fresh seeding');
    
  } catch (error) {
    console.error('❌ Error deleting translations:', error);
    throw error;
  }
};

const main = async () => {
  if (await connectDB()) {
    await deleteAllTranslations();
    await mongoose.connection.close();
    console.log('\n✅ Done!');
  }
  process.exit(0);
};

main();







