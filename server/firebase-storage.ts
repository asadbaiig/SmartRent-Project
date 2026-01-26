import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  setDoc,
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import type { 
  User, 
  InsertUser, 
  Property, 
  InsertProperty, 
  Contract, 
  InsertContract, 
  Payment, 
  InsertPayment, 
  Document, 
  InsertDocument, 
  Dispute, 
  InsertDispute 
} from '@shared/schema';

// Helper function to convert Firestore timestamp to Date
const convertTimestamp = (timestamp: any): Date => {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  return timestamp;
};

// Helper function to prepare data for Firestore
const prepareForFirestore = (data: any) => {
  const prepared = { ...data };
  
  // Remove undefined values
  Object.keys(prepared).forEach(key => {
    if (prepared[key] === undefined) {
      delete prepared[key];
    }
  });
  
  if (prepared.createdAt) prepared.createdAt = serverTimestamp();
  if (prepared.updatedAt) prepared.updatedAt = serverTimestamp();
  return prepared;
};

export class FirebaseStorage {
  // User operations
  async createUser(userData: InsertUser & { id?: string }): Promise<User> {
    let docRef;
    
    if (userData.id) {
      // Use custom ID (Firebase UID)
      docRef = doc(db, 'users', userData.id);
      await setDoc(docRef, prepareForFirestore(userData));
    } else {
      // Generate new ID
      docRef = await addDoc(collection(db, 'users'), prepareForFirestore(userData));
    }
    
    const user = await this.getUserById(docRef.id);
    return user!;
  }

