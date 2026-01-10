import { DailyLog, StudentProfile } from '../types';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, doc, getDoc, setDoc, 
  collection, getDocs, query, orderBy, deleteDoc, writeBatch, where,
  enableIndexedDbPersistence
} from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { firebaseConfig } from '../firebaseConfig';

// Initialize Firebase
let db: any;
let auth: any;
let isOfflineMode = false; // Flag: true if Auth/Permission errors occur, forcing local storage use

try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    
    // Attempt offline persistence
    enableIndexedDbPersistence(db).catch((err: any) => {
       // Ignore benign errors (e.g., multiple tabs open)
       console.log("Persistence status:", err.code);
    });
} catch (e) {
    console.warn("Firebase init failed, switching to offline mode.", e);
    isOfflineMode = true;
}

const COLLECTIONS = {
  STUDENTS: 'students',
  LOGS: 'logs'
};

const LOCAL_STORAGE_KEY = "ecotrack_data_v1";

// --- Helper: Check Connection Status for UI ---
export const getIsOfflineMode = () => isOfflineMode;

// --- Local Storage Helpers ---
const getLocalData = () => {
    try {
        return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '{"students": {}, "logs": {}}');
    } catch {
        return { students: {}, logs: {} };
    }
};

const saveLocalData = (data: any) => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
};

// --- Auth Helper ---
/**
 * Tries to sign in anonymously. 
 * If it fails (config not found), marks app as Offline Mode.
 */
const ensureAuth = async () => {
    if (isOfflineMode || !auth) return false;
    
    // If already signed in
    if (auth.currentUser) return true;

    try {
        await signInAnonymously(auth);
        return true;
    } catch (error: any) {
        console.warn("Auth failed, switching to local storage fallback:", error.code);
        // Common error when Auth is not enabled in Console
        if (error.code === 'auth/configuration-not-found' || error.code === 'auth/operation-not-allowed' || error.code === 'auth/internal-error') {
             isOfflineMode = true;
        }
        return false;
    }
};

// --- Student Logic ---

export const loginByStudentId = async (studentId: string): Promise<StudentProfile | null> => {
    let cloudProfile: StudentProfile | null = null;
    let useCloud = !isOfflineMode;

    // 1. Try Cloud Login
    if (useCloud) {
        const authed = await ensureAuth();
        if (authed && db) {
            try {
                const docRef = doc(db, COLLECTIONS.STUDENTS, studentId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    cloudProfile = {
                        id: studentId,
                        name: data.displayName || '',
                        className: data.className || '',
                        pin: data.pin || ''
                    };
                }
            } catch (e: any) {
                console.warn("Cloud login error (Permission/Network):", e.code);
                // If permission denied, likely Rules reject unauthed user or config issue
                if (e.code === 'permission-denied' || e.code === 'unavailable') {
                    useCloud = false; 
                    isOfflineMode = true; // Mark as offline if permission denied happens
                }
            }
        } else {
            useCloud = false;
        }
    }

    // 2. Local Fallback & Sync
    const localData = getLocalData();
    const localProfile = localData.students[studentId];

    // If we got data from cloud, update local cache and return it
    if (cloudProfile) {
        localData.students[studentId] = cloudProfile;
        saveLocalData(localData);
        return cloudProfile;
    }

    // If Cloud failed or returned nothing
    if (!useCloud || isOfflineMode) {
        // Return local profile if exists
        if (localProfile) {
            return localProfile;
        }
        
        // --- CRITICAL FIX ---
        // If Cloud is broken (Permission Denied/No Auth), we allow the user to 
        // "create" a session locally simply by logging in.
        // This ensures the app works for the student even if the backend is broken.
        const newLocalProfile = { id: studentId, name: '', className: '' };
        localData.students[studentId] = newLocalProfile;
        saveLocalData(localData);
        return newLocalProfile;
    }

    // Cloud worked but user ID not found in DB
    return null; 
};

