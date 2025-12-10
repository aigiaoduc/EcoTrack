
import { DailyLog, StudentProfile } from '../types';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, doc, getDoc, setDoc, updateDoc, 
  collection, addDoc, getDocs, query, where, orderBy, deleteDoc, writeBatch, collectionGroup,
  enableIndexedDbPersistence
} from 'firebase/firestore';
import { firebaseConfig } from '../firebaseConfig';

// Initialize Firebase
let db: any;
try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    
    // Kích hoạt tính năng Offline (Persistence)
    // Dữ liệu sẽ được lưu vào IndexedDB của trình duyệt
    enableIndexedDbPersistence(db).catch((err) => {
        if (err.code == 'failed-precondition') {
            console.warn('Persistence failed: Multiple tabs open');
        } else if (err.code == 'unimplemented') {
            console.warn('Persistence is not available in this browser');
        }
    });
} catch (e) {
    console.error("Firebase init failed. Check firebaseConfig.ts", e);
}

const COLLECTIONS = {
  STUDENTS: 'students',
  LOGS: 'logs'
};

const MAX_STUDENT_LIMIT = 100; // Giới hạn tối đa số học sinh

// --- Auth / Student Logic ---

/**
 * Đăng nhập bằng mã học sinh (ví dụ: hocsinh001)
 * Trả về thông tin profile nếu mã đúng, hoặc null nếu không tồn tại.
 */
export const loginByStudentId = async (studentId: string): Promise<StudentProfile | null> => {
  if (!db) return null;
  try {
    const docRef = doc(db, COLLECTIONS.STUDENTS, studentId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: studentId,
        name: data.displayName || '', // Tên có thể chưa đặt
        className: data.className || '',
        pin: data.pin || '' // Trả về PIN để kiểm tra ở Client (hoặc xử lý ở UI)
      };
    } else {
      console.warn("Mã học sinh không tồn tại");
      return null;
    }
  } catch (error) {
    console.error("Lỗi đăng nhập:", error);
    throw error;
  }
};

/**
 * Cập nhật thông tin cá nhân (Tên hiển thị, lớp, mã PIN)
 */
export const updateStudentProfile = async (id: string, name: string, className: string, pin?: string): Promise<void> => {
    if (!db) return;
    const docRef = doc(db, COLLECTIONS.STUDENTS, id);
    
    const updateData: any = {
        displayName: name,
        className: className,
        lastActive: new Date().toISOString()
    };

    if (pin !== undefined) {
        updateData.pin = pin;
    }

    // Sử dụng setDoc với merge: true để tạo nếu chưa có hoặc update nếu đã có (an toàn)
    await setDoc(docRef, updateData, { merge: true });
};

// --- Logs Logic ---

export const saveDailyLog = async (log: DailyLog): Promise<void> => {
  if (!db) {
      console.error("Database not initialized");
      throw new Error("Lỗi kết nối cơ sở dữ liệu");
  }
  
  try {
      // 1. Lưu log vào sub-collection: students/{studentId}/logs/{logId}
      const logRef = doc(db, COLLECTIONS.STUDENTS, log.studentId, COLLECTIONS.LOGS, log.id);
      await setDoc(logRef, log);
      
      // 2. Cập nhật tổng quan cho student
      const studentRef = doc(db, COLLECTIONS.STUDENTS, log.studentId);
      const studentSnap = await getDoc(studentRef);
      
      let currentTotal = 0;
      let currentCount = 0;

      if (studentSnap.exists()) {
          const data = studentSnap.data();
          currentTotal = data.totalCo2 || 0;
          currentCount = data.logCount || 0;
      } else {
          // Trường hợp hiếm: Doc student bị xóa nhưng vẫn login được (cache), hoặc lỗi logic
          // Ta sẽ tạo lại doc này để đảm bảo dữ liệu không bị mất
          console.warn("Student doc missing during save, creating new...");
      }

      const newTotal = currentTotal + log.totalCo2Kg;
      const newLogCount = currentCount + 1;

      // Dùng setDoc với merge: true thay vì updateDoc để an toàn hơn (tự tạo field nếu thiếu)
      await setDoc(studentRef, { 
          totalCo2: newTotal,
          logCount: newLogCount,
          lastActive: new Date().toISOString()
      }, { merge: true });
      
  } catch (error) {
      console.error("Error saving log:", error);
      throw error; // Ném lỗi ra để UI bắt được
  }
};

export const getStudentLogs = async (studentId: string): Promise<DailyLog[]> => {
  if (!db) return [];
  const logsRef = collection(db, COLLECTIONS.STUDENTS, studentId, COLLECTIONS.LOGS);
  // Query 20 log gần nhất
  const q = query(logsRef, orderBy('timestamp', 'desc')); 
  
  const querySnapshot = await getDocs(q);
  const logs: DailyLog[] = [];
  querySnapshot.forEach((doc) => {
    logs.push(doc.data() as DailyLog);
  });
  return logs;
};

// --- Teacher / Admin Logic ---

