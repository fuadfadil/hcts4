'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, XCircle, Clock, QrCode, Search } from 'lucide-react';
import Image from 'next/image';

interface VerificationResult {
  certificateNumber: string;
  status: 'valid' | 'expired' | 'not_found';
  isValid: boolean;
  statusMessage: string;
  issuedAt: string;
  expiresAt: string;
  service: {
    name: string;
    icd11Code: string;
  };
  transaction: {
    quantity: number;
    totalPrice: string;
    createdAt: string;
  };
  buyer: {
    organizationName: string;
  };
  seller: {
    organizationName: string;
  };
  verification: {
    hash: string;
    signature: string;
    qrValid: boolean;
  };
}

export function CertificateVerifier() {
  const [certificateNumber, setCertificateNumber] = useState('');
  const [qrData, setQrData] = useState('');
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    if (!certificateNumber.trim() && !qrData.trim()) {
      setError('Please enter a certificate number or scan a QR code');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const verifyData = qrData.trim() || certificateNumber.trim();
      const response = await fetch(`/api/certificates/verify/${encodeURIComponent(verifyData)}`);

      if (!response.ok) {
        throw new Error('Verification failed');
      }

      const result = await response.json();
      setVerificationResult(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
      setVerificationResult(null);
    } finally {
      setLoading(false);
    }
  };

  const getStatusDisplay = (result: VerificationResult) => {
    const statusConfig = {
      valid: { color: 'text-green-600', bgColor: 'bg-green-50', icon: CheckCircle, borderColor: 'border-green-200' },
      expired: { color: 'text-red-600', bgColor: 'bg-red-50', icon: XCircle, borderColor: 'border-red-200' },
      not_found: { color: 'text-gray-600', bgColor: 'bg-gray-50', icon: XCircle, borderColor: 'border-gray-200' },
    };

    const config = statusConfig[result.status] || statusConfig.not_found;
    const Icon = config.icon;

    return (
      <div className={`p-4 rounded-lg border ${config.bgColor} ${config.borderColor}`}>
        <div className="flex items-center gap-2">
          <Icon className={`w-5 h-5 ${config.color}`} />
          <span className={`font-medium ${config.color}`}>{result.statusMessage}</span>
        </div>
      </div>
    );
  };

  const resetForm = () => {
    setCertificateNumber('');
    setQrData('');
    setVerificationResult(null);
    setError(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Verification Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            Certificate Verification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="certificate-number">Certificate Number</Label>
              <Input
                id="certificate-number"
                value={certificateNumber}
                onChange={(e) => setCertificateNumber(e.target.value)}
                placeholder="Enter certificate number"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="qr-data">QR Code Data (Optional)</Label>
              <Input
                id="qr-data"
                value={qrData}
                onChange={(e) => setQrData(e.target.value)}
                placeholder="Paste QR code data here"
                className="mt-1"
              />
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded border border-red-200">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={handleVerify} disabled={loading} className="flex-1">
              {loading ? (
                'Verifying...'
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Verify Certificate
                </>
              )}
            </Button>
            <Button variant="outline" onClick={resetForm}>
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Verification Result */}
      {verificationResult && (
        <Card>
          <CardHeader>
            <CardTitle>Verification Result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status */}
            {getStatusDisplay(verificationResult)}

            <Separator />

            {/* Certificate Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-3">Certificate Information</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Certificate Number:</span> {verificationResult.certificateNumber}
                  </div>
                  <div>
                    <span className="font-medium">Issued:</span>{' '}
                    {new Date(verificationResult.issuedAt).toLocaleDateString()}
                  </div>
                  <div>
                    <span className="font-medium">Expires:</span>{' '}
                    {new Date(verificationResult.expiresAt).toLocaleDateString()}
                  </div>
                  <div>
                    <span className="font-medium">Verification Hash:</span>{' '}
                    <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                      {verificationResult.verification.hash}
                    </code>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Service Details</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Service:</span> {verificationResult.service.name}
                  </div>
                  <div>
                    <span className="font-medium">ICD-11 Code:</span> {verificationResult.service.icd11Code}
                  </div>
                  <div>
                    <span className="font-medium">Quantity:</span> {verificationResult.transaction.quantity}
                  </div>
                  <div>
                    <span className="font-medium">Total Price:</span> ${verificationResult.transaction.totalPrice}
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Parties */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">Buyer</h3>
                <p className="text-sm">{verificationResult.buyer.organizationName}</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Seller</h3>
                <p className="text-sm">{verificationResult.seller.organizationName}</p>
              </div>
            </div>

            <Separator />

            {/* Security Information */}
            <div>
              <h3 className="font-semibold mb-3">Security Verification</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  {verificationResult.verification.qrValid ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600" />
                  )}
                  <span>QR Code Valid</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>Hash Verified</span>
                </div>
                <div className="flex items-center gap-2">
                  {verificationResult.verification.signature === 'present' ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600" />
                  )}
                  <span>Digital Signature</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center text-xs text-muted-foreground border-t pt-4">
              <p>Verified by HCTS - Healthcare Trading Certificate System</p>
              <p>Timestamp: {new Date().toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}