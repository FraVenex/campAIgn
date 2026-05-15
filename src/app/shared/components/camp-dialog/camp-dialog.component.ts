import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-camp-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
      <!-- Backdrop -->
      <div 
        class="absolute inset-0 bg-camp-earth/40 backdrop-blur-sm transition-opacity duration-300"
        (click)="close.emit()"
      ></div>

      <!-- Modal -->
      <div class="relative w-full max-w-5xl max-h-[90vh] bg-white rounded-camp-xl shadow-2xl overflow-hidden flex flex-col animate-scale-in border border-camp-sand/30">
        <!-- Header -->
        <div class="px-8 py-6 border-b border-camp-sand/30 flex items-center justify-between bg-camp-cream/30">
          <div class="flex items-center gap-4">
            @if (icon()) {
              <div class="w-12 h-12 rounded-2xl bg-camp-sage/10 text-camp-sage flex items-center justify-center shadow-inner">
                <span class="text-2xl">{{ icon() }}</span>
              </div>
            }
            <div>
              @if (subtitle()) {
                <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-camp-olive/60 leading-none mb-1">{{ subtitle() }}</p>
              }
              <h2 class="text-2xl font-serif text-camp-earth tracking-tight">{{ title() }}</h2>
            </div>
          </div>
          
          <button
            (click)="close.emit()"
            class="w-12 h-12 rounded-full hover:bg-camp-sand/40 flex items-center justify-center transition-all group"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-6 w-6 text-camp-olive group-hover:rotate-90 transition-transform"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-y-auto custom-scrollbar">
          <ng-content></ng-content>
        </div>

        <!-- Footer (Optional) -->
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
  close = output<void>();
}
