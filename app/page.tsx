'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { formatLatamDate, yearOf, COUNTRIES, MONTHS } from '@/helpers/helpers'
import { createClient } from '@/lib/supabase/browser'
import Stats from './components/Stats'
import ThemeToggle from './components/ThemeToggle'

type ShowRow = {
  id: string
  show_date: string
  venue: string
  band: string
  country: string | null
}

type UserBand = {
  id: string
  name: string
}

function countryFlag(code: string | null): string {
  if (!code) return '🇦🇷'
  return COUNTRIES.find((c) => c.code === code)?.flag ?? '🏳️'
}

export default function Home() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [year, setYear] = useState<number>(0)
  const [userName, setUserName] = useState<string | null>(null)
  const [avatar, setAvatar] = useState<string | null>(null)
  const [date, setDate] = useState<string>('')
  const [venue, setVenue] = useState<string>('')
  const [band, setBand] = useState<string>('')
  const [customBand, setCustomBand] = useState<string>('')
  const [country, setCountry] = useState<string>('AR')
  const [rows, setRows] = useState<ShowRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'shows' | 'stats' | 'bands'>('shows')
  const [userBands, setUserBands] = useState<UserBand[]>([])
  const [newBandName, setNewBandName] = useState('')
  const [savingBand, setSavingBand] = useState(false)
  const [bandError, setBandError] = useState<string | null>(null)
  const [deleteModal, setDeleteModal] = useState<{ type: 'show' | 'band'; id: string; name: string } | null>(null)
  const [filterBand, setFilterBand] = useState('')
  const [filterVenue, setFilterVenue] = useState('')
  const [filterCountry, setFilterCountry] = useState('')
  const [filterMonth, setFilterMonth] = useState('')

  async function loadBands() {
    try {
      const res = await fetch('/api/bands', { cache: 'no-store' })
      const json = await res.json()
      if (res.ok) setUserBands(json.data || [])
    } catch {}
  }

  useEffect(() => {
    setYear(new Date().getFullYear())
    setMounted(true)
    createClient()
      .auth.getUser()
      .then(({ data: { user } }) => {
        setUserName(user?.user_metadata?.full_name ?? user?.email ?? null)
        setAvatar(user?.user_metadata?.picture ?? null)
      })
    loadBands()
  }, [])

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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (year > 0) {
      setFilterBand('')
      setFilterVenue('')
      setFilterCountry('')
      setFilterMonth('')
      loadShows(year)
    }
  }, [year])

  const uniqueBands = useMemo(() => [...new Set(rows.map((r) => r.band))].sort(), [rows])
  const uniqueVenues = useMemo(() => [...new Set(rows.map((r) => r.venue))].sort(), [rows])
  const uniqueCountries = useMemo(
    () => [...new Set(rows.map((r) => r.country).filter(Boolean))] as string[],
    [rows],
  )
  const usedMonths = useMemo(
    () => [...new Set(rows.map((r) => r.show_date.slice(5, 7)))].sort(),
    [rows],
  )

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (filterBand && r.band !== filterBand) return false
      if (filterVenue && r.venue !== filterVenue) return false
      if (filterCountry && r.country !== filterCountry) return false
      if (filterMonth && r.show_date.slice(5, 7) !== filterMonth) return false
      return true
    })
  }, [rows, filterBand, filterVenue, filterCountry, filterMonth])

  const hasActiveFilters = filterBand || filterVenue || filterCountry || filterMonth
  const total = filteredRows.length

  const yearOptions = useMemo(() => {
    const start = 2020
    const end = year + 1
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }, [year])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const finalBand = userBands.length > 0 && band === 'Otra' ? customBand.trim() : band.trim()
    if (!date || !venue.trim() || !finalBand) {
      setError('Te falta completar algo (fecha / lugar / banda).')
      return
    }

    setSaving(true)

    try {
      const res = await fetch('/api/shows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          show_date: date,
          venue: venue.trim(),
          band: finalBand,
          country,
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
      setCustomBand('')
      setCountry('AR')

      const insertedYear = yearOf(date)
      if (insertedYear !== year) setYear(insertedYear)
      else await loadShows(year)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleteModal) return
    const { type, id } = deleteModal
    setDeleteModal(null)

    if (type === 'show') {
      setError(null)
      try {
        const res = await fetch(`/api/shows?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
        const json = await res.json()
        if (!res.ok) { setError(json.error || 'Error borrando el show'); return }
        await loadShows(year)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error inesperado')
      }
    } else {
      setBandError(null)
      try {
        const res = await fetch(`/api/bands?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
        const json = await res.json()
        if (!res.ok) { setBandError(json.error || 'Error borrando la banda'); return }
        await loadBands()
      } catch (err: unknown) {
        setBandError(err instanceof Error ? err.message : 'Error inesperado')
      }
    }
  }

  const inputClass = 'w-full rounded-md border border-[var(--border-input)] bg-[var(--bg-input)] px-3 py-2.5 text-sm text-[var(--text)] placeholder-[var(--text-dim)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-dim)] transition-colors'
  const selectClass = 'w-full rounded-md border border-[var(--border-input)] bg-[var(--bg-input)] px-3 py-2.5 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-dim)] transition-colors appearance-none'
  const labelClass = 'block text-[10px] uppercase tracking-widest text-[var(--text-dim)] mb-1.5'

  return !mounted || loading || saving ? (
    <div
      className="flex items-center justify-center mt-60 gap-2"
      suppressHydrationWarning
    >
      <Image src="/loader2.gif" alt="Loading" width={400} height={400} />
    </div>
  ) : (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="mx-auto max-w-[880px] px-6 py-12">
        <header className="mb-8">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-[22px] font-medium tracking-tight">
                Show Tracker
              </h1>
              <div className="flex items-center gap-2 mt-1.5">
                {avatar && (
                  <Image
                    src={avatar}
                    alt="Avatar"
                    width={28}
                    height={28}
                    className="rounded-full"
                  />
                )}
                {userName && (
                  <p className="text-[13px] text-[var(--text-muted)]">{userName}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle />
              <button
                onClick={async () => {
                  await createClient().auth.signOut()
                  router.push('/login')
                }}
                className="rounded-md border border-[var(--border-input)] bg-transparent px-3.5 py-2 text-xs text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--text-dim)] cursor-pointer transition-colors"
              >
                Logout
              </button>
              <span className="text-[11px] uppercase tracking-widest text-[var(--text-dim)]">Año</span>
              <select
                className="rounded-md border border-[var(--border-input)] bg-[var(--bg-input)] px-3 py-2 text-sm font-mono text-[var(--text)] appearance-none focus:outline-none focus:border-[var(--accent)]"
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

          <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-5 py-4 flex items-center justify-between">
            <span className="text-[13px] text-[var(--text-muted)]">Total {year}</span>
            <span className="font-mono text-[28px] font-semibold text-[var(--accent)] leading-none tracking-tight">{total}</span>
          </div>

          <div className="mt-6 flex gap-0.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-1 w-fit">
            <button
              onClick={() => setTab('shows')}
              className={`rounded-md px-5 py-2 text-[13px] cursor-pointer transition-colors ${
                tab === 'shows'
                  ? 'bg-[var(--accent-dim)] text-[var(--accent)] font-medium'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              Shows
            </button>
            <button
              onClick={() => setTab('stats')}
              className={`rounded-md px-5 py-2 text-[13px] cursor-pointer transition-colors ${
                tab === 'stats'
                  ? 'bg-[var(--accent-dim)] text-[var(--accent)] font-medium'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              Estadísticas
            </button>
            <button
              onClick={() => setTab('bands')}
              className={`rounded-md px-5 py-2 text-[13px] cursor-pointer transition-colors ${
                tab === 'bands'
                  ? 'bg-[var(--accent-dim)] text-[var(--accent)] font-medium'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              Tus bandas
            </button>
          </div>
        </header>

        {tab === 'stats' ? (
          <Stats rows={rows} year={year} />
        ) : tab === 'bands' ? (
          <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--text-dim)]">Tus bandas</span>
              <div className="flex-1 h-px bg-[var(--border)]" />
            </div>
            <p className="text-[13px] text-[var(--text-muted)] mb-5">
              Agregá los nombres de tus bandas para verlas en el selector.
            </p>

            <form
              onSubmit={async (e) => {
                e.preventDefault()
                setBandError(null)
                if (!newBandName.trim()) return
                setSavingBand(true)
                try {
                  const res = await fetch('/api/bands', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: newBandName.trim() }),
                  })
                  const json = await res.json()
                  if (!res.ok) {
                    setBandError(json.error || 'Error guardando la banda')
                    return
                  }
                  setNewBandName('')
                  await loadBands()
                } catch (err: unknown) {
                  setBandError(err instanceof Error ? err.message : 'Error inesperado')
                } finally {
                  setSavingBand(false)
                }
              }}
              className="flex gap-2.5 mb-6"
            >
              <input
                value={newBandName}
                onChange={(e) => setNewBandName(e.target.value)}
                placeholder="Nombre de la banda…"
                className={`flex-1 ${inputClass}`}
              />
              <button
                type="submit"
                disabled={savingBand}
                className="rounded-md bg-[var(--btn-bg)] text-[var(--btn-text)] border border-[var(--btn-border)] px-5 py-2.5 text-sm font-semibold cursor-pointer hover:bg-[var(--btn-hover)] disabled:opacity-60 transition-all"
              >
                {savingBand ? 'Guardando…' : 'Agregar'}
              </button>
            </form>

            {bandError && (
              <p className="mb-3 text-sm text-[var(--danger)]">{bandError}</p>
            )}

            {userBands.length === 0 ? (
              <p className="text-sm text-[var(--text-dim)]">No tenés bandas guardadas todavía.</p>
            ) : (
              <div className="space-y-1.5">
                {userBands.map((b) => (
                  <div
                    key={b.id}
                    className="group flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-4 py-3"
                  >
                    <span className="text-sm">{b.name}</span>
                    <button
                      onClick={() => setDeleteModal({ type: 'band', id: b.id, name: b.name })}
                      className="rounded-md border border-transparent p-1.5 text-[var(--text-dim)] opacity-0 group-hover:opacity-100 hover:text-[var(--danger)] hover:border-[var(--danger)] hover:bg-[var(--danger-dim)] cursor-pointer transition-all"
                      title="Borrar banda"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : (
          <>
            <section className="mb-5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
              <div className="flex items-center gap-3 mb-5">
                <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--text-dim)]">Agregar show</span>
                <div className="flex-1 h-px bg-[var(--border)]" />
              </div>

              <form
                onSubmit={onSubmit}
                className="grid gap-3 md:grid-cols-5 overflow-hidden"
              >
                <div className="md:col-span-1 min-w-0">
                  <label className={labelClass}>Fecha</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={`${inputClass} min-w-0 max-w-full`}
                  />
                </div>

                <div className="md:col-span-1">
                  <label className={labelClass}>Lugar</label>
                  <input
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    placeholder="Niceto, Sullivans, etc"
                    className={inputClass}
                  />
                </div>

                <div className="md:col-span-1">
                  <label className={labelClass}>País</label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className={selectClass}
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-1">
                  <label className={labelClass}>Banda</label>
                  {userBands.length > 0 ? (
                    <>
                      <select
                        value={band}
                        onChange={(e) => {
                          setBand(e.target.value)
                          if (e.target.value !== 'Otra') setCustomBand('')
                        }}
                        className={selectClass}
                      >
                        <option value="">Seleccionar…</option>
                        {userBands.map((b) => (
                          <option key={b.id} value={b.name}>
                            {b.name}
                          </option>
                        ))}
                        <option value="Otra">Otra</option>
                      </select>
                      {band === 'Otra' && (
                        <input
                          value={customBand}
                          onChange={(e) => setCustomBand(e.target.value)}
                          placeholder="Nombre de la banda…"
                          className={`${inputClass} mt-2`}
                        />
                      )}
                    </>
                  ) : (
                    <input
                      value={band}
                      onChange={(e) => setBand(e.target.value)}
                      placeholder="Nombre de la banda…"
                      className={inputClass}
                    />
                  )}
                </div>

                <div className="md:col-span-1 flex items-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full rounded-md bg-[var(--btn-bg)] text-[var(--btn-text)] border border-[var(--btn-border)] px-4 py-2.5 text-sm font-semibold cursor-pointer hover:bg-[var(--btn-hover)] disabled:opacity-60 transition-all"
                  >
                    {saving ? 'Guardando…' : 'Guardar'}
                  </button>
                </div>
              </form>

              {error ? (
                <p className="mt-3 text-sm text-[var(--danger)]">
                  {error}
                </p>
              ) : null}
            </section>

            <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
              <div className="flex items-baseline justify-between gap-4 flex-wrap mb-4">
                <h2 className="text-[15px] font-medium">Shows {year}</h2>
                <p className="text-[11px] text-[var(--text-dim)] italic">
                  El # se calcula por orden de fecha dentro del año.
                </p>
              </div>

              <div className="flex flex-wrap items-end gap-3 pb-5 mb-5 border-b border-[var(--border)]">
                <div>
                  <label className={labelClass}>Banda</label>
                  <select
                    value={filterBand}
                    onChange={(e) => setFilterBand(e.target.value)}
                    className="rounded-md border border-[var(--border-input)] bg-[var(--bg-input)] px-2.5 py-2 text-xs text-[var(--text)] appearance-none focus:outline-none focus:border-[var(--accent)]"
                  >
                    <option value="">Todas</option>
                    {uniqueBands.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Lugar</label>
                  <select
                    value={filterVenue}
                    onChange={(e) => setFilterVenue(e.target.value)}
                    className="rounded-md border border-[var(--border-input)] bg-[var(--bg-input)] px-2.5 py-2 text-xs text-[var(--text)] appearance-none focus:outline-none focus:border-[var(--accent)]"
                  >
                    <option value="">Todos</option>
                    {uniqueVenues.map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>País</label>
                  <select
                    value={filterCountry}
                    onChange={(e) => setFilterCountry(e.target.value)}
                    className="rounded-md border border-[var(--border-input)] bg-[var(--bg-input)] px-2.5 py-2 text-xs text-[var(--text)] appearance-none focus:outline-none focus:border-[var(--accent)]"
                  >
                    <option value="">Todos</option>
                    {uniqueCountries.map((code) => {
                      const c = COUNTRIES.find((x) => x.code === code)
                      return (
                        <option key={code} value={code}>
                          {c ? `${c.flag} ${c.name}` : code}
                        </option>
                      )
                    })}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Mes</label>
                  <select
                    value={filterMonth}
                    onChange={(e) => setFilterMonth(e.target.value)}
                    className="rounded-md border border-[var(--border-input)] bg-[var(--bg-input)] px-2.5 py-2 text-xs text-[var(--text)] appearance-none focus:outline-none focus:border-[var(--accent)]"
                  >
                    <option value="">Todos</option>
                    {usedMonths.map((m) => {
                      const mo = MONTHS.find((x) => x.value === m)
                      return (
                        <option key={m} value={m}>
                          {mo ? mo.label : m}
                        </option>
                      )
                    })}
                  </select>
                </div>
                {hasActiveFilters && (
                  <button
                    onClick={() => {
                      setFilterBand('')
                      setFilterVenue('')
                      setFilterCountry('')
                      setFilterMonth('')
                    }}
                    className="rounded-md border border-[var(--border-input)] bg-transparent px-3 py-2 text-[11px] text-[var(--text-muted)] cursor-pointer hover:text-[var(--accent)] hover:border-[var(--accent)] transition-colors"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead className="text-left">
                    <tr className="border-b border-[var(--border-input)]">
                      <th className="pb-3 pr-3 w-12 text-[10px] uppercase tracking-widest text-[var(--text-dim)] font-medium">#</th>
                      <th className="pb-3 pr-3 w-36 text-[10px] uppercase tracking-widest text-[var(--text-dim)] font-medium">Fecha</th>
                      <th className="pb-3 pr-3 text-[10px] uppercase tracking-widest text-[var(--text-dim)] font-medium">Lugar</th>
                      <th className="pb-3 pr-3 text-[10px] uppercase tracking-widest text-[var(--text-dim)] font-medium">Banda</th>
                      <th className="pb-3 pr-3 w-11"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.length === 0 && !loading ? (
                      <tr>
                        <td className="py-5 text-[var(--text-dim)]" colSpan={5}>
                          {hasActiveFilters
                            ? 'No hay shows que coincidan con los filtros.'
                            : `No hay shows cargados para ${year}.`}
                        </td>
                      </tr>
                    ) : null}

                    {filteredRows.map((r, idx) => (
                      <tr key={r.id} className="group border-b border-[var(--border)] hover:bg-[var(--row-hover)] transition-colors">
                        <td className="py-3.5 pr-3 font-mono text-xs text-[var(--text-dim)]">{idx + 1}</td>
                        <td className="py-3.5 pr-3 font-mono text-[13px] text-[var(--text-muted)] tracking-wide">
                          {formatLatamDate(r.show_date)}
                        </td>
                        <td className="py-3.5 pr-3">
                          {r.venue} <span className="ml-1">{countryFlag(r.country)}</span>
                        </td>
                        <td className="py-3.5 pr-3 font-medium">
                          {r.band}
                        </td>
                        <td className="py-3.5 pr-3 text-right">
                          <button
                            onClick={() => setDeleteModal({ type: 'show', id: r.id, name: `${r.band} - ${r.venue}` })}
                            className="rounded-md border border-transparent p-1.5 text-[var(--text-dim)] opacity-0 group-hover:opacity-100 hover:text-[var(--danger)] hover:border-[var(--danger)] hover:bg-[var(--danger-dim)] cursor-pointer transition-all"
                            title="Borrar show"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {deleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)]">
            <div className="rounded-xl border border-[var(--border-input)] bg-[var(--bg-modal)] p-7 shadow-2xl max-w-sm w-full mx-4">
              <h3 className="text-base font-medium mb-2">Confirmar eliminación</h3>
              <p className="text-[13px] text-[var(--text-muted)] mb-6 leading-relaxed">
                ¿Estás seguro de que querés borrar <span className="font-semibold text-[var(--text)]">{deleteModal.name}</span>?
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeleteModal(null)}
                  className="rounded-md border border-[var(--border-input)] bg-transparent px-4 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)] cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  className="rounded-md bg-[var(--danger)] text-white px-4 py-2 text-sm font-medium cursor-pointer hover:bg-[var(--danger-hover)] transition-colors"
                >
                  Borrar
                </button>
              </div>
            </div>
          </div>
        )}

        <footer className="mt-12 text-xs text-[var(--text-dim)]">
          Hecho por{' '}
          <a
            className="text-[var(--text-muted)] underline underline-offset-3 hover:text-[var(--accent)] transition-colors"
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