export const updateStudentProfile = async (id: string, name: string, className: string, pin?: string): Promise<void> => {
    // 1. Update Local (Always succeeds)
    const localData = getLocalData();
    localData.students[id] = { 
        ...(localData.students[id] || { id }), 
        name, 
        className, 
        pin: pin || localData.students[id]?.pin 
    };
    saveLocalData(localData);

    // 2. Try Update Cloud
    if (!isOfflineMode && await ensureAuth() && db) {
        try {
             const docRef = doc(db, COLLECTIONS.STUDENTS, id);
             const updateData: any = {
                displayName: name,
                className: className,
                lastActive: new Date().toISOString()
            };
            if (pin !== undefined) updateData.pin = pin;
            await setDoc(docRef, updateData, { merge: true });
        } catch (e) {
            console.warn("Cloud update failed, data saved locally only.");
        }
    }
};

export const saveDailyLog = async (log: DailyLog): Promise<void> => {
    // 1. Save Local (Primary for reliability)
    const localData = getLocalData();
    const studentLogs = localData.logs[log.studentId] || [];
    
    // Avoid duplicates if saving same ID
    const existingIdx = studentLogs.findIndex((l: DailyLog) => l.id === log.id);
    if (existingIdx >= 0) studentLogs[existingIdx] = log;
    else studentLogs.push(log);
    
    localData.logs[log.studentId] = studentLogs;
    
    // Update local stats
    const currentProfile = localData.students[log.studentId] || { id: log.studentId };
    currentProfile.logCount = (currentProfile.logCount || 0) + 1;
    currentProfile.totalCo2 = (currentProfile.totalCo2 || 0) + log.totalCo2Kg;
    localData.students[log.studentId] = currentProfile;
    
    saveLocalData(localData);

    // 2. Sync to Cloud
    if (!isOfflineMode && await ensureAuth() && db) {
        try {
            // Save Log
            const logRef = doc(db, COLLECTIONS.STUDENTS, log.studentId, COLLECTIONS.LOGS, log.id);
            await setDoc(logRef, log);
            
            // Update Student Stats
            const studentRef = doc(db, COLLECTIONS.STUDENTS, log.studentId);
            await setDoc(studentRef, { 
                totalCo2: currentProfile.totalCo2,
                logCount: currentProfile.logCount,
                lastActive: new Date().toISOString()
            }, { merge: true });
        } catch (e) {
             console.warn("Cloud save failed, but local save succeeded.", e);
             // Do NOT throw error, UI should show success
        }
    }
};

export const getStudentLogs = async (studentId: string): Promise<DailyLog[]> => {
    let cloudLogs: DailyLog[] | null = null;

    // 1. Try Fetch Cloud
    if (!isOfflineMode && await ensureAuth() && db) {
        try {
            const logsRef = collection(db, COLLECTIONS.STUDENTS, studentId, COLLECTIONS.LOGS);
            const q = query(logsRef, orderBy('timestamp', 'desc')); 
            const querySnapshot = await getDocs(q);
            
            cloudLogs = [];
            querySnapshot.forEach((doc) => cloudLogs?.push(doc.data() as DailyLog));
            
            // Sync cloud results to local cache
            const localData = getLocalData();
            localData.logs[studentId] = cloudLogs;
            saveLocalData(localData);
        } catch (e) {
            console.warn("Cloud fetch failed, falling back to local.");
        }
    }

    // 2. Return Cloud or Local Fallback
    if (cloudLogs) return cloudLogs;
    
    const localData = getLocalData();
    const logs = localData.logs[studentId] || [];
    return logs.sort((a: DailyLog, b: DailyLog) => b.timestamp - a.timestamp);
};

// --- Admin / Teacher Functions ---

export const getAllStudentsData = async (): Promise<any[]> => {
     // Try Cloud
     if (!isOfflineMode && await ensureAuth() && db) {
         try {
             const studentsRef = collection(db, COLLECTIONS.STUDENTS);
             const querySnapshot = await getDocs(studentsRef);
             const students: any[] = [];
             querySnapshot.forEach((doc) => {
                 const data = doc.data();
                 students.push({
                     studentId: doc.id,
                     name: data.displayName || "(Chưa kích hoạt)",
                     className: data.className || "",
                     totalCo2: data.totalCo2 || 0,
                     logs: data.logCount || 0,
                     pin: data.pin || ""
                 });
             });
             return students.sort((a, b) => a.studentId.localeCompare(b.studentId, undefined, { numeric: true, sensitivity: 'base' }));
         } catch(e) {
             console.warn("Admin cloud fetch failed");
         }
     }
     
     // Fallback to local (Note: Teacher usually needs cloud, but we return what we have)
     const localData = getLocalData();
     return Object.values(localData.students).map((s: any) => ({
         studentId: s.id,
         name: s.name || "(Offline/Local)",
         className: s.className || "",
         totalCo2: s.totalCo2 || 0,
         logs: s.logCount || 0,
         pin: s.pin || ""
     }));
};

