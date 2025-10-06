'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Download, QrCode, CheckCircle, XCircle, Clock } from 'lucide-react';
import Image from 'next/image';

interface CertificateData {
  id: number;
  certificateNumber: string;
  status: 'valid' | 'expired' | 'revoked' | 'suspended';
  issuedAt: string;
  expiresAt: string;
  qrCodeData: string;
  verificationHash: string;
  service: {
    name: string;
    description?: string;
    icd11Code: string;
  };
  transaction: {
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    createdAt: string;
  };
  buyer: {
    organizationName: string;
  };
  seller: {
    organizationName: string;
  };
}

interface CertificateViewerProps {
  certificateId: number;
  onDownload?: (certificateId: number) => void;
}

export function CertificateViewer({ certificateId, onDownload }: CertificateViewerProps) {
  const [certificate, setCertificate] = useState<CertificateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCertificate();
  }, [certificateId]);

  const fetchCertificate = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/certificates/${certificateId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch certificate');
      }

      const result = await response.json();
      setCertificate(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      valid: { variant: 'default' as const, icon: CheckCircle, color: 'text-green-600' },
      expired: { variant: 'destructive' as const, icon: XCircle, color: 'text-red-600' },
      revoked: { variant: 'destructive' as const, icon: XCircle, color: 'text-red-600' },
      suspended: { variant: 'secondary' as const, icon: Clock, color: 'text-yellow-600' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.valid;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const handleDownload = () => {
    if (onDownload) {
      onDownload(certificateId);
    } else {
      // Default download behavior
      window.open(`/api/certificates/download/${certificateId}`, '_blank');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !certificate) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            {error || 'Certificate not found'}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-2xl">Healthcare Service Certificate</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Certificate #{certificate.certificateNumber}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(certificate.status)}
            <Button onClick={handleDownload} size="sm">
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Certificate Header */}
        <div className="text-center border-b pb-4">
          <h2 className="text-xl font-semibold text-blue-600">HCTS Digital Certificate</h2>
          <p className="text-sm text-muted-foreground">Healthcare Trading Certificate System</p>
        </div>

        {/* QR Code Section */}
        {certificate.qrCodeData && (
          <div className="flex justify-center">
            <div className="text-center">
              <div className="inline-block p-4 bg-white border rounded-lg">
                <Image
                  src={certificate.qrCodeData}
                  alt="Certificate QR Code"
                  width={150}
                  height={150}
                  className="mx-auto"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2 flex items-center justify-center gap-1">
                <QrCode className="w-3 h-3" />
                Scan for verification
              </p>
            </div>
          </div>
        )}

        <Separator />

        {/* Certificate Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Service Information */}
          <div>
            <h3 className="font-semibold mb-3">Service Information</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Service:</span> {certificate.service.name}
              </div>
              {certificate.service.description && (
                <div>
                  <span className="font-medium">Description:</span> {certificate.service.description}
                </div>
              )}
              <div>
                <span className="font-medium">ICD-11 Code:</span> {certificate.service.icd11Code}
              </div>
            </div>
          </div>

          {/* Transaction Information */}
          <div>
            <h3 className="font-semibold mb-3">Transaction Details</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Quantity:</span> {certificate.transaction.quantity}
              </div>
              <div>
                <span className="font-medium">Unit Price:</span> ${certificate.transaction.unitPrice.toFixed(2)}
              </div>
              <div>
                <span className="font-medium">Total Price:</span> ${certificate.transaction.totalPrice.toFixed(2)}
              </div>
              <div>
                <span className="font-medium">Transaction Date:</span>{' '}
                {new Date(certificate.transaction.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Parties Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-3">Buyer</h3>
            <p className="text-sm">{certificate.buyer.organizationName}</p>
          </div>
          <div>
            <h3 className="font-semibold mb-3">Seller</h3>
            <p className="text-sm">{certificate.seller.organizationName}</p>
          </div>
        </div>

        <Separator />

        {/* Certificate Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium">Issued:</span>{' '}
            {new Date(certificate.issuedAt).toLocaleDateString()}
          </div>
          <div>
            <span className="font-medium">Expires:</span>{' '}
            {new Date(certificate.expiresAt).toLocaleDateString()}
          </div>
          <div>
            <span className="font-medium">Verification Hash:</span>{' '}
            <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
              {certificate.verificationHash.substring(0, 8)}...
            </code>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground border-t pt-4">
          <p>This certificate is electronically generated and digitally signed.</p>
          <p>For verification, scan the QR code or visit the HCTS verification portal.</p>
        </div>
      </CardContent>
    </Card>
  );
}