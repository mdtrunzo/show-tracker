import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function yearRange(year: number) {
  return { from: `${year}-01-01`, to: `${year}-12-31` }
}

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const url = new URL(req.url)
  const year = Number(url.searchParams.get('year') || new Date().getFullYear())
  const { from, to } = yearRange(year)

  const { data, error } = await supabase
    .from('shows')
    .select('id, show_date, venue, band, country, created_at')
    .eq('user_id', user.id)
    .gte('show_date', from)
    .lte('show_date', to)
    .order('show_date', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ data: data ?? [] })
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { show_date, venue, band, country } = await req.json()

  if (!show_date || !venue?.trim() || !band?.trim()) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const { error } = await supabase.from('shows').insert({
    show_date,
    venue: venue.trim(),
    band: band.trim(),
    country: country || null,
    user_id: user.id,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const url = new URL(req.url)
  const id = url.searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  const { error } = await supabase
    .from('shows')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
