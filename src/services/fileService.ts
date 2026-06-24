import { db, isFirebaseConfigured, auth, shouldUseFirebase } from './firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  setDoc, 
  doc, 
  deleteDoc,
  orderBy,
  getDoc
} from 'firebase/firestore';

export type FileCategory = 'image' | 'video' | 'pdf' | 'other';

export interface FileRecord {
  id: string;
  uid: string;
  fileName: string;
  fileType: FileCategory;
  fileUrl: string;
  cloudinaryPublicId: string;
  createdAt: string;
  userName?: string;
  userPhotoURL?: string;
  userEmail?: string;
}

export enum FileOperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFileFirestoreError(error: unknown, operationType: FileOperationType, path: string | null): never {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
    },
    operationType,
    path
  };
  
  console.error('File Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Map file mime-type to our core categories
export function getFileCategory(mimeType: string, fileName: string): FileCategory {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')) return 'pdf';
  return 'other';
}

const cloudName = (import.meta as any).env.VITE_CLOUDINARY_CLOUD_NAME || 'dk30psxbj';
const defaultPreset = (import.meta as any).env.VITE_CLOUDINARY_UPLOAD_PRESET || 'User_files';

export const fileService = {
  // Secure server-proxied file upload to Cloudinary with accurate upload progress tracking
  async uploadToCloudinary(
    file: File, 
    onProgress?: (progress: number) => void
  ): Promise<{ fileUrl: string; publicId: string }> {
    let idToken = '';
    if (auth?.currentUser) {
      try {
        idToken = await auth.currentUser.getIdToken();
      } catch (err) {
        console.warn("Unable to fetch secure auth token for proxying file upload:", err);
      }
    }

    const url = '/api/upload';

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url, true);

      if (idToken) {
        xhr.setRequestHeader('Authorization', `Bearer ${idToken}`);
      }

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          onProgress(percentComplete);
        }
      });

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            if (response.status === "success" && response.fileDetails) {
              resolve({
                fileUrl: response.fileDetails.fileUrl,
                publicId: response.fileDetails.cloudinaryPublicId || response.fileDetails.id
              });
            } else {
              reject(new Error(response.error || "Proxy upload failed to return successful payload records."));
            }
          } catch (err) {
            reject(new Error("Failed to parse secure upload response configuration."));
          }
        } else {
          try {
            const response = JSON.parse(xhr.responseText);
            reject(new Error(response.error || "Server upload validation rejected the request."));
          } catch {
            reject(new Error(`Server-side upload rejected by proxy (Status: ${xhr.status})`));
          }
        }
      };

      xhr.onerror = () => {
        reject(new Error("Network connection error during proxy secure upload."));
      };

      const formData = new FormData();
      formData.append('file', file);

      xhr.send(formData);
    });
  },

  // Save metadata to Firestore
  async saveFileMetadata(userId: string, record: Omit<FileRecord, 'uid' | 'createdAt'>): Promise<FileRecord> {
    const fullRecord: FileRecord = {
      ...record,
      uid: userId,
      createdAt: new Date().toISOString()
    };

    if (shouldUseFirebase(userId)) {
      const pathStr = `files/${record.id}`;
      try {
        await setDoc(doc(db, 'files', record.id), fullRecord);
        return fullRecord;
      } catch (error) {
        handleFileFirestoreError(error, FileOperationType.CREATE, pathStr);
      }
    } else {
      // Offline fallback
      const cached = localStorage.getItem(`shared_files_${userId}`);
      const files: FileRecord[] = cached ? JSON.parse(cached) : [];
      files.unshift(fullRecord);
      localStorage.setItem(`shared_files_${userId}`, JSON.stringify(files));
      return fullRecord;
    }
  },

  // Fetch all shared files for Feed (and attach sender Profile fields)
  async fetchAllFiles(): Promise<FileRecord[]> {
    if (shouldUseFirebase()) {
      const pathStr = 'files';
      try {
        const q = query(collection(db, pathStr));
        const snapshot = await getDocs(q);
        const files: FileRecord[] = [];
        snapshot.forEach((doc) => {
          files.push({ id: doc.id, ...doc.data() } as FileRecord);
        });

        // Batch resolve associated user Profiles
        try {
          const userPromises = files.map(file => getDoc(doc(db, 'users', file.uid)));
          const userSnaps = await Promise.all(userPromises);
          
          files.forEach((file, index) => {
            const userSnap = userSnaps[index];
            if (userSnap && userSnap.exists()) {
              const userData = userSnap.data();
              file.userName = userData.displayName || userData.name || 'Anonymous';
              file.userPhotoURL = userData.photoURL || null;
              file.userEmail = userData.email || '';
            } else {
              file.userName = 'Anonymous User';
            }
          });
        } catch (profileErr) {
          console.warn("Failed retrieving user profiles for social feed:", profileErr);
        }

        // Sort by createdAt descending
        return files.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } catch (error) {
        try {
          handleFileFirestoreError(error, FileOperationType.LIST, pathStr);
        } catch (diagErr: any) {
          console.error("Firestore files query failed, reverting to cached local backup feed. Error details: ", diagErr.message);
        }
        // Local caching fallback
        const cachedList: FileRecord[] = [];
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith('shared_files_')) {
            const list = JSON.parse(localStorage.getItem(key) || '[]');
            cachedList.push(...list);
          }
        });
        return cachedList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
    } else {
      // Local caching fallback
      const cachedList: FileRecord[] = [];
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('shared_files_')) {
          const list = JSON.parse(localStorage.getItem(key) || '[]');
          cachedList.push(...list);
        }
      });
      return cachedList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  },

  // Delete document
  async deleteFile(userId: string, fileId: string): Promise<void> {
    if (shouldUseFirebase(userId)) {
      const pathStr = `files/${fileId}`;
      try {
        const fileRef = doc(db, 'files', fileId);
        const snapshot = await getDoc(fileRef);
        
        if (!snapshot.exists()) {
          throw new Error("Target file record does not exist on server.");
        }
        
        const data = snapshot.data();
        if (data.uid !== userId) {
          throw new Error("Security Alert: You are not authorized to delete other users' files.");
        }

        await deleteDoc(fileRef);
      } catch (error) {
        handleFileFirestoreError(error, FileOperationType.DELETE, pathStr);
      }
    } else {
      const key = `shared_files_${userId}`;
      const cached = localStorage.getItem(key);
      if (cached) {
        const files: FileRecord[] = JSON.parse(cached);
        const filtered = files.filter(f => f.id !== fileId);
        localStorage.setItem(key, JSON.stringify(filtered));
      }
    }
  }
};
