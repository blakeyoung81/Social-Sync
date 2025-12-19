'use client';

import React from 'react';
import { FileText, AlertTriangle } from 'lucide-react';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-8">
        <div className="flex items-center gap-3 mb-8">
          <FileText className="w-8 h-8 text-blue-600" />
          <h1 className="text-4xl font-bold text-gray-900">Terms of Service</h1>
        </div>

        <div className="prose prose-lg max-w-none">
          <p className="text-gray-600 mb-6">
            <strong>Last Updated:</strong> {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-700 mb-4">
              By accessing or using Social Sync ("the Service"), you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of these terms, you may not access the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Description of Service</h2>
            <p className="text-gray-700 mb-4">
              Social Sync is a social media management platform that provides video processing, content scheduling, and multi-platform publishing services for YouTube, Facebook, Instagram, TikTok, and other social media platforms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. User Accounts</h2>
            <div className="text-gray-700 space-y-3">
              <p><strong>3.1 Account Creation:</strong> You must provide accurate and complete information when creating an account.</p>
              <p><strong>3.2 Account Security:</strong> You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account.</p>
              <p><strong>3.3 Account Termination:</strong> We reserve the right to suspend or terminate accounts that violate these Terms.</p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Acceptable Use</h2>
            <div className="text-gray-700 space-y-3">
              <p>You agree not to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Upload content that violates any laws or third-party rights</li>
                <li>Upload content that is defamatory, obscene, or harmful</li>
                <li>Use the Service to spam or harass others</li>
                <li>Attempt to gain unauthorized access to the Service</li>
                <li>Interfere with or disrupt the Service</li>
                <li>Use the Service for any illegal purpose</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Content Ownership and License</h2>
            <div className="text-gray-700 space-y-3">
              <p><strong>5.1 Your Content:</strong> You retain ownership of all content you upload to the Service. By uploading content, you grant us a license to process, store, and transmit your content as necessary to provide the Service.</p>
              <p><strong>5.2 Our Content:</strong> All intellectual property in the Service, including software, design, and documentation, remains our property.</p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Third-Party Services</h2>
            <p className="text-gray-700">
              The Service integrates with third-party platforms (YouTube, Facebook, Instagram, etc.). Your use of these platforms is subject to their respective terms of service. We are not responsible for the actions or policies of these third parties.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Service Availability</h2>
            <p className="text-gray-700">
              We strive to maintain high availability but do not guarantee uninterrupted access. The Service may be unavailable due to maintenance, updates, or circumstances beyond our control.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Fees and Payment</h2>
            <div className="text-gray-700 space-y-3">
              <p><strong>8.1 Service Fees:</strong> Some features may require payment. Fees are clearly displayed before purchase.</p>
              <p><strong>8.2 Third-Party Costs:</strong> You are responsible for any costs incurred through third-party services (e.g., API usage fees).</p>
              <p><strong>8.3 Refunds:</strong> Refund policies are determined on a case-by-case basis.</p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Disclaimer of Warranties</h2>
            <p className="text-gray-700">
              THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE ERROR-FREE OR UNINTERRUPTED.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Limitation of Liability</h2>
            <p className="text-gray-700">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES ARISING FROM YOUR USE OF THE SERVICE.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Indemnification</h2>
            <p className="text-gray-700">
              You agree to indemnify and hold us harmless from any claims, damages, or expenses arising from your use of the Service or violation of these Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Changes to Terms</h2>
            <p className="text-gray-700">
              We reserve the right to modify these Terms at any time. Continued use of the Service after changes constitutes acceptance of the new Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">13. Governing Law</h2>
            <p className="text-gray-700">
              These Terms shall be governed by and construed in accordance with the laws of the United States, without regard to its conflict of law provisions.
            </p>
          </section>

          <section className="mb-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6" />
              14. Contact Information
            </h2>
            <p className="text-gray-700">
              For questions about these Terms, please contact us at:
            </p>
            <p className="text-gray-700 mt-2"><strong>Email:</strong> blake@ivytutoring.net</p>
          </section>
        </div>
      </div>
    </div>
  );
}

