
export enum TransportType {
  WALK = 'WALK',
  BICYCLE = 'BICYCLE',
  MOTORBIKE = 'MOTORBIKE',
  BUS = 'BUS',
  CAR = 'CAR',
  ELECTRIC_BIKE = 'ELECTRIC_BIKE'
}

export enum WasteType {
  PLASTIC = 'PLASTIC', // Chai, túi nilon
  PAPER = 'PAPER',     // Giấy vụn, hộp giấy
  ORGANIC = 'ORGANIC', // Đồ ăn thừa (suất)
  STYROFOAM = 'STYROFOAM', // Hộp xốp (thêm mới vì phổ biến ở cổng trường)
  MILK_CARTON = 'MILK_CARTON' // Vỏ hộp sữa
}

export enum DeviceType {
  SMARTPHONE = 'SMARTPHONE',
  LAPTOP = 'LAPTOP',
  TV = 'TV',
  TABLET = 'TABLET'
}

export interface DailyLog {
  id: string;
  studentId: string;
  date: string; // ISO string YYYY-MM-DD
  timestamp: number;
  transport: {
    type: TransportType;
    distanceKm: number;
  }[];
  waste: {
    type: WasteType;
    amountKg: number; // Trong code vẫn giữ tên biến là amountKg để tránh refactor lớn, nhưng logic hiểu là "số lượng" (items)
  }[];
  digital: {
    type: DeviceType;
    hours: number;
  }[];
  totalCo2Kg: number;
}

export interface StudentProfile {
  id: string;
  name: string;
  className: string;
  pin?: string; // Mã bảo mật 4 số
}

// Tốc độ trung bình (km/h) để quy đổi từ Phút -> Km
export const AVG_SPEED_KMH = {
    [TransportType.WALK]: 5,
    [TransportType.BICYCLE]: 15,
    [TransportType.ELECTRIC_BIKE]: 20,
    [TransportType.MOTORBIKE]: 30, // Tính trong phố
    [TransportType.CAR]: 30,      // Tính trong phố
    [TransportType.BUS]: 25
};

// CO2 Coefficients 
// Cập nhật: Rác thải tính theo "số lượng" (item) thay vì kg
export const CO2_FACTORS = {
  TRANSPORT: {
    [TransportType.WALK]: 0,
    [TransportType.BICYCLE]: 0,
    [TransportType.ELECTRIC_BIKE]: 0.015, 
    [TransportType.BUS]: 0.05, 
    [TransportType.MOTORBIKE]: 0.12,
    [TransportType.CAR]: 0.25,
  },
  WASTE: {
    // Tính theo đơn vị: Cái / Chiếc / Suất
    [WasteType.PLASTIC]: 0.08,    // 1 chai nhựa hoặc túi nilon ~ 80g CO2e (SX + Xử lý)
    [WasteType.PAPER]: 0.02,      // 1 tờ giấy A4 hoặc vỏ bánh kẹo giấy
    [WasteType.ORGANIC]: 0.5,     // 1 suất ăn thừa (tính cao để răn đe lãng phí thực phẩm)
    [WasteType.STYROFOAM]: 0.15,  // 1 hộp xốp (độc hại và tốn năng lượng)
    [WasteType.MILK_CARTON]: 0.05 // 1 vỏ hộp sữa giấy
  },
  DIGITAL: {
    [DeviceType.SMARTPHONE]: 0.06, 
    [DeviceType.TABLET]: 0.08,
    [DeviceType.LAPTOP]: 0.15,
    [DeviceType.TV]: 0.20,
  }
};

export const LABELS = {
  TRANSPORT: {
    [TransportType.WALK]: '👣 Đi bộ',
    [TransportType.BICYCLE]: '🚲 Xe đạp',
    [TransportType.ELECTRIC_BIKE]: '🛵 Xe đạp điện',
    [TransportType.BUS]: '🚌 Xe buýt',
    [TransportType.MOTORBIKE]: '🏍️ Xe máy',
    [TransportType.CAR]: '🚗 Ô tô',
  },
  WASTE: {
    [WasteType.PLASTIC]: '🥤 Chai / Túi nhựa',
    [WasteType.PAPER]: '📄 Giấy rác',
    [WasteType.ORGANIC]: '🍗 Bỏ thừa đồ ăn',
    [WasteType.STYROFOAM]: '🥡 Hộp xốp',
    [WasteType.MILK_CARTON]: '🧃 Vỏ hộp sữa',
  },
  DIGITAL: {
    [DeviceType.SMARTPHONE]: '📱 Điện thoại',
    [DeviceType.TABLET]: '📲 Máy tính bảng',
    [DeviceType.LAPTOP]: '💻 Máy tính / Laptop',
    [DeviceType.TV]: '📺 Tivi / Xem video',
  }
};
