const chatApiUrl = import.meta.env.VITE_LLM_API_URL

export const isChatbotConfigured = Boolean(chatApiUrl)

const localSuggestions = [
  {
    keywords: ['cay', 'huế', 'đậm đà'],
    reply: 'Nếu bạn thích vị cay và đậm đà, Bún bò Huế đặc biệt là lựa chọn rất hợp. Món đang bán chạy và chỉ mất khoảng 25 phút để giao.',
    dishId: 1,
  },
  {
    keywords: ['hàn', 'gà', 'phô mai'],
    reply: 'Mình gợi ý Gà sốt cay phô mai từ Seoul Kitchen. Món có vị cay béo, đang giảm 15% và giao khoảng 30 phút.',
    dishId: 2,
  },
  {
    keywords: ['nhanh', 'burger', 'ăn nhanh'],
    reply: 'Burger bò phô mai là lựa chọn nhanh gọn cho bạn, giao khoảng 20 phút. Nếu muốn no hơn, bạn có thể gọi thêm một phần khoai.',
    dishId: 3,
  },
  {
    keywords: ['cơm', 'no', 'trưa', 'tối'],
    reply: 'Một phần Cơm tấm sườn nướng sẽ rất vừa bụng cho bữa trưa hoặc tối. Đây là món được yêu thích với đánh giá 4.9.',
    dishId: 4,
  },
  {
    keywords: ['uống', 'trà sữa', 'ngọt'],
    reply: 'Bạn thử Trà sữa ô long kem trứng của Mây Tea nhé. Vị trà thơm, béo nhẹ và giao khoảng 15 phút.',
    dishId: 6,
  },
]

function getLocalSuggestion(message, dishes) {
  const normalizedMessage = message.toLowerCase()
  const suggestion = localSuggestions.find(({ keywords }) => keywords.some((keyword) => normalizedMessage.includes(keyword)))
  const dish = dishes.find((item) => item.id === suggestion?.dishId)

  if (suggestion && dish) return { text: suggestion.reply, dish }

  const affordableDish = [...dishes].sort((first, second) => first.price - second.price)[0]
  return {
    text: `Mình gợi ý ${affordableDish.name} (${affordableDish.restaurant}), giá ${affordableDish.price.toLocaleString('vi-VN')}đ và giao khoảng ${affordableDish.time}. Bạn thích món cay, món no hay đồ uống hơn?`,
    dish: affordableDish,
  }
}

export async function getDishSuggestion(message, dishes) {
  if (!chatApiUrl) return getLocalSuggestion(message, dishes)

  const response = await fetch(chatApiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      dishes: dishes.map(({ id, name, restaurant, price, category, rating, time }) => ({
        id,
        name,
        restaurant,
        price,
        category,
        rating,
        time,
      })),
    }),
  })

  if (!response.ok) throw new Error('Không thể kết nối với trợ lý món ăn.')

  const data = await response.json()
  if (!data.reply || typeof data.reply !== 'string') {
    throw new Error('Trợ lý chưa trả về câu trả lời hợp lệ.')
  }

  const dish = dishes.find((item) => item.id === data.dishId)
  return { text: data.reply, dish }
}
