import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function EditContractDialog({ editingContract, setIsEditDialogOpen, setEditingContract, toast, queryClient }: any) {
  const [formData, setFormData] = useState(editingContract || {});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const updateField = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };
  useEffect(() => {
    if (editingContract) setFormData(editingContract);
  }, [editingContract]);
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/contracts/${editingContract.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to update contract' }));
        throw new Error(errorData.message || 'Failed to update contract');
      }
      toast({ title: 'Success', description: 'Contract updated successfully!' });
      setIsEditDialogOpen(false);
      setEditingContract(null);
      await queryClient.refetchQueries({ queryKey: ['/api/contracts'], exact: true });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to update contract', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };
  if (!editingContract) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-bold mb-4">Edit Contract</h3>
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <Label htmlFor="monthlyRent">Monthly Rent</Label>
            <Input
              id="monthlyRent"
              type="number"
              value={formData.monthlyRent || ''}
              onChange={(e) => updateField('monthlyRent', e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="securityDeposit">Security Deposit</Label>
            <Input
              id="securityDeposit"
              type="number"
              value={formData.securityDeposit || ''}
              onChange={(e) => updateField('securityDeposit', e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="duration">Duration (months)</Label>
            <Input
              id="duration"
              type="number"
              value={formData.duration || ''}
              onChange={(e) => updateField('duration', e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="terms">Terms</Label>
            <Textarea
              id="terms"
              value={formData.terms || ''}
              onChange={(e) => updateField('terms', e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => { setIsEditDialogOpen(false); setEditingContract(null); }}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Changes'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}