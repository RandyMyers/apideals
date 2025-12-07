# Translation Fix Plan

## Identified Issues

From analysis of `seedMissingTranslations_11_woocommerce.js`, found patterns of English placeholders:

### Pattern 1: Mix of English + Translated Word
```
fr: 'Select a WooCommerce Magasin'  // Should be: 'Sélectionner un magasin WooCommerce'
pt: 'Add Loja'                      // Should be: 'Adicionar Loja'
nl: 'Add Winkel'                    // Should be: 'Winkel toevoegen'
```

### Pattern 2: Full English Sentences
```
fr: 'Choose a store to sync coupons or deals from'
pt: 'Choose a store to sync coupons or deals from'
nl: 'Choose a store to sync coupons or deals from'
```

## Translation Dictionary

Based on context and proper translations:

### French (fr)
- Select/Choose → Sélectionner/Choisir
- Add → Ajouter
- Store → Magasin
- Coupon → Coupon
- Deal → Offre
- Sync → Synchroniser
- From → De/Depuis

### Portuguese (pt)
- Select/Choose → Selecionar/Escolher
- Add → Adicionar
- Store → Loja
- Coupon → Cupom
- Deal → Oferta
- Sync → Sincronizar
- From → De/A partir de

### Dutch (nl)
- Select/Choose → Selecteren/Kiezen
- Add → Toevoegen
- Store → Winkel
- Coupon → Kortingscode
- Deal → Aanbieding
- Sync → Synchroniseren
- From → Van/Vanaf

## Files to Fix

All 22 supplementary files need to be checked and fixed.

## Approach

1. Read each file
2. Identify English text in fr, pt, nl fields
3. Apply proper translations
4. Save corrected file
5. Verify changes




