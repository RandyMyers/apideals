/**
 * Seed Hostinger web hosting deals from `hostinger deals.md` (project root).
 * Uses the same referral URL as the Hostinger store:
 *   https://www.hostinger.com?REFERRALCODE=1GAEL52
 *
 * Seeds: Premium / Business / Unlimited / Cloud Startup — new vs existing customer
 * where documented. Cloud Startup "new customer" row appears only in the summary table
 * in the markdown; that row is included with copy aligned to the other new-customer deals.
 *
 * Idempotent: skips deals that already exist for the Hostinger store (same `name`).
 *
 * Usage:
 *   node scripts/seedHostingerHostingDeals.js
 *
 * Env:
 *   MONGO_URL | MONGODB_URI | MONGO_URI
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Deal = require('../models/deal');
const Store = require('../models/store');
const Category = require('../models/category');
const User = require('../models/user');
const Site = require('../models/site');

/** Same link as `seedPopularStores.js` Hostinger entry */
const HOSTINGER_REFERRAL_URL = 'https://www.hostinger.com?REFERRALCODE=1GAEL52';

function daysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

async function findAdminUserId() {
  const admin = await User.findOne({ role: { $in: ['admin', 'superAdmin', 'superadmin'] } }).select('_id');
  if (admin) return admin._id;
  const anyUser = await User.findOne().select('_id');
  return anyUser?._id || null;
}

/**
 * All deals from hostinger deals.md — pricing and copy match the doc where present.
 */
