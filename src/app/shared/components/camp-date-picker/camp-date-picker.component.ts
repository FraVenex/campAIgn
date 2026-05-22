import { Component, input, output, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-camp-date-picker',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div (click)="$event.stopPropagation()" class="bg-white border border-camp-sand rounded-xl shadow-camp-lg p-4 w-72 animate-slide-up">
      <div class="flex items-center justify-between mb-4">
        <button
          type="button"
          (click)="navigateMonth(-1)"
          class="w-8 h-8 rounded-full hover:bg-camp-sand/30 flex items-center justify-center text-camp-olive cursor-pointer"
        >
          &lt;
        </button>
        <span class="text-xs font-serif font-bold text-camp-earth uppercase tracking-wider">
          {{ monthYearLabel() }}
        </span>
        <button
          type="button"
          (click)="navigateMonth(1)"
          class="w-8 h-8 rounded-full hover:bg-camp-sand/30 flex items-center justify-center text-camp-olive cursor-pointer"
        >
          &gt;
        </button>
      </div>

      <div class="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-camp-olive/60 uppercase mb-2">
        @for (d of weekdayLabels; track d) {
          <div>{{ d }}</div>
        }
      </div>

      <div class="grid grid-cols-7 gap-1">
        @for (cell of monthDays(); track $index) {
          <button
            type="button"
            [disabled]="disablePast() && isPast(cell.date)"
            (click)="onSelectDate(cell.date)"
            [class.text-camp-olive]="selectedDate() !== formatDate(cell.date)"
            [class.opacity-30]="!cell.isCurrentMonth && selectedDate() !== formatDate(cell.date)"
            [class.bg-camp-sage]="selectedDate() === formatDate(cell.date)"
            [class.text-white]="selectedDate() === formatDate(cell.date)"
            [class.font-bold]="selectedDate() === formatDate(cell.date)"
            [class.opacity-10]="disablePast() && isPast(cell.date)"
            class="w-8 h-8 rounded-full hover:bg-camp-sand/30 flex items-center justify-center text-xs transition-colors disabled:pointer-events-none cursor-pointer"
          >
            {{ cell.label }}
          </button>
        }
      </div>
    </div>
  `
})
export class CampDatePickerComponent implements OnInit {
  selectedDate = input<string>('');
  disablePast = input<boolean>(true);

  dateSelected = output<string>();

  readonly weekdayLabels = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];

  pickerDate = signal<Date>(new Date());

  monthYearLabel = computed(() =>
    this.pickerDate().toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
  );

  monthDays = computed(() => {
    const d = this.pickerDate();
    const year = d.getFullYear();
    const month = d.getMonth();

    const firstDay = new Date(year, month, 1);
    let startDay = firstDay.getDay();
    startDay = startDay === 0 ? 6 : startDay - 1;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells: { date: Date; isCurrentMonth: boolean; label: number }[] = [];

    for (let i = startDay - 1; i >= 0; i--) {
      cells.push({
        date: new Date(year, month - 1, daysInPrevMonth - i),
        isCurrentMonth: false,
        label: daysInPrevMonth - i
      });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      cells.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
        label: i
      });
    }

    const totalCells = cells.length;
    const remaining = totalCells > 35 ? 42 - totalCells : 35 - totalCells;
    for (let i = 1; i <= remaining; i++) {
      cells.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
        label: i
      });
    }

    return cells;
  });

  ngOnInit() {
    const current = this.selectedDate();
    if (current) {
      const d = new Date(current);
      if (!isNaN(d.getTime())) {
        this.pickerDate.set(d);
      }
    }
  }

  navigateMonth(direction: number) {
    const d = new Date(this.pickerDate());
    d.setMonth(d.getMonth() + direction);
    this.pickerDate.set(d);
  }

  isPast(date: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compare = new Date(date);
    compare.setHours(0, 0, 0, 0);
    return compare.getTime() < today.getTime();
  }

  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  onSelectDate(date: Date) {
    this.dateSelected.emit(this.formatDate(date));
  }
}
