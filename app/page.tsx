'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'

type ShowRow = {
  id: string
  show_date: string // YYYY-MM-DD
  venue: string
  band: string
}

function yearOf(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').getFullYear()
}

export default function Home() {
  const currentYear = new Date().getFullYear()

  const [year, setYear] = useState<number>(currentYear)
  const [date, setDate] = useState<string>('')
  const [venue, setVenue] = useState<string>('')
  const [band, setBand] = useState<string>('')
  const [rows, setRows] = useState<ShowRow[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // token (solo vos) guardado en localStorage
  const [tokenInput, setTokenInput] = useState('')

  useEffect(() => {
    setTokenInput(localStorage.getItem('showtracker_token') || '')
  }, [])

  function saveToken() {
    localStorage.setItem('showtracker_token', tokenInput.trim())
  }

  function getToken() {
    return localStorage.getItem('showtracker_token') || ''
  }

  async function loadShows(selectedYear: number) {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/shows?year=${selectedYear}`, {
        cache: 'no-store',
      })
      const json = await res.json()

      if (!res.ok) {
        setError(json.error || 'Error loading shows')
        setRows([])
      } else {
        setRows(json.data || [])
      }
    } catch (err: any) {
      setError(err?.message || 'Error inesperado')
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadShows(year)
  }, [year])

  const total = rows.length

  const yearOptions = useMemo(() => {
    const start = 2020
    const end = currentYear + 1
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }, [currentYear])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!date || !venue.trim() || !band.trim()) {
      setError('Te falta completar algo (fecha / lugar / banda).')
      return
    }

    const token = getToken()
    if (!token) {
      setError('Falta el Admin token (guardalo una vez y listo).')
      return
    }

    setSaving(true)

    try {
      const res = await fetch('/api/shows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-app-token': token,
        },
        body: JSON.stringify({
          show_date: date,
          venue: venue.trim(),
          band: band.trim(),
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error || 'Error guardando el show')
        return
      }

      setDate('')
      setVenue('')
      setBand('')

      const insertedYear = yearOf(date)
      if (insertedYear !== year) setYear(insertedYear)
      else await loadShows(year)
    } catch (err: any) {
      setError(err?.message || 'Error inesperado')
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: string) {
    setError(null)

    const token = getToken()
    if (!token) {
      setError('Falta el Admin token para borrar.')
      return
    }

    try {
      const res = await fetch(`/api/shows?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: {
          'x-app-token': token,
        },
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error || 'Error borrando el show')
        return
      }

      await loadShows(year)
    } catch (err: any) {
      setError(err?.message || 'Error inesperado')
    }
  }

  return loading || saving ? (
    <div className="flex items-center justify-center mt-60 gap-2">
      <Image src="/loader2.gif" alt="Loading" width={400} height={400} />
    </div>
  ) : (
    <main className="min-h-screen bg-[#f3efe5] text-[#2f2a20]">
      <div className="mx-auto max-w-4xl px-5 py-10 font-vintage">
        <header className="mb-8">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl md:text-4xl tracking-wide">
                Show Tracking
              </h1>
              <p className="mt-2 text-sm opacity-80">
                Trackeá tus shows por año.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm opacity-80">Año</label>
              <select
                className="rounded-lg border border-[#d6cbb6] bg-[#fbf7ee] px-3 py-2 text-sm"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-[#d6cbb6] bg-[#fbf7ee] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm opacity-85">
                <span className="opacity-70">Total {year}:</span>{' '}
                <span className="text-lg font-bold">{total}</span>
              </div>

              {loading ? (
                <div className="text-sm opacity-70">Cargando…</div>
              ) : null}
            </div>
          </div>
        </header>

        <section className="mb-8 rounded-2xl border border-[#d6cbb6] bg-[#fbf7ee] p-5">
          <h2 className="text-lg tracking-wide">Agregar show</h2>

          <form onSubmit={onSubmit} className="mt-4 grid gap-3 md:grid-cols-4">
            <div className="md:col-span-1 min-w-0">
              <label className="block text-xs opacity-70 mb-1">Fecha</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="block w-full min-w-0 rounded-lg border border-[#d6cbb6] bg-[#f3efe5] px-3 py-2 text-sm"
              />
            </div>

            <div className="md:col-span-1">
              <label className="block text-xs opacity-70 mb-1">Lugar</label>
              <input
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="Niceto, Uniclub, etc"
                className="w-full rounded-lg border border-[#d6cbb6] bg-[#f3efe5] px-3 py-2 text-sm"
              />
            </div>

            <div className="md:col-span-1">
              <label className="block text-xs opacity-70 mb-1">Banda</label>
              <input
                value={band}
                onChange={(e) => setBand(e.target.value)}
                placeholder="SuperVos…"
                className="w-full rounded-lg border border-[#d6cbb6] bg-[#f3efe5] px-3 py-2 text-sm"
              />
            </div>

            <div className="md:col-span-1 flex items-end">
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-lg border cursor-pointer border-[#d6cbb6] bg-[#e7dcc7] px-4 py-2 text-sm tracking-wide hover:bg-[#dacdae] disabled:opacity-60"
              >
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </form>

          {error ? (
            <p className="mt-3 text-sm text-[#f65f4e] opacity-95">{error}</p>
          ) : null}
        </section>

        <section className="rounded-2xl border border-[#d6cbb6] bg-[#fbf7ee] p-5">
          <div className="flex items-baseline justify-between gap-4 flex-wrap">
            <h2 className="text-lg tracking-wide">Shows {year}</h2>
            <p className="text-xs opacity-70">
              El # se calcula por orden de fecha dentro del año.
            </p>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="text-left">
                <tr className="border-b border-[#d6cbb6] opacity-80">
                  <th className="py-2 pr-3 w-14">#</th>
                  <th className="py-2 pr-3 w-40">Fecha</th>
                  <th className="py-2 pr-3">Lugar</th>
                  <th className="py-2 pr-3">Banda</th>
                  <th className="py-2 pr-3 w-24"></th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && !loading ? (
                  <tr>
                    <td className="py-4 opacity-70" colSpan={5}>
                      No hay shows cargados para {year}.
                    </td>
                  </tr>
                ) : null}

                {rows.map((r, idx) => (
                  <tr key={r.id} className="border-b border-[#2b251b]">
                    <td className="py-2 pr-3 opacity-80">{idx + 1}</td>
                    <td className="py-2 pr-3">{r.show_date}</td>
                    <td className="py-2 pr-3">{r.venue}</td>
                    <td className="py-2 pr-3">{r.band}</td>
                    <td className="py-2 pr-3 text-right">
                      <button
                        onClick={() => remove(r.id)}
                        className="rounded-md border cursor-pointer border-[#d6cbb6] px-2 py-1 text-xs opacity-80 hover:opacity-100"
                      >
                        Borrar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="mt-8 text-xs opacity-60">
          Hecho por{' '}
          <a
            className="underline underline-offset-2"
            href="https://github.com/mdtrunzo"
            target="_blank"
          >
            @mdtrunzo
          </a>
        </footer>
      </div>
    </main>
  )
}
