'use client'

import React, { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"

const fortunes = [
  { icon: '☀️', description: '大吉', color: 'text-amber-600' },
  { icon: '🌤️', description: '吉', color: 'text-orange-500' },
  { icon: '⛅', description: '小吉', color: 'text-cyan-600' },
  { icon: '☁️', description: '平', color: 'text-slate-500' },
  { icon: '🌧️', description: '小凶', color: 'text-indigo-600' },
  { icon: '⛈️', description: '凶', color: 'text-purple-600' },
]

const months = [
  '一月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '十一月', '十二月'
]

const weekdays = ['日', '月', '火', '水', '木', '金', '土']

const FortuneCalendar = () => {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(null)

  const prevYear = () => setCurrentYear(currentYear - 1)
  const nextYear = () => setCurrentYear(currentYear + 1)

  const getRandomFortune = () => fortunes[Math.floor(Math.random() * fortunes.length)]

  const renderMonthGroup = (startMonth) => (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }, (_, i) => {
            const monthIndex = startMonth + i
            if (monthIndex >= 12) return null
            const fortune = getRandomFortune()
            return (
              (<Button
                key={monthIndex}
                variant="ghost"
                className="w-full h-full flex flex-col items-center p-4 hover:bg-amber-100"
                onClick={() => setSelectedMonth(monthIndex)}>
                <h3 className="text-lg font-medium text-amber-800 mb-2">{months[monthIndex]}</h3>
                <div className="text-4xl mb-1">{fortune.icon}</div>
                <p className={`text-sm ${fortune.color}`}>{fortune.description}</p>
              </Button>)
            );
          })}
        </div>
      </CardContent>
    </Card>
  )

  const renderMonthCalendar = (month) => {
    const daysInMonth = new Date(currentYear, month + 1, 0).getDate()
    const firstDayOfMonth = new Date(currentYear, month, 1).getDay()

    return (
      (<div className="w-full px-4">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekdays.map((day) => (
            <div key={day} className="text-center font-medium text-amber-800">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDayOfMonth }).map((_, index) => (
            <div key={`empty-${index}`} className="h-16"></div>
          ))}
          {Array.from({ length: daysInMonth }).map((_, index) => {
            const fortune = getRandomFortune()
            return (
              (<div
                key={index}
                className="h-16 bg-white rounded-lg shadow p-1 flex flex-col items-center justify-between border border-amber-200">
                <span className="text-sm font-medium text-gray-600">{index + 1}</span>
                <span className="text-lg">{fortune.icon}</span>
                <span className={`text-xs ${fortune.color}`}>{fortune.description}</span>
              </div>)
            );
          })}
        </div>
      </div>)
    );
  }

  const renderYearView = () => (
    <div
      className="max-w-4xl mx-auto bg-amber-50 p-6 rounded-xl shadow-lg"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23d1b78f' fill-opacity='0.1' fill-rule='evenodd'/%3E%3C/svg%3E")`,
      }}>
      <h1 className="text-3xl font-semibold text-amber-800 mb-6 text-center">
        {currentYear}年 八字流年運勢暦
      </h1>
      <div className="flex justify-between items-center mb-6">
        <Button onClick={prevYear} variant="outline">
          <ChevronLeft className="mr-2 h-4 w-4" /> 前一年
        </Button>
        <span className="text-xl font-medium text-amber-900">{currentYear}年</span>
        <Button onClick={nextYear} variant="outline">
          後一年 <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
      <ScrollArea className="h-[600px]">
        {renderMonthGroup(0)}
        {renderMonthGroup(4)}
        {renderMonthGroup(8)}
      </ScrollArea>
    </div>
  )

  const renderMonthView = () => (
    <div className="bg-amber-50 min-h-screen">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <Button onClick={() => setSelectedMonth(null)} variant="ghost">
            <ChevronLeft className="mr-2 h-4 w-4" /> 返回年度概览
          </Button>
          <h2 className="text-2xl font-semibold text-amber-800">
            {currentYear}年 {months[selectedMonth]}
          </h2>
        </div>
        <ScrollArea className="h-[calc(100vh-120px)]">
          {renderMonthCalendar(selectedMonth)}
        </ScrollArea>
      </div>
    </div>
  )

  return selectedMonth === null ? renderYearView() : renderMonthView();
}

export default FortuneCalendar