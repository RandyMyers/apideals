require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Deal = require('../models/deal');
const Store = require('../models/store');

async function run() {
  const uri = process.env.MONGO_URL || process.env.MONGODB_URI || process.env.MONGO_URI;
  await mongoose.connect(uri);

  const trip = await Store.findOne({
    $or: [{ slug: /^trip-com$/i }, { name: /^trip\.com$/i }, { url: /trip\.com/i }],
  }).select('_id name slug');

  if (!trip) {
    console.log('Trip.com store not found');
    return;
  }

  const deal = await Deal.findOne({
    store: trip._id,
    name: /Motto by Hilton Times Square/i,
  })
    .sort({ updatedAt: -1 })
    .select(
      '_id name slug title originalPrice discountedPrice discountValue discountType priceUnit startDate endDate maxUsage isActive isPublished imageUrl imageGallery updatedAt productUrl entityName entityLocation'
    );

  if (!deal) {
    console.log('Deal not found');
    return;
  }

  console.log(
    JSON.stringify(
      {
        store: { id: trip._id, name: trip.name, slug: trip.slug },
        deal,
      },
      null,
      2
    )
  );
}

run()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });

