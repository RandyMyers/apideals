/**
 * Seed Expedia store SEO content + refresh deal dates for public visibility.
 *
 * Usage:
 *   node scripts/seedExpediaStoreSeoContent.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Store = require('../models/store');
const Deal = require('../models/deal');
const UrlRedirect = require('../models/urlRedirect');
const Site = require('../models/site');

/** Target SERP phrase — lowercase exact match everywhere (title, H1, intro, all locales). */
const EXACT_KEYWORD = 'expedia coupon codes';

function daysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

/** German locale body — keeps exact phrase "expedia coupon codes" for SEO */
function buildGermanExpediaLocale(regionSuffix = '') {
  const keyword = EXACT_KEYWORD;
  const titleSuffix = regionSuffix ? ` (${regionSuffix})` : '';
  return {
    seo: {
      primaryKeyword: 'expedia coupon codes',
      title: `${keyword} und Deals: verifizierte Angebote & Promo-Codes${titleSuffix}`,
      metaDescription:
        `Finde ${keyword} für Hotels und Pakete. Wöchentliche Updates mit geprüften Deals, FAQs und Checkout-Hilfe (DealCouponz).`,
      h1: `${keyword} und Deals`,
      intro:
        `Du suchst ${keyword}? Wir aktualisieren diese Seite regelmäßig und entfernen abgelaufene Angebote. ` +
        `Wenn ein echter Code verfügbar ist, kannst du ihn kopieren – sonst nutze unsere Get-Deal-Links für geprüfte Expedia-Sparangebote.`,
      keywords: ['expedia coupon codes', 'expedia promo codes', 'expedia deals', 'hotel deals'],
    },
    logoAlt: `Expedia Logo — ${keyword} (DealCouponz)`,
    description:
      `DealCouponz listet verifizierte ${keyword}, Hotel-Deals und Reiseangebote. Wöchentlich aktualisiert.`,
    savingTips: [
      { tip: `Vergleiche ${keyword} für Hotels – Hotelrabatte sind häufiger als Flug-Prozentcodes.`, order: 1, isActive: true },
      { tip: `Buche Flug + Hotel als Paket, wenn kein reiner Flug-${keyword} verfügbar ist.`, order: 2, isActive: true },
      { tip: `Prüfe die Expedia-App: manche Angebote gibt es nur mobil.`, order: 3, isActive: true },
      { tip: `Expedia erlaubt meist nur einen Promo-Code pro Buchung – kombiniere mit Cashback (z. B. Rakuten), nicht mehrere Codes.`, order: 4, isActive: true },
      { tip: `Lies Ablaufdaten bei jedem ${keyword}; wir aktualisieren wöchentlich und blenden abgelaufene Angebote aus.`, order: 5, isActive: true },
      { tip: `Wochentags-Hotelaufenthalte passen oft gut zu ${keyword} für extra Nachtrabatte.`, order: 6, isActive: true },
    ],
    faqs: [
      {
        question: `Sind ${keyword} seriös?`,
        answer:
          `Ja, wenn sie von Expedia oder autorisierten Partnern wie DealCouponz stammen. Wir listen geprüfte Angebote und entfernen abgelaufene Codes.`,
        group: 'faq',
        order: 1,
        isActive: true,
      },
      {
        question: `Gelten ${keyword} für alle Hotels?`,
        answer:
          `Nein. Einige Ketten und Member-Only-Tarife sind ausgeschlossen. Lies die Bedingungen des Angebots vor der Zahlung.`,
        group: 'faq',
        order: 2,
        isActive: true,
      },
      {
        question: `Funktionieren ${keyword} für Flüge?`,
        answer:
          `Manchmal, aber selten als Prozent-Rabatt auf Flüge. Die meisten ${keyword} gelten für Hotels und Pakete. Paketbuchungen sind oft die beste Alternative.`,
        group: 'paa',
        order: 1,
        isActive: true,
      },
      {
        question: `Kann ich mehr als einen Expedia-Promo-Code pro Buchung nutzen?`,
        answer:
          `In der Regel nein – ein Promo-Code pro Buchung. Du kannst oft Expedia Rewards Punkte oder Cashback-Programme zusätzlich nutzen, wenn die Bedingungen es erlauben.`,
        group: 'paa',
        order: 2,
        isActive: true,
      },
      {
        question: `Warum funktioniert mein ${keyword} nicht?`,
        answer:
          `Häufige Gründe: Mindestbestellwert nicht erreicht, falsches Produkt (Hotel vs. Flug), Code abgelaufen, nur-App-Angebot oder bereits ein anderer Rabatt aktiv. Teste Inkognito-Modus oder die Expedia-App.`,
        group: 'troubleshooting',
        order: 1,
        isActive: true,
      },
      {
        question: `Mein Code funktioniert in der App, aber nicht am Desktop – warum?`,
        answer:
          `Einige ${keyword} sind nur in der Expedia-App gültig. Öffne das Angebot über unseren Get-Deal-Link auf dem Handy oder installiere die App und versuche es erneut.`,
        group: 'troubleshooting',
        order: 2,
        isActive: true,
      },
    ],
    editorial: {
      howToSteps: [
        `Klicke auf einen Gutschein oder Get Deal auf dieser Seite, um Expedia zu öffnen.`,
        `Suche Hotel, Flug, Paket oder Mietwagen und wähle deine Option.`,
        `Gehe zur Kasse, bis du „Promo code“, „Coupon“ oder „Gutschein“ siehst.`,
        `Füge den ${keyword} ein (Strg+V / Cmd+V) und klicke auf Anwenden.`,
        `Prüfe, ob der Rabatt in der Preisübersicht erscheint, bevor du bezahlst.`,
        `Schließe die Buchung erst ab, wenn die Ersparnis sichtbar ist.`,
      ],
      comparisonRows: [
        { type: 'Hotel', worksBestFor: 'Aufenthalte ab 2 Nächten, Städtereisen', typicalDiscount: '% oder Nachtrabatt', notes: 'Häufigste Angebote auf DealCouponz.' },
        { type: 'Flug', worksBestFor: 'Inlands- oder international', typicalDiscount: '$ Rabatt (begrenzt)', notes: 'Viele Codes schließen Flüge aus; Pakete können gelten.' },
        { type: 'Paket', worksBestFor: 'Flug + Hotel', typicalDiscount: '$ ab Mindestbetrag', notes: 'Gute Option ohne reinen Flug-Code.' },
        { type: 'Mietwagen', worksBestFor: 'Avis, Budget & Partner', typicalDiscount: '% auf ausgewählte Angebote', notes: 'Partner und Sperrtermine prüfen.' },
      ],
      stackingNote:
        `Expedia erlaubt normalerweise nicht mehrere Promo-Codes pro Buchung. Du kannst einen ${keyword} mit Expedia Rewards und Cashback (z. B. Rakuten) kombinieren, wenn die Bedingungen es erlauben.`,
      exclusionsNote:
        `Prozent-Codes nur für Flüge sind selten. Resortgebühren, Steuern und Member-Only-Unterkünfte können ausgeschlossen sein. Lies die Angebotsbedingungen vor dem Checkout.`,
      externalLinks: [
        { label: 'Expedia Kundenservice', url: 'https://www.expedia.com/service/' },
        { label: 'Expedia Newsletter (offiziell)', url: 'https://www.expedia.com/newsletter' },
      ],
      internalLinks: [
        { label: 'Reise-Kategorie', path: '/categories/travel', anchorText: 'Reise-Deals und Gutscheine' },
        { label: 'Alle Geschäfte', path: '/stores/all', anchorText: 'Alle Gutscheincodes durchsuchen' },
      ],
      authorByline: 'Geprüft vom DealCouponz Reise-Deals-Team',
    },
  };
}

function buildSeoPayload(now) {
  const keyword = EXACT_KEYWORD;

  const baseEnglishSeo = {
    primaryKeyword: EXACT_KEYWORD,
    title: `${EXACT_KEYWORD} (2026): verified deals & promo codes`,
    metaDescription:
      `Find working ${EXACT_KEYWORD} for hotels, flights, and packages. Updated weekly with tested deals, FAQs, and step-by-step checkout help on DealCouponz.`,
    h1: `${EXACT_KEYWORD} and deals`,
    intro:
      `Looking for active ${EXACT_KEYWORD} that actually lower your trip price? This page lists verified ${EXACT_KEYWORD} and hotel deals our team checks regularly. ` +
      `When a true promo code is available, copy it below; otherwise use our Get Deal links for tested hotel and package savings on Expedia.`,
    keywords: [
      EXACT_KEYWORD,
      'expedia promo codes',
      'expedia discount codes',
      'expedia hotel deals',
      'expedia coupons 2026',
    ],
  };

  const baseShared = {
    savingTips: [
      {
        tip: 'Compare Expedia coupon codes for hotels before booking—hotel discounts are more common than flight percentage codes.',
        order: 1,
        isActive: true,
      },
      {
        tip: 'Book flight + hotel as a package when a flight-only Expedia coupon code is not available.',
        order: 2,
        isActive: true,
      },
      {
        tip: 'Check the Expedia app for mobile-only offers not always shown on desktop.',
        order: 3,
        isActive: true,
      },
      {
        tip: 'Expedia typically allows one promo code per booking—combine with cashback (e.g. Rakuten), not multiple codes.',
        order: 4,
        isActive: true,
      },
      {
        tip: 'Read expiry dates on every Expedia coupon code; we refresh this page weekly and hide expired offers.',
        order: 5,
        isActive: true,
      },
      {
        tip: 'Mid-week hotel stays often pair well with Expedia coupon codes for extra nightly savings.',
        order: 6,
        isActive: true,
      },
    ],
    faqs: [
      {
        question: 'Are Expedia coupon codes legit?',
        answer:
          'Yes, when they come from Expedia or authorized partners like DealCouponz. Avoid random forum codes that look too good to be true—we only list verified offers and community submissions we review.',
        group: 'faq',
        order: 1,
        isActive: true,
      },
      {
        question: 'Do Expedia coupon codes work on all hotels?',
        answer:
          'No. Some chains and member-only rates are excluded. Always check the offer terms on the listing before you pay.',
        group: 'faq',
        order: 2,
        isActive: true,
      },
      {
        question: 'Do Expedia coupon codes work on flights?',
        answer:
          'Sometimes, but rarely for percentage-off flight codes. Most Expedia coupon codes target hotels and packages. Package bookings are often the best way to save when flight-only codes are unavailable.',
        group: 'paa',
        order: 1,
        isActive: true,
      },
      {
        question: 'Can I use more than one Expedia promo code per booking?',
        answer:
          'Usually no—Expedia allows one promo code per booking. You can still combine a code with Expedia Rewards points or third-party cashback where eligible.',
        group: 'paa',
        order: 2,
        isActive: true,
      },
      {
        question: 'Why isn’t my Expedia coupon working?',
        answer:
          'Common causes: minimum spend not met, wrong product type (hotel vs flight), code expired, app-only restriction, or another promotion already applied. Try incognito mode or the Expedia app, and confirm dates match the offer.',
        group: 'troubleshooting',
        order: 1,
        isActive: true,
      },
      {
        question: 'My code works in the app but not on desktop—why?',
        answer:
          'Some Expedia coupon codes are app-exclusive. Open the same offer from our Get Deal link on your phone or install the Expedia app and retry checkout there.',
        group: 'troubleshooting',
        order: 2,
        isActive: true,
      },
    ],
    editorial: {
      howToSteps: [
        'Click a coupon or Get Deal button on this page to open Expedia.',
        'Search for your hotel, flight, package, or car rental and select your option.',
        'Proceed to checkout until you see “Promo code”, “Coupon”, or “Add coupon”.',
        'Paste the Expedia coupon code (Ctrl+V / Cmd+V) and click Apply.',
        'Confirm the discount appears in the price breakdown before entering payment details.',
        'Complete booking only after the savings line item is visible.',
      ],
      comparisonRows: [
        {
          type: 'Hotel',
          worksBestFor: 'Stays of 2+ nights, city breaks',
          typicalDiscount: '% off or nightly deal',
          notes: 'Most common offers on DealCouponz; check entity tags for location.',
        },
        {
          type: 'Flight',
          worksBestFor: 'Domestic or international airfare',
          typicalDiscount: '$ off (limited)',
          notes: 'Many Expedia coupon codes exclude flights; packages may qualify instead.',
        },
        {
          type: 'Package',
          worksBestFor: 'Flight + hotel bundles',
          typicalDiscount: '$ off minimum spend',
          notes: 'Strong option when no flight-only code is listed.',
        },
        {
          type: 'Car rental',
          worksBestFor: 'Avis, Budget, and partners',
          typicalDiscount: '% off select rentals',
          notes: 'Verify partner and blackout dates in offer terms.',
        },
      ],
      stackingNote:
        'Expedia does not allow stacking multiple promo codes on one booking. You can combine one Expedia coupon code with Expedia Rewards points and eligible cashback programs (such as Rakuten) where terms allow.',
      exclusionsNote:
        'Flight-only percentage codes are uncommon. Resort fees, taxes, and member-only properties may be excluded. Read each offer’s terms before checkout.',
      externalLinks: [
        {
          label: 'Expedia Customer Service',
          url: 'https://www.expedia.com/service/',
        },
        {
          label: 'Sign up for Expedia emails (official)',
          url: 'https://www.expedia.com/newsletter',
        },
      ],
      internalLinks: [
        {
          label: 'Travel category deals',
          path: '/categories/travel',
          anchorText: 'Travel deals and coupons',
        },
        {
          label: 'All stores',
          path: '/stores/all',
          anchorText: 'Browse all store coupon codes',
        },
      ],
      authorByline: 'Reviewed by the DealCouponz travel deals team',
    },
  };

  return {
    seoSlug: 'expedia-coupon-codes',
    logoAlt: `${EXACT_KEYWORD} and travel deals on DealCouponz`,
    contentUpdatedAt: now,
    lastVerifiedAt: now,
    description:
      `DealCouponz lists verified ${EXACT_KEYWORD}, hotel deals, and travel savings updated weekly. ` +
      `Browse active ${EXACT_KEYWORD} for hotels and packages, plus step-by-step help when a promo code does not apply at checkout. ` +
      `We test offers regularly and remove expired deals so you see working savings—not outdated lists.`,
    seo: baseEnglishSeo,
    savingTips: baseShared.savingTips,
    faqs: baseShared.faqs,
    editorial: baseShared.editorial,

    // Regional content variants (manual). Keep keyword phrase intact for ranking in MX/JP/KR.
    languageTranslations: (() => {
      const translations = {
      // Default English (explicit — same as root fields)
      en: {
        seo: baseEnglishSeo,
        logoAlt: `${EXACT_KEYWORD} and travel deals on DealCouponz`,
        description:
          `DealCouponz lists verified ${EXACT_KEYWORD}, hotel deals, and travel savings updated weekly. ` +
          `Browse active ${EXACT_KEYWORD} for hotels and packages, plus step-by-step help when a promo code does not apply at checkout.`,
      },

      // English variants
      'en-GB': {
        seo: {
          primaryKeyword: 'expedia coupon codes',
          title: `${keyword} and Deals: Verified Promo Codes (UK)`,
          metaDescription:
            `Find ${keyword} for hotels and packages. Updated weekly with tested offers, FAQs, and checkout help (DealCouponz).`,
          h1: `${keyword} and Deals`,
          intro:
            `Looking for ${keyword}? This page lists verified deals we refresh weekly. ` +
            `Copy a real code when available, or use our Get Deal links for tested Expedia savings.`,
          keywords: ['expedia coupon codes', 'expedia promo codes', 'expedia deals', 'travel deals'],
        },
        logoAlt: `Expedia logo — ${keyword} (DealCouponz)`,
        description:
          `DealCouponz lists verified ${keyword}, hotel deals, and travel savings. Updated weekly to remove expired offers.`,
      },
      'en-AU': {
        seo: {
          primaryKeyword: 'expedia coupon codes',
          title: `${keyword} and Deals: Verified Deals & Promo Codes (AU)`,
          metaDescription:
            `Find ${keyword} for hotels and packages. Updated weekly with verified offers and step-by-step checkout help (DealCouponz).`,
          h1: `${keyword} and Deals`,
          intro:
            `Need ${keyword} for your next trip? We keep this page updated and remove expired offers. ` +
            `Use a code when available, or click Get Deal for tested savings on Expedia.`,
          keywords: ['expedia coupon codes', 'expedia promo codes', 'expedia hotel deals'],
        },
        logoAlt: `Expedia logo — ${keyword} (DealCouponz)`,
        description:
          `Verified ${keyword} and travel deals updated weekly on DealCouponz.`,
      },

      // Irish (Gaeilge) — keep keyword phrase intact in English for targeting
      ga: {
        seo: {
          primaryKeyword: 'expedia coupon codes',
          title: `${keyword} and Deals: lascainí fíoraithe & treoir céim ar chéim`,
          metaDescription:
            `Faigh ${keyword} do óstáin agus pacáistí. Nuashonraithe gach seachtain le tairiscintí fíoraithe agus cabhair ag an tseiceáil amach (DealCouponz).`,
          h1: `${keyword} and Deals`,
          intro:
            `Ag lorg ${keyword}? Coinnímid an leathanach seo cothrom le dáta agus bainimid tairiscintí imithe in éag. ` +
            `Cóipeáil cód nuair atá sé ar fáil, nó úsáid Get Deal chun coigilteas tástáilte ar Expedia a fheiceáil.`,
          keywords: ['expedia coupon codes', 'expedia promo codes', 'travel deals'],
        },
        logoAlt: `Lógó Expedia — ${keyword} (DealCouponz)`,
        description:
          `Liostaíonn DealCouponz ${keyword} fíoraithe agus tairiscintí taistil. Nuashonraithe gach seachtain.`,
      },

      // German / Austrian German — full FAQs, editorial, tips (not English fallback)
      de: buildGermanExpediaLocale(),
      'de-AT': buildGermanExpediaLocale('AT'),

      // Spanish (Spain) — MX has separate richer copy below
      es: {
        seo: {
          primaryKeyword: 'expedia coupon codes',
          title: `${keyword} and Deals: ofertas verificadas y ayuda paso a paso`,
          metaDescription:
            `Encuentra ${keyword} para hoteles y paquetes. Actualizamos semanalmente con ofertas verificadas, FAQs y pasos para aplicar códigos en Expedia (DealCouponz).`,
          h1: `${keyword} and Deals`,
          intro:
            `¿Buscas ${keyword}? Mantenemos esta página actualizada y retiramos ofertas caducadas. ` +
            `Copia un código real cuando esté disponible o usa Get Deal para ver ahorros verificados en Expedia.`,
          keywords: ['expedia coupon codes', 'expedia promo codes', 'ofertas expedia'],
        },
        logoAlt: `Logotipo de Expedia — ${keyword} (DealCouponz)`,
        description:
          `DealCouponz publica ${keyword} verificados y ofertas de viaje. Actualizamos semanalmente.`,
      },

      // Italian
      it: {
        seo: {
          primaryKeyword: 'expedia coupon codes',
          title: `${keyword} and Deals: offerte verificate e guida passo-passo`,
          metaDescription:
            `Trova ${keyword} per hotel e pacchetti. Aggiornamenti settimanali con offerte verificate, FAQ e istruzioni per il checkout (DealCouponz).`,
          h1: `${keyword} and Deals`,
          intro:
            `Cerchi ${keyword}? Aggiorniamo questa pagina regolarmente e rimuoviamo le offerte scadute. ` +
            `Copia un codice quando disponibile oppure usa Get Deal per risparmi verificati su Expedia.`,
          keywords: ['expedia coupon codes', 'expedia promo codes', 'offerte expedia'],
        },
        logoAlt: `Logo Expedia — ${keyword} (DealCouponz)`,
        description:
          `DealCouponz pubblica ${keyword} verificati e offerte di viaggio. Aggiornato ogni settimana.`,
      },

      // French
      fr: {
        seo: {
          primaryKeyword: 'expedia coupon codes',
          title: `${keyword} et offres : guide vérifié étape par étape`,
          metaDescription:
            `Trouvez ${keyword} pour hôtels et forfaits. Mises à jour hebdomadaires avec offres testées, FAQ et aide au paiement (DealCouponz).`,
          h1: `${keyword} and Deals`,
          intro:
            `Vous cherchez ${keyword} ? Nous mettons cette page à jour et supprimons les offres expirées. ` +
            `Copiez un code lorsqu’il est disponible, sinon utilisez nos liens Get Deal pour des économies vérifiées sur Expedia.`,
          keywords: ['expedia coupon codes', 'expedia promo codes', 'offres expedia'],
        },
        logoAlt: `Logo Expedia — ${keyword} (DealCouponz)`,
        description:
          `DealCouponz propose des ${keyword} vérifiés et des offres de voyage, mis à jour chaque semaine.`,
      },

      // Portuguese
      pt: {
        seo: {
          primaryKeyword: 'expedia coupon codes',
          title: `${keyword} and Deals: ofertas verificadas e guia passo a passo`,
          metaDescription:
            `Encontre ${keyword} para hotéis e pacotes. Atualização semanal com ofertas testadas, FAQ e ajuda no checkout (DealCouponz).`,
          h1: `${keyword} and Deals`,
          intro:
            `À procura de ${keyword}? Mantemos esta página atualizada e removemos ofertas expiradas. ` +
            `Copie um código quando disponível ou use Get Deal para poupanças verificadas na Expedia.`,
          keywords: ['expedia coupon codes', 'expedia promo codes', 'ofertas expedia'],
        },
        logoAlt: `Logótipo Expedia — ${keyword} (DealCouponz)`,
        description:
          `DealCouponz lista ${keyword} verificados e ofertas de viagem. Atualizado semanalmente.`,
      },

      // Dutch
      nl: {
        seo: {
          primaryKeyword: 'expedia coupon codes',
          title: `${keyword} and Deals: geverifieerde deals en stap-voor-stap hulp`,
          metaDescription:
            `Vind ${keyword} voor hotels en pakketten. Wekelijks bijgewerkt met geteste aanbiedingen, FAQ en checkout-hulp (DealCouponz).`,
          h1: `${keyword} and Deals`,
          intro:
            `Op zoek naar ${keyword}? We werken deze pagina regelmatig bij en verwijderen verlopen aanbiedingen. ` +
            `Kopieer een echte code wanneer beschikbaar of gebruik Get Deal voor geteste Expedia-besparingen.`,
          keywords: ['expedia coupon codes', 'expedia promo codes', 'expedia deals'],
        },
        logoAlt: `Expedia-logo — ${keyword} (DealCouponz)`,
        description:
          `DealCouponz toont geverifieerde ${keyword} en reisdeals. Wekelijks bijgewerkt.`,
      },

      // Nordics
      no: {
        seo: {
          primaryKeyword: 'expedia coupon codes',
          title: `${keyword} and Deals: verifiserte tilbud og trinnvis guide`,
          metaDescription:
            `Finn ${keyword} for hotell og pakker. Ukentlige oppdateringer med testede tilbud, FAQ og utsjekk-hjelp (DealCouponz).`,
          h1: `${keyword} and Deals`,
          intro:
            `Ser du etter ${keyword}? Vi oppdaterer siden jevnlig og fjerner utløpte tilbud. ` +
            `Kopier en kode når den finnes, eller bruk Get Deal for verifiserte Expedia-besparelser.`,
          keywords: ['expedia coupon codes', 'expedia promo codes'],
        },
        logoAlt: `Expedia-logo — ${keyword} (DealCouponz)`,
        description:
          `Verifiserte ${keyword} og reisetilbud, oppdatert ukentlig på DealCouponz.`,
      },
      fi: {
        seo: {
          primaryKeyword: 'expedia coupon codes',
          title: `${keyword} and Deals: varmennetut tarjoukset ja vaiheittainen opas`,
          metaDescription:
            `Löydä ${keyword} hotelleihin ja paketteihin. Päivitämme viikoittain varmennetuilla tarjouksilla, FAQ:lla ja ohjeilla (DealCouponz).`,
          h1: `${keyword} and Deals`,
          intro:
            `Etsitkö ${keyword}? Päivitämme sivua säännöllisesti ja poistamme vanhentuneet tarjoukset. ` +
            `Kopioi koodi, kun se on saatavilla, tai käytä Get Deal -linkkejä varmennettuihin Expedia-säästöihin.`,
          keywords: ['expedia coupon codes', 'expedia promo codes'],
        },
        logoAlt: `Expedia-logo — ${keyword} (DealCouponz)`,
        description:
          `DealCouponz listaa varmennetut ${keyword} ja matkatarjoukset. Päivitetään viikoittain.`,
      },
      da: {
        seo: {
          primaryKeyword: 'expedia coupon codes',
          title: `${keyword} and Deals: verificerede tilbud og trin-for-trin hjælp`,
          metaDescription:
            `Find ${keyword} til hoteller og pakker. Ugentlige opdateringer med testede tilbud, FAQ og checkout-hjælp (DealCouponz).`,
          h1: `${keyword} and Deals`,
          intro:
            `Leder du efter ${keyword}? Vi opdaterer siden løbende og fjerner udløbne tilbud. ` +
            `Kopiér en kode når den findes, eller brug Get Deal for verificerede Expedia-besparelser.`,
          keywords: ['expedia coupon codes', 'expedia promo codes'],
        },
        logoAlt: `Expedia-logo — ${keyword} (DealCouponz)`,
        description:
          `Verificerede ${keyword} og rejsetilbud, opdateret ugentligt på DealCouponz.`,
      },
      sv: {
        seo: {
          primaryKeyword: 'expedia coupon codes',
          title: `${keyword} and Deals: verifierade erbjudanden och steg-för-steg hjälp`,
          metaDescription:
            `Hitta ${keyword} för hotell och paket. Veckovisa uppdateringar med testade erbjudanden, FAQ och hjälp i kassan (DealCouponz).`,
          h1: `${keyword} and Deals`,
          intro:
            `Letar du efter ${keyword}? Vi uppdaterar sidan regelbundet och tar bort utgångna erbjudanden. ` +
            `Kopiera en kod när den finns, eller använd Get Deal för verifierade Expedia-besparingar.`,
          keywords: ['expedia coupon codes', 'expedia promo codes'],
        },
        logoAlt: `Expedia-logotyp — ${keyword} (DealCouponz)`,
        description:
          `Verifierade ${keyword} och reseerbjudanden, uppdateras varje vecka på DealCouponz.`,
      },

      'es-MX': {
        seo: {
          primaryKeyword: 'expedia coupon codes',
          title: `${keyword} and Deals: ofertas verificadas y ayuda paso a paso`,
          metaDescription:
            `Encuentra ${keyword} para hoteles y paquetes. Actualizamos semanalmente con ofertas verificadas, preguntas frecuentes y pasos para aplicar el código en Expedia (DealCouponz).`,
          h1: `${keyword} and Deals`,
          intro:
            `¿Buscas ${keyword} que realmente bajen el precio de tu viaje? Aquí encontrarás ofertas verificadas y descuentos de hotel que revisamos con frecuencia. ` +
            `Si hay un código real disponible, podrás copiarlo; si no, usa nuestros enlaces de “Get Deal” para ver ahorros probados en Expedia.`,
          keywords: [
            'expedia coupon codes',
            'expedia promo codes',
            'códigos de descuento expedia',
            'ofertas expedia hoteles',
          ],
        },
        logoAlt: `Logotipo de Expedia — ${keyword} en DealCouponz`,
        description:
          `DealCouponz publica ${keyword} verificados, ofertas de hotel y ahorros de viaje. ` +
          `Actualizamos semanalmente y retiramos ofertas vencidas para que veas descuentos vigentes en Expedia.`,
        savingTips: [
          { tip: `Compara ${keyword} para hoteles: suelen ser más comunes que los códigos para vuelos.`, order: 1, isActive: true },
          { tip: `Si no hay código para vuelos, prueba reservar paquete (vuelo + hotel).`, order: 2, isActive: true },
          { tip: `Revisa la app de Expedia: algunas ofertas son exclusivas para móvil.`, order: 3, isActive: true },
          { tip: `Normalmente solo se permite 1 código por reserva: combina con cashback cuando aplique.`, order: 4, isActive: true },
        ],
        faqs: [
          {
            question: `¿Son legítimos los ${keyword}?`,
            answer:
              `Sí, cuando provienen de Expedia o socios autorizados. En DealCouponz mostramos ofertas verificadas y eliminamos promociones vencidas.`,
            group: 'faq',
            order: 1,
            isActive: true,
          },
          {
            question: `¿Por qué no funciona mi ${keyword}?`,
            answer:
              `Causas comunes: mínimo de compra, fechas fuera del periodo, restricciones (solo app), o el tipo de producto (hotel vs vuelo). Verifica términos y vuelve a intentar en modo incógnito o en la app.`,
            group: 'troubleshooting',
            order: 1,
            isActive: true,
          },
        ],
        editorial: {
          howToSteps: [
            `Abre Expedia desde un enlace de esta página.`,
            `Elige tu hotel/paquete y avanza al checkout.`,
            `Busca “Promo code” o “Coupon”.`,
            `Pega el ${keyword} y pulsa Apply.`,
            `Confirma que el descuento aparece antes de pagar.`,
          ],
          comparisonRows: [
            { type: 'Hotel', worksBestFor: 'Estancias de 2+ noches', typicalDiscount: '% o tarifa con descuento', notes: 'Lo más común en DealCouponz.' },
            { type: 'Vuelo', worksBestFor: 'Vuelos nacionales/internacionales', typicalDiscount: '$ (limitado)', notes: 'Muchos códigos excluyen vuelos; paquetes pueden aplicar.' },
            { type: 'Paquete', worksBestFor: 'Vuelo + hotel', typicalDiscount: '$ con mínimo', notes: 'Buena opción si no hay código de vuelo.' },
            { type: 'Auto', worksBestFor: 'Renta de autos', typicalDiscount: '% selecto', notes: 'Verifica socios y fechas.' },
          ],
          stackingNote:
            `Normalmente Expedia no permite apilar múltiples códigos. Usa 1 ${keyword} por reserva y combina con puntos o cashback si aplica.`,
          exclusionsNote:
            `Impuestos, tasas y algunas propiedades pueden quedar excluidas. Revisa los términos antes de pagar.`,
          externalLinks: [
            { label: 'Soporte oficial de Expedia', url: 'https://www.expedia.com/service/' },
          ],
          internalLinks: [
            { label: 'Categoría de Viajes', path: '/categories/travel', anchorText: 'Ofertas y cupones de viaje' },
          ],
          authorByline: 'Revisado por el equipo de ofertas de viaje de DealCouponz',
        },
      },
      ja: {
        seo: {
          primaryKeyword: 'expedia coupon codes',
          title: `${keyword} とお得情報：検証済みの旅行割引・プロモコード`,
          metaDescription:
            `${keyword} をホテル・パッケージ向けに掲載。毎週更新し、検証済みオファー、FAQ、適用手順をまとめています（DealCouponz）。`,
          h1: `${keyword} とお得情報`,
          intro:
            `${keyword} を探していますか？このページでは、定期的に確認している検証済みのオファーを掲載しています。` +
            `実際のプロモコードがある場合はコピーして利用でき、コードがない場合でも “Get Deal” リンクで割引条件を確認できます。`,
          keywords: ['expedia coupon codes', 'expedia promo codes', 'expedia deals', 'expedia hotel deals'],
        },
        logoAlt: `Expedia ロゴ — ${keyword}（DealCouponz）`,
        description:
          `${keyword} と検証済みの旅行割引を掲載しています。毎週更新し、期限切れのオファーは整理して最新情報を保ちます。`,
        savingTips: [
          { tip: `ホテル向けの ${keyword} は、フライト向けより見つかりやすい傾向があります。`, order: 1, isActive: true },
          { tip: `フライト単体にコードがない場合は、パッケージ（航空券＋ホテル）を確認しましょう。`, order: 2, isActive: true },
          { tip: `Expedia アプリ限定のオファーがある場合があります。`, order: 3, isActive: true },
        ],
        faqs: [
          {
            question: `${keyword} は本当に使えますか？`,
            answer:
              `はい（正規の提供元の場合）。DealCouponz では検証済みのオファーを掲載し、期限切れは非表示にします。`,
            group: 'faq',
            order: 1,
            isActive: true,
          },
          {
            question: `${keyword} が適用されない理由は？`,
            answer:
              `最小金額、対象外（フライトなど）、期限切れ、アプリ限定などが原因です。条件を確認し、必要ならアプリやシークレットモードで再試行してください。`,
            group: 'troubleshooting',
            order: 1,
            isActive: true,
          },
        ],
        editorial: {
          howToSteps: [
            `このページのリンクから Expedia を開きます。`,
            `ホテル/パッケージを選択し、支払い画面へ進みます。`,
            `「Promo code / Coupon」欄を探します。`,
            `${keyword} を貼り付けて適用します。`,
            `割引が反映されたことを確認してから決済します。`,
          ],
          comparisonRows: [
            { type: 'Hotel', worksBestFor: '2泊以上の滞在', typicalDiscount: '%/割引料金', notes: '掲載数が多い傾向。' },
            { type: 'Flight', worksBestFor: '航空券', typicalDiscount: '$（限定）', notes: '除外されることが多い。' },
            { type: 'Package', worksBestFor: '航空券＋ホテル', typicalDiscount: '$（条件付き）', notes: 'フライト除外時の代替。' },
            { type: 'Car', worksBestFor: 'レンタカー', typicalDiscount: '%', notes: '提携先・除外日を確認。' },
          ],
          stackingNote:
            `Expedia は複数コードの併用ができないことが多いです。1つの ${keyword} とポイント/キャッシュバックの併用可否は条件をご確認ください。`,
          exclusionsNote:
            `税・手数料、会員限定料金、対象外施設などが除外される場合があります。`,
          externalLinks: [
            { label: 'Expedia 公式サポート', url: 'https://www.expedia.com/service/' },
          ],
          internalLinks: [
            { label: '旅行カテゴリ', path: '/categories/travel', anchorText: '旅行のクーポンとセール' },
          ],
          authorByline: 'DealCouponz 旅行ディール編集部が確認',
        },
      },
      ko: {
        seo: {
          primaryKeyword: 'expedia coupon codes',
          title: `${keyword} and Deals: 검증된 할인/프로모 코드 & 이용 가이드`,
          metaDescription:
            `호텔/패키지에 적용 가능한 ${keyword} 및 검증된 딜을 매주 업데이트합니다. 적용 방법, FAQ, 이용 팁까지 한 번에 확인하세요 (DealCouponz).`,
          h1: `${keyword} 및 딜`,
          intro:
            `${keyword} 를 찾고 계신가요? 이 페이지에는 정기적으로 확인한 검증된 오퍼를 모았습니다. ` +
            `실제 프로모 코드가 있으면 아래에서 복사해 적용하고, 코드가 없을 때도 “Get Deal” 링크로 가능한 할인 조건을 확인할 수 있습니다.`,
          keywords: ['expedia coupon codes', 'expedia promo codes', 'expedia 할인', 'expedia 호텔 딜'],
        },
        logoAlt: `Expedia 로고 — ${keyword} (DealCouponz)`,
        description:
          `${keyword} 및 검증된 여행 할인 정보를 제공합니다. 매주 업데이트하며 만료된 오퍼는 정리해 최신 정보를 유지합니다.`,
        savingTips: [
          { tip: `호텔용 ${keyword} 가 항공권보다 더 자주 제공되는 편입니다.`, order: 1, isActive: true },
          { tip: `항공권 코드가 없으면 패키지(항공+호텔)로 할인 적용 여부를 확인하세요.`, order: 2, isActive: true },
          { tip: `모바일 앱 전용 오퍼가 있을 수 있으니 Expedia 앱도 확인하세요.`, order: 3, isActive: true },
          { tip: `대부분 1회 예약당 1개의 코드만 적용됩니다. 캐시백/포인트는 약관에 따라 별도 적용될 수 있습니다.`, order: 4, isActive: true },
        ],
        faqs: [
          {
            question: `${keyword} 는 진짜인가요?`,
            answer:
              `네, 공식 또는 인증 파트너 경로에서 제공되는 경우에 한해 유효합니다. DealCouponz는 검증된 오퍼를 중심으로 제공하고 만료된 오퍼는 숨깁니다.`,
            group: 'faq',
            order: 1,
            isActive: true,
          },
          {
            question: `왜 ${keyword} 가 적용되지 않나요?`,
            answer:
              `최소 결제 금액, 적용 대상(호텔/항공/패키지) 불일치, 만료, 앱 전용 조건 등이 흔한 원인입니다. 약관을 확인하고 시크릿 모드/앱에서 다시 시도해 보세요.`,
            group: 'troubleshooting',
            order: 1,
            isActive: true,
          },
        ],
        editorial: {
          howToSteps: [
            `이 페이지의 링크로 Expedia를 엽니다.`,
            `호텔/패키지를 선택하고 결제 단계로 이동합니다.`,
            `“Promo code / Coupon” 입력란을 찾습니다.`,
            `${keyword} 를 붙여 넣고 적용합니다.`,
            `결제 전 할인 금액이 반영됐는지 확인합니다.`,
          ],
          comparisonRows: [
            { type: 'Hotel', worksBestFor: '2박 이상 숙박', typicalDiscount: '%/할인가', notes: '가장 흔한 형태.' },
            { type: 'Flight', worksBestFor: '항공권', typicalDiscount: '$ (제한적)', notes: '대부분 제외될 수 있음.' },
            { type: 'Package', worksBestFor: '항공+호텔', typicalDiscount: '$ (조건)', notes: '항공권 코드가 없을 때 대안.' },
            { type: 'Car', worksBestFor: '렌터카', typicalDiscount: '%', notes: '제휴사/블랙아웃 확인.' },
          ],
          stackingNote:
            `Expedia는 여러 코드를 중복 적용하지 않는 경우가 많습니다. 1개의 ${keyword} 와 포인트/캐시백의 병행 가능 여부는 약관을 확인하세요.`,
          exclusionsNote:
            `세금/수수료, 회원 전용 요금, 일부 숙소는 제외될 수 있습니다.`,
          externalLinks: [
            { label: 'Expedia 공식 고객센터', url: 'https://www.expedia.com/service/' },
          ],
          internalLinks: [
            { label: '여행 카테고리', path: '/categories/travel', anchorText: '여행 쿠폰과 딜' },
          ],
          authorByline: 'DealCouponz 여행 딜 팀 검토',
        },
      },
    };

      // Ensure all locales have full sections, even if only SEO/description were specified.
      // Keep the exact keyword phrase intact by reusing base shared content.
      Object.keys(translations).forEach((code) => {
        const row = translations[code] || {};
        if (!row.seo?.primaryKeyword) {
          row.seo = { ...(row.seo || {}), primaryKeyword: EXACT_KEYWORD };
        }
        if (!row.logoAlt) row.logoAlt = `Expedia logo — ${EXACT_KEYWORD} (DealCouponz)`;
        if (!row.description) {
          row.description = `DealCouponz lists verified ${EXACT_KEYWORD}, hotel deals, and travel savings. Updated weekly.`;
        }
        if (!row.savingTips) row.savingTips = baseShared.savingTips;
        if (!row.faqs) row.faqs = baseShared.faqs;
        if (!row.editorial) row.editorial = baseShared.editorial;
      });

      return translations;
    })(),
  };
}

