import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';

export type ResourceType = 'pub' | 'evt' | 'outil';
export interface ResourceChange {
  type: ResourceType;
  memberIds: number[];
}

@Injectable({ providedIn: 'root' })
export class ResourceSyncService {
  private subject = new Subject<ResourceChange>();

  emit(change: ResourceChange) {
    try { this.subject.next(change); } catch (e) { console.error('ResourceSyncService emit error', e); }
  }

  onChange(): Observable<ResourceChange> {
    return this.subject.asObservable();
  }
}
