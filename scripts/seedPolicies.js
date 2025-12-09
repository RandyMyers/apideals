const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Policy = require('../models/policy');

// Load .env file from server directory
dotenv.config({ path: path.join(__dirname, '../.env') });

const policyData = [
  {
    title: 'Privacy Policy',
    content: `
      <h1>Privacy Policy</h1>
      <p><strong>Last Updated:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      
      <h2>1. Introduction</h2>
      <p>Welcome to DealCouponz. We are committed to protecting your privacy and ensuring you have a positive experience on our website. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website.</p>
      
      <h2>2. Information We Collect</h2>
      <h3>2.1 Personal Information</h3>
      <p>We may collect personal information that you voluntarily provide to us when you:</p>
      <ul>
        <li>Register for an account</li>
        <li>Subscribe to our newsletter</li>
        <li>Contact us through our contact forms</li>
        <li>Participate in surveys or promotions</li>
      </ul>
      <p>This information may include your name, email address, phone number, and any other information you choose to provide.</p>
      
      <h3>2.2 Automatically Collected Information</h3>
      <p>When you visit our website, we automatically collect certain information about your device, including:</p>
      <ul>
        <li>IP address</li>
        <li>Browser type and version</li>
        <li>Operating system</li>
        <li>Pages you visit and time spent on pages</li>
        <li>Referring website addresses</li>
      </ul>
      
      <h2>3. How We Use Your Information</h2>
      <p>We use the information we collect to:</p>
      <ul>
        <li>Provide, maintain, and improve our services</li>
        <li>Process your transactions and send related information</li>
        <li>Send you promotional communications (with your consent)</li>
        <li>Respond to your comments, questions, and requests</li>
        <li>Monitor and analyze trends, usage, and activities</li>
        <li>Detect, prevent, and address technical issues</li>
      </ul>
      
      <h2>4. Information Sharing and Disclosure</h2>
      <p>We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:</p>
      <ul>
        <li>With service providers who assist us in operating our website</li>
        <li>When required by law or to protect our rights</li>
        <li>In connection with a business transfer or merger</li>
        <li>With your explicit consent</li>
      </ul>
      
      <h2>5. Data Security</h2>
      <p>We implement appropriate technical and organizational security measures to protect your personal information. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.</p>
      
      <h2>6. Your Rights</h2>
      <p>You have the right to:</p>
      <ul>
        <li>Access your personal information</li>
        <li>Correct inaccurate information</li>
        <li>Request deletion of your information</li>
        <li>Opt-out of marketing communications</li>
        <li>Withdraw consent at any time</li>
      </ul>
      
      <h2>7. Cookies and Tracking Technologies</h2>
      <p>We use cookies and similar tracking technologies to track activity on our website. For more information, please see our <a href="/cookies">Cookie Policy</a>.</p>
      
      <h2>8. Third-Party Links</h2>
      <p>Our website may contain links to third-party websites. We are not responsible for the privacy practices of these external sites. We encourage you to review their privacy policies.</p>
      
      <h2>9. Children's Privacy</h2>
      <p>Our services are not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13.</p>
      
      <h2>10. Changes to This Privacy Policy</h2>
      <p>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.</p>
      
      <h2>11. Contact Us</h2>
      <p>If you have any questions about this Privacy Policy, please contact us at:</p>
      <p>
        <strong>Email:</strong> support@dealcouponz.com<br>
        <strong>Address:</strong> [Your Business Address]
      </p>
    `
  },
  {
    title: 'Terms of Service',
    content: `
      <h1>Terms of Service</h1>
      <p><strong>Last Updated:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      
      <h2>1. Acceptance of Terms</h2>
      <p>By accessing and using DealCouponz, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to these Terms of Service, please do not use our website.</p>
      
      <h2>2. Use License</h2>
      <p>Permission is granted to temporarily access the materials on DealCouponz for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:</p>
      <ul>
        <li>Modify or copy the materials</li>
        <li>Use the materials for any commercial purpose or for any public display</li>
        <li>Attempt to reverse engineer any software contained on the website</li>
        <li>Remove any copyright or other proprietary notations from the materials</li>
      </ul>
      
      <h2>3. User Accounts</h2>
      <p>To access certain features of our website, you may be required to create an account. You are responsible for:</p>
      <ul>
        <li>Maintaining the confidentiality of your account credentials</li>
        <li>All activities that occur under your account</li>
        <li>Providing accurate and complete information</li>
        <li>Notifying us immediately of any unauthorized use</li>
      </ul>
      
      <h2>4. Coupons and Deals</h2>
      <p>DealCouponz provides access to coupons, deals, and promotional offers from various merchants. We do not guarantee:</p>
      <ul>
        <li>The availability of any coupon or deal</li>
        <li>The accuracy of coupon codes or promotional information</li>
        <li>The validity or expiration dates of offers</li>
        <li>The acceptance of coupons by merchants</li>
      </ul>
      <p>All coupons and deals are subject to the terms and conditions set by the respective merchants.</p>
      
      <h2>5. Prohibited Uses</h2>
      <p>You agree not to use DealCouponz:</p>
      <ul>
        <li>In any way that violates any applicable law or regulation</li>
        <li>To transmit any malicious code or viruses</li>
        <li>To collect or harvest personal information about other users</li>
        <li>To impersonate or misrepresent your affiliation with any person or entity</li>
        <li>To interfere with or disrupt the website or servers</li>
      </ul>
      
      <h2>6. Intellectual Property</h2>
      <p>All content on DealCouponz, including text, graphics, logos, images, and software, is the property of DealCouponz or its content suppliers and is protected by copyright and trademark laws.</p>
      
      <h2>7. Disclaimer</h2>
      <p>The materials on DealCouponz are provided on an 'as is' basis. DealCouponz makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property.</p>
      
      <h2>8. Limitations of Liability</h2>
      <p>In no event shall DealCouponz or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on DealCouponz.</p>
      
      <h2>9. Accuracy of Materials</h2>
      <p>The materials appearing on DealCouponz could include technical, typographical, or photographic errors. DealCouponz does not warrant that any of the materials on its website are accurate, complete, or current.</p>
      
      <h2>10. Links to Third-Party Websites</h2>
      <p>DealCouponz has not reviewed all of the sites linked to our website and is not responsible for the contents of any such linked site. The inclusion of any link does not imply endorsement by DealCouponz.</p>
      
      <h2>11. Modifications</h2>
      <p>DealCouponz may revise these Terms of Service at any time without notice. By using this website, you are agreeing to be bound by the then current version of these Terms of Service.</p>
      
      <h2>12. Governing Law</h2>
      <p>These terms and conditions are governed by and construed in accordance with the laws of [Your Jurisdiction] and you irrevocably submit to the exclusive jurisdiction of the courts in that location.</p>
      
      <h2>13. Contact Information</h2>
      <p>If you have any questions about these Terms of Service, please contact us at:</p>
      <p>
        <strong>Email:</strong> support@dealcouponz.com<br>
        <strong>Address:</strong> [Your Business Address]
      </p>
    `
  },
  {
    title: 'Cookie Policy',
    content: `
      <h1>Cookie Policy</h1>
      <p><strong>Last Updated:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      
      <h2>1. What Are Cookies?</h2>
      <p>Cookies are small text files that are placed on your computer or mobile device when you visit a website. They are widely used to make websites work more efficiently and provide information to the website owners.</p>
      
      <h2>2. How We Use Cookies</h2>
      <p>DealCouponz uses cookies to:</p>
      <ul>
        <li>Remember your preferences and settings</li>
        <li>Understand how you use our website</li>
        <li>Improve your browsing experience</li>
        <li>Provide personalized content and advertisements</li>
        <li>Analyze website traffic and usage patterns</li>
      </ul>
      
      <h2>3. Types of Cookies We Use</h2>
      <h3>3.1 Essential Cookies</h3>
      <p>These cookies are necessary for the website to function properly. They enable core functionality such as security, network management, and accessibility. You cannot opt-out of these cookies.</p>
      
      <h3>3.2 Performance Cookies</h3>
      <p>These cookies collect information about how you use our website, such as which pages you visit most often. This data helps us optimize our website's performance.</p>
      
      <h3>3.3 Functionality Cookies</h3>
      <p>These cookies allow the website to remember choices you make (such as your username, language, or region) and provide enhanced, personalized features.</p>
      
      <h3>3.4 Targeting/Advertising Cookies</h3>
      <p>These cookies are used to deliver advertisements that are relevant to you and your interests. They also help measure the effectiveness of advertising campaigns.</p>
      
      <h2>4. Third-Party Cookies</h2>
      <p>In addition to our own cookies, we may also use various third-party cookies to report usage statistics of the website, deliver advertisements, and so on. These third parties may include:</p>
      <ul>
        <li>Google Analytics</li>
        <li>Social media platforms</li>
        <li>Advertising networks</li>
      </ul>
      
      <h2>5. Managing Cookies</h2>
      <p>You can control and/or delete cookies as you wish. You can delete all cookies that are already on your computer and you can set most browsers to prevent them from being placed. However, if you do this, you may have to manually adjust some preferences every time you visit a site, and some services and functionalities may not work.</p>
      
      <h3>5.1 Browser Settings</h3>
      <p>Most web browsers allow you to control cookies through their settings. Here are links to instructions for managing cookies in popular browsers:</p>
      <ul>
        <li><a href="https://support.google.com/chrome/answer/95647" target="_blank">Google Chrome</a></li>
        <li><a href="https://support.mozilla.org/en-US/kb/enable-and-disable-cookies-website-preferences" target="_blank">Mozilla Firefox</a></li>
        <li><a href="https://support.apple.com/guide/safari/manage-cookies-and-website-data-sfri11471/mac" target="_blank">Safari</a></li>
        <li><a href="https://support.microsoft.com/en-us/windows/delete-and-manage-cookies-168dab11-0753-043d-7c16-ede5947fc64d" target="_blank">Microsoft Edge</a></li>
      </ul>
      
      <h2>6. Cookies We Use</h2>
      <p>The following table lists the cookies we use and the purposes for which we use them:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 1rem 0;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="padding: 0.75rem; text-align: left; border: 1px solid #ddd;">Cookie Name</th>
            <th style="padding: 0.75rem; text-align: left; border: 1px solid #ddd;">Purpose</th>
            <th style="padding: 0.75rem; text-align: left; border: 1px solid #ddd;">Duration</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 0.75rem; border: 1px solid #ddd;">session_id</td>
            <td style="padding: 0.75rem; border: 1px solid #ddd;">Maintains your session</td>
            <td style="padding: 0.75rem; border: 1px solid #ddd;">Session</td>
          </tr>
          <tr>
            <td style="padding: 0.75rem; border: 1px solid #ddd;">preferences</td>
            <td style="padding: 0.75rem; border: 1px solid #ddd;">Stores your preferences</td>
            <td style="padding: 0.75rem; border: 1px solid #ddd;">1 year</td>
          </tr>
          <tr>
            <td style="padding: 0.75rem; border: 1px solid #ddd;">analytics</td>
            <td style="padding: 0.75rem; border: 1px solid #ddd;">Tracks website usage</td>
            <td style="padding: 0.75rem; border: 1px solid #ddd;">2 years</td>
          </tr>
        </tbody>
      </table>
      
      <h2>7. Do Not Track Signals</h2>
      <p>Some browsers incorporate a "Do Not Track" (DNT) feature that signals to websites you visit that you do not want to have your online activity tracked. Currently, there is no standard for how DNT signals should be interpreted, so we do not respond to DNT signals at this time.</p>
      
      <h2>8. Updates to This Cookie Policy</h2>
      <p>We may update this Cookie Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. Please revisit this Cookie Policy regularly to stay informed about our use of cookies.</p>
      
      <h2>9. Contact Us</h2>
      <p>If you have any questions about our use of cookies, please contact us at:</p>
      <p>
        <strong>Email:</strong> support@dealcouponz.com<br>
        <strong>Address:</strong> [Your Business Address]
      </p>
    `
  }
];

