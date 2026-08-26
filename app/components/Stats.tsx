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
  const monthsToShow = useMemo(() => {
    const now = new Date()
    const currentYear = now.getFullYear()
    if (year < currentYear) return 12
    if (year === currentYear) return now.getMonth() + 1
    return 0
  }, [year])

  const monthlyData = useMemo(() => {
    const counts = new Array(12).fill(0)
    rows.forEach((r) => {
      const month = new Date(r.show_date + 'T00:00:00').getMonth()
      counts[month]++
    })
    return MONTH_NAMES.slice(0, monthsToShow).map((name, i) => ({
      mes: name,
      shows: counts[i],
    }))
  }, [rows, monthsToShow])

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
      const name = r.band === 'Supervos' ? 'SuperVos' : r.band
      map[name] = (map[name] || 0) + 1
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
    return Math.round(rows.length / monthsElapsed)
  }, [rows, year])

  const uniqueVenues = useMemo(() => new Set(rows.map((r) => r.venue)).size, [rows])
  const uniqueBands = useMemo(() => new Set(rows.map((r) => r.band === 'Supervos' ? 'SuperVos' : r.band)).size, [rows])

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-[#222120] bg-[#1a1917] p-6">
        <p className="text-[#4a4640]">No hay shows cargados para {year}.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
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
            className="rounded-xl border border-[#222120] bg-[#1a1917] p-5 text-center"
          >
            <p className="text-[11px] uppercase tracking-widest text-[#4a4640] mb-1.5">{card.label}</p>
            <p className="font-mono text-[32px] font-semibold text-[#c9a23c] leading-none tracking-tight">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Shows per month bar chart */}
      <div className="rounded-xl border border-[#222120] bg-[#1a1917] p-6">
        <h3 className="text-[15px] font-medium mb-5">Shows por mes</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2825" />
            <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#7d7870' }} axisLine={{ stroke: '#2a2825' }} tickLine={{ stroke: '#2a2825' }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#7d7870' }} axisLine={{ stroke: '#2a2825' }} tickLine={{ stroke: '#2a2825' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1a1917',
                border: '1px solid #2a2825',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#e5e0d8',
              }}
              cursor={{ fill: 'rgba(201, 162, 60, 0.06)' }}
            />
            <Bar dataKey="shows" fill="#c9a23c" radius={[3, 3, 0, 0]} opacity={0.85} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Cumulative growth line chart */}
      <div className="rounded-xl border border-[#222120] bg-[#1a1917] p-6">
        <h3 className="text-[15px] font-medium mb-5">Crecimiento acumulado</h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={cumulativeData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2825" />
            <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#7d7870' }} axisLine={{ stroke: '#2a2825' }} tickLine={{ stroke: '#2a2825' }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#7d7870' }} axisLine={{ stroke: '#2a2825' }} tickLine={{ stroke: '#2a2825' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1a1917',
                border: '1px solid #2a2825',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#e5e0d8',
              }}
              cursor={{ stroke: 'rgba(201, 162, 60, 0.3)' }}
            />
            <Line
              type="monotone"
              dataKey="total"
              stroke="#c9a23c"
              strokeWidth={2}
              dot={{ fill: '#c9a23c', r: 4, strokeWidth: 0 }}
              activeDot={{ fill: '#c9a23c', r: 6, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Top venues & bands */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-[#222120] bg-[#1a1917] p-6">
          <h3 className="text-[15px] font-medium mb-4">Top lugares</h3>
          <div>
            {topVenues.map(([name, count], i) => (
              <div key={name} className="flex items-center justify-between text-[13px] py-2.5 border-b border-[#222120] last:border-b-0">
                <span>
                  <span className="font-mono text-[11px] text-[#4a4640] mr-2.5 inline-block w-5">{i + 1}.</span>
                  {name}
                </span>
                <span className="font-mono font-semibold text-[#c9a23c]">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-[#222120] bg-[#1a1917] p-6">
          <h3 className="text-[15px] font-medium mb-4">Top bandas</h3>
          <div>
            {topBands.map(([name, count], i) => (
              <div key={name} className="flex items-center justify-between text-[13px] py-2.5 border-b border-[#222120] last:border-b-0">
                <span>
                  <span className="font-mono text-[11px] text-[#4a4640] mr-2.5 inline-block w-5">{i + 1}.</span>
                  {name}
                </span>
                <span className="font-mono font-semibold text-[#c9a23c]">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Best month highlight */}
      {bestMonth && (
        <div className="rounded-xl border border-[#222120] bg-[#1a1917] p-7 text-center">
          <p className="text-[11px] uppercase tracking-widest text-[#4a4640] mb-1.5">Mejor mes</p>
          <p className="font-mono text-[28px] font-semibold text-[#c9a23c]">{bestMonth.mes}</p>
          <p className="text-[13px] text-[#7d7870] mt-1">{bestMonth.shows} shows</p>
        </div>
      )}
    </div>
  )
}