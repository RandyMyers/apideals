/**
 * Seed Missing Translations - Part 8: Form Validation Messages (Part 2)
 * 
 * Usage: node server/scripts/seedMissingTranslations_8_forms_validation2.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Translation = require('../models/translation');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL, { 
      useNewUrlParser: true, 
      useUnifiedTopology: true 
    });
    console.log('Connected to MongoDB');
    return true;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error.message);
    return false;
  }
};

const translations = [
  {
    key: 'forms.validation.dealTypeRequired',
    category: 'messages',
    en: 'Deal type is required',
    ga: 'Tá cineál margaidh ag teastáil',
    de: 'Angebotsart ist erforderlich',
    es: 'El tipo de oferta es obligatorio',
    it: 'Il tipo di offerta è obbligatorio',
    no: 'Tilbudstype er påkrevd',
    fi: 'Tarjouksen tyyppi on pakollinen',
    da: 'Tilbudstype er påkrævet',
    sv: 'Erbjudandetyp krävs',
    fr: 'Le type d\'offre est requis',
    pt: 'O tipo de oferta é obrigatório',
    nl: 'Type aanbieding is verplicht',
    'en-GB': 'Deal type is required',
    'en-AU': 'Deal type is required',
    'de-AT': 'Angebotsart ist erforderlich',
    description: 'Deal type required validation',
    context: 'ManualDealForm.js',
  },
  {
    key: 'forms.validation.titleOrNameRequired',
    category: 'messages',
    en: 'Title or name is required',
    ga: 'Tá teideal nó ainm ag teastáil',
    de: 'Titel oder Name ist erforderlich',
    es: 'El título o nombre es obligatorio',
    it: 'Il titolo o il nome è obbligatorio',
    no: 'Tittel eller navn er påkrevd',
    fi: 'Otsikko tai nimi on pakollinen',
    da: 'Titel eller navn er påkrævet',
    sv: 'Titel eller namn krävs',
    fr: 'Le titre ou le nom est requis',
    pt: 'O título ou nome é obrigatório',
    nl: 'Titel of naam is verplicht',
    'en-GB': 'Title or name is required',
    'en-AU': 'Title or name is required',
    'de-AT': 'Titel oder Name ist erforderlich',
    description: 'Title or name required validation',
    context: 'ManualDealForm.js',
  },
];

const seed = async () => {
  try {
    const connected = await connectDB();
    if (!connected) {
      process.exit(1);
    }

    let created = 0;
    let updated = 0;

    for (const translation of translations) {
      const existing = await Translation.findOne({ key: translation.key });
      
      if (existing) {
        await Translation.findOneAndUpdate(
          { key: translation.key },
          { $set: translation },
          { runValidators: true }
        );
        updated++;
        console.log(`✓ Updated: ${translation.key}`);
      } else {
        await Translation.create(translation);
        created++;
        console.log(`✓ Created: ${translation.key}`);
      }
    }

    console.log(`\n=== Part 8 Complete ===`);
    console.log(`Created: ${created}, Updated: ${updated}, Total: ${translations.length}`);

    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

seed();

