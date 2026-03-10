'use client'

import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts'

type ShowRow = {
  id: string
  show_date: string
  venue: string
  band: string
}

const MONTH_NAMES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
]

export default function Stats({ rows, year }: { rows: ShowRow[]; year: number }) {
  const monthlyData = useMemo(() => {
    const counts = new Array(12).fill(0)
    rows.forEach((r) => {
      const month = new Date(r.show_date + 'T00:00:00').getMonth()
      counts[month]++
    })
    return MONTH_NAMES.map((name, i) => ({
      mes: name,
      shows: counts[i],
    }))
  }, [rows])

  const cumulativeData = useMemo(() => {
    let acc = 0
    return monthlyData.map((d) => {
      acc += d.shows
      return { mes: d.mes, total: acc }
    })
  }, [monthlyData])

  const topVenues = useMemo(() => {
    const map: Record<string, number> = {}
    rows.forEach((r) => {
      map[r.venue] = (map[r.venue] || 0) + 1
    })
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
  }, [rows])

  const topBands = useMemo(() => {
    const map: Record<string, number> = {}
    rows.forEach((r) => {
      map[r.band] = (map[r.band] || 0) + 1
    })
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
  }, [rows])

  const bestMonth = useMemo(() => {
    const best = monthlyData.reduce((a, b) => (b.shows > a.shows ? b : a), monthlyData[0])
    return best.shows > 0 ? best : null
  }, [monthlyData])

  const avgPerMonth = useMemo(() => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const monthsElapsed = year < currentYear ? 12 : (year === currentYear ? now.getMonth() + 1 : 0)
    if (monthsElapsed === 0) return 0
    return (rows.length / monthsElapsed).toFixed(1)
  }, [rows, year])

  const uniqueVenues = useMemo(() => new Set(rows.map((r) => r.venue)).size, [rows])
  const uniqueBands = useMemo(() => new Set(rows.map((r) => r.band)).size, [rows])

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-[#d6cbb6] bg-[#fbf7ee] p-5">
        <p className="opacity-70">No hay shows cargados para {year}.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total shows', value: rows.length },
          { label: 'Promedio/mes', value: avgPerMonth },
          { label: 'Lugares distintos', value: uniqueVenues },
          { label: 'Bandas distintas', value: uniqueBands },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-[#d6cbb6] bg-[#fbf7ee] p-4 text-center"
          >
            <p className="text-xs opacity-70">{card.label}</p>
            <p className="text-2xl font-bold mt-1">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Shows per month bar chart */}
      <div className="rounded-2xl border border-[#d6cbb6] bg-[#fbf7ee] p-5">
        <h3 className="text-lg tracking-wide mb-4">Shows por mes</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#d6cbb6" />
            <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#2f2a20' }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#2f2a20' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fbf7ee',
                border: '1px solid #d6cbb6',
                borderRadius: '8px',
                fontSize: '13px',
              }}
            />
            <Bar dataKey="shows" fill="#a3947b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Cumulative growth line chart */}
      <div className="rounded-2xl border border-[#d6cbb6] bg-[#fbf7ee] p-5">
        <h3 className="text-lg tracking-wide mb-4">Crecimiento acumulado</h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={cumulativeData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#d6cbb6" />
            <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#2f2a20' }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#2f2a20' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fbf7ee',
                border: '1px solid #d6cbb6',
                borderRadius: '8px',
                fontSize: '13px',
              }}
            />
            <Line
              type="monotone"
              dataKey="total"
              stroke="#7a6c55"
              strokeWidth={2}
              dot={{ fill: '#7a6c55', r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Top venues & bands */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Top venues */}
        <div className="rounded-2xl border border-[#d6cbb6] bg-[#fbf7ee] p-5">
          <h3 className="text-lg tracking-wide mb-3">Top lugares</h3>
          <div className="space-y-2">
            {topVenues.map(([name, count], i) => (
              <div key={name} className="flex items-center justify-between text-sm">
                <span>
                  <span className="opacity-50 mr-2">{i + 1}.</span>
                  {name}
                </span>
                <span className="font-bold">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top bands */}
        <div className="rounded-2xl border border-[#d6cbb6] bg-[#fbf7ee] p-5">
          <h3 className="text-lg tracking-wide mb-3">Top bandas</h3>
          <div className="space-y-2">
            {topBands.map(([name, count], i) => (
              <div key={name} className="flex items-center justify-between text-sm">
                <span>
                  <span className="opacity-50 mr-2">{i + 1}.</span>
                  {name}
                </span>
                <span className="font-bold">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Best month highlight */}
      {bestMonth && (
        <div className="rounded-2xl border border-[#d6cbb6] bg-[#fbf7ee] p-5 text-center">
          <p className="text-xs opacity-70">Mejor mes</p>
          <p className="text-2xl font-bold mt-1">{bestMonth.mes}</p>
          <p className="text-sm opacity-70 mt-1">{bestMonth.shows} shows</p>
        </div>
      )}
    </div>
  )
}