/**
 * Hàm đặc biệt: Tự động tạo hàng loạt tài khoản
 * Hỗ trợ batching để tránh giới hạn 500 writes của Firestore
 */
export const seedStudentAccounts = async (
    prefix: string = 'hocsinh', 
    startIndex: number = 1,
    count: number = 100,
    defaultClass: string = ""
): Promise<string[]> => {
    if (!db) return [];

    // 1. Kiểm tra giới hạn số lượng học sinh
    const studentsRef = collection(db, COLLECTIONS.STUDENTS);
    const snapshot = await getDocs(studentsRef);
    const currentCount = snapshot.size;

    if (currentCount + count > MAX_STUDENT_LIMIT) {
        const remaining = Math.max(0, MAX_STUDENT_LIMIT - currentCount);
        throw new Error(`Đạt giới hạn ${MAX_STUDENT_LIMIT} học sinh. Hiện có: ${currentCount}. Bạn chỉ có thể tạo thêm tối đa ${remaining} tài khoản.`);
    }
    
    // 2. Tiến hành tạo nếu chưa vượt quá giới hạn
    const createdIds: string[] = [];
    const BATCH_SIZE = 400; // Safe limit under 500
    
    let currentBatch = writeBatch(db);
    let operationCount = 0;
    let batchCount = 0;

    for (let i = 0; i < count; i++) {
        const num = startIndex + i;
        // Pad số 0: 1 -> 001, 99 -> 099
        const idSuffix = num.toString().padStart(3, '0');
        const studentId = `${prefix}${idSuffix}`;
        
        const docRef = doc(db, COLLECTIONS.STUDENTS, studentId);
        
        const dataToSet: any = {
             id: studentId,
             createdAt: new Date().toISOString()
        };

        // Chỉ set lớp nếu giáo viên có nhập
        if (defaultClass) {
            dataToSet.className = defaultClass;
        }

        currentBatch.set(docRef, dataToSet, { merge: true });
        
        createdIds.push(studentId);
        operationCount++;

        if (operationCount >= BATCH_SIZE) {
            await currentBatch.commit();
            currentBatch = writeBatch(db);
            operationCount = 0;
            batchCount++;
        }
    }

    if (operationCount > 0) {
        await currentBatch.commit();
    }
    
    return createdIds;
};

export const deleteStudent = async (studentId: string): Promise<void> => {
    if (!db) return;
    await deleteDoc(doc(db, COLLECTIONS.STUDENTS, studentId));
};

export const deleteAllStudents = async (): Promise<void> => {
    if (!db) return;
    const studentsRef = collection(db, COLLECTIONS.STUDENTS);
    const snapshot = await getDocs(studentsRef);
    
    // Batch delete
    const BATCH_SIZE = 400;
    let batch = writeBatch(db);
    let count = 0;

    for (const doc of snapshot.docs) {
        batch.delete(doc.ref);
        count++;
        if (count >= BATCH_SIZE) {
            await batch.commit();
            batch = writeBatch(db);
            count = 0;
        }
    }
    
    if (count > 0) {
        await batch.commit();
    }
};

export const getAllStudentsData = async (): Promise<{ studentId: string, name: string, className: string, totalCo2: number, logs: number, pin?: string }[]> => {
  if (!db) return [];
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
        pin: data.pin || "" // Lấy cả PIN cho admin xem
    });
  });
  
  return students.sort((a, b) => {
     // Sort theo ID
     return a.studentId.localeCompare(b.studentId, undefined, { numeric: true, sensitivity: 'base' });
  });
};

// --- Reporting & Maintenance ---

/**
 * Xuất dữ liệu ra CSV theo Tháng và Năm được chọn
 * @param year Năm cần xuất báo cáo (VD: 2024)
 * @param months Mảng các tháng cần xuất (VD: [1, 2, 12])
 */
