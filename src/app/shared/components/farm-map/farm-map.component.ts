import {
	AfterViewInit,
	Component,
	ElementRef,
	HostListener,
	OnDestroy,
	TemplateRef,
	ViewChild,
	computed,
	effect,
	input,
	output,
	signal,
	untracked
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { Plant } from "../../../core/services/plants.service";
import { plantStatusMeta } from "../../../core/constants/domain";
import { GRID_COL_LINES, GRID_NODES, GRID_ROW_LINES, isNodeOccupied, snapToGrid } from "../../../core/utils/farm-grid";

export type FarmMapMode = "view" | "select" | "move";

export interface MapBadge {
	icon: string;
	title: string;
	/** Classe Tailwind per lo sfondo del badge (default bianco). */
	tone?: string;
}

export interface PlantPopupContext {
	$implicit: Plant;
	close: () => void;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

/**
 * Mappa del terreno condivisa da tutte le sezioni (Terreno, Interventi, Raccolta).
 * Gestisce gesture (pan, pinch, wheel, doppio tap), modalità visualizzazione/selezione/spostamento,
 * badge sui marker e posizionamento del popup (ancorato su desktop, bottom sheet su mobile).
 * Il contenuto del popup è fornito dalla pagina tramite `popupTemplate`.
 */
@Component({
	selector: "app-farm-map",
	standalone: true,
	imports: [CommonModule],
	template: `
		<div class="relative isolate">
			<div
				#viewport
				class="map-viewport relative w-full aspect-[4/3] max-h-[70vh] landscape:max-h-[calc(100vh-140px)] border border-camp-sand/50 rounded-camp shadow-inner bg-camp-sand/10 overflow-hidden touch-none select-none"
				[class.cursor-grab]="mode() !== 'select' || selectTool() === 'tap'"
				[class.cursor-crosshair]="mode() === 'select' && selectTool() === 'area'"
				(mousedown)="onMouseDown($event)"
				(wheel)="onWheel($event)"
				(touchstart)="onTouchStart($event)"
				(touchmove)="onTouchMove($event)"
				(touchend)="onTouchEnd($event)"
				(touchcancel)="onTouchEnd($event)"
			>
				<!-- Controlli zoom flottanti -->
				<div class="absolute top-3 right-3 z-30 flex flex-col items-center bg-white/90 backdrop-blur-md rounded-2xl shadow-camp border border-camp-sand/60 p-1 gap-1" (mousedown)="$event.stopPropagation()" (touchstart)="$event.stopPropagation()">
					<button type="button" (click)="zoomBy(0.5)" [disabled]="zoom() >= maxZoom" aria-label="Ingrandisci" class="map-ctrl">+</button>
					<button type="button" (click)="resetView()" aria-label="Ripristina visuale" class="px-1.5 py-0.5 text-[10px] font-bold rounded-md hover:bg-camp-sand/30 text-camp-olive cursor-pointer">{{ zoomPercent() }}%</button>
					<button type="button" (click)="zoomBy(-0.5)" [disabled]="zoom() <= minZoom" aria-label="Rimpicciolisci" class="map-ctrl">−</button>
					<div class="w-5 h-px bg-camp-sand/50 my-0.5"></div>
					<button type="button" (click)="resetView()" aria-label="Adatta allo schermo" title="Adatta allo schermo" class="map-ctrl text-xs">⛶</button>
					@if (mode() === "select") {
						<div class="w-5 h-px bg-camp-sand/50 my-0.5"></div>
						<button
							type="button"
							(click)="selectTool.set(selectTool() === 'area' ? 'tap' : 'area')"
							[class.bg-camp-sage]="selectTool() === 'area'"
							[style.color]="selectTool() === 'area' ? '#fff' : null"
							title="Selezione ad area: trascina per selezionare più piante"
							aria-label="Selezione ad area"
							class="map-ctrl text-xs"
						>
							⬚
						</button>
					}
				</div>

				@if (mode() === "select" && selectTool() === "area") {
					<div class="absolute top-3 left-3 z-30 px-2.5 py-1 bg-camp-sage text-white text-[10px] font-bold uppercase tracking-wider rounded-full shadow pointer-events-none">Trascina per selezionare un'area</div>
				}

				<div
					class="relative w-full h-full origin-top-left will-change-transform bg-gradient-to-br from-[#dfd7bf] to-[#c7beaa]"
					[style.transform]="'translate3d(' + panX() + 'px, ' + panY() + 'px, 0) scale(' + zoom() + ')'"
					[style.transition]="isAnimating() ? 'transform 0.25s cubic-bezier(0.2, 0, 0, 1)' : 'none'"
					(click)="onBackgroundClick()"
				>
					<svg class="absolute inset-0 w-full h-full text-camp-earth/10 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
						<defs>
							<pattern [attr.id]="patternId" width="100" height="100" patternUnits="userSpaceOnUse">
								<rect width="100" height="100" fill="none" stroke="currentColor" stroke-width="1.5" />
								<line x1="0" y1="25" x2="100" y2="25" stroke="currentColor" stroke-width="0.75" stroke-dasharray="3 3" />
								<line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" stroke-width="0.75" stroke-dasharray="3 3" />
								<line x1="0" y1="75" x2="100" y2="75" stroke="currentColor" stroke-width="0.75" stroke-dasharray="3 3" />
							</pattern>
						</defs>
						<rect width="100%" height="100%" [attr.fill]="'url(#' + patternId + ')'" />

						@if (mode() === "move") {
							@for (x of colLines; track x) {
								<line [attr.x1]="x + '%'" y1="7%" [attr.x2]="x + '%'" y2="95%" stroke="#964f26" stroke-width="1.2" stroke-dasharray="3 3" opacity="0.35" />
							}
							@for (y of rowLines; track y) {
								<line x1="5%" [attr.y1]="y + '%'" x2="95%" [attr.y2]="y + '%'" stroke="#964f26" stroke-width="1.2" stroke-dasharray="3 3" opacity="0.35" />
							}
							@for (node of gridNodes; track node.x + "-" + node.y) {
								<circle [attr.cx]="node.x + '%'" [attr.cy]="node.y + '%'" r="2.5" fill="#964f26" opacity="0.4" />
							}
							@if (snapPreview(); as target) {
								<circle [attr.cx]="target.x + '%'" [attr.cy]="target.y + '%'" r="14" [attr.fill]="target.occupied ? 'rgba(239,68,68,0.22)' : 'rgba(138,171,143,0.35)'" [attr.stroke]="target.occupied ? '#dc2626' : '#4a6741'" stroke-width="2" stroke-dasharray="3 3" />
								<circle [attr.cx]="target.x + '%'" [attr.cy]="target.y + '%'" r="4.5" [attr.fill]="target.occupied ? '#dc2626' : '#4a6741'" />
							}
						}
					</svg>

					@for (t of grassTufts; track $index) {
						<span class="absolute text-[8px] opacity-15 pointer-events-none select-none" [style.left.%]="t.x" [style.top.%]="t.y">🌿</span>
					}

					@for (p of renderedPlants(); track p.id) {
						<div
							class="absolute"
							[style.left.%]="p.position_x"
							[style.top.%]="p.position_y"
							[style.z-index]="dragId() === p.id ? 50 : activePopupId() === p.id ? 40 : selectedIds().has(p.id!) ? 20 : 10"
							[style.opacity]="isDimmed(p) ? 0.25 : 1"
						>
							<button
								type="button"
								[attr.aria-label]="p.name"
								[title]="p.name + ' · ' + (p.status || 'Non Valutato')"
								(click)="onPlantClick(p, $event)"
								(mousedown)="onPlantPointerDown($event, p)"
								(touchstart)="onPlantPointerDown($event, p)"
								class="relative w-6 h-6 sm:w-7 sm:h-7 md:w-9 md:h-9 -translate-x-1/2 -translate-y-1/2 rounded-full border md:border-2 flex items-center justify-center shadow-md transition-transform duration-150 hover:scale-125 focus:outline-none touch-none before:content-[''] before:absolute before:-inset-2.5 before:rounded-full"
								[ngClass]="markerClass(p)"
								[class.scale-125]="dragId() === p.id"
								[class.ring-2]="selectedIds().has(p.id!) || dragId() === p.id || activePopupId() === p.id"
								[class.md:ring-4]="selectedIds().has(p.id!)"
								[class.ring-camp-sage]="selectedIds().has(p.id!) || activePopupId() === p.id"
								[class.ring-camp-terracotta]="dragId() === p.id"
								[class.cursor-grab]="mode() === 'move'"
							>
								<span class="text-[10px] sm:text-xs md:text-base leading-none select-none">{{ speciesIcon(p.species) }}</span>
								@if (selectedIds().has(p.id!)) {
									<span class="absolute -top-1 -right-1 w-3.5 h-3.5 md:w-4 md:h-4 bg-camp-sage text-white text-[8px] md:text-[10px] font-bold rounded-full flex items-center justify-center shadow">✓</span>
								} @else if (badgesFor(p).length) {
									<span class="absolute -top-2 -right-2.5 flex -space-x-1">
										@for (b of badgesFor(p).slice(0, 3); track $index) {
											<span
												[title]="b.title"
												class="w-3.5 h-3.5 md:w-[18px] md:h-[18px] rounded-full border border-white shadow flex items-center justify-center text-[7px] md:text-[10px] leading-none"
												[ngClass]="b.tone || 'bg-white'"
												>{{ b.icon }}</span
											>
										}
									</span>
								}
							</button>
						</div>
					}

					@if (areaRect(); as r) {
						<div class="absolute border-2 border-dashed border-camp-sage bg-camp-sage/15 rounded pointer-events-none" [style.left.%]="r.x" [style.top.%]="r.y" [style.width.%]="r.w" [style.height.%]="r.h"></div>
					}
				</div>
			</div>

			<!-- Popup desktop: fuori dal contenitore scalato, quindi non subisce lo zoom -->
			@if (popupPlant(); as pp) {
				@if (!isMobile() && popupTemplate()) {
					<div class="absolute z-40 w-72 animate-scale-in" [ngStyle]="popupStyle()" (mousedown)="$event.stopPropagation()">
						<div class="bg-white border border-camp-sand/60 rounded-camp shadow-camp-xl overflow-hidden">
							<ng-container *ngTemplateOutlet="popupTemplate()!; context: { $implicit: pp, close: closeFn }"></ng-container>
						</div>
					</div>
				}
			}
		</div>

		<!-- Popup mobile: bottom sheet -->
		@if (popupPlant(); as pp) {
			@if (isMobile() && popupTemplate()) {
				<div class="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] z-[96] bg-white rounded-2xl shadow-camp-xl border border-camp-sand/60 overflow-hidden animate-slide-up max-h-[65vh] overflow-y-auto">
					<ng-container *ngTemplateOutlet="popupTemplate()!; context: { $implicit: pp, close: closeFn }"></ng-container>
				</div>
			}
		}
	`,
	styles: [
		`
			.map-ctrl {
				width: 2rem;
				height: 2rem;
				display: flex;
				align-items: center;
				justify-content: center;
				border-radius: 0.75rem;
				color: #3f4238;
				font-weight: 700;
				cursor: pointer;
				transition: all 0.15s ease;
			}
			.map-ctrl:hover {
				background: rgba(232, 228, 217, 0.45);
			}
			.map-ctrl:active {
				transform: scale(0.95);
			}
			.map-ctrl:disabled {
				opacity: 0.3;
				pointer-events: none;
			}
		`
	]
})
export class FarmMapComponent implements AfterViewInit, OnDestroy {
	@ViewChild("viewport", { static: true }) private viewportRef!: ElementRef<HTMLElement>;

	readonly plants = input.required<Plant[]>();
	readonly mode = input<FarmMapMode>("view");
	readonly selectedIds = input<Set<string>>(new Set());
	readonly badges = input<Record<string, MapBadge[]>>({});
	/** Se valorizzato, le piante non incluse vengono attenuate (ricerca/filtri). */
	readonly highlightIds = input<Set<string> | null>(null);
	readonly popupTemplate = input<TemplateRef<PlantPopupContext> | null>(null);

	readonly selectionChange = output<Set<string>>();
	readonly plantMoved = output<{ plant: Plant; x: number; y: number }>();
	readonly moveRejected = output<string>();
	readonly plantClicked = output<Plant>();

	readonly minZoom = MIN_ZOOM;
	readonly maxZoom = MAX_ZOOM;
	readonly colLines = GRID_COL_LINES;
	readonly rowLines = GRID_ROW_LINES;
	readonly gridNodes = GRID_NODES;
	readonly patternId = `parcels-${Math.random().toString(36).slice(2, 8)}`;
	readonly grassTufts = Array.from({ length: 20 }, () => ({ x: Math.random() * 90 + 5, y: Math.random() * 90 + 5 }));

	readonly zoom = signal(1);
	readonly panX = signal(0);
	readonly panY = signal(0);
	readonly isAnimating = signal(false);
	readonly zoomPercent = computed(() => Math.round(this.zoom() * 100));
	readonly viewportSize = signal({ w: 0, h: 0 });
	readonly isMobile = signal(false);
	readonly selectTool = signal<"tap" | "area">("tap");

	readonly activePopupId = signal<string | null>(null);
	readonly dragId = signal<string | null>(null);
	private readonly dragPos = signal<{ x: number; y: number } | null>(null);
	readonly snapPreview = signal<{ x: number; y: number; occupied: boolean } | null>(null);
	readonly areaRect = signal<{ x: number; y: number; w: number; h: number } | null>(null);

	readonly renderedPlants = computed(() => {
		const id = this.dragId();
		const pos = this.dragPos();
		if (!id || !pos) return this.plants();
		return this.plants().map(p => (p.id === id ? { ...p, position_x: pos.x, position_y: pos.y } : p));
	});

	readonly popupPlant = computed(() => {
		const id = this.activePopupId();
		return id ? (this.plants().find(p => p.id === id) ?? null) : null;
	});

	readonly popupStyle = computed(() => {
		const p = this.popupPlant();
		const { w, h } = this.viewportSize();
		if (!p || !w) return {};
		const ax = this.panX() + (p.position_x / 100) * w * this.zoom();
		const ay = this.panY() + (p.position_y / 100) * h * this.zoom();
		const popupW = 288;
		const left = Math.max(8, Math.min(w - popupW - 8, ax - popupW / 2));
		const below = ay < h * 0.45;
		return below ? { left: `${left}px`, top: `${ay + 26}px` } : { left: `${left}px`, bottom: `${h - ay + 26}px` };
	});

	readonly closeFn = () => this.closePopup();

	// Stato gesture
	private hasPanned = false;
	private isPanning = false;
	private panStart = { x: 0, y: 0, panX: 0, panY: 0 };
	private pinch = { active: false, distance: 0, zoom: 1, mapX: 0, mapY: 0, panX: 0, panY: 0 };
	private lastTap = { time: 0, x: 0, y: 0 };
	private areaStart: { x: number; y: number } | null = null;
	private dragMoved = false;
	private dragOrigin = { x: 0, y: 0 };
	private lastPointer = { x: 0, y: 0 };
	private autoPanRaf: number | null = null;
	private autoPanSpeed = { x: 0, y: 0 };
	private cleanupFns: (() => void)[] = [];
	private resizeObserver?: ResizeObserver;
	private mediaQuery?: MediaQueryList;

	constructor() {
		effect(() => {
			const mode = this.mode();
			untracked(() => {
				if (mode !== "view") this.closePopup();
				if (mode !== "select") this.selectTool.set("tap");
			});
		});
		effect(() => {
			// chiude il popup se la pianta non esiste più (es. eliminata)
			const id = this.activePopupId();
			if (id && !this.plants().some(p => p.id === id)) untracked(() => this.activePopupId.set(null));
		});
	}

	ngAfterViewInit() {
		const el = this.viewportRef.nativeElement;
		const update = () => {
			const rect = el.getBoundingClientRect();
			this.viewportSize.set({ w: rect.width, h: rect.height });
			this.applyPan(this.panX(), this.panY());
		};
		update();
		if (typeof ResizeObserver !== "undefined") {
			this.resizeObserver = new ResizeObserver(update);
			this.resizeObserver.observe(el);
		}
		this.mediaQuery = window.matchMedia("(max-width: 767px)");
		this.isMobile.set(this.mediaQuery.matches);
		const onMq = (e: MediaQueryListEvent) => this.isMobile.set(e.matches);
		this.mediaQuery.addEventListener("change", onMq);
		this.cleanupFns.push(() => this.mediaQuery?.removeEventListener("change", onMq));
	}

	ngOnDestroy() {
		this.resizeObserver?.disconnect();
		this.stopAutoPan();
		this.cleanupFns.forEach(fn => fn());
	}

	// ---- API pubblica ----

	openPopup(plantId: string) {
		this.activePopupId.set(plantId);
	}

	closePopup() {
		this.activePopupId.set(null);
	}

	resetView() {
		this.animate(() => {
			this.zoom.set(1);
			this.panX.set(0);
			this.panY.set(0);
		});
	}

	zoomBy(delta: number) {
		const { w, h } = this.viewportSize();
		const target = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.round((this.zoom() + delta) * 10) / 10));
		this.animate(() => this.zoomAt(target, w / 2, h / 2));
	}

	// ---- Rendering helpers ----

	markerClass(p: Plant): string {
		return plantStatusMeta(p.status).marker;
	}

	speciesIcon(species?: string): string {
		switch ((species || "").toLowerCase()) {
			case "agrume":
				return "🍊";
			case "vite":
				return "🍇";
			case "mandorlo":
				return "🌸";
			case "fico":
				return "🌿";
			default:
				return "🌳";
		}
	}

	badgesFor(p: Plant): MapBadge[] {
		return (p.id && this.badges()[p.id]) || [];
	}

	isDimmed(p: Plant): boolean {
		const h = this.highlightIds();
		return !!h && !h.has(p.id!);
	}

	// ---- Click ----

	onBackgroundClick() {
		if (this.hasPanned) return;
		this.closePopup();
	}

	onPlantClick(p: Plant, event: Event) {
		event.stopPropagation();
		if (this.hasPanned || this.dragMoved || !p.id) return;
		if (this.mode() === "select") {
			const next = new Set(this.selectedIds());
			next.has(p.id) ? next.delete(p.id) : next.add(p.id);
			this.selectionChange.emit(next);
		} else if (this.mode() === "view") {
			this.activePopupId.set(this.activePopupId() === p.id ? null : p.id);
		}
		this.plantClicked.emit(p);
	}

	// ---- Mouse: pan / selezione ad area ----

	onMouseDown(event: MouseEvent) {
		if (event.button !== 0 || this.dragId()) return;
		if (this.mode() === "select" && this.selectTool() === "area") {
			this.startArea(event.clientX, event.clientY);
			return;
		}
		this.startPan(event.clientX, event.clientY);
		this.listenWindow(
			(e: MouseEvent) => this.movePan(e.clientX, e.clientY),
			() => this.endPan()
		);
	}

	onWheel(event: WheelEvent) {
		event.preventDefault();
		const rect = this.viewportRef.nativeElement.getBoundingClientRect();
		const target = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, parseFloat((this.zoom() + (event.deltaY > 0 ? -0.2 : 0.2)).toFixed(2))));
		if (target === this.zoom()) return;
		this.isAnimating.set(false);
		this.zoomAt(target, event.clientX - rect.left, event.clientY - rect.top);
	}

	// ---- Touch: pan, pinch, doppio tap ----

	onTouchStart(event: TouchEvent) {
		if (this.dragId()) return;
		const rect = this.viewportRef.nativeElement.getBoundingClientRect();
		if (event.touches.length === 1) {
			const t = event.touches[0];
			const now = Date.now();
			if (now - this.lastTap.time < 320 && Math.hypot(t.clientX - this.lastTap.x, t.clientY - this.lastTap.y) < 30) {
				if (event.cancelable) event.preventDefault();
				this.lastTap.time = 0;
				const x = t.clientX - rect.left;
				const y = t.clientY - rect.top;
				this.animate(() => (this.zoom() > 1.1 ? (this.zoom.set(1), this.panX.set(0), this.panY.set(0)) : this.zoomAt(2.2, x, y)));
				return;
			}
			this.lastTap = { time: now, x: t.clientX, y: t.clientY };
			if (this.mode() === "select" && this.selectTool() === "area") {
				this.startArea(t.clientX, t.clientY, true);
				return;
			}
			this.startPan(t.clientX, t.clientY);
		} else if (event.touches.length === 2) {
			if (event.cancelable) event.preventDefault();
			this.areaStart = null;
			this.areaRect.set(null);
			const [t1, t2] = [event.touches[0], event.touches[1]];
			const midX = (t1.clientX + t2.clientX) / 2 - rect.left;
			const midY = (t1.clientY + t2.clientY) / 2 - rect.top;
			this.isPanning = false;
			this.hasPanned = true;
			this.pinch = {
				active: true,
				distance: Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY),
				zoom: this.zoom(),
				panX: this.panX(),
				panY: this.panY(),
				mapX: (midX - this.panX()) / this.zoom(),
				mapY: (midY - this.panY()) / this.zoom()
			};
			this.isAnimating.set(false);
		}
	}

	onTouchMove(event: TouchEvent) {
		if (this.dragId() || this.areaStart) return;
		const rect = this.viewportRef.nativeElement.getBoundingClientRect();
		if (event.touches.length === 2 && this.pinch.active && this.pinch.distance > 0) {
			if (event.cancelable) event.preventDefault();
			const [t1, t2] = [event.touches[0], event.touches[1]];
			const scale = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY) / this.pinch.distance;
			const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, this.pinch.zoom * scale));
			const midX = (t1.clientX + t2.clientX) / 2 - rect.left;
			const midY = (t1.clientY + t2.clientY) / 2 - rect.top;
			this.zoom.set(newZoom);
			this.applyPan(midX - this.pinch.mapX * newZoom, midY - this.pinch.mapY * newZoom);
		} else if (event.touches.length === 1 && this.isPanning) {
			const t = event.touches[0];
			if (Math.hypot(t.clientX - this.panStart.x, t.clientY - this.panStart.y) > 5 && event.cancelable) event.preventDefault();
			this.movePan(t.clientX, t.clientY);
		}
	}

	onTouchEnd(event: TouchEvent) {
		if (event.touches.length === 0) {
			this.pinch.active = false;
			this.endPan();
		} else if (event.touches.length === 1) {
			this.pinch.active = false;
			this.startPan(event.touches[0].clientX, event.touches[0].clientY);
			this.hasPanned = true;
		}
	}

	// ---- Drag & drop piante (modalità spostamento) ----

	onPlantPointerDown(event: MouseEvent | TouchEvent, plant: Plant) {
		if (this.mode() !== "move" || !plant.id) return;
		event.stopPropagation();
		if (event.cancelable) event.preventDefault();
		const point = this.pointOf(event);
		this.dragId.set(plant.id);
		this.dragMoved = false;
		this.dragOrigin = point;
		this.lastPointer = point;
		this.dragPos.set({ x: plant.position_x, y: plant.position_y });
		this.updateSnap(plant.position_x, plant.position_y, plant.id);

		this.listenWindow(
			(e: MouseEvent | TouchEvent) => {
				if (e.cancelable) e.preventDefault();
				if ("touches" in e && e.touches.length > 1) return this.endDrag();
				const pt = this.pointOf(e);
				this.lastPointer = pt;
				if (Math.hypot(pt.x - this.dragOrigin.x, pt.y - this.dragOrigin.y) > 6) this.dragMoved = true;
				this.updateDrag(pt.x, pt.y);
				this.checkAutoPan(pt.x, pt.y);
			},
			() => this.endDrag(),
			true
		);
	}

	private updateDrag(clientX: number, clientY: number) {
		const id = this.dragId();
		if (!id) return;
		const rect = this.viewportRef.nativeElement.getBoundingClientRect();
		const x = Math.max(5, Math.min(95, (((clientX - rect.left - this.panX()) / this.zoom()) / rect.width) * 100));
		const y = Math.max(5, Math.min(95, (((clientY - rect.top - this.panY()) / this.zoom()) / rect.height) * 100));
		this.dragPos.set({ x: parseFloat(x.toFixed(2)), y: parseFloat(y.toFixed(2)) });
		this.updateSnap(x, y, id);
	}

	private updateSnap(x: number, y: number, id: string) {
		const snapped = snapToGrid(x, y);
		this.snapPreview.set({ ...snapped, occupied: isNodeOccupied(this.plants(), snapped.x, snapped.y, id) });
	}

	private endDrag() {
		this.stopAutoPan();
		const id = this.dragId();
		const pos = this.dragPos();
		const plant = this.plants().find(p => p.id === id);
		const target = this.snapPreview();
		this.dragId.set(null);
		this.dragPos.set(null);
		this.snapPreview.set(null);
		if (plant && pos && target && this.dragMoved) {
			if (target.occupied) this.moveRejected.emit("Punto del reticolo già occupato da un'altra pianta");
			else if (target.x !== plant.position_x || target.y !== plant.position_y) this.plantMoved.emit({ plant, x: target.x, y: target.y });
		}
		setTimeout(() => (this.dragMoved = false), 100);
	}

	private checkAutoPan(clientX: number, clientY: number) {
		if (this.zoom() <= 1) return this.stopAutoPan();
		const rect = this.viewportRef.nativeElement.getBoundingClientRect();
		const margin = 36;
		const sx = clientX < rect.left + margin ? 7 : clientX > rect.right - margin ? -7 : 0;
		const sy = clientY < rect.top + margin ? 7 : clientY > rect.bottom - margin ? -7 : 0;
		this.autoPanSpeed = { x: sx, y: sy };
		if ((sx || sy) && this.autoPanRaf === null) this.runAutoPan();
		if (!sx && !sy) this.stopAutoPan();
	}

	private runAutoPan() {
		this.autoPanRaf = requestAnimationFrame(() => {
			this.autoPanRaf = null;
			if (!this.dragId() || (!this.autoPanSpeed.x && !this.autoPanSpeed.y)) return;
			this.applyPan(this.panX() + this.autoPanSpeed.x, this.panY() + this.autoPanSpeed.y);
			this.updateDrag(this.lastPointer.x, this.lastPointer.y);
			this.runAutoPan();
		});
	}

	private stopAutoPan() {
		if (this.autoPanRaf !== null) cancelAnimationFrame(this.autoPanRaf);
		this.autoPanRaf = null;
		this.autoPanSpeed = { x: 0, y: 0 };
	}

	// ---- Selezione ad area ----

	private startArea(clientX: number, clientY: number, touch = false) {
		const start = this.toMapPercent(clientX, clientY);
		this.areaStart = start;
		this.hasPanned = false;
		const move = (e: MouseEvent | TouchEvent) => {
			if (!this.areaStart) return;
			if (e.cancelable) e.preventDefault();
			const pt = this.pointOf(e);
			const cur = this.toMapPercent(pt.x, pt.y);
			this.hasPanned = true;
			this.areaRect.set({
				x: Math.min(start.x, cur.x),
				y: Math.min(start.y, cur.y),
				w: Math.abs(cur.x - start.x),
				h: Math.abs(cur.y - start.y)
			});
		};
		const end = () => {
			const r = this.areaRect();
			this.areaStart = null;
			this.areaRect.set(null);
			if (r && r.w > 1 && r.h > 1) {
				const next = new Set(this.selectedIds());
				for (const p of this.plants()) {
					if (p.id && !this.isDimmed(p) && p.position_x >= r.x && p.position_x <= r.x + r.w && p.position_y >= r.y && p.position_y <= r.y + r.h) next.add(p.id);
				}
				this.selectionChange.emit(next);
			}
			setTimeout(() => (this.hasPanned = false), 120);
		};
		this.listenWindow(move, end, touch);
	}

	// ---- Pan helpers ----

	private startPan(x: number, y: number) {
		this.isPanning = true;
		this.hasPanned = false;
		this.panStart = { x, y, panX: this.panX(), panY: this.panY() };
		this.isAnimating.set(false);
	}

	private movePan(x: number, y: number) {
		if (!this.isPanning) return;
		const dx = x - this.panStart.x;
		const dy = y - this.panStart.y;
		if (Math.hypot(dx, dy) > 5) this.hasPanned = true;
		this.applyPan(this.panStart.panX + dx, this.panStart.panY + dy);
	}

	private endPan() {
		this.isPanning = false;
		setTimeout(() => (this.hasPanned = false), 180);
	}

	private zoomAt(target: number, x: number, y: number) {
		const mapX = (x - this.panX()) / this.zoom();
		const mapY = (y - this.panY()) / this.zoom();
		this.zoom.set(target);
		this.applyPan(x - mapX * target, y - mapY * target);
	}

	private applyPan(x: number, y: number) {
		const { w, h } = this.viewportSize();
		const z = this.zoom();
		if (!w || z <= 1) {
			this.panX.set(0);
			this.panY.set(0);
			return;
		}
		this.panX.set(Math.min(0, Math.max(w * (1 - z), x)));
		this.panY.set(Math.min(0, Math.max(h * (1 - z), y)));
	}

	private animate(fn: () => void) {
		this.isAnimating.set(true);
		fn();
		setTimeout(() => this.isAnimating.set(false), 260);
	}

	private toMapPercent(clientX: number, clientY: number) {
		const rect = this.viewportRef.nativeElement.getBoundingClientRect();
		return {
			x: (((clientX - rect.left - this.panX()) / this.zoom()) / rect.width) * 100,
			y: (((clientY - rect.top - this.panY()) / this.zoom()) / rect.height) * 100
		};
	}

	private pointOf(e: MouseEvent | TouchEvent) {
		if ("touches" in e) {
			const t = e.touches[0] || e.changedTouches[0];
			return { x: t.clientX, y: t.clientY };
		}
		return { x: e.clientX, y: e.clientY };
	}

	private listenWindow(move: (e: any) => void, end: () => void, includeTouch = false) {
		const opts = { passive: false } as AddEventListenerOptions;
		const stop = () => {
			window.removeEventListener("mousemove", move);
			window.removeEventListener("mouseup", stop);
			if (includeTouch) {
				window.removeEventListener("touchmove", move);
				window.removeEventListener("touchend", stop);
				window.removeEventListener("touchcancel", stop);
			}
			this.cleanupFns = this.cleanupFns.filter(fn => fn !== stop);
			end();
		};
		window.addEventListener("mousemove", move, opts);
		window.addEventListener("mouseup", stop);
		if (includeTouch) {
			window.addEventListener("touchmove", move, opts);
			window.addEventListener("touchend", stop);
			window.addEventListener("touchcancel", stop);
		}
		this.cleanupFns.push(stop);
	}

	@HostListener("window:keydown.escape")
	onEscape() {
		this.closePopup();
	}
}
