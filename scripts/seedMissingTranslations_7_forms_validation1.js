/**
 * Seed Missing Translations - Part 7: Form Validation Messages (Part 1)
 * 
 * Usage: node server/scripts/seedMissingTranslations_7_forms_validation1.js
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
    key: 'forms.validation.titleRequired',
    category: 'messages',
    en: 'Title is required',
    ga: 'Tá teideal ag teastáil',
    de: 'Titel ist erforderlich',
    es: 'El título es obligatorio',
    it: 'Il titolo è obbligatorio',
    no: 'Tittel er påkrevd',
    fi: 'Otsikko on pakollinen',
    da: 'Titel er påkrævet',
    sv: 'Titel krävs',
    fr: 'Le titre est requis',
    pt: 'O título é obrigatório',
    nl: 'Titel is verplicht',
    'en-GB': 'Title is required',
    'en-AU': 'Title is required',
    'de-AT': 'Titel ist erforderlich',
    description: 'Title required validation',
    context: 'ManualCouponForm.js, ManualDealForm.js',
  },
  {
    key: 'forms.validation.codeRequired',
    category: 'messages',
    en: 'Coupon code is required',
    ga: 'Tá cód cúpón ag teastáil',
    de: 'Gutscheincode ist erforderlich',
    es: 'El código de cupón es obligatorio',
    it: 'Il codice coupon è obbligatorio',
    no: 'Kupongkode er påkrevd',
    fi: 'Kupongkoodi on pakollinen',
    da: 'Kuponkode er påkrævet',
    sv: 'Kupongkod krävs',
    fr: 'Le code coupon est requis',
    pt: 'O código do cupom é obrigatório',
    nl: 'Couponcode is verplicht',
    'en-GB': 'Coupon code is required',
    'en-AU': 'Coupon code is required',
    'de-AT': 'Gutscheincode ist erforderlich',
    description: 'Coupon code required validation',
    context: 'ManualCouponForm.js',
  },
  {
    key: 'forms.validation.storeRequired',
    category: 'messages',
    en: 'Store is required',
    ga: 'Tá stór ag teastáil',
    de: 'Geschäft ist erforderlich',
    es: 'La tienda es obligatoria',
    it: 'Il negozio è obbligatorio',
    no: 'Butikk er påkrevd',
    fi: 'Kauppa on pakollinen',
    da: 'Butik er påkrævet',
    sv: 'Butik krävs',
    fr: 'Le magasin est requis',
    pt: 'A loja é obrigatória',
    nl: 'Winkel is verplicht',
    'en-GB': 'Store is required',
    'en-AU': 'Store is required',
    'de-AT': 'Geschäft ist erforderlich',
    description: 'Store required validation',
    context: 'ManualCouponForm.js, ManualDealForm.js',
  },
  {
    key: 'forms.validation.categoryRequired',
    category: 'messages',
    en: 'Category is required',
    ga: 'Tá catagóir ag teastáil',
    de: 'Kategorie ist erforderlich',
    es: 'La categoría es obligatoria',
    it: 'La categoria è obbligatoria',
    no: 'Kategori er påkrevd',
    fi: 'Kategoria on pakollinen',
    da: 'Kategori er påkrævet',
    sv: 'Kategori krävs',
    fr: 'La catégorie est requise',
    pt: 'A categoria é obrigatória',
    nl: 'Categorie is verplicht',
    'en-GB': 'Category is required',
    'en-AU': 'Category is required',
    'de-AT': 'Kategorie ist erforderlich',
    description: 'Category required validation',
    context: 'ManualCouponForm.js, ManualDealForm.js',
  },
  {
    key: 'forms.validation.discountTypeRequired',
    category: 'messages',
    en: 'Discount type is required',
    ga: 'Tá cineál lascaine ag teastáil',
    de: 'Rabattart ist erforderlich',
    es: 'El tipo de descuento es obligatorio',
    it: 'Il tipo di sconto è obbligatorio',
    no: 'Rabatttype er påkrevd',
    fi: 'Alennustyyppi on pakollinen',
    da: 'Rabattype er påkrævet',
    sv: 'Rabatttyp krävs',
    fr: 'Le type de remise est requis',
    pt: 'O tipo de desconto é obrigatório',
    nl: 'Kortingstype is verplicht',
    'en-GB': 'Discount type is required',
    'en-AU': 'Discount type is required',
    'de-AT': 'Rabattart ist erforderlich',
    description: 'Discount type required validation',
    context: 'ManualCouponForm.js, ManualDealForm.js',
  },
  {
    key: 'forms.validation.discountValueRequired',
    category: 'messages',
    en: 'Discount value must be greater than 0',
    ga: 'Ní mór luach lascaine a bheith níos mó ná 0',
    de: 'Rabattwert muss größer als 0 sein',
    es: 'El valor del descuento debe ser mayor que 0',
    it: 'Il valore dello sconto deve essere maggiore di 0',
    no: 'Rabattverdi må være større enn 0',
    fi: 'Alennusarvon on oltava suurempi kuin 0',
    da: 'Rabatværdi skal være større end 0',
    sv: 'Rabattvärde måste vara större än 0',
    fr: 'La valeur de remise doit être supérieure à 0',
    pt: 'O valor do desconto deve ser maior que 0',
    nl: 'Kortingswaarde moet groter zijn dan 0',
    'en-GB': 'Discount value must be greater than 0',
    'en-AU': 'Discount value must be greater than 0',
    'de-AT': 'Rabattwert muss größer als 0 sein',
    description: 'Discount value validation',
    context: 'ManualCouponForm.js, ManualDealForm.js',
  },
  {
    key: 'forms.validation.startDateRequired',
    category: 'messages',
    en: 'Start date is required',
    ga: 'Tá dáta tosaigh ag teastáil',
    de: 'Startdatum ist erforderlich',
    es: 'La fecha de inicio es obligatoria',
    it: 'La data di inizio è obbligatoria',
    no: 'Startdato er påkrevd',
    fi: 'Aloituspäivä on pakollinen',
    da: 'Startdato er påkrævet',
    sv: 'Startdatum krävs',
    fr: 'La date de début est requise',
    pt: 'A data de início é obrigatória',
    nl: 'Startdatum is verplicht',
    'en-GB': 'Start date is required',
    'en-AU': 'Start date is required',
    'de-AT': 'Startdatum ist erforderlich',
    description: 'Start date required validation',
    context: 'ManualCouponForm.js, ManualDealForm.js',
  },
  {
    key: 'forms.validation.endDateRequired',
    category: 'messages',
    en: 'End date is required',
    ga: 'Tá dáta deiridh ag teastáil',
    de: 'Enddatum ist erforderlich',
    es: 'La fecha de finalización es obligatoria',
    it: 'La data di fine è obbligatoria',
    no: 'Sluttdato er påkrevd',
    fi: 'Päättymispäivä on pakollinen',
    da: 'Slutdato er påkrævet',
    sv: 'Slutdatum krävs',
    fr: 'La date de fin est requise',
    pt: 'A data de término é obrigatória',
    nl: 'Einddatum is verplicht',
    'en-GB': 'End date is required',
    'en-AU': 'End date is required',
    'de-AT': 'Enddatum ist erforderlich',
    description: 'End date required validation',
    context: 'ManualCouponForm.js, ManualDealForm.js',
  },
  {
    key: 'forms.validation.endDateAfterStart',
    category: 'messages',
    en: 'End date must be after start date',
    ga: 'Ní mór dáta deiridh a bheith tar éis dáta tosaigh',
    de: 'Enddatum muss nach dem Startdatum liegen',
    es: 'La fecha de finalización debe ser posterior a la fecha de inicio',
    it: 'La data di fine deve essere successiva alla data di inizio',
    no: 'Sluttdato må være etter startdato',
    fi: 'Päättymispäivän on oltava aloituspäivän jälkeen',
    da: 'Slutdato skal være efter startdato',
    sv: 'Slutdatum måste vara efter startdatum',
    fr: 'La date de fin doit être postérieure à la date de début',
    pt: 'A data de término deve ser posterior à data de início',
    nl: 'Einddatum moet na de startdatum liggen',
    'en-GB': 'End date must be after start date',
    'en-AU': 'End date must be after start date',
    'de-AT': 'Enddatum muss nach dem Startdatum liegen',
    description: 'End date after start date validation',
    context: 'ManualCouponForm.js, ManualDealForm.js',
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

    console.log(`\n=== Part 7 Complete ===`);
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

