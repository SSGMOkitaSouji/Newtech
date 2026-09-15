import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)
export const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null

export async function createOrder({ customer, items, subtotal, deliveryFee }) {
  if (!supabase) {
    throw new Error('Supabase chưa được cấu hình. Hãy tạo file .env.local từ .env.example.')
  }

  const { data, error } = await supabase
    .from('orders')
    .insert({
      customer_name: customer.name,
      phone: customer.phone,
      address: customer.address,
      note: customer.note || null,
      items,
      subtotal,
      delivery_fee: deliveryFee,
      total: subtotal + deliveryFee,
      status: 'pending',
    })
    .select('id')
    .single()

  if (error) throw error
  return data
}