export const seedStudentAccounts = async (prefix: string, startIndex: number, count: number, defaultClass: string): Promise<string[]> => {
    if (isOfflineMode || !(await ensureAuth()) || !db) {
        throw new Error("Không thể tạo tài khoản khi đang ở chế độ Offline (Lỗi kết nối Firebase).");
    }
    
    // Original Logic
    const studentsRef = collection(db, COLLECTIONS.STUDENTS);
    const snapshot = await getDocs(studentsRef);
    const currentCount = snapshot.size;
    const MAX_STUDENT_LIMIT = 100;

    if (currentCount + count > MAX_STUDENT_LIMIT) {
        const remaining = Math.max(0, MAX_STUDENT_LIMIT - currentCount);
        throw new Error(`Đạt giới hạn ${MAX_STUDENT_LIMIT} học sinh.`);
    }
    
    const createdIds: string[] = [];
    const BATCH_SIZE = 400;
    
    let currentBatch = writeBatch(db);
    let operationCount = 0;

    for (let i = 0; i < count; i++) {
        const num = startIndex + i;
        const idSuffix = num.toString().padStart(3, '0');
        const studentId = `${prefix}${idSuffix}`;
        const docRef = doc(db, COLLECTIONS.STUDENTS, studentId);
        const dataToSet: any = { id: studentId, createdAt: new Date().toISOString() };
        if (defaultClass) dataToSet.className = defaultClass;
        currentBatch.set(docRef, dataToSet, { merge: true });
        createdIds.push(studentId);
        operationCount++;

        if (operationCount >= BATCH_SIZE) {
            await currentBatch.commit();
            currentBatch = writeBatch(db);
            operationCount = 0;
        }
    }
    if (operationCount > 0) await currentBatch.commit();
    return createdIds;
};

export const deleteStudent = async (studentId: string): Promise<void> => {
    // Cloud
    if (!isOfflineMode && await ensureAuth() && db) {
        try {
            await deleteDoc(doc(db, COLLECTIONS.STUDENTS, studentId));
        } catch (e) { console.warn("Cloud delete failed"); }
    }
    // Local
    const localData = getLocalData();
    delete localData.students[studentId];
    delete localData.logs[studentId];
    saveLocalData(localData);
};

export const deleteAllStudents = async (): Promise<void> => {
    // Cloud
    if (!isOfflineMode && await ensureAuth() && db) {
        try {
            const studentsRef = collection(db, COLLECTIONS.STUDENTS);
            const snapshot = await getDocs(studentsRef);
            let batch = writeBatch(db);
            let count = 0;
            for (const doc of snapshot.docs) {
                batch.delete(doc.ref);
                count++;
                if (count >= 400) { await batch.commit(); batch = writeBatch(db); count = 0; }
            }
            if (count > 0) await batch.commit();
        } catch (e) { console.warn("Cloud delete all failed"); }
    }
    // Local
    localStorage.removeItem(LOCAL_STORAGE_KEY);
};

