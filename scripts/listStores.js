require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Store = require('../models/store');

(async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URL || process.env.MONGO_URI;
    if (!mongoUri) {
      console.log('❌ No MongoDB URI found');
      process.exit(1);
    }
    await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('✅ Connected to MongoDB\n');
    
    const stores = await Store.find({}).select('_id name url').limit(10);
    console.log('Available stores:');
    if (stores.length === 0) {
      console.log('  No stores found');
    } else {
      stores.forEach(s => console.log(`  ${s._id} - ${s.name} (${s.url || 'No URL'})`));
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();

