import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class DuoStreakService {
  getStreakWeeks(myWatchedDates: (string | null)[], friendWatchedDates: (string | null)[], now = new Date()): number {
    const myWeeks = this.toWeekKeys(myWatchedDates);
    const friendWeeks = this.toWeekKeys(friendWatchedDates);

    const bothActiveWeeksAgo = (weeksAgo: number): boolean => {
      const date = new Date(now);
      date.setDate(date.getDate() - weeksAgo * 7);
      const key = this.weekKey(date);
      return myWeeks.has(key) && friendWeeks.has(key);
    };

    // Huidige week telt pas mee zodra er gedeelde activiteit is; anders start de telling bij vorige week, zodat de streak niet meteen breekt zolang de week nog loopt.
    let weeksAgo = bothActiveWeeksAgo(0) ? 0 : 1;
    let streak = 0;
    while (bothActiveWeeksAgo(weeksAgo)) {
      streak++;
      weeksAgo++;
    }
    return streak;
  }

  private toWeekKeys(dates: (string | null)[]): Set<string> {
    return new Set(
      dates.filter((d): d is string => !!d).map(d => this.weekKey(new Date(d))),
    );
  }

  private weekKey(date: Date): string {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return `${d.getUTCFullYear()}-W${weekNo}`;
  }
}