const seedPolicies = async () => {
  try {
    // Use the same connection method as app.js
    await mongoose.connect(process.env.MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true });

    console.log('Connected to MongoDB');

    // Insert policies (update if exists, create if not)
    let created = 0;
    let updated = 0;
    let errors = 0;

    for (const policy of policyData) {
      try {
        const existingPolicy = await Policy.findOne({ title: policy.title });
        
        if (existingPolicy) {
          existingPolicy.content = policy.content;
          existingPolicy.lastUpdated = new Date();
          await existingPolicy.save();
          console.log(`✓ Updated policy: ${policy.title}`);
          updated++;
        } else {
          await Policy.create(policy);
          console.log(`✓ Created policy: ${policy.title}`);
          created++;
        }
      } catch (err) {
        if (err.code === 8000 || err.codeName === 'AtlasError') {
          console.error(`✗ Collection limit reached. Cannot create "policies" collection.`);
          console.error('Please create the collection manually in MongoDB Atlas or upgrade your plan.');
          errors++;
          break;
        } else {
          console.error(`✗ Error creating/updating policy "${policy.title}":`, err.message);
          errors++;
        }
      }
    }

    console.log(`\nPolicy seeding completed! Created: ${created}, Updated: ${updated}, Errors: ${errors}`);
    process.exit(errors > 0 ? 1 : 0);
  } catch (error) {
    if (error.code === 8000 || error.codeName === 'AtlasError') {
      console.error('\n✗ MongoDB Atlas Collection Limit Reached (500/500)');
      console.error('Solution options:');
      console.error('1. Create "policies" collection manually in MongoDB Atlas UI');
      console.error('2. Delete unused collections to free up space');
      console.error('3. Upgrade your MongoDB Atlas plan');
      console.error('\nAfter creating the collection, run this script again.');
    } else {
      console.error('Error seeding policies:', error);
    }
    process.exit(1);
  }
};

seedPolicies();