async function run() {
  const mongoUri = process.env.MONGO_URL || process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('Missing MONGO_URL / MONGODB_URI / MONGO_URI');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  const now = new Date();

  try {
    const expedia = await Store.findOne({
      $or: [{ slug: /^expedia$/i }, { seoSlug: 'expedia-coupon-codes' }],
    });

    if (!expedia) {
      console.error('Expedia store not found.');
      process.exit(1);
    }

    const seoPayload = buildSeoPayload(now);
    await Store.updateOne({ _id: expedia._id }, { $set: seoPayload });
    console.log('Updated Expedia store SEO fields');

    const dealUpdate = await Deal.updateMany(
      { store: expedia._id },
      {
        $set: {
          startDate: now,
          endDate: daysFromNow(90),
          isActive: true,
          isPublished: true,
        },
      }
    );
    console.log('Refreshed deals:', dealUpdate.modifiedCount, 'modified');

    const site = await Site.findOne({ slug: 'dealcouponz', isActive: true }).select('_id').lean();
    await UrlRedirect.findOneAndUpdate(
      { oldPath: '/stores/expedia' },
      {
        $set: {
          siteId: site?._id,
          oldPath: '/stores/expedia',
          newPath: '/stores/expedia-coupon-codes',
          redirectType: 301,
          referenceType: 'store',
          referenceId: expedia._id,
          isActive: true,
        },
      },
      { upsert: true }
    );
    console.log('301 redirect: /stores/expedia -> /stores/expedia-coupon-codes');

    const publicDeals = await Deal.countDocuments({
      store: expedia._id,
      isActive: true,
      isPublished: true,
      endDate: { $gte: now },
    });
    console.log('Public deals now:', publicDeals);
    console.log('\nDone. Visit /stores/expedia-coupon-codes');
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

run();
