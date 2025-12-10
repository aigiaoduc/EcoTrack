
import { DailyLog, TransportType, WasteType, DeviceType } from '../types';

// Kho lời khuyên dự phòng (Fallback) khi không gọi được AI
const LOCAL_ECO_TIPS = {
  TRANSPORT: [
    "Đi bộ hoặc đạp xe đến trường không chỉ giảm khí thải mà còn giúp bạn cao lớn hơn đấy! 🚲",
    "Nếu nhà gần, hãy thử đi bộ đi học. Mỗi bước chân là một đóng góp cho Trái Đất xanh! 👣",
    "Rủ bạn bè đi chung xe hoặc đi xe buýt sẽ vui hơn và bớt khói bụi hơn nhiều. 🚌",
    "Hạn chế đi xe máy hoặc ô tô khi không cần thiết nhé. Bầu trời sẽ cảm ơn bạn! ☁️",
  ],
  WASTE: [
    "Mang theo bình nước cá nhân để không phải mua chai nhựa dùng một lần nhé! 🥤",
    "Tái sử dụng giấy một mặt để làm giấy nháp. Tiết kiệm giấy là bảo vệ rừng! 🌳",
    "Hạn chế lấy túi nilon khi mua đồ ăn sáng. Hãy thử mang hộp đựng của mình đi xem sao! 🥡",
    "Phân loại rác đúng nơi quy định giúp các chú lao công đỡ vất vả hơn nhiều. ♻️",
  ],
  DIGITAL: [
    "Tắt máy tính và đèn khi ra khỏi phòng. Tiết kiệm điện là yêu nước! 💡",
    "Thay vì lướt điện thoại, tối nay hãy thử đọc một cuốn sách xem sao? 📚",
    "Rút sạc khi pin đầy. Sạc pin qua đêm tốn điện và hại máy lắm đó. 🔌",
  ],
  GENERAL: [
    "Trồng một cái cây nhỏ ở góc học tập để lọc không khí nhé! 🌱",
    "Mỗi hành động nhỏ của bạn hôm nay đều giúp Trái Đất 'dễ thở' hơn. Cố lên! 🌍",
    "Bạn là một 'Chiến binh Xanh' xuất sắc! Hãy lan tỏa tinh thần này cho bạn bè nhé. 🌟",
  ]
};

const WELCOME_QUOTES = [
  "Trái Đất không thuộc về chúng ta, chúng ta thuộc về Trái Đất.",
  "Đừng vứt rác, hãy để rác đúng nơi quy định. Hành động nhỏ, ý nghĩa lớn!",
  "Sống xanh không khó, chỉ cần bạn bớt đi một chiếc túi nilon mỗi ngày.",
  "Trồng thêm một cây xanh là gieo thêm một mầm hy vọng.",
  "Tiết kiệm điện hôm nay, thắp sáng ngày mai.",
  "Hãy đối xử tốt với thiên nhiên, thiên nhiên sẽ đối xử tốt với bạn.",
  "Mỗi tờ giấy tiết kiệm được là bạn đang bảo vệ một cánh rừng.",
  "Nước sạch là tài nguyên quý giá, xin đừng lãng phí!",
  "Thay đổi thói quen, thay đổi khí hậu.",
  "Một thế giới xanh bắt đầu từ chính suy nghĩ của bạn.",
  "Giảm rác thải nhựa là bảo vệ đại dương và các loài sinh vật biển.",
  "Tắt máy khi chờ đèn đỏ lâu cũng là cách bảo vệ bầu không khí.",
  "Hãy để lại dấu chân xanh trên mỗi con đường bạn đi qua.",
  "Ăn hết phần cơm của mình là cách đơn giản nhất để trân trọng tài nguyên.",
  "Bảo vệ môi trường là bảo vệ cuộc sống của chính chúng ta."
];

// Danh sách các model của Pollinations để fallback
const AI_MODELS = ['openai', 'mistral', 'llama', 'searchgpt'];

