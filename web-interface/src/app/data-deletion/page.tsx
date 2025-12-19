'use client';

import React from 'react';
import { Trash2, Mail, AlertCircle } from 'lucide-react';

export default function DataDeletion() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-8">
        <div className="flex items-center gap-3 mb-8">
          <Trash2 className="w-8 h-8 text-red-600" />
          <h1 className="text-4xl font-bold text-gray-900">Data Deletion Instructions</h1>
        </div>

        <div className="prose prose-lg max-w-none">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-blue-600 mt-1" />
              <div>
                <h3 className="text-lg font-bold text-blue-900 mb-2">Your Right to Delete Data</h3>
                <p className="text-gray-700">
                  You have the right to request deletion of your personal data at any time. This page explains how to exercise that right.
                </p>
              </div>
            </div>
          </div>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">How to Request Data Deletion</h2>
            <div className="text-gray-700 space-y-4">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="font-bold text-gray-900 mb-2">Option 1: Through the Application</h3>
                <ol className="list-decimal pl-6 space-y-2">
                  <li>Log into your Social Sync account</li>
                  <li>Navigate to Settings → Account</li>
                  <li>Click "Delete Account" or "Delete My Data"</li>
                  <li>Confirm your request</li>
                </ol>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="font-bold text-gray-900 mb-2">Option 2: Via Email Request</h3>
                <ol className="list-decimal pl-6 space-y-2">
                  <li>Send an email to <strong>blake@ivytutoring.net</strong></li>
                  <li>Subject line: "Data Deletion Request"</li>
                  <li>Include your account email address</li>
                  <li>Specify which data you want deleted (account, content, or all data)</li>
                </ol>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">What Data Will Be Deleted</h2>
            <div className="text-gray-700 space-y-3">
              <p>When you request data deletion, we will remove:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Account Information:</strong> Email, username, profile settings</li>
                <li><strong>Authentication Data:</strong> OAuth tokens and connection credentials for social media platforms</li>
                <li><strong>Content Data:</strong> Uploaded videos, processed content, and metadata</li>
                <li><strong>Usage Data:</strong> Processing history, preferences, and analytics</li>
                <li><strong>Stored Files:</strong> Videos, thumbnails, and generated content</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Data Retention Exceptions</h2>
            <div className="text-gray-700 space-y-3">
              <p>We may retain certain data in the following circumstances:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Legal Requirements:</strong> Data required to comply with legal obligations or court orders</li>
                <li><strong>Dispute Resolution:</strong> Data necessary to resolve disputes or enforce agreements</li>
                <li><strong>Backup Systems:</strong> Data in backup systems may be retained for up to 90 days</li>
                <li><strong>Anonymized Data:</strong> Aggregated, anonymized data that cannot identify you</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Processing Time</h2>
            <div className="text-gray-700 space-y-3">
              <p>We will process your deletion request within:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Immediate:</strong> Account access will be disabled immediately</li>
                <li><strong>30 Days:</strong> Most data will be deleted within 30 days</li>
                <li><strong>90 Days:</strong> All data, including backups, will be permanently deleted within 90 days</li>
              </ul>
              <p className="mt-4">You will receive a confirmation email once deletion is complete.</p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Third-Party Data</h2>
            <div className="text-gray-700 space-y-3">
              <p>Please note:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Social Media Platforms:</strong> Content already published to YouTube, Facebook, Instagram, etc., will remain on those platforms. You must delete it directly from those platforms.</li>
                <li><strong>Third-Party Services:</strong> We will revoke access tokens, but you may need to disconnect apps directly from platform settings.</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Data Export Before Deletion</h2>
            <p className="text-gray-700">
              Before deleting your account, you can export your data:
            </p>
            <ol className="list-decimal pl-6 space-y-2 text-gray-700 mt-3">
              <li>Go to Settings → Data Export</li>
              <li>Request a data export</li>
              <li>Download your data within 7 days</li>
              <li>Then proceed with deletion if desired</li>
            </ol>
          </section>

          <section className="mb-8 bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-red-600" />
              Important Notes
            </h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Data deletion is permanent and cannot be undone</li>
              <li>You will lose access to all processed content and history</li>
              <li>Make sure to export any data you want to keep before deletion</li>
              <li>Published content on social platforms will not be automatically deleted</li>
            </ul>
          </section>

          <section className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Mail className="w-6 h-6" />
              Contact for Data Deletion
            </h2>
            <p className="text-gray-700 mb-2">
              To request data deletion or if you have questions:
            </p>
            <p className="text-gray-700"><strong>Email:</strong> blake@ivytutoring.net</p>
            <p className="text-gray-700 mt-2"><strong>Subject:</strong> Data Deletion Request</p>
            <p className="text-gray-700 mt-2"><strong>Response Time:</strong> We will respond within 7 business days</p>
          </section>
        </div>
      </div>
    </div>
  );
}

