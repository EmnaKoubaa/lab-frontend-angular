import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Outil } from 'src/modeles/Outil';

@Injectable({
  providedIn: 'root'
})
export class OutilService {
  private memberCache: { [outilId: number]: number[] } = {};

  constructor(private httpClient: HttpClient) { }

  setMembersForOutil(outilId: number, memberIds: number[]) {
    this.memberCache[Number(outilId)] = memberIds || [];
  }

  getMembersForOutil(outilId: number): number[] | undefined {
    return this.memberCache[Number(outilId)];
  }
  getAllOutils(): Observable<Outil[]> {
    return this.httpClient.get<Outil[]>(`/OUTIL-SERVICE/outils`).pipe(
      map(list => list.map(o => ({
        id: o.id,
        date: o.date,
        source: o.source,
      }) as Outil)),
      catchError(err => {
        console.error('getAllOutils error', err);
        return of([] as Outil[]);
      })
    );
  }

  addOutil(o: Outil): Observable<Outil | null> {
    const payload: any = { date: o.date, source: o.source };
    if ((o as any).membres && Array.isArray((o as any).membres)) {
      payload.membres = (o as any).membres.map((m: any) => ({ id: Number(m.id) }));
    }
    return this.httpClient.post<Outil>(`/OUTIL-SERVICE/outils`, payload).pipe(
      map(o => ({ id: o.id, date: o.date, source: o.source, membres: (o as any).membres || [] } as Outil)),
      catchError(err => {
        console.error('addOutil error', err);
        return of(null);
      })
    );
  }

  getOutilById(id: string): Observable<Outil> {
    return this.httpClient.get<any>(`/OUTIL-SERVICE/outils/${id}`).pipe(
      map(o => ({ id: o.id, date: o.date, source: o.source, membres: o.membres || [] } as Outil))
    );
  }

  updateOutil(id: string, o: Outil): Observable<void> {
    const payload: any = { date: o.date, source: o.source };
    if ((o as any).membres && Array.isArray((o as any).membres)) {
      payload.membres = (o as any).membres.map((m: any) => ({ id: Number(m.id) }));
    }
    return this.httpClient.put<void>(`/OUTIL-SERVICE/outils/${id}`, payload);
  }

  deleteOutilById(id: string): Observable<void> {
    return this.httpClient.delete<void>(`/OUTIL-SERVICE/outils/${id}`);
  }
}