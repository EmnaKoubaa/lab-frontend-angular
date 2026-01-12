import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Evt } from '../modeles/Evt';

@Injectable({
  providedIn: 'root'
})
export class EvtService {
  private memberCache: { [evtId: number]: number[] } = {};

  constructor(private httpClient:HttpClient) { }

  setMembersForEvent(evtId: number, memberIds: number[]) {
    this.memberCache[Number(evtId)] = memberIds || [];
  }

  getMembersForEvent(evtId: number): number[] | undefined {
    return this.memberCache[Number(evtId)];
  }
  getAllEvents():Observable<Evt[]>{
    return this.httpClient.get<any[]>(`/EVENEMENT-SERVICE/evenements`).pipe(
      map(list => list.map(e => ({
        id: e.id,
        titre: e.titre,
        dateDeb: e.dateDeb || e.date,
        dateFin: e.dateFin || e.date,
        lieu: e.lieu,
      }) as Evt)),
      catchError(err => {
        console.error('getAllEvents error', err);
        return of([] as Evt[]);
      })
    );
  }

  addEvent(evt:Evt):Observable<Evt>{
    const payload: any = { titre: evt.titre, dateDeb: evt.dateDeb, dateFin: evt.dateFin, lieu: evt.lieu };
    if ((evt as any).membres && Array.isArray((evt as any).membres)) {
      payload.membres = (evt as any).membres.map((m: any) => ({ id: Number(m.id) }));
    }
    return this.httpClient.post<any>(`/EVENEMENT-SERVICE/evenements`, payload).pipe(
      map(e => ({ id: e.id, titre: e.titre, dateDeb: e.dateDeb || e.date, dateFin: e.dateFin || e.date, lieu: e.lieu, membres: e.membres || [] } as Evt))
    );
  }

  updateEvent(id:string,evt:Evt):Observable<void>{
    const payload: any = { titre: evt.titre, dateDeb: evt.dateDeb, dateFin: evt.dateFin, lieu: evt.lieu };
    if ((evt as any).membres && Array.isArray((evt as any).membres)) {
      payload.membres = (evt as any).membres.map((m: any) => ({ id: Number(m.id) }));
    }
    return this.httpClient.put<void>(`/EVENEMENT-SERVICE/evenements/${id}`,payload);
  }

  getEventById(id:string):Observable<Evt>{
    return this.httpClient.get<any>(`/EVENEMENT-SERVICE/evenements/${id}`).pipe(
      map(e => ({ id: e.id, titre: e.titre, dateDeb: e.dateDeb || e.date, dateFin: e.dateFin || e.date, lieu: e.lieu, membres: e.membres || [] } as Evt))
    );
  }

  deleteEventById(id:string):Observable<void>{
    return this.httpClient.delete<void>(`/EVENEMENT-SERVICE/evenements/${id}`);
  }
  
}