export const exportLogsToCSV = async (year: number, months: number[]): Promise<string> => {
    // Relies on getAllStudentsData & getStudentLogs which handle fallback
    const students = await getAllStudentsData();
    let csvContent = "\uFEFFMã Học Sinh;Họ Tên;Lớp;Ngày;Tháng;Giờ;Đi Lại (km);Rác Thải (món);Thiết Bị (giờ);Tổng CO2 (kg)\n";

    for (const st of students) {
        const logs = await getStudentLogs(st.studentId);
        const filteredLogs = logs.filter(l => {
            const date = new Date(l.timestamp);
            return date.getFullYear() === year && months.includes(date.getMonth() + 1);
        });
        filteredLogs.sort((a, b) => a.timestamp - b.timestamp);

        let studentTotalCO2 = 0;
        if (filteredLogs.length > 0) {
            for (const log of filteredLogs) {
                 studentTotalCO2 += log.totalCo2Kg;
                 const d = new Date(log.timestamp);
                 const tDist = log.transport.reduce((sum, t) => sum + t.distanceKm, 0);
                 const wAmount = log.waste.reduce((sum, w) => sum + w.amountKg, 0); 
                 const dTime = log.digital.reduce((sum, d) => sum + d.hours, 0);
                 const row = [`"${st.studentId}"`,`"${st.name}"`, `"${st.className}"`,`"${d.toLocaleDateString('vi-VN')}"`,`"${d.getMonth() + 1}"`,`"${d.toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}"`,tDist.toString().replace('.', ','),wAmount.toString().replace('.', ','),dTime.toString().replace('.', ','),log.totalCo2Kg.toFixed(2).replace('.', ',')].join(";");
                 csvContent += row + "\n";
            }
            csvContent += `"TỔNG KẾT (${st.studentId})";"Tổng phát thải: ${studentTotalCO2.toFixed(2).replace('.', ',')} kg";;;;;;;;"${studentTotalCO2.toFixed(2).replace('.', ',')}"\n;;;;;;;;;\n`;
        }
    }
    return encodeURI("data:text/csv;charset=utf-8," + csvContent);
};

export const deleteLogsByDateRange = async (fromDateStr: string, toDateStr: string): Promise<number> => {
    let count = 0;
    const startTs = new Date(fromDateStr).setHours(0,0,0,0);
    const endTs = new Date(toDateStr).setHours(23,59,59,999);
    
    // 1. Delete Local
    const localData = getLocalData();
    Object.keys(localData.logs).forEach(studentId => {
        const logs = localData.logs[studentId];
        const initialLen = logs.length;
        const newLogs = logs.filter((l: DailyLog) => !(l.timestamp >= startTs && l.timestamp <= endTs));
        localData.logs[studentId] = newLogs;
        count += (initialLen - newLogs.length);
    });
    saveLocalData(localData);

    // 2. Delete Cloud (Best effort)
    if (!isOfflineMode && await ensureAuth() && db) {
        try {
            const students = await getAllStudentsData();
            let batch = writeBatch(db);
            let opCount = 0;
            for (const st of students) {
                const logsRef = collection(db, COLLECTIONS.STUDENTS, st.studentId, COLLECTIONS.LOGS);
                const q = query(logsRef, where('timestamp', '>=', startTs), where('timestamp', '<=', endTs));
                const snapshot = await getDocs(q);
                for (const d of snapshot.docs) {
                    batch.delete(d.ref);
                    opCount++;
                    if (opCount >= 400) { await batch.commit(); batch = writeBatch(db); opCount = 0; }
                }
            }
            if (opCount > 0) await batch.commit();
        } catch(e) { console.warn("Cloud range delete failed"); }
    }
    return count;
};

export const deleteAllLogs = async (): Promise<number> => {
    let count = 0;
    // 1. Local
    const localData = getLocalData();
    Object.keys(localData.logs).forEach(key => {
        count += localData.logs[key].length;
        localData.logs[key] = [];
        if(localData.students[key]) {
             localData.students[key].totalCo2 = 0;
             localData.students[key].logCount = 0;
        }
    });
    saveLocalData(localData);

    // 2. Cloud
    if (!isOfflineMode && await ensureAuth() && db) {
         try {
             // Reusing previous logic logic...
             const students = await getAllStudentsData();
             let batch = writeBatch(db);
             let opCount = 0;
             for (const st of students) {
                const logsRef = collection(db, COLLECTIONS.STUDENTS, st.studentId, COLLECTIONS.LOGS);
                const snapshot = await getDocs(logsRef);
                for (const d of snapshot.docs) {
                    batch.delete(d.ref);
                    opCount++;
                    if (opCount >= 400) { await batch.commit(); batch = writeBatch(db); opCount = 0; }
                }
                const stRef = doc(db, COLLECTIONS.STUDENTS, st.studentId);
                batch.update(stRef, { totalCo2: 0, logCount: 0 });
                opCount++;
             }
             if (opCount > 0) await batch.commit();
         } catch(e) { console.warn("Cloud delete all logs failed"); }
    }
    return count;
};
