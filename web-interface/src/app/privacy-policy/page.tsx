'use client';

import React from 'react';
import { Shield, Mail, Calendar } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-8">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="w-8 h-8 text-blue-600" />
          <h1 className="text-4xl font-bold text-gray-900">Privacy Policy</h1>
        </div>

        <div className="prose prose-lg max-w-none">
          <p className="text-gray-600 mb-6">
            <strong>Last Updated:</strong> {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Introduction</h2>
            <p className="text-gray-700 mb-4">
              Social Sync ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Social Media Manager application.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Information We Collect</h2>
            <div className="text-gray-700 space-y-3">
              <p><strong>2.1 Account Information:</strong> When you connect your social media accounts (YouTube, Facebook, Instagram, TikTok), we collect account identifiers and authentication tokens necessary to manage your content.</p>
              <p><strong>2.2 Content Data:</strong> We process video files, metadata, and content you upload or process through our service.</p>
              <p><strong>2.3 Usage Data:</strong> We collect information about how you interact with our application, including processing preferences and feature usage.</p>
              <p><strong>2.4 Technical Data:</strong> We may collect device information, IP addresses, and browser type for security and optimization purposes.</p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. How We Use Your Information</h2>
            <div className="text-gray-700 space-y-3">
              <p>We use the collected information to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Provide video processing and content management services</li>
                <li>Upload and schedule content to your connected social media platforms</li>
                <li>Improve our AI-powered features (transcription, content generation, etc.)</li>
                <li>Maintain and improve our service quality</li>
                <li>Comply with legal obligations</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Data Sharing and Disclosure</h2>
            <div className="text-gray-700 space-y-3">
              <p>We do not sell your personal information. We may share your data only in the following circumstances:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Service Providers:</strong> With third-party services (OpenAI, Pexels, Pixabay) necessary for our features</li>
                <li><strong>Social Media Platforms:</strong> Content you choose to upload is shared with your connected platforms per your instructions</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Data Security</h2>
            <p className="text-gray-700">
              We implement industry-standard security measures to protect your data, including encryption, secure authentication, and regular security audits. However, no method of transmission over the internet is 100% secure.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Your Rights</h2>
            <div className="text-gray-700 space-y-3">
              <p>You have the right to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Access your personal data</li>
                <li>Request correction of inaccurate data</li>
                <li>Request deletion of your data (see Data Deletion section)</li>
                <li>Withdraw consent for data processing</li>
                <li>Export your data</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Data Retention</h2>
            <p className="text-gray-700">
              We retain your data only as long as necessary to provide our services or as required by law. When you delete your account, we will delete or anonymize your personal data within 30 days, except where we are required to retain it for legal purposes.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Children's Privacy</h2>
            <p className="text-gray-700">
              Our service is not intended for users under the age of 13. We do not knowingly collect personal information from children under 13.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. International Data Transfers</h2>
            <p className="text-gray-700">
              Your information may be transferred to and processed in countries other than your country of residence. We ensure appropriate safeguards are in place to protect your data.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Changes to This Policy</h2>
            <p className="text-gray-700">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.
            </p>
          </section>

          <section className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Mail className="w-6 h-6" />
              11. Contact Us
            </h2>
            <p className="text-gray-700">
              If you have questions about this Privacy Policy or wish to exercise your rights, please contact us:
            </p>
            <div className="mt-4 space-y-2">
              <p className="text-gray-700"><strong>Email:</strong> blake@ivytutoring.net</p>
              <p className="text-gray-700"><strong>Data Protection Officer:</strong> Available upon request</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