function buildDeals(startDate, endDate) {
  return [
    {
      title: 'New Customer Exclusive: Hostinger Premium Plan',
      name: 'Hostinger Premium Plan - New Customer Exclusive',
      description:
        "Get Hostinger's Premium hosting plan at an exclusive discounted rate for new customers. Perfect for creators and small brands looking to run websites smoothly with powerful features including AI tools, free domain, and priority support.",
      instructions:
        "1. Click 'Get Deal' to activate your exclusive offer\n2. Select the Premium plan at checkout\n3. Your 20% discount will be automatically applied on top of the new customer introductory price\n4. Complete your purchase to lock in this rate for the first 12 months",
      dealType: 'discount',
      discountType: 'percentage',
      discountValue: 20,
      originalPrice: 155.88,
      discountedPrice: 33.5,
      currency: 'USD',
      priceUnit: 'per_year',
      savingsAmount: 122.38,
      savingsPercentage: 78.5,
      highlights: [
        '🎯 Exclusive 20% OFF on top of new customer pricing',
        '💰 Pay only $33.50 for the first 12 months',
        '🚀 3 websites included',
        '🌐 Free domain for 1 year',
        '⚡ 20 GB SSD storage',
        '🛡️ Free weekly backups',
        '🤖 AI tools included',
        '📧 2 free email mailboxes per website for 1 year',
      ],
      features: [
        'Premium hosting optimized for WordPress, Node.js, and drag-and-drop builders',
        'Built-in CDN for faster global loading speeds',
        'Integrated ecommerce functionality',
        'Priority 24/7 expert support',
        'AI email marketing tools',
        'Prompt-based website builder for quick setup',
        'Free SSL certificate included',
      ],
      longDescription: `Get started with Hostinger's Premium plan at the lowest possible price! This exclusive deal is designed specifically for new customers who want to maximize their savings.

For your first 12 months, you'll pay just $33.50 total — that's less than $3 per month for premium hosting that normally renews at $10.99/month. The 20% discount from this offer stacks on top of Hostinger's already generous new customer introductory pricing.

The Premium plan is perfect for creators, freelancers, and small brands who need reliable hosting with room to grow. You'll get 3 websites, a free domain for your first year, 20 GB SSD storage, free weekly backups, and priority support from hosting experts.

Plus, you'll have access to Hostinger's AI tools that help you build your site faster, and you'll get 2 free email mailboxes per website for your first year — perfect for creating professional @yourdomain.com addresses.

Whether you're building with WordPress, using the drag-and-drop builder, or coding with Node.js, this plan gives you the flexibility and performance you need to succeed online.`,
      tags: [
        'hosting',
        'web hosting',
        'premium hosting',
        'new customer',
        'exclusive',
        'website builder',
        'wordpress hosting',
        'ai tools',
        'domain included',
        'best deal',
      ],
    },
    {
      title: 'Hostinger Premium Plan - Existing Customer Renewal Discount',
      name: 'Hostinger Premium Plan - Existing Customer Exclusive',
      description:
        "Already a Hostinger customer? Get an exclusive 20% discount on your Premium plan renewal. This special offer is available only through this link and gives you savings that Hostinger doesn't typically offer to existing users.",
      instructions:
        "1. Click 'Apply Discount' to activate your exclusive renewal offer\n2. Log in to your existing Hostinger account\n3. Apply this discount to your next renewal or plan upgrade\n4. The 20% savings will be applied at checkout",
      dealType: 'discount',
      discountType: 'percentage',
      discountValue: 20,
      originalPrice: 131.88,
      discountedPrice: 105.48,
      currency: 'USD',
      priceUnit: 'per_year',
      savingsAmount: 26.4,
      savingsPercentage: 20,
      highlights: [
        '🔄 Exclusive 20% OFF on Premium plan renewals',
        '💰 Pay only $105.48 for the next 12 months — save $26.40',
        '🏆 Special offer not available to the general public',
        '⚡ Keep all your existing websites and settings',
        '🛡️ Continue enjoying priority 24/7 expert support',
        '🤖 Maintain access to AI tools and features',
        '📧 Keep your free email mailboxes',
      ],
      features: [
        'Seamless renewal — no migration or setup required',
        'Continue hosting up to 3 websites',
        'Maintain 20 GB SSD storage capacity',
        'Keep free weekly backups enabled',
        'Retain CDN access for fast global loading',
        'Continue using integrated ecommerce features',
        'Preserve all AI tools and prompt-based builder access',
        'Keep your free domain (if within first year) or renew at standard rates',
      ],
      longDescription: `Already using Hostinger? Here's an exclusive offer just for you!

This special 20% discount applies directly to your Premium plan renewal — something Hostinger doesn't typically offer to existing customers. Instead of paying the standard $10.99/month renewal rate, you'll pay just $8.79/month when billed annually.

Total for your next 12 months: $105.48, saving you $26.40 compared to the regular renewal price.

Why this matters: Most hosting companies only offer deep discounts to new customers. This deal is different — it's designed specifically for loyal Hostinger users like you who want to continue their service without overpaying.

When you apply this discount, you keep everything you already love about your Premium plan:
- All your existing websites stay exactly as they are
- No migration, no downtime, no hassle
- Full access to AI tools, priority support, and all premium features

Simply click the button below, log into your Hostinger account, and apply this discount to your next renewal. It works for:
- Current Premium plan renewals
- Upgrading from a lower plan to Premium
- Adding additional years to your existing subscription

Don't let your hosting expire at the full price — lock in this exclusive 20% savings today.`,
      tags: [
        'hosting',
        'web hosting',
        'premium hosting',
        'existing customer',
        'renewal discount',
        'loyalty offer',
        'hostinger renewal',
        'exclusive',
        'save on renewal',
      ],
    },
    {
      title: 'New Customer Exclusive: Hostinger Business Plan',
      name: 'Hostinger Business Plan - New Customer Exclusive',
      description:
        "Get Hostinger's Business hosting plan at an exclusive discounted rate for new customers. Perfect for growing businesses needing more speed, ecommerce capabilities, and scalable resources with powerful NVMe storage and daily backups.",
      instructions:
        "1. Click 'Get Deal' to activate your exclusive offer\n2. Select the Business plan at checkout\n3. Your 20% discount will be automatically applied on top of the new customer introductory price\n4. Complete your purchase to lock in this rate for the first 12 months",
      dealType: 'discount',
      discountType: 'percentage',
      discountValue: 20,
      originalPrice: 227.88,
      discountedPrice: 43.1,
      currency: 'USD',
      priceUnit: 'per_year',
      savingsAmount: 184.78,
      savingsPercentage: 81,
      highlights: [
        '🎯 Exclusive 20% OFF on top of new customer pricing',
        '💰 Pay only $43.10 for the first 12 months',
        '🌐 Host up to 50 websites',
        '⚡ 50 GB NVMe storage — 5x faster than standard SSD',
        '🛡️ Daily backups included (vs weekly on lower plans)',
        '🚀 Built for ecommerce with integrated tools',
        '🤖 Full AI tools suite',
        '📧 5 free email mailboxes per website for 1 year',
        '🏪 Perfect for growing businesses and online stores',
      ],
      features: [
        'NVMe storage for faster loading times and better performance',
        'Daily backups for enhanced security and peace of mind',
        'Host up to 50 websites under one account',
        'Free domain name for the first year',
        'Integrated ecommerce functionality with no transaction fees',
        'AI tools including prompt-based website builder',
        'CDN included for global content delivery',
        'Priority 24/7 expert support',
        'WordPress, Node.js, and drag-and-drop builder support',
        'AI email marketing tools to grow your audience',
      ],
      longDescription: `Take your online presence to the next level with Hostinger's Business plan — designed specifically for growing businesses and ecommerce sites.

This exclusive new customer deal gives you 20% OFF on top of Hostinger's already low introductory pricing. Your final price: just $43.10 for the entire first year — that's less than $4/month for premium business hosting.

What makes the Business plan different:
- NVMe Storage: 5x faster than standard SSD, meaning quicker page loads and better customer experiences
- Daily Backups: Automatic daily backups keep your data safe (lower plans offer weekly backups only)
- 50 Websites: Scale your business across multiple sites under one account
- Ecommerce Ready: Full integrated ecommerce with no hidden transaction fees

Whether you're running an online store, a portfolio, or multiple client websites, the Business plan gives you the speed, reliability, and resources you need to grow.

Plus, you'll get:
- Free domain for your first year
- 5 professional email mailboxes per website
- Priority support from hosting experts
- Access to AI tools that simplify website creation

Don't settle for basic hosting — get business-grade performance at an unbeatable introductory price. This offer is available only through this link for new Hostinger customers.`,
      tags: [
        'hosting',
        'business hosting',
        'ecommerce hosting',
        'nvme storage',
        'business plan',
        'growing business',
        'online store',
        'wordpress hosting',
        'daily backups',
        'scalable hosting',
      ],
    },
    {
      title: 'Hostinger Business Plan - Existing Customer Renewal Discount',
      name: 'Hostinger Business Plan - Existing Customer Exclusive',
      description:
        "Already a Hostinger customer? Get an exclusive 20% discount on your Business plan renewal. Perfect for growing businesses that need to maintain premium performance, daily backups, and ecommerce capabilities without paying full renewal rates.",
      instructions:
        "1. Click 'Apply Discount' to activate your exclusive renewal offer\n2. Log in to your existing Hostinger account\n3. Apply this discount to your next Business plan renewal or upgrade\n4. The 20% savings will be applied at checkout",
      dealType: 'discount',
      discountType: 'percentage',
      discountValue: 20,
      originalPrice: 203.88,
      discountedPrice: 163.1,
      currency: 'USD',
      priceUnit: 'per_year',
      savingsAmount: 40.78,
      savingsPercentage: 20,
      highlights: [
        '🔄 Exclusive 20% OFF on Business plan renewals',
        '💰 Pay only $163.10 for the next 12 months — save $40.78',
        '🏆 Special renewal offer not available to the general public',
        '⚡ Keep all your existing websites, ecommerce stores, and settings',
        '🛡️ Continue daily backups and NVMe storage',
        '📧 Maintain your 5 free email mailboxes per website',
        '🚀 Ideal for growing businesses scaling their online presence',
      ],
      features: [
        'Seamless renewal — no migration, no downtime',
        'Continue hosting up to 50 websites',
        'Maintain NVMe storage for superior speed',
        'Keep daily backups active for data protection',
        'Retain full ecommerce functionality',
        'Continue using AI tools and prompt-based builder',
        'Preserve CDN access for global performance',
        'Keep priority 24/7 expert support access',
        'Maintain your 5 free email mailboxes per website (if within first year)',
      ],
      longDescription: `Growing your business shouldn't mean overpaying for hosting renewal.

This exclusive 20% discount is designed specifically for existing Hostinger Business plan customers. Instead of paying the standard $16.99/month renewal rate, you'll pay just $13.59/month when billed annually.

Total for your next 12 months: $163.10, saving you $40.78 compared to the regular renewal price.

Why this matters for your business:
- You keep your NVMe storage speed — critical for ecommerce conversion rates
- Your daily backups continue uninterrupted
- All 50 websites stay active with zero downtime
- Your ecommerce stores remain fully functional

This offer is perfect for:
- Current Business plan customers renewing for another year
- Premium plan customers upgrading to Business
- Adding multiple years to lock in your savings

Your business deserves reliable, high-performance hosting. Don't let your plan expire at full price — apply this exclusive 20% discount to your renewal today.

Simply click below, log into your Hostinger account, and the discount will be applied at checkout. No migration, no setup changes — just pure savings.`,
      tags: [
        'hosting',
        'business hosting',
        'ecommerce hosting',
        'nvme storage',
        'business plan',
        'growing business',
        'online store',
        'wordpress hosting',
        'daily backups',
        'scalable hosting',
      ],
    },
    {
      title: 'New Customer Exclusive: Hostinger Unlimited Plan',
      name: 'Hostinger Unlimited Plan - New Customer Exclusive',
      description:
        "Get Hostinger's Unlimited plan at an exclusive discounted rate for new customers. The ultimate solution for maximum flexibility with unlimited websites, AI tools, priority support, and everything you need for long-term projects.",
      instructions:
        "1. Click 'Get Deal' to activate your exclusive offer\n2. Select the Unlimited plan at checkout\n3. Your 20% discount will be automatically applied on top of the new customer introductory price\n4. Complete your purchase to lock in this rate for the first 12 months",
      dealType: 'discount',
      discountType: 'percentage',
      discountValue: 20,
      originalPrice: 239.88,
      discountedPrice: 52.7,
      currency: 'USD',
      priceUnit: 'per_year',
      savingsAmount: 187.18,
      savingsPercentage: 78,
      highlights: [
        '🎯 Exclusive 20% OFF on top of new customer pricing',
        '💰 Pay only $52.70 for the first 12 months',
        '🌐 Unlimited websites — no caps, no limits',
        '⚡ 50 GB NVMe storage for lightning-fast performance',
        '🛡️ Daily backups with easy data restore',
        '🤖 50 AI prompt builder credits included',
        '📧 Unlimited free email mailboxes per website for 1 year',
        '✉️ AI email marketing free for 1 year',
        '🚀 Complete solution for long-term projects',
      ],
      features: [
        'Unlimited websites — host as many as you need',
        'NVMe storage for 5x faster performance than standard SSD',
        'Daily backups with one-click restore functionality',
        'Free domain name for the first year',
        'Unlimited professional email mailboxes per website',
        'AI email marketing platform included free for 1 year',
        '50 credits for prompt-based AI website builder',
        'Integrated ecommerce with no transaction fees',
        'CDN included for global content delivery',
        'Priority 24/7 expert support',
        'WordPress, Node.js, and drag-and-drop builder support',
        'All AI tools for website creation and optimization',
      ],
      longDescription: `Go unlimited with Hostinger's most flexible plan — designed for serious creators, agencies, and long-term projects.

This exclusive new customer deal gives you 20% OFF on top of Hostinger's already low introductory pricing. Your final price: just $52.70 for the entire first year — that's less than $4.40/month for unlimited hosting with premium features.

Why the Unlimited plan is different:
- Unlimited Websites: Host as many sites as you want — portfolios, client sites, side projects, ecommerce stores — no limits
- NVMe Storage: 50 GB of lightning-fast storage for optimal performance across all your sites
- Daily Backups + Easy Restore: One-click restore gives you peace of mind for every project
- AI Email Marketing: Free for the first year — grow your audience with automated campaigns
- Unlimited Mailboxes: Create unlimited professional email addresses @yourdomain.com

This plan is the complete package:
- 50 AI prompt builder credits to accelerate website creation
- Full ecommerce functionality for selling products
- Priority support from hosting experts
- CDN for fast global loading speeds

Whether you're running multiple businesses, managing client websites, or building a long-term digital empire, the Unlimited plan gives you everything you need with no restrictions.

This offer is exclusively available through this link for new Hostinger customers. Don't settle for limits — go unlimited at the lowest price possible.`,
      tags: [
        'hosting',
        'unlimited hosting',
        'unlimited websites',
        'agencies',
        'multiple sites',
        'nvme storage',
        'ai tools',
        'prompt builder',
        'unlimited email',
        'ai email marketing',
        'long term projects',
        'complete solution',
      ],
    },
    {
      title: 'Hostinger Unlimited Plan - Existing Customer Renewal Discount',
      name: 'Hostinger Unlimited Plan - Existing Customer Exclusive',
      description:
        "Already a Hostinger customer? Get an exclusive 20% discount on your Unlimited plan renewal. Perfect for creators, agencies, and long-term projects who need unlimited websites, AI tools, and priority support without paying full renewal rates.",
      instructions:
        "1. Click 'Apply Discount' to activate your exclusive renewal offer\n2. Log in to your existing Hostinger account\n3. Apply this discount to your next Unlimited plan renewal or upgrade\n4. The 20% savings will be applied at checkout",
      dealType: 'discount',
      discountType: 'percentage',
      discountValue: 20,
      originalPrice: 203.88,
      discountedPrice: 163.1,
      currency: 'USD',
      priceUnit: 'per_year',
      savingsAmount: 40.78,
      savingsPercentage: 20,
      highlights: [
        '🔄 Exclusive 20% OFF on Unlimited plan renewals',
        '💰 Pay only $163.10 for the next 12 months — save $40.78',
        '🌐 Keep your unlimited websites — no migration, no limits',
        '⚡ Maintain NVMe storage and daily backups',
        '📧 Continue unlimited email mailboxes per website',
        '🤖 Keep your AI tools and prompt builder credits',
        '🏆 Special renewal offer not available to the general public',
        '🚀 Perfect for agencies and long-term projects',
      ],
      features: [
        'Seamless renewal — no migration, no downtime',
        'Continue hosting unlimited websites',
        'Maintain 50 GB NVMe storage for superior speed',
        'Keep daily backups with easy restore functionality',
        'Retain full ecommerce capabilities',
        'Continue using AI tools and prompt-based builder',
        'Preserve CDN access for global performance',
        'Keep priority 24/7 expert support',
        'Maintain unlimited email mailboxes per website',
        'Continue AI email marketing access',
      ],
      longDescription: `Running unlimited websites requires unlimited reliability — and that shouldn't come at an inflated renewal price.

This exclusive 20% discount is designed specifically for existing Hostinger Unlimited plan customers. Instead of paying the standard $16.99/month renewal rate, you'll pay just $13.59/month when billed annually.

Total for your next 12 months: $163.10, saving you $40.78 compared to the regular renewal price.

What you keep with this renewal:
- Unlimited websites — all your projects, client sites, and side businesses
- NVMe storage speed — critical for performance across multiple sites
- Daily backups with one-click restore — complete peace of mind
- Unlimited email mailboxes — professional communication for every domain
- AI tools and 50 prompt builder credits
- AI email marketing platform

This offer is perfect for:
- Current Unlimited plan customers renewing for another year
- Business plan customers upgrading to Unlimited
- Agencies managing multiple client websites
- Long-term projects that need maximum flexibility
- Adding multiple years to lock in savings

Your unlimited projects deserve unlimited support. Don't let your plan expire at full price — apply this exclusive 20% discount to your renewal today.

Simply click below, log into your Hostinger account, and the discount will be applied at checkout. No migration, no changes — just keep doing what you're doing at a better price.`,
      tags: [
        'hosting',
        'unlimited hosting',
        'unlimited websites',
        'agencies',
        'multiple sites',
        'nvme storage',
        'ai tools',
        'prompt builder',
        'unlimited email',
        'ai email marketing',
        'long term projects',
        'complete solution',
      ],
    },
    {
      title: 'New Customer Exclusive: Hostinger Cloud Startup Plan',
      name: 'Hostinger Cloud Startup Plan - New Customer Exclusive',
      description:
        "Get Hostinger's Cloud Startup plan at an exclusive discounted rate for new customers. Dedicated cloud infrastructure, up to 100 websites, 100 GB NVMe storage, and daily plus on-demand backups — built for agencies and high-traffic projects.",
      instructions:
        "1. Click 'Get Deal' to activate your exclusive offer\n2. Select the Cloud Startup plan at checkout\n3. Your 20% discount will be automatically applied on top of the new customer introductory price\n4. Complete your purchase to lock in this rate for the first 12 months",
      dealType: 'discount',
      discountType: 'percentage',
      discountValue: 20,
      originalPrice: 335.88,
      discountedPrice: 95.9,
      currency: 'USD',
      priceUnit: 'per_year',
      savingsAmount: 239.98,
      savingsPercentage: 71.5,
      highlights: [
        '☁️ Exclusive 20% OFF on top of new customer Cloud Startup pricing',
        '💰 Pay only $95.90 for the first 12 months — save $239.98 vs list',
        '🌐 Host up to 100 websites on cloud infrastructure',
        '💾 100 GB NVMe storage',
        '🛡️ Daily backups plus on-demand backups',
        '📧 10 email mailboxes per website',
        '🤖 AI tools and prompt builder credits',
        '🚀 Ideal for agencies and high-traffic sites',
      ],
      features: [
        'Cloud infrastructure — performance built for demanding workloads',
        'Host up to 100 websites under one account',
        '100 GB NVMe storage for all your projects',
        'Daily backups plus on-demand backup before major changes',
        'Free domain for the first year (where applicable)',
        'CDN for global content delivery',
        'Priority 24/7 expert support',
        'Integrated ecommerce and AI email marketing tools',
        'WordPress, Node.js, and drag-and-drop builder support',
      ],
      longDescription: `Scale with Hostinger's Cloud Startup plan — dedicated cloud resources for agencies and serious projects.

This new-customer offer stacks 20% OFF on Hostinger's introductory Cloud Startup pricing. Your first year totals about $95.90 (see checkout for current taxes and currency), compared to a much higher standard annual list price — giving you major savings while you onboard clients and grow traffic.

You get room for up to 100 websites, 100 GB of NVMe storage, daily and on-demand backups, and the performance headroom cloud hosting is known for. Pair that with priority support and Hostinger's AI tooling to ship sites faster.

Use the same exclusive link as our other Hostinger deals to activate this offer at checkout. Perfect if you're graduating from shared hosting and need consistent performance under load.`,
      tags: [
        'cloud hosting',
        'cloud startup',
        'dedicated hosting',
        'agencies',
        'high traffic',
        '100 websites',
        'nvme storage',
        'on demand backups',
        'cloud infrastructure',
        'agency hosting',
        'scalable hosting',
        'wordpress cloud',
      ],
    },
    {
      title: 'Hostinger Cloud Startup Plan - Existing Customer Renewal Discount',
      name: 'Hostinger Cloud Startup Plan - Existing Customer Exclusive',
      description:
        "Already a Hostinger customer? Get an exclusive 20% discount on your Cloud Startup plan renewal. Perfect for agencies and high-traffic projects that need dedicated cloud infrastructure, massive storage, and on-demand backups without paying full renewal rates.",
      instructions:
        "1. Click 'Apply Discount' to activate your exclusive renewal offer\n2. Log in to your existing Hostinger account\n3. Apply this discount to your next Cloud Startup plan renewal or upgrade\n4. The 20% savings will be applied at checkout",
      dealType: 'discount',
      discountType: 'percentage',
      discountValue: 20,
      originalPrice: 311.88,
      discountedPrice: 249.5,
      currency: 'USD',
      priceUnit: 'per_year',
      savingsAmount: 62.38,
      savingsPercentage: 20,
      highlights: [
        '☁️ Exclusive 20% OFF on Cloud Startup plan renewals',
        '💰 Pay only $249.50 for the next 12 months — save $62.38',
        '⚡ Keep your dedicated cloud infrastructure',
        '🌐 Maintain hosting for up to 100 websites',
        '💾 Preserve 100 GB NVMe storage capacity',
        '🛡️ Continue daily and on-demand backup capabilities',
        '📧 Keep 10 email mailboxes per website',
        '🤖 Maintain your AI tools and prompt builder credits',
        '🏆 Special renewal offer not available to the general public',
        '🚀 Ideal for agencies scaling their client portfolio',
      ],
      features: [
        'Seamless cloud renewal — no migration, no downtime',
        'Continue hosting up to 100 websites',
        'Maintain 100 GB NVMe storage for all your projects',
        'Keep daily backups PLUS on-demand backup functionality',
        'Retain full cloud infrastructure performance — 100x faster',
        'Continue using all AI tools and prompt builder',
        'Preserve CDN access for global content delivery',
        'Keep priority 24/7 expert support',
        'Maintain 10 email mailboxes per website',
        'Continue AI email marketing platform access',
      ],
      longDescription: `Your agency runs on cloud infrastructure. Your renewal shouldn't run up costs.

This exclusive 20% discount is designed specifically for existing Hostinger Cloud Startup customers. Instead of paying the standard $25.99/month renewal rate, you'll pay just $20.79/month when billed annually.

Total for your next 12 months: $249.50, saving you $62.38 compared to the regular renewal price.

What you keep with this renewal:
- Cloud infrastructure: 100x faster performance for all 100 websites
- 100 GB NVMe storage: All your client projects, media files, and databases
- On-demand backups: Trigger backups before major updates or after launches
- Dedicated resources: Consistent performance no matter the traffic spikes
- 10 email mailboxes per website: Professional communication for every client
- AI tools + email marketing: Continue growing without added costs

This offer is perfect for:
- Current Cloud Startup customers renewing for another year
- Unlimited/Business customers upgrading to cloud infrastructure
- Agencies managing 50-100 client websites
- High-traffic projects that demand dedicated resources
- Adding multiple years to lock in savings

Your clients depend on you. Your hosting should depend on reliable cloud infrastructure — at a price that makes business sense.

Don't let your cloud plan expire at full price. Apply this exclusive 20% discount to your renewal today.

Simply click below, log into your Hostinger account, and the discount will be applied at checkout. No migration, no changes — just continue delivering exceptional performance for your clients at a better price.`,
      tags: [
        'cloud hosting',
        'cloud startup',
        'dedicated hosting',
        'agencies',
        'high traffic',
        '100 websites',
        'nvme storage',
        'on demand backups',
        'cloud infrastructure',
        'agency hosting',
        'scalable hosting',
        'wordpress cloud',
      ],
    },
  ].map((d) => ({
    ...d,
    productUrl: HOSTINGER_REFERRAL_URL,
    startDate,
    endDate,
    maxUsage: 1000,
    isActive: true,
    isPublished: true,
    isWorldwide: true,
    availableCountries: ['WORLDWIDE'],
    entityScope: 'global',
  }));
}

