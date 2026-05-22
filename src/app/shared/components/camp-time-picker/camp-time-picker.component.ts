import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-camp-time-picker',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-camp-sand rounded-xl shadow-camp-lg max-h-48 overflow-y-auto py-1.5 custom-scrollbar animate-slide-up">
      @for (time of timeOptions; track time) {
        <button
          type="button"
          (click)="onSelectTime(time)"
          class="w-full text-left px-4 py-2.5 text-xs text-camp-earth hover:bg-camp-cream/40 transition-colors flex items-center justify-between cursor-pointer"
        >
          <span>{{ time }}</span>
          @if (selectedTime() === time) {
            <span class="text-camp-sage">✓</span>
          }
        </button>
      }
    </div>
  `
})
export class CampTimePickerComponent {
  selectedTime = input<string>('');
  timeSelected = output<string>();

  readonly timeOptions = [
    '00:00', '00:30', '01:00', '01:30', '02:00', '02:30', '03:00', '03:30',
    '04:00', '04:30', '05:00', '05:30', '06:00', '06:30', '07:00', '07:30',
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
    '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30'
  ];

  onSelectTime(time: string) {
    this.timeSelected.emit(time);
  }
}