export const exportLogsToCSV = async (year: number, months: number[]): Promise<string> => {
    if (!db) return "";
    if (!months || months.length === 0) return "";
    
    // Xác định khoảng thời gian rộng nhất để query database (từ đầu năm đến cuối năm)
    // Sau đó sẽ filter chi tiết bằng code JS
    const startOfYear = new Date(year, 0, 1).getTime();
    const endOfYear = new Date(year, 11, 31, 23, 59, 59).getTime();

    const students = await getAllStudentsData();
    
    // QUAN TRỌNG: Thêm BOM (\uFEFF) để Excel nhận diện UTF-8
    let csvContent = "\uFEFF"; 
    
    // Header columns
    csvContent += "Mã Học Sinh;Họ Tên;Lớp;Ngày;Tháng;Giờ;Đi Lại (km);Rác Thải (món);Thiết Bị (giờ);Tổng CO2 (kg)\n";

    // Duyệt từng học sinh
    for (const st of students) {
        const logs = await getStudentLogs(st.studentId);
        
        // Filter: Lấy log trong năm VÀ có tháng nằm trong danh sách months
        const filteredLogs = logs.filter(l => {
            const date = new Date(l.timestamp);
            const logYear = date.getFullYear();
            const logMonth = date.getMonth() + 1; // getMonth() trả về 0-11
            return logYear === year && months.includes(logMonth);
        });
        
        // Sort lại log theo thứ tự thời gian tăng dần
        filteredLogs.sort((a, b) => a.timestamp - b.timestamp);

        // Biến tính tổng cho khoảng thời gian này
        let studentTotalCO2 = 0;

        if (filteredLogs.length > 0) {
            for (const log of filteredLogs) {
                 studentTotalCO2 += log.totalCo2Kg;

                 const d = new Date(log.timestamp);
                 const dateStr = d.toLocaleDateString('vi-VN'); // dd/mm/yyyy
                 const monthStr = (d.getMonth() + 1).toString();
                 const timeStr = d.toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'});
                 
                 // Tính tổng từng loại để report
                 const tDist = log.transport.reduce((sum, t) => sum + t.distanceKm, 0);
                 const wAmount = log.waste.reduce((sum, w) => sum + w.amountKg, 0); 
                 const dTime = log.digital.reduce((sum, d) => sum + d.hours, 0);

                 const row = [
                     `"${st.studentId}"`,
                     `"${st.name}"`, 
                     `"${st.className}"`,
                     `"${dateStr}"`,
                     `"${monthStr}"`,
                     `"${timeStr}"`,
                     tDist.toString().replace('.', ','),
                     wAmount.toString().replace('.', ','),
                     dTime.toString().replace('.', ','),
                     log.totalCo2Kg.toFixed(2).replace('.', ',') 
                 ].join(";");
                 csvContent += row + "\n";
            }

            // --- THÊM DÒNG TỔNG KẾT CHO HỌC SINH NÀY ---
            const summaryRow = [
                `"TỔNG KẾT (${st.studentId})"`, // Cột Mã HS
                `"Tổng phát thải trong các tháng đã chọn: ${studentTotalCO2.toFixed(2).replace('.', ',')} kg"`, // Cột Tên
                "", "", "", "", "", "", "", // Các cột trống
                `"${studentTotalCO2.toFixed(2).replace('.', ',')}"` // Cột Tổng CO2
            ].join(";");
            
            // Thêm dòng tổng kết
            csvContent += summaryRow + "\n";
            
            // Thêm một dòng trống để tách biệt các học sinh
            csvContent += ";;;;;;;;;\n";
        }
    }

    return encodeURI("data:text/csv;charset=utf-8," + csvContent);
};

/**
 * Xóa dữ liệu (logs) theo khoảng thời gian
 * Không xóa tài khoản học sinh
 */
export const deleteLogsByDateRange = async (fromDateStr: string, toDateStr: string): Promise<number> => {
    if (!db) return 0;
    
    const startTs = new Date(fromDateStr).setHours(0,0,0,0);
    const endTs = new Date(toDateStr).setHours(23,59,59,999);

    const students = await getAllStudentsData();
    let deletedCount = 0;
    const BATCH_SIZE = 400;
    let batch = writeBatch(db);
    let opCount = 0;

    for (const st of students) {
        const logsRef = collection(db, COLLECTIONS.STUDENTS, st.studentId, COLLECTIONS.LOGS);
        // Query timestamp trong khoảng
        const q = query(logsRef, where('timestamp', '>=', startTs), where('timestamp', '<=', endTs));
        const snapshot = await getDocs(q);

        for (const docSnap of snapshot.docs) {
            batch.delete(docSnap.ref);
            opCount++;
            deletedCount++;

            if (opCount >= BATCH_SIZE) {
                await batch.commit();
                batch = writeBatch(db);
                opCount = 0;
            }
        }
    }

    if (opCount > 0) {
        await batch.commit();
    }
    
    return deletedCount;
};

/**
 * Xóa TOÀN BỘ dữ liệu (logs) của tất cả học sinh
 * Không xóa tài khoản học sinh, reset bộ đếm về 0
 */
export const deleteAllLogs = async (): Promise<number> => {
    if (!db) return 0;

    const students = await getAllStudentsData();
    let deletedCount = 0;
    const BATCH_SIZE = 400;
    let batch = writeBatch(db);
    let opCount = 0;

    for (const st of students) {
        const logsRef = collection(db, COLLECTIONS.STUDENTS, st.studentId, COLLECTIONS.LOGS);
        const snapshot = await getDocs(logsRef);

        for (const docSnap of snapshot.docs) {
            batch.delete(docSnap.ref);
            opCount++;
            deletedCount++;

            if (opCount >= BATCH_SIZE) {
                await batch.commit();
                batch = writeBatch(db);
                opCount = 0;
            }
        }

        // Reset student stats
        const studentRef = doc(db, COLLECTIONS.STUDENTS, st.studentId);
        batch.update(studentRef, { totalCo2: 0, logCount: 0 });
        opCount++;
        
        if (opCount >= BATCH_SIZE) {
            await batch.commit();
            batch = writeBatch(db);
            opCount = 0;
        }
    }

    if (opCount > 0) {
        await batch.commit();
    }

    return deletedCount;
};