  async getUserById(id: string): Promise<User | null> {
    const docRef = doc(db, 'users', id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt)
      } as User;
    }
    return null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const q = query(collection(db, 'users'), where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt)
      } as User;
    }
    return null;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const docRef = doc(db, 'users', id);
    await updateDoc(docRef, { ...updates, updatedAt: serverTimestamp() });
    return this.getUserById(id);
  }

  // Property operations
  async createProperty(propertyData: InsertProperty): Promise<Property> {
    const docRef = await addDoc(
      collection(db, 'properties'),
      {
        ...prepareForFirestore(propertyData),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }
    );
    const property = await this.getPropertyById(docRef.id);
    return property!;
  }

  async getPropertyById(id: string): Promise<Property | null> {
    const docRef = doc(db, 'properties', id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt)
      } as Property;
    }
    return null;
  }

  async getPropertiesByLandlord(landlordId: string): Promise<Property[]> {
    const q = query(
      collection(db, 'properties'), 
      where('landlordId', '==', landlordId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt)
      } as Property;
    });
  }

  async getAvailableProperties(): Promise<Property[]> {
    // Simplified query to avoid index requirements
    const q = query(collection(db, 'properties'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: convertTimestamp(data.createdAt),
          updatedAt: convertTimestamp(data.updatedAt)
        } as Property;
      })
      .filter(property => property.isAvailable === true)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getProperties(filters: any = {}): Promise<Property[]> {
    // Simplified query to avoid index requirements
    const q = query(collection(db, 'properties'));
    const querySnapshot = await getDocs(q);
    
    let results = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt)
      } as Property;
    });

    // Apply filters in memory to avoid index requirements
    if (filters.city) {
      results = results.filter(property => property.city === filters.city);
    }
    if (filters.propertyType) {
      results = results.filter(property => property.propertyType === filters.propertyType);
    }
    if (filters.minRent !== undefined) {
      results = results.filter(property => Number(property.monthlyRent) >= filters.minRent);
    }
    if (filters.maxRent !== undefined) {
      results = results.filter(property => Number(property.monthlyRent) <= filters.maxRent);
    }
    if (filters.bedrooms !== undefined) {
      results = results.filter(property => property.bedrooms === filters.bedrooms);
    }
    if (filters.isAvailable !== undefined) {
      results = results.filter(property => property.isAvailable === filters.isAvailable);
    }

    // Sort by creation date
    results.sort((a, b) => {
      const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
      const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
      return bTime - aTime;
    });

    // Apply limit and offset if specified
    if (filters.offset) {
      results = results.slice(filters.offset);
    }
    if (filters.limit) {
      results = results.slice(0, filters.limit);
    }

    return results;
  }

  async getProperty(id: string): Promise<Property | null> {
    return this.getPropertyById(id);
  }

  async deleteProperty(id: string): Promise<void> {
    const docRef = doc(db, 'properties', id);
    await deleteDoc(docRef);
  }

  async updateProperty(id: string, updates: Partial<Property>): Promise<Property | null> {
    const docRef = doc(db, 'properties', id);
    await updateDoc(docRef, { ...updates, updatedAt: serverTimestamp() });
    return this.getPropertyById(id);
  }

  // Contract operations
  async createContract(contractData: InsertContract): Promise<Contract> {
    const docRef = await addDoc(collection(db, 'contracts'), prepareForFirestore(contractData));
    const contract = await this.getContractById(docRef.id);
    
    // Store on blockchain if enabled
    if (contract) {
      const { blockchainService } = await import('./blockchain-service');
      if (blockchainService.isEnabled()) {
        try {
          // Generate default blockchain addresses if not provided
          const landlordAddress = contractData.landlordId || "0x0000000000000000000000000000000000000001";
          const tenantAddress = contractData.tenantId || "0x0000000000000000000000000000000000000002";
          
          const blockchainHash = await blockchainService.createContract({
            contractId: contract.id,
            propertyId: contract.propertyId,
            landlordAddress,
            tenantAddress,
            monthlyRent: contractData.monthlyRent.toString(),
            securityDeposit: contractData.securityDeposit.toString(),
            startDate: contract.startDate,
            endDate: contract.endDate,
            terms: contractData.terms || {},
            status: 0 // draft
          });
          
          if (blockchainHash) {
            // Update the contract with blockchain hash
            await updateDoc(docRef, { blockchainHash });
            contract.blockchainHash = blockchainHash;
            console.log(`[Firebase] Contract ${contract.id} stored on blockchain: ${blockchainHash}`);
          }
        } catch (blockchainError: any) {
          console.error(`[Firebase] Failed to store contract ${contract.id} on blockchain:`, blockchainError.message);
          // Don't fail the contract creation if blockchain fails
        }
      }
    }
    
    return contract!;
  }

  async getContractById(id: string): Promise<Contract | null> {
    const docRef = doc(db, 'contracts', id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        startDate: convertTimestamp(data.startDate),
        endDate: convertTimestamp(data.endDate),
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt)
      } as Contract;
    }
    return null;
  }

  async getContractsByUser(userId: string): Promise<Contract[]> {
    const q = query(
      collection(db, 'contracts'), 
      where('tenantId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        startDate: convertTimestamp(data.startDate),
        endDate: convertTimestamp(data.endDate),
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt)
      } as Contract;
    });
  }

  async updateContract(id: string, updates: Partial<Contract>): Promise<Contract | null> {
    const docRef = doc(db, 'contracts', id);
    await updateDoc(docRef, { ...updates, updatedAt: serverTimestamp() });
    return this.getContractById(id);
  }

  async getContracts(filters: any = {}): Promise<Contract[]> {
    let q = collection(db, 'contracts');
    const constraints: any[] = [];

    if (filters.landlordId) {
      constraints.push(where('landlordId', '==', filters.landlordId));
    }
    if (filters.tenantId) {
      constraints.push(where('tenantId', '==', filters.tenantId));
    }

    if (constraints.length > 0) {
      q = query(q, ...constraints, orderBy('createdAt', 'desc'));
    } else {
      q = query(q, orderBy('createdAt', 'desc'));
    }

    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        startDate: convertTimestamp(data.startDate),
        endDate: convertTimestamp(data.endDate),
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt)
      } as Contract;
    });
  }

  async getContract(id: string): Promise<Contract | null> {
    return this.getContractById(id);
  }

  async deleteContract(id: string): Promise<void> {
    const docRef = doc(db, 'contracts', id);
    await deleteDoc(docRef);
  }

  // Payment operations
  async createPayment(paymentData: InsertPayment): Promise<Payment> {
    const docRef = await addDoc(collection(db, 'payments'), prepareForFirestore(paymentData));
    const payment = await this.getPaymentById(docRef.id);
    return payment!;
  }

  async getPaymentById(id: string): Promise<Payment | null> {
    const docRef = doc(db, 'payments', id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        dueDate: convertTimestamp(data.dueDate),
        paidDate: data.paidDate ? convertTimestamp(data.paidDate) : null,
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt)
      } as Payment;
    }
    return null;
  }

  async getPaymentsByContract(contractId: string): Promise<Payment[]> {
    const q = query(
      collection(db, 'payments'), 
      where('contractId', '==', contractId),
      orderBy('dueDate', 'asc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        dueDate: convertTimestamp(data.dueDate),
        paidDate: data.paidDate ? convertTimestamp(data.paidDate) : null,
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt)
      } as Payment;
    });
  }

  async updatePayment(id: string, updates: Partial<Payment>): Promise<Payment | null> {
    const docRef = doc(db, 'payments', id);
    await updateDoc(docRef, { ...updates, updatedAt: serverTimestamp() });
    return this.getPaymentById(id);
  }

  async getPayments(filters: any = {}): Promise<Payment[]> {
    let q = collection(db, 'payments');
    const constraints: any[] = [];

    if (filters.contractId) {
      constraints.push(where('contractId', '==', filters.contractId));
    }
    if (filters.tenantId) {
      constraints.push(where('tenantId', '==', filters.tenantId));
    }
    if (filters.landlordId) {
      constraints.push(where('landlordId', '==', filters.landlordId));
    }

    if (constraints.length > 0) {
      q = query(q, ...constraints, orderBy('dueDate', 'asc'));
    } else {
      q = query(q, orderBy('dueDate', 'asc'));
    }

    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        dueDate: convertTimestamp(data.dueDate),
        paidDate: data.paidDate ? convertTimestamp(data.paidDate) : null,
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt)
      } as Payment;
    });
  }

  async getPayment(id: string): Promise<Payment | null> {
    return this.getPaymentById(id);
  }

  // Document operations
  async createDocument(documentData: InsertDocument): Promise<Document> {
    const docRef = await addDoc(collection(db, 'documents'), prepareForFirestore(documentData));
    const document = await this.getDocumentById(docRef.id);
    return document!;
  }

  async getDocumentById(id: string): Promise<Document | null> {
    const docRef = doc(db, 'documents', id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        createdAt: convertTimestamp(data.createdAt)
      } as Document;
    }
    return null;
  }

  async getDocumentsByUser(userId: string): Promise<Document[]> {
    const q = query(
      collection(db, 'documents'), 
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: convertTimestamp(data.createdAt)
      } as Document;
    });
  }

  async getDocuments(filters: any = {}): Promise<Document[]> {
    let q = collection(db, 'documents');
    const constraints: any[] = [];

    if (filters.userId) {
      constraints.push(where('userId', '==', filters.userId));
    }
    if (filters.propertyId) {
      constraints.push(where('propertyId', '==', filters.propertyId));
    }
    if (filters.contractId) {
      constraints.push(where('contractId', '==', filters.contractId));
    }

    if (constraints.length > 0) {
      q = query(q, ...constraints, orderBy('createdAt', 'desc'));
    } else {
      q = query(q, orderBy('createdAt', 'desc'));
    }

    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: convertTimestamp(data.createdAt)
      } as Document;
    });
  }

  // Dispute operations
  async createDispute(disputeData: InsertDispute): Promise<Dispute> {
    const docRef = await addDoc(collection(db, 'disputes'), prepareForFirestore(disputeData));
    const dispute = await this.getDisputeById(docRef.id);
    return dispute!;
  }

  async getDisputeById(id: string): Promise<Dispute | null> {
    const docRef = doc(db, 'disputes', id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        resolvedAt: data.resolvedAt ? convertTimestamp(data.resolvedAt) : null,
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt)
      } as Dispute;
    }
    return null;
  }

  async getDisputesByContract(contractId: string): Promise<Dispute[]> {
    const q = query(
      collection(db, 'disputes'), 
      where('contractId', '==', contractId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        resolvedAt: data.resolvedAt ? convertTimestamp(data.resolvedAt) : null,
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt)
      } as Dispute;
    });
  }

  async updateDispute(id: string, updates: Partial<Dispute>): Promise<Dispute | null> {
    const docRef = doc(db, 'disputes', id);
    await updateDoc(docRef, { ...updates, updatedAt: serverTimestamp() });
    return this.getDisputeById(id);
  }

  async getDisputes(filters: any = {}): Promise<Dispute[]> {
    let q = collection(db, 'disputes');
    const constraints: any[] = [];

    if (filters.contractId) {
      constraints.push(where('contractId', '==', filters.contractId));
    }

    if (constraints.length > 0) {
      q = query(q, ...constraints, orderBy('createdAt', 'desc'));
    } else {
      q = query(q, orderBy('createdAt', 'desc'));
    }

    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        resolvedAt: data.resolvedAt ? convertTimestamp(data.resolvedAt) : null,
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt)
      } as Dispute;
    });
  }

  // Utility methods for stats and other operations
  async getAllUsers(): Promise<User[]> {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt)
      } as User;
    });
  }

  async updateUserVerificationStatus(userId: string, status: string, notes?: string): Promise<User | null> {
    const updates: any = { verificationStatus: status as any };
    if (notes) {
      updates.verificationNotes = notes;
    }
    return this.updateUser(userId, updates);
  }

  async getLandlordStats(landlordId: string): Promise<any> {
    const properties = await this.getPropertiesByLandlord(landlordId);
    const contracts = await this.getContracts({ landlordId });
    
    return {
      totalProperties: properties.length,
      activeContracts: contracts.filter(c => c.status === 'active').length,
      totalRent: properties.reduce((sum, p) => sum + Number(p.monthlyRent), 0)
    };
  }

  async getTenantStats(tenantId: string): Promise<any> {
    const contracts = await this.getContracts({ tenantId });
    const payments = await this.getPayments({ tenantId });
    
    return {
      activeContracts: contracts.filter(c => c.status === 'active').length,
      totalPayments: payments.length,
      overduePayments: payments.filter(p => p.status === 'overdue').length
    };
  }

  async getAdminStats(): Promise<any> {
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const propertiesSnapshot = await getDocs(collection(db, 'properties'));
    const contractsSnapshot = await getDocs(collection(db, 'contracts'));
    
    return {
      totalUsers: usersSnapshot.size,
      totalProperties: propertiesSnapshot.size,
      totalContracts: contractsSnapshot.size
    };
  }

  // Message operations
  async createMessage(data: {
    senderId: string;
    receiverId: string;
    propertyId: string;
    message: string;
  }): Promise<any> {
    const messagesRef = collection(db, 'messages');
    const messageData = {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const docRef = await addDoc(messagesRef, messageData);
    const doc = await getDoc(docRef);
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: convertTimestamp(doc.data()?.createdAt),
    };
  }

  async getMessages(filters: {
    propertyId?: string;
    userId?: string;
    senderId?: string;
    receiverId?: string;
  }): Promise<any[]> {
    const messagesRef = collection(db, 'messages');
    
    if (filters.propertyId && filters.senderId && filters.receiverId) {
      // Get messages between two users for a property
      const q1 = query(
        messagesRef,
        where('propertyId', '==', filters.propertyId),
        where('senderId', '==', filters.senderId),
        where('receiverId', '==', filters.receiverId)
      );
      const q2 = query(
        messagesRef,
        where('propertyId', '==', filters.propertyId),
        where('senderId', '==', filters.receiverId),
        where('receiverId', '==', filters.senderId)
      );
      
      const [snapshot1, snapshot2] = await Promise.all([
        getDocs(q1),
        getDocs(q2),
      ]);
      
      const messages = [
        ...snapshot1.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: convertTimestamp(doc.data()?.createdAt),
        })),
        ...snapshot2.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: convertTimestamp(doc.data()?.createdAt),
        })),
      ];
      
      return messages.sort((a, b) => {
        const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
        const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
        return aTime - bTime;
      });
    }
    
    // Fallback: get all messages for property
    let q = query(messagesRef, where('propertyId', '==', filters.propertyId || ''));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: convertTimestamp(doc.data()?.createdAt),
    })).sort((a, b) => {
      const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
      const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
      return aTime - bTime;
    });
  }
}

export const firebaseStorage = new FirebaseStorage();
