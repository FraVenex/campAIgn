import { Injectable, computed, inject, signal } from "@angular/core";
import { SupabaseService } from "./supabase.service";
import { AuthService } from "./auth.service";
import { makeLocalId } from "./table-repository";

export interface Photo {
	id: string;
	user_id: string;
	plant_id?: string | null;
	storage_path: string;
	public_url: string;
	caption?: string | null;
	created_at: string;
	isLocal?: boolean;
}

export interface PhotoUpload {
	file: File;
	caption?: string;
}

const LOCAL_PHOTOS_KEY = "camp-local-photos";
const BUCKET = "plant-photos";

/**
 * Foto di piante e della galleria generale.
 * Usa Supabase Storage + tabella `plant_photos`; se bucket o tabella non sono disponibili
 * salva una copia compressa in locale per non perdere il lavoro dell'utente.
 */
@Injectable({ providedIn: "root" })
export class PhotosService {
	private client = inject(SupabaseService).client;
	private auth = inject(AuthService);

	readonly photos = signal<Photo[]>([]);
	readonly loaded = signal(false);
	readonly usingLocalFallback = computed(() => this.photos().some(p => p.isLocal));

	async load(force = false): Promise<void> {
		if (this.loaded() && !force) return;
		const user = this.auth.currentUser();
		let remote: Photo[] = [];
		if (user) {
			try {
				const { data, error } = await this.client.from("plant_photos").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
				if (error) throw error;
				remote = (data || []) as Photo[];
			} catch (err) {
				console.warn("[PhotosService] Tabella foto non disponibile, uso archivio locale.", err);
			}
		}
		this.photos.set(this.sortPhotos([...remote, ...this.localPhotos()]));
		this.loaded.set(true);
	}

	forPlant(plantId: string): Photo[] {
		return this.photos().filter(p => p.plant_id === plantId);
	}

	async upload(items: PhotoUpload[], plantId: string | null): Promise<{ uploaded: Photo[]; errors: string[] }> {
		const user = this.auth.currentUser();
		if (!user) return { uploaded: [], errors: ["Utente non autenticato."] };

		const uploaded: Photo[] = [];
		const errors: string[] = [];
		for (const item of items) {
			try {
				uploaded.push(await this.uploadRemote(item, plantId, user.id));
			} catch (remoteErr: any) {
				try {
					uploaded.push(await this.saveLocal(item, plantId, user.id));
				} catch {
					errors.push(`${item.file.name}: ${remoteErr?.message || "caricamento non riuscito"}`);
				}
			}
		}
		if (uploaded.length) this.photos.update(list => this.sortPhotos([...uploaded, ...list]));
		return { uploaded, errors };
	}

	async updateCaption(photo: Photo, caption: string): Promise<void> {
		if (photo.isLocal) {
			this.saveLocalPhotos(this.localPhotos().map(p => (p.id === photo.id ? { ...p, caption } : p)));
		} else {
			const { error } = await this.client.from("plant_photos").update({ caption }).eq("id", photo.id);
			if (error) throw error;
		}
		this.photos.update(list => list.map(p => (p.id === photo.id ? { ...p, caption } : p)));
	}

	async remove(photo: Photo): Promise<void> {
		if (photo.isLocal) {
			this.saveLocalPhotos(this.localPhotos().filter(p => p.id !== photo.id));
		} else {
			await this.client.storage.from(BUCKET).remove([photo.storage_path]);
			const { error } = await this.client.from("plant_photos").delete().eq("id", photo.id);
			if (error) throw error;
		}
		this.photos.update(list => list.filter(p => p.id !== photo.id));
	}

	private async uploadRemote(item: PhotoUpload, plantId: string | null, userId: string): Promise<Photo> {
		const ext = item.file.name.split(".").pop() || "jpg";
		const path = `${userId}/${plantId || "gallery"}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
		const { error: storageError } = await this.client.storage.from(BUCKET).upload(path, item.file, { contentType: item.file.type, upsert: false });
		if (storageError) throw storageError;
		const { data: urlData } = this.client.storage.from(BUCKET).getPublicUrl(path);
		const { data, error } = await this.client
			.from("plant_photos")
			.insert([{ plant_id: plantId, user_id: userId, storage_path: path, public_url: urlData.publicUrl, caption: item.caption || null }])
			.select()
			.single();
		if (error) {
			await this.client.storage.from(BUCKET).remove([path]);
			throw error;
		}
		return data as Photo;
	}

	private async saveLocal(item: PhotoUpload, plantId: string | null, userId: string): Promise<Photo> {
		const dataUrl = await downscaleImage(item.file, 1280, 0.72);
		const photo: Photo = {
			id: makeLocalId("photo"),
			user_id: userId,
			plant_id: plantId,
			storage_path: "local",
			public_url: dataUrl,
			caption: item.caption || null,
			created_at: new Date().toISOString(),
			isLocal: true
		};
		const all = [photo, ...this.localPhotos()];
		this.saveLocalPhotos(all);
		if (!this.localPhotos().some(p => p.id === photo.id)) throw new Error("Spazio locale esaurito");
		return photo;
	}

	private localPhotos(): Photo[] {
		try {
			return JSON.parse(localStorage.getItem(LOCAL_PHOTOS_KEY) || "[]");
		} catch {
			return [];
		}
	}

	private saveLocalPhotos(list: Photo[]) {
		try {
			localStorage.setItem(LOCAL_PHOTOS_KEY, JSON.stringify(list));
		} catch {
			// quota piena
		}
	}

	private sortPhotos(list: Photo[]): Photo[] {
		return [...list].sort((a, b) => b.created_at.localeCompare(a.created_at));
	}
}

function downscaleImage(file: File, maxSize: number, quality: number): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onerror = () => reject(reader.error);
		reader.onload = () => {
			const img = new Image();
			img.onerror = () => reject(new Error("Immagine non valida"));
			img.onload = () => {
				const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
				const canvas = document.createElement("canvas");
				canvas.width = Math.round(img.width * scale);
				canvas.height = Math.round(img.height * scale);
				canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
				resolve(canvas.toDataURL("image/jpeg", quality));
			};
			img.src = reader.result as string;
		};
		reader.readAsDataURL(file);
	});
}