/**
 * Gọi API Pollinations với cơ chế thử lại (Retry) qua các model khác nhau
 */
const fetchPollinationsResponse = async (prompt: string): Promise<string | null> => {
    for (const model of AI_MODELS) {
        try {
            // Encode prompt để an toàn trên URL
            const encodedPrompt = encodeURIComponent(prompt);
            // Thêm seed ngẫu nhiên để câu trả lời không bị trùng lặp
            const seed = Math.floor(Math.random() * 10000);
            const url = `https://text.pollinations.ai/${encodedPrompt}?model=${model}&seed=${seed}`;

            const response = await fetch(url);
            
            if (response.ok) {
                const text = await response.text();
                if (text && text.length > 10 && !text.includes("Error")) {
                    console.log(`AI Success with model: ${model}`);
                    return text;
                }
            }
        } catch (e) {
            console.warn(`Failed with model ${model}, trying next...`);
            continue; // Thử model tiếp theo
        }
    }
    return null; // Thất bại toàn tập
};

/**
 * Tạo lời khuyên thông minh sử dụng Pollinations AI
 */
export const generateEcoInsight = async (log: DailyLog): Promise<string> => {
  // 1. Phân tích dữ liệu nhật ký để tạo context cho AI
  const transportCount = log.transport.length;
  const wasteCount = log.waste.length;
  const digitalHours = log.digital.reduce((acc, d) => acc + d.hours, 0);
  const totalCo2 = log.totalCo2Kg;

  let context = "";
  if (totalCo2 < 2) context += "Hôm nay học sinh này làm rất tốt, phát thải thấp. ";
  else context += "Hôm nay phát thải hơi cao. ";

  if (transportCount > 2) context += "Đi lại bằng phương tiện phát thải nhiều. ";
  if (wasteCount > 3) context += "Xả nhiều rác thải nhựa/giấy. ";
  if (digitalHours > 4) context += "Sử dụng thiết bị điện tử quá nhiều. ";

  // 2. Tạo prompt cho AI
  const prompt = `Đóng vai Gia sư Xanh thân thiện. Hãy đưa ra 1 lời khuyên ngắn gọn (dưới 30 từ), vui vẻ, có icon emoji dành cho học sinh dựa trên tình hình hôm nay: ${context}. Viết bằng tiếng Việt.`;

  // 3. Gọi AI với cơ chế fallback
  const aiAdvice = await fetchPollinationsResponse(prompt);

  if (aiAdvice) {
      return aiAdvice;
  }

  // 4. Nếu AI thất bại, dùng logic cũ (Local Fallback)
  console.warn("All AI models failed, using local backup.");
  
  let categoryToAdvise: 'TRANSPORT' | 'WASTE' | 'DIGITAL' | 'GENERAL' = 'GENERAL';
  const hasHighEmissionTransport = log.transport.some(t => t.type === TransportType.CAR || t.type === TransportType.MOTORBIKE);
  const hasPlasticOrFoam = log.waste.some(w => w.type === WasteType.PLASTIC || w.type === WasteType.STYROFOAM);
  
  if (hasPlasticOrFoam) categoryToAdvise = 'WASTE';
  else if (hasHighEmissionTransport) categoryToAdvise = 'TRANSPORT';
  else if (digitalHours > 4) categoryToAdvise = 'DIGITAL';
  else {
    const categories: ('TRANSPORT' | 'WASTE' | 'DIGITAL' | 'GENERAL')[] = ['TRANSPORT', 'WASTE', 'DIGITAL', 'GENERAL'];
    categoryToAdvise = categories[Math.floor(Math.random() * categories.length)];
  }

  const tipsList = LOCAL_ECO_TIPS[categoryToAdvise];
  return tipsList[Math.floor(Math.random() * tipsList.length)];
};

export const getRandomWelcomeQuote = (): string => {
    return WELCOME_QUOTES[Math.floor(Math.random() * WELCOME_QUOTES.length)];
};
