import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-camp-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="camp-card relative overflow-hidden transition-all duration-300"
      [ngClass]="{
        'h-full flex flex-col': fullHeight(),
        'bg-white text-camp-earth border-camp-sand/60': variant() === 'default',
        'bg-camp-sage text-white border-white/10': variant() === 'primary',
        'bg-gradient-to-br from-camp-sage to-camp-earth text-white border-none': variant() === 'dark',
        'bg-white/80 backdrop-blur-xl border-white/40 shadow-xl': variant() === 'glass',
        'p-6': padding() === 'normal',
        'p-8': padding() === 'large',
        'p-4': padding() === 'small'
      }"
    >
      @if (title() || subtitle() || icon()) {
        <div class="flex items-center justify-between mb-6 relative z-10">
          <div class="flex items-center gap-3">
            @if (icon()) {
              <div class="w-10 h-10 rounded-full flex items-center justify-center border shadow-sm transition-transform group-hover:scale-110"
                   [ngClass]="{
                     'bg-camp-sage/10 border-camp-sage/20 text-camp-sage': variant() === 'default',
                     'bg-white/20 border-white/30 text-white': variant() !== 'default'
                   }">
                <span class="text-xl">{{ icon() }}</span>
              </div>
            }
            <div>
              @if (subtitle()) {
                <span class="text-[10px] uppercase font-bold tracking-[0.2em] opacity-60 block leading-none mb-1.5">{{ subtitle() }}</span>
              }
              @if (title()) {
                <h3 class="text-xl font-serif tracking-tight leading-tight" 
                    [ngClass]="variant() === 'default' ? 'text-camp-earth' : 'text-white'">
                  {{ title() }}
                </h3>
              }
            </div>
          </div>
          <ng-content select="[header-action]"></ng-content>
        </div>
      }
      
      <div class="flex-1 relative z-10">
        <ng-content></ng-content>
      </div>

      @if (hasFooter()) {
        <div class="mt-6 pt-6 border-t border-current/10 relative z-10">
          <ng-content select="[footer]"></ng-content>
        </div>
      }

      <!-- Subtle background decoration if icon is present -->
      @if (icon() && variant() !== 'default') {
        <div class="absolute -right-6 -bottom-6 opacity-10 pointer-events-none transform rotate-12 scale-150">
          <span class="text-9xl">{{ icon() }}</span>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class CampCardComponent {
  title = input<string>();
  subtitle = input<string>();
  icon = input<string>();
  variant = input<'default' | 'primary' | 'dark' | 'glass'>('default');
  padding = input<'small' | 'normal' | 'large'>('normal');
  fullHeight = input<boolean>(true);
  hasFooter = input<boolean>(false);
}
