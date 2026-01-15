import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

function yearRange(year: number) {
  return { from: `${year}-01-01`, to: `${year}-12-31` }
}

function requireToken(req: Request) {
  const token = req.headers.get('x-app-token')
  if (!token || token !== process.env.APP_WRITE_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const year = Number(url.searchParams.get('year') || new Date().getFullYear())
  const { from, to } = yearRange(year)

  const { data, error } = await supabase
    .from('shows')
    .select('id, show_date, venue, band, created_at')
    .gte('show_date', from)
    .lte('show_date', to)
    .order('show_date', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ data: data ?? [] })
}

export async function POST(req: Request) {
  const authError = requireToken(req)
  if (authError) return authError

  const { show_date, venue, band } = await req.json()

  if (!show_date || !venue?.trim() || !band?.trim()) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const { error } = await supabase.from('shows').insert({
    show_date,
    venue: venue.trim(),
    band: band.trim(),
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const authError = requireToken(req)
  if (authError) return authError

  const url = new URL(req.url)
  const id = url.searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  const { error } = await supabase.from('shows').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
