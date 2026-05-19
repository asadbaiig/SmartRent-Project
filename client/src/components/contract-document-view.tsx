import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import { useMemo } from "react";

interface ContractDocumentViewProps {
  contract: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ContractDocumentView({ contract, open, onOpenChange }: ContractDocumentViewProps) {
  const { user } = useAuth();

  // Fetch property details
  const { data: property } = useQuery({
    queryKey: ['/api/properties', contract?.propertyId],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/properties/${contract.propertyId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!contract?.propertyId && open,
  });

  // Fetch landlord details
  const { data: landlordData } = useQuery({
    queryKey: ['/api/users/by-email', contract?.landlordEmail],
    queryFn: async () => {
      if (!contract?.landlordEmail) return null;
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/users/by-email?email=${encodeURIComponent(contract.landlordEmail)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!contract?.landlordEmail && open,
  });

  // Fetch tenant details
  const { data: tenantData } = useQuery({
    queryKey: ['/api/users/by-email', contract?.tenantEmail],
    queryFn: async () => {
      if (!contract?.tenantEmail) return null;
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/users/by-email?email=${encodeURIComponent(contract.tenantEmail)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!contract?.tenantEmail && open,
  });

  const landlord = landlordData || (contract.landlordEmail ? {
    email: contract.landlordEmail,
    fullName: contract.landlordEmail.split('@')[0],
    cnicNumber: null,
  } : null);

  const tenant = tenantData || (contract.tenantEmail ? {
    email: contract.tenantEmail,
    fullName: contract.tenantEmail.split('@')[0],
    cnicNumber: null,
  } : null);

  if (!contract) return null;

  const formatDate = (date: string | Date) => {
    const d = new Date(date);
    const day = d.getDate();
    const month = d.toLocaleString('en-US', { month: 'long' });
    const year = d.getFullYear();
    const daySuffix = day === 1 || day === 21 || day === 31 ? 'st' : 
                     day === 2 || day === 22 ? 'nd' : 
                     day === 3 || day === 23 ? 'rd' : 'th';
    return `${day}${daySuffix} day of ${month}, ${year}`;
  };

  const formatDateShort = (date: string | Date) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatCurrency = (amount: string | number) => {
    const num = Number(amount);
    const words = num.toLocaleString('en-US');
    return `Rs. ${words}/-`;
  };

  const formatCurrencyWords = (amount: string | number) => {
    const num = Math.floor(Number(amount));
    if (num === 0) return 'Zero';
    
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    const convertHundreds = (n: number): string => {
      if (n === 0) return '';
      if (n < 10) return ones[n];
      if (n < 20) return teens[n - 10];
      if (n < 100) {
        const ten = Math.floor(n / 10);
        const one = n % 10;
        return tens[ten] + (one ? ' ' + ones[one] : '');
      }
      const hundred = Math.floor(n / 100);
      const remainder = n % 100;
      return ones[hundred] + ' Hundred' + (remainder ? ' ' + convertHundreds(remainder) : '');
    };
    
    if (num < 1000) return convertHundreds(num);
    
    const convert = (n: number): string => {
      if (n < 1000) return convertHundreds(n);
      if (n < 100000) {
        const thousand = Math.floor(n / 1000);
        const remainder = n % 1000;
        return convertHundreds(thousand) + ' Thousand' + (remainder ? ' ' + convertHundreds(remainder) : '');
      }
      if (n < 10000000) {
        const lakh = Math.floor(n / 100000);
        const remainder = n % 100000;
        return convertHundreds(lakh) + ' Lakh' + (remainder ? ' ' + convert(remainder) : '');
      }
      const crore = Math.floor(n / 10000000);
      const remainder = n % 10000000;
      return convertHundreds(crore) + ' Crore' + (remainder ? ' ' + convert(remainder) : '');
    };
    
    return convert(num);
  };

  const landlordName = landlord?.fullName || contract.landlordEmail?.split('@')[0] || 'Landlord';
  const tenantName = contract.terms?.tenantName || tenant?.fullName || contract.tenantEmail?.split('@')[0] || 'Tenant';
  // Get CNIC from contract terms first, then from user profile, then default
  const landlordCNIC = contract.terms?.landlordCNIC || landlord?.cnicNumber || 'Not provided';
  const tenantCNIC = contract.terms?.tenantCNIC || tenant?.cnicNumber || 'Not provided';
  const landlordAddress = property?.address || 'Address not provided';
  const tenantAddress = 'Address not provided';
  const propertyAddress = property?.address || property?.title || contract.propertyId || 'Property Address';

  const startDate = formatDate(contract.startDate);
  const endDate = formatDate(contract.endDate);
  const contractDate = formatDate(contract.createdAt || contract.startDate);
  const monthlyRent = formatCurrency(contract.monthlyRent);
  const monthlyRentWords = formatCurrencyWords(Number(contract.monthlyRent));
  const securityDeposit = formatCurrency(contract.securityDeposit);
  const securityDepositWords = formatCurrencyWords(Number(contract.securityDeposit));

  // Calculate duration in months
  const start = new Date(contract.startDate);
  const end = new Date(contract.endDate);
  const months = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));

  const landlordSignature = contract.digitalSignature?.landlord || null;
  
  // Default tenant signature - a simple text-based signature with tenant name
  const defaultTenantSignature = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 80;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    // Set font and style
    ctx.font = 'italic 24px Arial';
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Draw tenant name as signature
    const signatureText = tenantName || 'Tenant';
    ctx.fillText(signatureText, canvas.width / 2, canvas.height / 2);
    
    // Add a simple underline
    ctx.beginPath();
    ctx.moveTo(canvas.width * 0.2, canvas.height * 0.7);
    ctx.lineTo(canvas.width * 0.8, canvas.height * 0.7);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    return canvas.toDataURL('image/png');
  }, [tenantName]);
  
  // Use tenant signature if available, otherwise use default
  const tenantSignature = contract.digitalSignature?.tenant || defaultTenantSignature;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Rental Agreement - ${contract.id}</title>
          <style>
            ${document.querySelector('#contract-document-styles')?.textContent || ''}
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          ${document.querySelector('#contract-document-content')?.innerHTML || ''}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <>
      <style id="contract-document-styles">{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
          .contract-document { box-shadow: none; }
        }
        .contract-document {
          font-family: 'Times New Roman', serif;
          line-height: 1.8;
          color: #000;
        }
      `}</style>
      
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto no-print">
          <DialogHeader className="no-print">
            <div className="flex justify-between items-center">
              <DialogTitle>Rental Agreement</DialogTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div id="contract-document-content" className="contract-document bg-white p-8 md:p-12 text-black">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold mb-2">RENTAL AGREEMENT</h1>
            </div>

            <div className="mb-6">
              <p className="text-justify mb-4">
                This rent agreement is being executed on <strong>{contractDate}</strong> between{' '}
                <strong>{landlordName}</strong> {landlord?.cnicNumber ? `son of [Father's Name]` : ''} R/O {landlordAddress}{' '}
                (hereinafter called as <strong>LANDLORD-FIRST PARTY</strong>)
              </p>
              <div className="text-center my-4">
                <strong>AND</strong>
              </div>
              <p className="text-justify mb-4">
                <strong>{tenantName}</strong> {tenant?.cnicNumber ? `son of [Father's Name]` : ''} R/O {tenantAddress}{' '}
                (hereinafter called the <strong>TENANT-SECOND PARTY</strong>)
              </p>
            </div>

            <div className="mb-6">
              <p className="text-justify mb-4">
                WHEREAS, the said first party is the absolute owner in possession of{' '}
                <strong>{propertyAddress}</strong> and has agreed to let out the said property on monthly rent basis to the Tenant and Tenant has agreed on the same, with the following terms and conditions.
              </p>
            </div>

            <div className="mb-6 space-y-4">
              <p className="text-justify">
                <strong>1.</strong> That the rent of the above-stated property has been fixed as{' '}
                <strong>{monthlyRent} (Rupees {monthlyRentWords} only)</strong> per month which will always be paid in advance within 20-25th day of every month, against a receipt in writing of a receipt thereof. Also a refundable Security Deposit of{' '}
                <strong>{securityDeposit} (Rupees {securityDepositWords} only)</strong> has been paid from the Second Party to first party which is refundable at the time of vacation of the said property by the Second Party adjusting therewith unpaid utility bills, unpaid monthly rent, etc., if any –
              </p>

              <p className="text-justify">
                <strong>2.</strong> That the tenancy period is for <strong>{months} months</strong> i.e from{' '}
                <strong>{formatDateShort(contract.startDate)}</strong> to <strong>{formatDateShort(contract.endDate)}</strong>.
              </p>

              <p className="text-justify">
                <strong>3.</strong> That one month's notice from either party for the vacation of the said property is mandatory, e.g. if Second Party wishes to vacate the said property and hand over to the First Party or the First Party wishes to get the said property vacated from the Second Party
              </p>

              <p className="text-justify">
                <strong>4.</strong> That the Second Party is not allowed to make any sort of change in the structure of the property without the written prior approval of the First Party. That the Second Party will utilize the property only and only for the residential purposes within framework of the law and rule of the Islamic Republic of Pakistan any illegal activity, detected would tend to revocation of the instant Rent Agreement and the property will be got vacated from Second Party without serving upon him any notice in writing
              </p>

              <p className="text-justify">
                <strong>5.</strong> That the Second Party will not sub-let the property wholly or partially.
              </p>

              <p className="text-justify">
                <strong>6.</strong> That the possession of the property will physically be handed over to the First Party on the expiry of the instant agreement
              </p>

              <p className="text-justify">
                <strong>7.</strong> That the Second Party will hand over the possession of the property back to the First Party in the condition it was given to him. He will be fully responsible for repair or replacement of any wear and tear in the property.
              </p>

              <p className="text-justify">
                <strong>8.</strong> That the Second Party will be solely responsible for the payment of all sort of Utility Bills i.e. Electricity, Gas, etc., and give back the paid bills to the First Party.
              </p>

              <p className="text-justify">
                <strong>9.</strong> That the First Party or his agent(s) shall have the right at all reasonable times during the term of this Rent Agreement and any renewal of this Lease Agreement to enter the said property for the purpose of inspecting the premises and / or making any repairs to the premises or other item as required under this Rent Agreement.
              </p>

              <p className="text-justify">
                <strong>10.</strong> That breach of any of the above terms and conditions will tend to vacation of the property by the Second Party without serving any kind of notice.
              </p>
            </div>

            {contract.terms?.customTerms && (
              <div className="mb-6">
                <p className="text-justify">
                  <strong>11.</strong> Additional Terms: {contract.terms.customTerms}
                </p>
              </div>
            )}

            <div className="mb-6">
              <p className="text-justify">
                Now, therefore, this Tenancy Agreement has been drafted, read and understood by both the parties and signed before the presents on the date, month and the year mentioned above.
              </p>
            </div>

            <div className="mt-12 space-y-8">
              <div className="flex justify-between">
                <div className="flex-1">
                  <p className="mb-2">Landlord-First party ________</p>
                  <p className="font-semibold">{landlordName}</p>
                  <p className="text-sm">CNIC No. {landlordCNIC}</p>
                  {landlordSignature && (
                    <div className="mt-4">
                      <img src={landlordSignature} alt="Landlord Signature" className="h-16 w-auto" />
                    </div>
                  )}
                </div>
                <div className="flex-1 text-right">
                  <p className="mb-2">Second Party-Tenant ________</p>
                  <p className="font-semibold">{tenantName}</p>
                  <p className="text-sm">CNIC No. {tenantCNIC}</p>
                  {tenantSignature && (
                    <div className="mt-4 flex justify-end">
                      <img src={tenantSignature} alt="Tenant Signature" className="h-16 w-auto" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
