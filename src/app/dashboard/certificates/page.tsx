'use client';

import { useState, useEffect } from 'react';
import { useSession } from '@/lib/auth-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CertificateViewer } from '@/components/certificates/CertificateViewer';
import {
  FileText,
  Download,
  Eye,
  Calendar,
  Building,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';

interface Certificate {
  id: number;
  certificateNumber: string;
  status: 'valid' | 'expired' | 'revoked' | 'suspended';
  issuedAt: string;
  expiresAt: string;
  verificationHash: string;
  service: {
    name: string;
    icd11Code: string;
  };
  transaction: {
    id: number;
    quantity: number;
    totalPrice: number;
    createdAt: string;
    role: 'buyer' | 'seller';
  };
}

export default function CertificatesPage() {
  const { data: session } = useSession();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCertificate, setSelectedCertificate] = useState<number | null>(null);

  useEffect(() => {
    if (session?.user?.id) {
      fetchCertificates();
    }
  }, [session]);

  const fetchCertificates = async () => {
    if (!session?.user?.id) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/certificates/user/${session.user.id}`);
      const result = await response.json();

      if (result.success) {
        setCertificates(result.data.certificates);
      }
    } catch (error) {
      console.error('Error fetching certificates:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadCertificate = async (certificateId: number) => {
    try {
      const response = await fetch(`/api/certificates/download/${certificateId}`);
      if (!response.ok) {
        throw new Error('Failed to download certificate');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificate-${certificateId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading certificate:', error);
      // TODO: Show error toast
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      valid: { variant: 'default' as const, icon: CheckCircle, color: 'text-green-600' },
      expired: { variant: 'destructive' as const, icon: XCircle, color: 'text-red-600' },
      revoked: { variant: 'destructive' as const, icon: XCircle, color: 'text-red-600' },
      suspended: { variant: 'secondary' as const, icon: AlertTriangle, color: 'text-yellow-600' },
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  if (!session) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto text-center">
          <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-bold mb-2">My Certificates</h1>
          <p className="text-muted-foreground">Sign in to view your certificates.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">My Certificates</h1>
          <p className="text-muted-foreground mt-2">
            View and manage your healthcare service certificates
          </p>
        </div>
      </div>

      {/* Certificates List */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-6 animate-pulse">
              <div className="h-4 bg-muted rounded mb-2"></div>
              <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
              <div className="flex justify-between">
                <div className="h-6 bg-muted rounded w-20"></div>
                <div className="h-6 bg-muted rounded w-24"></div>
              </div>
            </Card>
          ))}
        </div>
      ) : certificates.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">No certificates found</h3>
          <p className="text-muted-foreground">
            You don't have any certificates yet. Complete a purchase to receive a certificate.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {certificates.map((certificate) => (
            <Card key={certificate.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">
                      Certificate #{certificate.certificateNumber}
                    </h3>
                    {getStatusBadge(certificate.status)}
                    <Badge variant="outline" className="capitalize">
                      {certificate.transaction.role}
                    </Badge>
                  </div>

                  <p className="text-muted-foreground mb-3">
                    {certificate.service.name} (ICD-11: {certificate.service.icd11Code})
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">Issued</div>
                        <div className="text-muted-foreground">{formatDate(certificate.issuedAt)}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">Expires</div>
                        <div className="text-muted-foreground">{formatDate(certificate.expiresAt)}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">Quantity</div>
                        <div className="text-muted-foreground">{certificate.transaction.quantity} unit(s)</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">Value</div>
                        <div className="text-muted-foreground">{formatPrice(certificate.transaction.totalPrice)}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 ml-6">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Certificate Details</DialogTitle>
                      </DialogHeader>
                      <CertificateViewer
                        certificateId={certificate.id}
                        onDownload={(id) => downloadCertificate(id)}
                      />
                    </DialogContent>
                  </Dialog>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadCertificate(certificate.id)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}