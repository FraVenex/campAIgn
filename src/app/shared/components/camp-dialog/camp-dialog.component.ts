import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-camp-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-8">
      <div 
        class="absolute inset-0 bg-camp-earth/40 backdrop-blur-sm transition-opacity duration-300"
        (click)="close.emit()"
      ></div>

      <div [class]="'relative w-full ' + maxWidth() + ' max-h-[92dvh] landscape:max-h-[96dvh] bg-white rounded-t-2xl sm:rounded-camp-xl shadow-2xl overflow-hidden flex flex-col animate-scale-in border border-camp-sand/30 pb-safe sm:pb-0'">
        <div class="px-4 py-3.5 sm:px-6 md:px-8 sm:py-6 border-b border-camp-sand/30 flex items-center justify-between bg-camp-cream/30 shrink-0">
          <div class="flex items-center gap-3 sm:gap-4">
            @if (icon()) {
              <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-camp-sage/10 text-camp-sage flex items-center justify-center shadow-inner shrink-0">
                <span class="text-xl sm:text-2xl">{{ icon() }}</span>
              </div>
            }
            <div>
              @if (subtitle()) {
                <p class="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] text-camp-olive/60 leading-none mb-1">{{ subtitle() }}</p>
              }
              <h2 class="text-xl sm:text-2xl font-serif text-camp-earth tracking-tight">{{ title() }}</h2>
            </div>
          </div>
          
          <button
            (click)="close.emit()"
            class="w-10 h-10 sm:w-12 sm:h-12 rounded-full hover:bg-camp-sand/40 flex items-center justify-center transition-all group cursor-pointer"
            aria-label="Chiudi dialogo"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5 sm:h-6 sm:w-6 text-camp-olive group-hover:rotate-90 transition-transform"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 md:p-8">
          <ng-content></ng-content>
        </div>

        <ng-content select="[footer]"></ng-content>
      </div>
    </div>
  `,
  styles: [`
    .animate-scale-in {
      animation: scaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes scaleIn {
      from { opacity: 0; transform: scale(0.95) translateY(20px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
    .custom-scrollbar::-webkit-scrollbar {
      width: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: #E8E4D9;
      border-radius: 3px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: #D8D4C9;
    }
  `]
})
export class CampDialogComponent {
  title = input.required<string>();
  subtitle = input<string>();
  icon = input<string>();
  maxWidth = input<string>('max-w-5xl');
  close = output<void>();
}
