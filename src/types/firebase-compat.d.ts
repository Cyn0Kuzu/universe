// Firebase Compat Type Declarations
// This file provides type declarations for firebase.compat modules
declare module 'firebase/compat/app' {
  import { default as firebase } from 'firebase/compat';
  export default firebase;
}

declare module 'firebase/compat' {
  namespace firebase {
    namespace auth {
      interface User {
        uid: string;
        email: string | null;
        displayName: string | null;
        emailVerified: boolean;
        photoURL: string | null;
        [key: string]: any;
      }
      
      interface UserCredential {
        user: User;
        [key: string]: any;
      }
      
      interface AuthCredential {
        providerId: string;
        [key: string]: any;
      }
      
      class EmailAuthProvider {
        static credential(email: string, password: string): AuthCredential;
      }
      
      interface Auth {
        currentUser: User | null;
        onAuthStateChanged(callback: (user: User | null) => void): () => void;
        signInWithEmailAndPassword(email: string, password: string): Promise<UserCredential>;
        signOut(): Promise<void>;
        EmailAuthProvider: typeof EmailAuthProvider;
        [key: string]: any;
      }
    }
    
    namespace firestore {
      interface Timestamp {
        seconds: number;
        nanoseconds: number;
        toDate(): Date;
        toMillis(): number;
      }
      
      interface Firestore {
        collection(collectionPath: string): CollectionReference;
        collectionGroup(collectionId: string): Query;
        doc(documentPath: string): DocumentReference;
        runTransaction<T>(updateFunction: (transaction: Transaction) => Promise<T>): Promise<T>;
        batch(): WriteBatch;
        FieldValue: {
          serverTimestamp(): any;
          arrayUnion(...elements: any[]): any;
          arrayRemove(...elements: any[]): any;
          increment(n: number): any;
          delete(): any;
        };
      }
      
      interface WriteBatch {
        set(documentRef: DocumentReference, data: any, options?: { merge?: boolean }): WriteBatch;
        update(documentRef: DocumentReference, data: any): WriteBatch;
        delete(documentRef: DocumentReference): WriteBatch;
        commit(): Promise<void>;
      }
      
      interface CollectionReference extends Query {
        id: string;
        path: string;
        doc(documentPath?: string): DocumentReference;
        add(data: any): Promise<DocumentReference>;
      }
      
      interface DocumentReference {
        id: string;
        path: string;
        get(): Promise<DocumentSnapshot>;
        set(data: any, options?: { merge?: boolean }): Promise<void>;
        update(data: any): Promise<void>;
        delete(): Promise<void>;
        collection(collectionPath: string): CollectionReference;
        onSnapshot(
          next: (snapshot: DocumentSnapshot) => void,
          error?: (error: any) => void
        ): () => void;
        ref: DocumentReference;
      }
      
      interface DocumentSnapshot {
        id: string;
        data(): any;
        exists: boolean;
        ref: DocumentReference;
        metadata?: {
          fromCache: boolean;
          hasPendingWrites: boolean;
        };
      }
      
      interface Query {
        where(field: string, opStr: any, value: any): Query;
        orderBy(field: string, direction?: 'asc' | 'desc'): Query;
        limit(n: number): Query;
        startAfter(...fieldValues: any[]): Query;
        get(): Promise<QuerySnapshot>;
        onSnapshot(
          next: (snapshot: QuerySnapshot) => void, 
          error?: (error: any) => void
        ): () => void;
      }
      
      interface QuerySnapshot {
        docs: DocumentSnapshot[];
        forEach(callback: (doc: DocumentSnapshot) => void): void;
        docChanges(): DocumentChange[];
        empty: boolean;
        size: number;
        metadata?: {
          fromCache: boolean;
          hasPendingWrites: boolean;
        };
      }
      
      interface DocumentChange {
        type: 'added' | 'modified' | 'removed';
        doc: DocumentSnapshot;
      }
      
      type DocumentChangeType = 'added' | 'modified' | 'removed';
      
      interface Transaction {
        get(documentRef: DocumentReference): Promise<DocumentSnapshot>;
        set(documentRef: DocumentReference, data: any, options?: any): Transaction;
        update(documentRef: DocumentReference, data: any): Transaction;
        delete(documentRef: DocumentReference): Transaction;
      }
      
      class Timestamp {
        static now(): Timestamp;
        static fromDate(date: Date): Timestamp;
        static fromMillis(milliseconds: number): Timestamp;
      }
      
      const FieldValue: {
        serverTimestamp(): any;
        arrayUnion(...elements: any[]): any;
        arrayRemove(...elements: any[]): any;
        increment(n: number): any;
        delete(): any;
      };
    }
    
    interface FirebaseApp {
      auth(): firebase.auth.Auth;
      firestore(): firebase.firestore.Firestore;
      [key: string]: any;
    }
    
    const apps: FirebaseApp[];
    
    function auth(): firebase.auth.Auth;
    function firestore(): firebase.firestore.Firestore;
    
    function initializeApp(config: any): FirebaseApp;
    
    type User = firebase.auth.User;
  }
  
  // Default export interface
  interface FirebaseNamespace {
    apps: firebase.FirebaseApp[];
    auth(): firebase.auth.Auth;
    firestore(): firebase.firestore.Firestore;
    initializeApp(config: any): firebase.FirebaseApp;
    User: firebase.auth.User;
    firestore: {
      Timestamp: typeof firebase.firestore.Timestamp;
      FieldValue: typeof firebase.firestore.FieldValue;
    };
  }
  
  const firebase: FirebaseNamespace & {
    auth: {
      User: firebase.auth.User;
      UserCredential: firebase.auth.UserCredential;
      EmailAuthProvider: typeof firebase.auth.EmailAuthProvider;
    };
    firestore: {
      Timestamp: typeof firebase.firestore.Timestamp;
      FieldValue: typeof firebase.firestore.FieldValue;
    };
  };
  export default firebase;
}
