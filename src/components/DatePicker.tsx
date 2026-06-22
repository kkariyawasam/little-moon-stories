import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  placeholder?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  placeholder = "mm/dd/yyyy"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse initial date or default to today
  let initialDate = new Date();
  if (value) {
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      initialDate = parsed;
    }
  }

  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth()); // 0-11

  // Keep internal panel inside current values when input value changes
  useEffect(() => {
    if (value) {
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) {
        setCurrentYear(parsed.getFullYear());
        setCurrentMonth(parsed.getMonth());
      }
    }
  }, [value]);

  // Click outside listener to close the calendar panel
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Format YYYY-MM-DD back for display label as MM/DD/YYYY
  const getDisplayLabel = () => {
    if (!value) return placeholder;
    const parts = value.split('-');
    if (parts.length === 3) {
      return `${parts[1]}/${parts[2]}/${parts[0]}`; // MM/DD/YYYY
    }
    return value;
  };

  const years: number[] = [];
  const currentSystemYear = new Date().getFullYear();
  // Birthdays usually range from 0 to 18 years ago for children
  for (let y = currentSystemYear; y >= currentSystemYear - 20; y--) {
    years.push(y);
  }

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const startDayOfWeek = new Date(currentYear, currentMonth, 1).getDay(); // 0 (Sun) to 6 (Sat)
  
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const formattedMonth = String(currentMonth + 1).padStart(2, '0');
    const formattedDay = String(day).padStart(2, '0');
    const isoString = `${currentYear}-${formattedMonth}-${formattedDay}`;
    onChange(isoString);
    setIsOpen(false);
  };

  const isSelected = (day: number) => {
    if (!value) return false;
    const parts = value.split('-');
    if (parts.length === 3) {
      return parseInt(parts[0]) === currentYear &&
             parseInt(parts[1]) === (currentMonth + 1) &&
             parseInt(parts[2]) === day;
    }
    return false;
  };

  const isToday = (day: number) => {
    const today = new Date();
    return today.getFullYear() === currentYear &&
           today.getMonth() === currentMonth &&
           today.getDate() === day;
  };

  // Generate calendar grid array
  const gridCells = [];
  // Previous month trailing days
  const prevMonthDaysCount = new Date(currentYear, currentMonth, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    gridCells.push({
      day: prevMonthDaysCount - i,
      isCurrentMonth: false
    });
  }
  // Current month active days
  for (let d = 1; d <= daysInMonth; d++) {
    gridCells.push({
      day: d,
      isCurrentMonth: true
    });
  }

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Target input looks like regular input but handles clicks customly */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left px-3.5 py-2.5 bg-[#05060d] border border-[#212752] rounded-xl text-xs text-slate-100 flex items-center justify-between hover:border-indigo-400/70 focus:outline-none focus:ring-1 focus:ring-indigo-400 select-none transition-all cursor-pointer min-h-[38px] active:scale-[0.99]"
      >
        <span className={value ? "text-slate-100 font-mono" : "text-slate-500 font-mono"}>
          {getDisplayLabel()}
        </span>
        <CalendarIcon className="w-3.5 h-3.5 text-[#5e6695] shrink-0" />
      </button>

      {/* Floating Dropdown Calendar */}
      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-[280px] bg-[#0c0e1e] border border-[#242b5c] rounded-2xl shadow-2xl p-4 z-50 select-none animate-in fade-in slide-in-from-top-1 duration-150">
          
          {/* Header Month / Year drop downs and arrows */}
          <div className="flex items-center justify-between gap-1 mb-4">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Quick dropdown selects for month and year */}
            <div className="flex items-center gap-1.5 flex-1 justify-center">
              <select
                value={currentMonth}
                onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
                className="bg-[#05060d] text-slate-100 border border-[#212752] rounded-lg text-[11px] px-1.5 py-1 font-semibold focus:outline-none focus:border-indigo-400 cursor-pointer"
              >
                {months.map((m, idx) => (
                  <option key={m} value={idx}>{m}</option>
                ))}
              </select>

              <select
                value={currentYear}
                onChange={(e) => setCurrentYear(parseInt(e.target.value))}
                className="bg-[#05060d] text-slate-100 border border-[#212752] rounded-lg text-[11px] px-1.5 py-1 font-mono font-semibold focus:outline-none focus:border-indigo-400 cursor-pointer"
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Days of week header */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-[#5c6492] uppercase tracking-wider mb-2 font-mono">
            <span>Su</span>
            <span>Mo</span>
            <span>Tu</span>
            <span>We</span>
            <span>Th</span>
            <span>Fr</span>
            <span>Sa</span>
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {gridCells.map((cell, idx) => {
              if (!cell.isCurrentMonth) {
                return (
                  <div
                    key={`empty-${idx}`}
                    className="aspect-square flex items-center justify-center text-[11px] text-slate-700 font-mono"
                  >
                    {cell.day}
                  </div>
                );
              }

              const selected = isSelected(cell.day);
              const today = isToday(cell.day);

              return (
                <button
                  key={`day-${cell.day}`}
                  type="button"
                  onClick={() => handleSelectDay(cell.day)}
                  className={`aspect-square rounded-lg flex flex-col items-center justify-center text-[11px] font-mono transition-all cursor-pointer relative ${
                    selected
                      ? 'bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 font-bold shadow-lg shadow-amber-400/20 scale-[1.05]'
                      : 'hover:bg-indigo-600/30 text-slate-200'
                  }`}
                >
                  <span>{cell.day}</span>
                  {today && !selected && (
                    <span className="absolute bottom-1 w-1 h-1 bg-amber-400 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Helper quick actions footer */}
          <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-[#1b2149] text-[10px]">
            <button
              type="button"
              onClick={() => {
                const todayStr = new Date().toISOString().split('T')[0];
                onChange(todayStr);
                setIsOpen(false);
              }}
              className="px-2.5 py-1 rounded hover:bg-slate-800 text-slate-300 font-medium transition-colors"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => {
                onChange("");
                setIsOpen(false);
              }}
              className="px-2.5 py-1 rounded hover:bg-slate-800 text-amber-300/85 font-medium transition-colors"
            >
              Clear
            </button>
          </div>

        </div>
      )}
    </div>
  );
};