async function run() {
  const mongoUri = process.env.MONGO_URL || process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('Missing MONGO_URL / MONGODB_URI / MONGO_URI in .env');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB\n');

  const store = await Store.findOne({ name: /^hostinger$/i }).lean();
  if (!store) {
    console.error('Hostinger store not found. Run: node scripts/seedPopularStores.js (or create the store first).');
    process.exit(1);
  }
  console.log('Store:', store.name, store._id);

  let siteId = store.siteId;
  if (!siteId) {
    const site = await Site.findOne({ slug: 'dealcouponz', isActive: true }).select('_id').lean();
    siteId = site?._id;
    if (siteId) {
      await Store.updateOne({ _id: store._id }, { $set: { siteId } });
      console.log('Assigned siteId to Hostinger store (was missing)');
    }
  }

  let categoryId = store.categoryId;
  if (!categoryId) {
    const cat = await Category.findOne({ name: 'Software & Apps' }).select('_id').lean();
    categoryId = cat?._id;
  }
  if (!categoryId) {
    console.error('No category on store and Software & Apps not found. Run seed:categories.');
    process.exit(1);
  }
  console.log('Category:', categoryId);

  const userId = await findAdminUserId();
  if (userId) console.log('Optional userId:', userId);

  const startDate = new Date();
  const endDate = daysFromNow(90);
  const dealPayloads = buildDeals(startDate, endDate);

  let created = 0;
  let skipped = 0;

  for (const payload of dealPayloads) {
    const exists = await Deal.findOne({ store: store._id, name: payload.name }).select('_id').lean();
    if (exists) {
      console.log('Skip (exists):', payload.name);
      skipped++;
      continue;
    }

    const doc = new Deal({
      ...payload,
      store: store._id,
      categoryId,
      userId: userId || undefined,
      ...(siteId && { siteId }),
    });
    await doc.save();
    console.log('Created:', doc.name, '→', doc.slug);
    created++;
  }

  console.log(`\nDone. Created ${created}, skipped ${skipped}. Referral URL: ${HOSTINGER_REFERRAL_URL}`);
  await mongoose.disconnect();
  console.log('Disconnected.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
