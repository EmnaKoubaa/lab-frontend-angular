import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Pub } from 'src/modeles/Pub';


@Injectable({
  providedIn: 'root'
})
export class PubService {

  private memberCache: { [pubId: number]: number[] } = {};

  constructor(private httpClient: HttpClient) { }

  setMembersForPub(pubId: number, memberIds: number[]) {
    this.memberCache[Number(pubId)] = memberIds || [];
  }

  getMembersForPub(pubId: number): number[] | undefined {
    return this.memberCache[Number(pubId)];
  }

  getAllPubs(): Observable<Pub[]> {
    return this.httpClient.get<any[]>(`/PUBLICATION-SERVICE/publications`).pipe(
      map(list => list.map(p => ({
              id: p.id,
              type: p.type,
              titre: p.titre,
              lien: p.lien,
              date: p.date,
              sourcePdf: p.sourcePdf || p.sourcepdf,
              membres: p.membres || p.auteurs || []
            }) as Pub)),
      catchError(err => {
        console.error('getAllPubs error', err);
        return of([] as Pub[]);
      })
    );
  }

  addPub(p: Pub): Observable<Pub | null> {
    // send source as 'sourcepdf' to match backend field if needed
    const payload: any = { type: p.type, titre: p.titre, lien: p.lien, date: p.date, sourcepdf: p.sourcePdf };
    if ((p as any).membres && Array.isArray((p as any).membres)) {
      payload.membres = (p as any).membres.map((m: any) => ({ id: Number(m.id) }));
    }
        return this.httpClient.post<any>(`/PUBLICATION-SERVICE/publications`, payload).pipe(
          map(p => ({ id: p.id, type: p.type, titre: p.titre, lien: p.lien, date: p.date, sourcePdf: p.sourcePdf || p.sourcepdf, membres: p.membres || p.auteurs || [] } as Pub)),
          catchError(err => {
            console.error('addPub error', err);
            return of(null);
          })
        );
  }

  getPubById(id: string): Observable<Pub> {
    return this.httpClient.get<any>(`/PUBLICATION-SERVICE/publications/${id}`).pipe(
          map(p => ({ id: p.id, type: p.type, titre: p.titre, lien: p.lien, date: p.date, sourcePdf: p.sourcePdf || p.sourcepdf, membres: p.membres || p.auteurs || [] } as Pub))
        );
  }

  updatePub(id: string, p: Pub): Observable<void | null> {
    // send source as 'sourcepdf' to match backend field name and include selected members
    const payload: any = { type: p.type, titre: p.titre, lien: p.lien, date: p.date, sourcepdf: p.sourcePdf };
    if ((p as any).membres && Array.isArray((p as any).membres)) {
      payload.membres = (p as any).membres.map((m: any) => ({ id: Number(m.id ?? m) }));
    }
    return this.httpClient.put<void>(`/PUBLICATION-SERVICE/publications/${id}`, payload).pipe(
      catchError(err => {
        console.error('updatePub error', err);
        return of(null as any);
      })
    );
  }

  deletePubById(id: string): Observable<void> {
    return this.httpClient.delete<void>(`/PUBLICATION-SERVICE/publications/${id}`);
  }
}