import { db } from "./db";
import { legalPages, newsletterSubscribers } from "@shared/schema";
import { eq } from "drizzle-orm";

const LEGAL_CONTENT: { slug: string; title: string; content: string }[] = [
  {
    slug: "terms",
    title: "Terms of Service",
    content: `<h2>Terms of Service</h2>
<p><strong>Effective Date:</strong> January 1, 2025 &nbsp;|&nbsp; <strong>Last Updated:</strong> April 20, 2026</p>

<p>Welcome to Taskdrip™ ("Platform", "we", "us", or "our"), operated by Taskdrip LLC. By accessing or using our platform at <a href="https://taskdrip.online">taskdrip.online</a>, you agree to be bound by these Terms of Service ("Terms"). Please read them carefully.</p>

<h3>1. Acceptance of Terms</h3>
<p>By creating an account or using any part of the Taskdrip platform, you confirm that you are at least 18 years old, have read and understood these Terms, and agree to be legally bound by them. If you do not agree, you may not use our services.</p>

<h3>2. Description of Services</h3>
<p>Taskdrip is a Web3 influencer marketplace that connects brands with content creators and influencers. Our platform provides:</p>
<ul>
  <li>Campaign management tools for brands to run influencer marketing campaigns</li>
  <li>A marketplace for creators to discover and complete paid tasks and campaigns</li>
  <li>P2P (Peer-to-Peer) trading functionality for influencer services</li>
  <li>BreedSkool Academy — educational content for influencer skill development</li>
  <li>A shop for digital products and resources</li>
  <li>Crypto-based payment processing (USDT, TON, and other digital currencies)</li>
</ul>

<h3>3. Account Registration</h3>
<p>To access most features, you must create an account. You agree to:</p>
<ul>
  <li>Provide accurate, current, and complete information during registration</li>
  <li>Maintain the security of your password and account credentials</li>
  <li>Notify us immediately of any unauthorized access to your account</li>
  <li>Take responsibility for all activities that occur under your account</li>
</ul>
<p>We reserve the right to suspend or terminate accounts that violate these Terms or contain false information.</p>

<h3>4. Influencer Responsibilities</h3>
<p>As an influencer or creator on Taskdrip, you agree to:</p>
<ul>
  <li>Only apply to campaigns you can legitimately complete</li>
  <li>Submit authentic, original content that meets campaign requirements</li>
  <li>Not engage in fake engagement, bot activity, or fraudulent submissions</li>
  <li>Disclose sponsored content in accordance with FTC guidelines and applicable laws</li>
  <li>Maintain accurate social media follower counts and engagement statistics</li>
</ul>

<h3>5. Brand Responsibilities</h3>
<p>As a brand using Taskdrip, you agree to:</p>
<ul>
  <li>Provide clear, accurate campaign briefs and requirements</li>
  <li>Review and approve or reject submissions in a timely manner (within 7 days)</li>
  <li>Fund campaigns before they go live on the platform</li>
  <li>Not engage in discriminatory practices in influencer selection</li>
  <li>Comply with all applicable advertising and marketing laws</li>
</ul>

<h3>6. Payments and Fees</h3>
<p>Taskdrip charges platform fees for transactions. All fees are disclosed prior to completing any transaction. Payments to influencers are processed in cryptocurrency (USDT/TON) to provided wallet addresses. Taskdrip is not responsible for blockchain network delays, transaction fees, or wallet address errors provided by users.</p>
<p><strong>Points and $TDRIP Tokens:</strong> Points earned on the platform are off-chain rewards. Conversion to $TDRIP tokens is subject to availability and platform policies, which may change without notice.</p>

<h3>7. Prohibited Activities</h3>
<p>You may not:</p>
<ul>
  <li>Use the platform for any illegal purpose</li>
  <li>Submit fraudulent content, fake engagement, or false submissions</li>
  <li>Harass, threaten, or abuse other platform users</li>
  <li>Reverse engineer, decompile, or attempt to extract our source code</li>
  <li>Use automated bots, scrapers, or scripts to access the platform</li>
  <li>Circumvent platform fees by conducting transactions off-platform</li>
  <li>Create multiple accounts to circumvent restrictions or bans</li>
</ul>

<h3>8. Intellectual Property</h3>
<p>The Taskdrip name, logo, and all platform content are protected by copyright and trademark law. You retain ownership of content you create, but grant Taskdrip a non-exclusive license to display and promote your work within the platform. You may not use Taskdrip's branding without written permission.</p>

<h3>9. Dispute Resolution</h3>
<p>In the event of a dispute between a brand and influencer, Taskdrip may offer mediation services. Our decisions in platform disputes are final. For disputes involving Taskdrip directly, you agree to submit to binding arbitration under the rules of the American Arbitration Association in Delaware, USA.</p>

<h3>10. Limitation of Liability</h3>
<p>TO THE MAXIMUM EXTENT PERMITTED BY LAW, TASKDRIP SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR GOODWILL, ARISING FROM YOUR USE OF THE PLATFORM. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE 12 MONTHS PRECEDING THE CLAIM.</p>

<h3>11. Termination</h3>
<p>We may suspend or terminate your account at any time for violations of these Terms. You may close your account at any time by contacting support. Upon termination, your right to use the platform ceases immediately.</p>

<h3>12. Changes to These Terms</h3>
<p>We reserve the right to modify these Terms at any time. We will provide notice of significant changes via email or platform notification. Continued use after changes constitutes acceptance of the revised Terms.</p>

<h3>13. Governing Law</h3>
<p>These Terms are governed by the laws of the State of Delaware, United States, without regard to conflict of law provisions.</p>

<h3>14. Contact Us</h3>
<p>For questions about these Terms, please contact us at:</p>
<p><strong>Taskdrip LLC</strong><br>
Email: <a href="mailto:legal@taskdrip.online">legal@taskdrip.online</a><br>
Support: <a href="mailto:support@taskdrip.online">support@taskdrip.online</a></p>`,
  },
  {
    slug: "privacy",
    title: "Privacy Policy",
    content: `<h2>Privacy Policy</h2>
<p><strong>Effective Date:</strong> January 1, 2025 &nbsp;|&nbsp; <strong>Last Updated:</strong> April 20, 2026</p>

<p>Taskdrip LLC ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use the Taskdrip platform.</p>

<h3>1. Information We Collect</h3>
<h4>Information You Provide Directly</h4>
<ul>
  <li><strong>Account Information:</strong> Name, email address, password (hashed), user type (creator/brand), location</li>
  <li><strong>Profile Information:</strong> Bio, profile photo, social media handles, follower counts, niche/industry</li>
  <li><strong>Payment Information:</strong> Cryptocurrency wallet addresses (we do not store credit/debit card information)</li>
  <li><strong>Content:</strong> Campaign submissions, posts, messages, and other content you upload</li>
  <li><strong>Communications:</strong> Support requests, email correspondence</li>
</ul>

<h4>Information Collected Automatically</h4>
<ul>
  <li><strong>Usage Data:</strong> Pages visited, features used, time spent on platform</li>
  <li><strong>Device Information:</strong> IP address, browser type, operating system</li>
  <li><strong>Cookies:</strong> Session cookies and analytics cookies (see our Cookie Policy for details)</li>
</ul>

<h3>2. How We Use Your Information</h3>
<p>We use your information to:</p>
<ul>
  <li>Create and manage your account</li>
  <li>Facilitate campaign matching between brands and influencers</li>
  <li>Process payments and manage your wallet</li>
  <li>Send transactional emails (account updates, campaign approvals, payment notifications)</li>
  <li>Send marketing communications (only with your consent)</li>
  <li>Analyze platform usage to improve our services</li>
  <li>Prevent fraud and ensure platform security</li>
  <li>Comply with legal obligations</li>
</ul>

<h3>3. Information Sharing</h3>
<p>We do not sell your personal information. We share information only in these circumstances:</p>
<ul>
  <li><strong>With Other Users:</strong> Profile information (name, bio, social handles, follower counts) is visible to brands when you apply to campaigns</li>
  <li><strong>Service Providers:</strong> Email delivery (SendGrid), analytics, and hosting providers who are contractually bound to protect your data</li>
  <li><strong>Legal Requirements:</strong> When required by law, court order, or government authority</li>
  <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
</ul>

<h3>4. Data Security</h3>
<p>We implement industry-standard security measures including:</p>
<ul>
  <li>Password hashing using bcrypt with salt rounds</li>
  <li>HTTPS/TLS encryption for all data transmission</li>
  <li>Rate limiting to prevent brute-force attacks</li>
  <li>Content Security Policy (CSP) headers</li>
  <li>Regular security audits</li>
</ul>
<p>No system is 100% secure. We encourage you to use a strong, unique password and enable two-factor authentication.</p>

<h3>5. Data Retention</h3>
<p>We retain your account data for as long as your account is active. After account deletion, we retain certain data for up to 12 months for legal and fraud prevention purposes. Newsletter subscription data is retained until you unsubscribe.</p>

<h3>6. Your Rights</h3>
<p>Depending on your location, you may have the right to:</p>
<ul>
  <li>Access the personal data we hold about you</li>
  <li>Correct inaccurate data</li>
  <li>Request deletion of your data ("right to be forgotten")</li>
  <li>Object to or restrict processing of your data</li>
  <li>Data portability — receive your data in a machine-readable format</li>
  <li>Withdraw consent for marketing communications at any time</li>
</ul>
<p>To exercise any of these rights, contact us at <a href="mailto:privacy@taskdrip.online">privacy@taskdrip.online</a>.</p>

<h3>7. Children's Privacy</h3>
<p>Taskdrip is not directed to individuals under 18 years of age. We do not knowingly collect personal information from minors. If we discover that a minor has registered, we will promptly delete their account and data.</p>

<h3>8. International Data Transfers</h3>
<p>Your data may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place for such transfers, including standard contractual clauses where required by applicable law.</p>

<h3>9. Third-Party Links</h3>
<p>Our platform may contain links to third-party websites. We are not responsible for the privacy practices of those sites and encourage you to review their privacy policies.</p>

<h3>10. Changes to This Policy</h3>
<p>We may update this Privacy Policy periodically. We will notify you of significant changes via email or a prominent notice on the platform. Continued use after changes constitutes acceptance.</p>

<h3>11. Contact Us</h3>
<p>For privacy-related questions or to exercise your rights:</p>
<p><strong>Taskdrip LLC — Privacy Team</strong><br>
Email: <a href="mailto:privacy@taskdrip.online">privacy@taskdrip.online</a><br>
General: <a href="mailto:support@taskdrip.online">support@taskdrip.online</a></p>`,
  },
  {
    slug: "cookies",
    title: "Cookie Policy",
    content: `<h2>Cookie Policy</h2>
<p><strong>Effective Date:</strong> January 1, 2025 &nbsp;|&nbsp; <strong>Last Updated:</strong> April 20, 2026</p>

<p>This Cookie Policy explains what cookies are, how Taskdrip LLC ("we", "our", "us") uses cookies and similar technologies on the Taskdrip platform, and how you can manage your cookie preferences.</p>

<h3>1. What Are Cookies?</h3>
<p>Cookies are small text files stored on your device (computer, tablet, or smartphone) when you visit a website. They allow the website to recognize your device and remember information about your visit, such as your login status and preferences.</p>
<p>Similar technologies include:</p>
<ul>
  <li><strong>Local Storage / Session Storage:</strong> Browser storage mechanisms used for session data</li>
  <li><strong>Pixel Tags / Web Beacons:</strong> Small transparent images used to track email opens</li>
  <li><strong>Analytics SDKs:</strong> JavaScript libraries that collect usage analytics</li>
</ul>

<h3>2. Types of Cookies We Use</h3>

<h4>2.1 Strictly Necessary Cookies</h4>
<p>These cookies are essential for the platform to function and cannot be disabled.</p>
<table style="width:100%;border-collapse:collapse;margin:12px 0;">
  <tr style="background:#f9fafb;"><th style="text-align:left;padding:8px;border:1px solid #e5e7eb;">Cookie Name</th><th style="text-align:left;padding:8px;border:1px solid #e5e7eb;">Purpose</th><th style="text-align:left;padding:8px;border:1px solid #e5e7eb;">Duration</th></tr>
  <tr><td style="padding:8px;border:1px solid #e5e7eb;">taskdrip.sid</td><td style="padding:8px;border:1px solid #e5e7eb;">Maintains your login session</td><td style="padding:8px;border:1px solid #e5e7eb;">Session</td></tr>
  <tr><td style="padding:8px;border:1px solid #e5e7eb;">csrf_token</td><td style="padding:8px;border:1px solid #e5e7eb;">Protects against cross-site request forgery</td><td style="padding:8px;border:1px solid #e5e7eb;">Session</td></tr>
</table>

<h4>2.2 Functional Cookies</h4>
<p>These cookies remember your preferences to enhance your experience.</p>
<table style="width:100%;border-collapse:collapse;margin:12px 0;">
  <tr style="background:#f9fafb;"><th style="text-align:left;padding:8px;border:1px solid #e5e7eb;">Cookie Name</th><th style="text-align:left;padding:8px;border:1px solid #e5e7eb;">Purpose</th><th style="text-align:left;padding:8px;border:1px solid #e5e7eb;">Duration</th></tr>
  <tr><td style="padding:8px;border:1px solid #e5e7eb;">theme_pref</td><td style="padding:8px;border:1px solid #e5e7eb;">Stores your light/dark mode preference</td><td style="padding:8px;border:1px solid #e5e7eb;">1 year</td></tr>
  <tr><td style="padding:8px;border:1px solid #e5e7eb;">lang_pref</td><td style="padding:8px;border:1px solid #e5e7eb;">Stores your language preference</td><td style="padding:8px;border:1px solid #e5e7eb;">1 year</td></tr>
</table>

<h4>2.3 Analytics Cookies</h4>
<p>These cookies help us understand how users interact with the platform, allowing us to improve it. They collect anonymized or aggregated data.</p>
<table style="width:100%;border-collapse:collapse;margin:12px 0;">
  <tr style="background:#f9fafb;"><th style="text-align:left;padding:8px;border:1px solid #e5e7eb;">Provider</th><th style="text-align:left;padding:8px;border:1px solid #e5e7eb;">Purpose</th><th style="text-align:left;padding:8px;border:1px solid #e5e7eb;">Duration</th></tr>
  <tr><td style="padding:8px;border:1px solid #e5e7eb;">Google Analytics 4</td><td style="padding:8px;border:1px solid #e5e7eb;">Page views, user behavior, traffic sources</td><td style="padding:8px;border:1px solid #e5e7eb;">2 years</td></tr>
  <tr><td style="padding:8px;border:1px solid #e5e7eb;">Google Tag Manager</td><td style="padding:8px;border:1px solid #e5e7eb;">Tag management for analytics and marketing</td><td style="padding:8px;border:1px solid #e5e7eb;">Session</td></tr>
</table>

<h4>2.4 Marketing Cookies</h4>
<p>These cookies are used to deliver relevant advertisements and track campaign performance. They may be set by our advertising partners.</p>
<ul>
  <li>Ad network cookies (if ad networks are configured by the platform admin)</li>
  <li>Retargeting cookies for platform promotion</li>
</ul>

<h3>3. Managing Your Cookie Preferences</h3>
<p>You can control cookies through:</p>
<ul>
  <li><strong>Browser Settings:</strong> Most browsers allow you to block or delete cookies. Note that blocking essential cookies will prevent the platform from working correctly.</li>
  <li><strong>Opt-Out Tools:</strong> For Google Analytics, visit <a href="https://tools.google.com/dlpage/gaoptout" target="_blank">Google Analytics Opt-out</a></li>
</ul>

<h4>How to manage cookies in popular browsers:</h4>
<ul>
  <li><a href="https://support.google.com/chrome/answer/95647" target="_blank">Google Chrome</a></li>
  <li><a href="https://support.mozilla.org/en-US/kb/enable-and-disable-cookies-website-preferences" target="_blank">Mozilla Firefox</a></li>
  <li><a href="https://support.apple.com/en-us/HT201265" target="_blank">Safari</a></li>
  <li><a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank">Microsoft Edge</a></li>
</ul>

<h3>4. Do Not Track</h3>
<p>Our platform currently does not respond to "Do Not Track" (DNT) browser signals. We will update this policy when a standard for DNT compliance is established.</p>

<h3>5. Changes to This Cookie Policy</h3>
<p>We may update this policy to reflect changes in our cookie use or applicable regulations. Significant changes will be communicated via email or platform notice.</p>

<h3>6. Contact Us</h3>
<p>For questions about our use of cookies:</p>
<p><strong>Taskdrip LLC</strong><br>
Email: <a href="mailto:privacy@taskdrip.online">privacy@taskdrip.online</a></p>`,
  },
  {
    slug: "disclaimer",
    title: "Disclaimer",
    content: `<h2>Disclaimer</h2>
<p><strong>Effective Date:</strong> January 1, 2025 &nbsp;|&nbsp; <strong>Last Updated:</strong> April 20, 2026</p>

<p>Please read this Disclaimer carefully before using the Taskdrip platform operated by Taskdrip LLC ("we", "our", "us").</p>

<h3>1. General Information Disclaimer</h3>
<p>The information provided on the Taskdrip platform is for general informational and operational purposes only. While we strive to keep information accurate and up to date, we make no representations or warranties of any kind, express or implied, about the completeness, accuracy, reliability, or suitability of the information, products, services, or related graphics on the platform.</p>

<h3>2. No Financial or Investment Advice</h3>
<div style="background:#fef2f2;border-left:4px solid #ef4444;padding:16px;margin:16px 0;border-radius:4px;">
  <p style="margin:0;font-weight:600;color:#dc2626;">Important Notice</p>
  <p style="margin:8px 0 0;">Nothing on the Taskdrip platform constitutes financial advice, investment advice, trading advice, or any other type of advice. Cryptocurrency values fluctuate significantly, and past performance is not indicative of future results.</p>
</div>
<p>Specifically:</p>
<ul>
  <li>The $TDRIP token is not an investment product and makes no guarantees of future value</li>
  <li>Points earned on the platform are off-chain rewards and their convertibility to $TDRIP tokens is subject to platform policies which may change</li>
  <li>Earnings from campaigns depend on your performance, brand approval, and market conditions</li>
  <li>We do not guarantee any level of income or earnings from using the platform</li>
</ul>

<h3>3. Cryptocurrency Risks</h3>
<p>Cryptocurrency transactions carry inherent risks, including:</p>
<ul>
  <li><strong>Volatility:</strong> Cryptocurrency values can change dramatically in short periods</li>
  <li><strong>Irreversibility:</strong> Blockchain transactions cannot be reversed once confirmed</li>
  <li><strong>Wallet Errors:</strong> Sending funds to an incorrect wallet address results in permanent loss</li>
  <li><strong>Regulatory Risk:</strong> Cryptocurrency regulations vary by jurisdiction and may change</li>
  <li><strong>Network Risk:</strong> Blockchain network congestion can cause delays or increased fees</li>
</ul>
<p>You are solely responsible for all cryptocurrency transactions made through your account. Taskdrip is not liable for any losses arising from cryptocurrency transactions.</p>

<h3>4. Earnings Disclaimer</h3>
<p>Taskdrip does not guarantee any specific level of income, earnings, or results. Income examples on the platform (such as "15,000+ influencers earning USDT" or earnings statistics) are illustrative and not guarantees of what you will earn. Your actual results will depend on:</p>
<ul>
  <li>Your content quality and engagement rates</li>
  <li>The campaigns you apply for and get approved for</li>
  <li>Your subscription level and creator tier</li>
  <li>Market demand for your niche and audience</li>
  <li>Your consistency and activity on the platform</li>
</ul>

<h3>5. Third-Party Links and Services</h3>
<p>The Taskdrip platform may contain links to third-party websites, services, and resources. These are provided for convenience only. We have no control over the content, privacy policies, or practices of third-party sites and accept no responsibility for them. We encourage you to review the terms and privacy policies of any third-party sites you visit.</p>

<h3>6. Content Disclaimer</h3>
<p>Taskdrip is a marketplace platform. We do not endorse, verify, or take responsibility for:</p>
<ul>
  <li>The quality, accuracy, or legality of campaigns posted by brands</li>
  <li>The content submitted by influencers for campaign reviews</li>
  <li>Products sold in the Taskdrip Shop by third-party sellers</li>
  <li>Information shared in the social feed or P2P marketplace</li>
</ul>
<p>Users are responsible for conducting their own due diligence before engaging in any transaction.</p>

<h3>7. Educational Content (BreedSkool Academy)</h3>
<p>The courses and educational content available on BreedSkool Academy are provided for informational and educational purposes only. Completion of courses does not guarantee employment, specific earnings, or success in influencer marketing. Results vary based on individual effort, skills, and market conditions.</p>

<h3>8. Platform Availability</h3>
<p>We do not guarantee that the platform will be available 100% of the time. We may experience downtime due to maintenance, technical issues, or circumstances beyond our control. We are not liable for any losses resulting from platform unavailability.</p>

<h3>9. Limitation of Liability</h3>
<p>To the fullest extent permitted by applicable law, Taskdrip LLC, its officers, directors, employees, and agents shall not be liable for any direct, indirect, incidental, special, consequential, or punitive damages, including but not limited to:</p>
<ul>
  <li>Loss of profits, revenue, or data</li>
  <li>Financial losses from cryptocurrency transactions</li>
  <li>Damages from platform unavailability or errors</li>
  <li>Any loss arising from reliance on information provided on the platform</li>
</ul>

<h3>10. Regulatory Compliance</h3>
<p>You are responsible for ensuring your use of the Taskdrip platform complies with all applicable laws and regulations in your jurisdiction, including:</p>
<ul>
  <li>Advertising disclosure requirements (FTC guidelines, ASA rules, etc.)</li>
  <li>Cryptocurrency regulations in your country</li>
  <li>Tax obligations on earnings received through the platform</li>
  <li>Content regulations regarding sponsored content in your region</li>
</ul>

<h3>11. Changes to This Disclaimer</h3>
<p>We reserve the right to modify this Disclaimer at any time. Changes will be effective immediately upon posting. Continued use of the platform constitutes acceptance of the updated Disclaimer.</p>

<h3>12. Contact</h3>
<p>For questions about this Disclaimer:</p>
<p><strong>Taskdrip LLC</strong><br>
Email: <a href="mailto:legal@taskdrip.online">legal@taskdrip.online</a><br>
Website: <a href="https://taskdrip.online">taskdrip.online</a></p>`,
  },
];

export async function seedLegalPages(): Promise<void> {
  try {
    for (const page of LEGAL_CONTENT) {
      const existing = await db.select().from(legalPages).where(eq(legalPages.slug, page.slug)).limit(1);
      if (!existing.length) {
        await db.insert(legalPages).values({
          slug: page.slug,
          title: page.title,
          content: page.content,
        });
        console.log(`[seed-legal] Seeded legal page: ${page.slug}`);
      }
    }
    // Seed one demo newsletter subscriber
    const demoSub = await db.select().from(newsletterSubscribers).where(eq(newsletterSubscribers.email, "newsletter.demo@taskdrip.online")).limit(1);
    if (!demoSub.length) {
      await db.insert(newsletterSubscribers).values({
        email: "newsletter.demo@taskdrip.online",
        name: "Demo Subscriber",
        source: "footer",
        status: "active",
      });
      console.log("[seed-legal] Seeded demo newsletter subscriber");
    }
  } catch (err) {
    console.error("[seed-legal] Seeding error:", err);
  }
}
