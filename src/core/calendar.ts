import { BALANCE } from './balance';

/** A run is `months` game months of `daysPerMonth` shop days each. */
export const calendar = {
  daysPerMonth: BALANCE.calendar.daysPerMonth,
  months: BALANCE.calendar.months,
  get totalDays() {
    return this.daysPerMonth * this.months;
  },
};

export const monthOf = (day: number) => Math.floor((day - 1) / calendar.daysPerMonth) + 1;
export const dayInMonth = (day: number) => ((day - 1) % calendar.daysPerMonth) + 1;
export const isMonthStart = (day: number) => dayInMonth(day) === 1;
/** True once the last day of the last month has been played. */
export const isRunComplete = (day: number) => day > calendar.totalDays;

export const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
export const monthName = (day: number) => MONTH_NAMES[(monthOf(day) - 1) % 12];
