import { createServer } from 'node:http'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

loadEnvFile(resolve(process.cwd(), 'server/.env'))

const port = Number(process.env.PORT || 3000)
const geminiApiKey = process.env.GEMINI_API_KEY
const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.0-flash'

function loadEnvFile(filePath) {
  try {
    const contents = readFileSync(filePath, 'utf8')
    contents.split(/\r?\n/).forEach((line) => {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
      if (!match || process.env[match[1]]) return
      process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2')
    })
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  })
  response.end(JSON.stringify(payload))
}

function readBody(request) {
  return new Promise((resolveBody, reject) => {
    let body = ''
    request.on('data', (chunk) => {
      body += chunk
      if (body.length > 100000) reject(new Error('Request quá lớn.'))
    })
    request.on('end', () => {
      try {
        resolveBody(JSON.parse(body))
      } catch {
        reject(new Error('Dữ liệu gửi lên không hợp lệ.'))
      }
    })
    request.on('error', reject)
  })
}

async function askGemini(message, dishes) {
  const menu = dishes.map((dish) => (
    `${dish.id}: ${dish.name} | ${dish.restaurant} | ${dish.price}đ | ${dish.category} | ${dish.rating} sao | ${dish.time}`
  )).join('\n')

  const prompt = `Bạn là trợ lý gợi ý món ăn cho ứng dụng Bếp Nhà.
Trả lời bằng tiếng Việt, thân thiện, ngắn gọn (tối đa 2 câu).
Chỉ gợi ý món có trong thực đơn bên dưới.
Cuối câu trả lời phải có đúng JSON trên một dòng theo mẫu {"dishId":1}.
Nếu không có món phù hợp nhất, chọn món gần nhất.

Thực đơn:
${menu}

Khách hỏi: ${message}`

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    },
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Gemini API lỗi (${response.status}): ${errorText.slice(0, 200)}`)
  }

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Gemini không trả về nội dung.')

  const dishIdMatch = text.match(/"dishId"\s*:\s*(\d+)/)
  const cleanText = text.replace(/\s*\{["']dishId["']\s*:\s*\d+\}\s*$/i, '').trim()
  return { reply: cleanText || text, dishId: dishIdMatch ? Number(dishIdMatch[1]) : undefined }
}

const server = createServer(async (request, response) => {
  if (request.method === 'OPTIONS') {
    sendJson(response, 204, {})
    return
  }

  if (request.method === 'GET' && request.url === '/health') {
    sendJson(response, 200, { ok: true, geminiConfigured: Boolean(geminiApiKey) })
    return
  }

  if (request.method !== 'POST' || request.url !== '/api/chat') {
    sendJson(response, 404, { error: 'Không tìm thấy endpoint.' })
    return
  }

  if (!geminiApiKey) {
    sendJson(response, 500, { error: 'Thiếu GEMINI_API_KEY trong server/.env.' })
    return
  }

  try {
    const { message, dishes } = await readBody(request)
    if (typeof message !== 'string' || !message.trim() || !Array.isArray(dishes)) {
      sendJson(response, 400, { error: 'Cần có message và dishes hợp lệ.' })
      return
    }
    sendJson(response, 200, await askGemini(message.trim(), dishes))
  } catch (error) {
    sendJson(response, 502, { error: error.message || 'Không thể gọi Gemini.' })
  }
})

server.listen(port, () => {
  console.log(`Bếp Nhà API đang chạy tại http://localhost:${port}`)
})
