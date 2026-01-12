import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of, forkJoin } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { Member } from 'src/modeles/Member';

@Injectable({
  providedIn: 'root'
}) 
export class MemberService {

  constructor(private httpClient: HttpClient) { }

  GetAllMembers(): Observable<Member[]> {
    return this.httpClient.get<any[]>("/MEMBRE-SERVICE/membres").pipe(
      map(list => list.map(m => ({
        id: m.id,
        cin: m.cin,
        nom: m.nom,
        prenom: m.prenom,
        dateNaissance: m.dateNaissance,
        photo: m.photo,
        cv: m.cv,
        email: m.email,
        password: m.password,
        type: m.dateInscription !== undefined ? 'etudiant' : 'enseignant',
        createdDate: m.dateInscription || new Date().toISOString().slice(0, 10)
      }) as Member)),
      catchError(err => {
        console.error('GetAllMembers error', err);
        return of([] as Member[]);
      })
    );
  }

  addMember(f: Member): Observable<void> {
    const today = new Date().toISOString().slice(0, 10);
    
    if (f.type.toLowerCase() === 'enseignant') {
      const payload = { 
        cin: f.cin, 
        nom: f.nom, 
        prenom: f.prenom, 
        dateNaissance: f.dateNaissance || today, 
        email: f.email || '', 
        password: f.password || '',
        photo: f.photo || null,
        cv: f.cv || '',
        grade: (f as any).grade || '', 
        etablissement: (f as any).etablissement || ''
      };
      return this.httpClient.post<void>('/MEMBRE-SERVICE/membres/enseignant', payload);
    } else {
      const payload = { 
        cin: f.cin, 
        nom: f.nom, 
        prenom: f.prenom, 
        dateNaissance: f.dateNaissance || today, 
        email: f.email || '', 
        password: f.password || '',
        photo: f.photo || null,
        cv: f.cv || '',
        dateInscription: (f as any).dateInscription || today, 
        diplome: (f as any).diplome || '', 
        sujet: (f as any).sujet || '',
        encadrant: (f as any).encadrant || null
      };
      return this.httpClient.post<void>('/MEMBRE-SERVICE/membres/etudiant', payload);
    }
  }

  deleteMemberById(id: string): Observable<void> {
    return this.httpClient.delete<void>(`/MEMBRE-SERVICE/membres/${id}`);
  }

  getMemberById(id: string): Observable<Member> {
    return this.httpClient.get<any>(`/MEMBRE-SERVICE/membres/${id}`).pipe(
      map(m => ({ 
        id: m.id, 
        cin: m.cin, 
        nom: m.nom, 
        prenom: m.prenom, 
        dateNaissance: m.dateNaissance, 
        photo: m.photo, 
        cv: m.cv, 
        email: m.email, 
        password: m.password,
        // student/teacher specific fields
        dateInscription: m.dateInscription || null,
        diplome: m.diplome || null,
        sujet: m.sujet || null,
        grade: m.grade || null,
        etablissement: m.etablissement || null,
        encadrant: m.encadrant || null,
        type: m.dateInscription !== undefined && m.dateInscription !== null ? 'etudiant' : 'enseignant',
        createdDate: m.dateInscription || new Date().toISOString().slice(0, 10)
      } as Member))
    );
  }

  // Get raw member object (including nested encadrant and teacher/student-specific fields)
  getRawMemberById(id: string): Observable<any> {
    return this.httpClient.get<any>(`/MEMBRE-SERVICE/membres/${id}`);
  }

  // Get full member (with pubs/evts/outils) - backend provides /fullmember/{id}
  getFullMemberById(id: string): Observable<any> {
    return this.httpClient.get<any>(`/MEMBRE-SERVICE/fullmember/${id}`);
  }

  // Get raw list of members (useful to find students of a teacher)
  getAllMembersRaw(): Observable<any[]> {
    return this.httpClient.get<any[]>(`/MEMBRE-SERVICE/membres`);
  }

  // Assign a teacher as encadrant to a student
  setEncadrant(studentId: string, teacherId: number) {
    return this.getRawMemberById(studentId).pipe(
      switchMap((s: any) => {
        const payload: any = {
          cin: s.cin,
          nom: s.nom,
          prenom: s.prenom,
          dateNaissance: s.dateNaissance || new Date().toISOString().slice(0,10),
          email: s.email || '',
          password: s.password || '',
          photo: s.photo || null,
          cv: s.cv || '',
          dateInscription: s.dateInscription || new Date().toISOString().slice(0,10),
          diplome: s.diplome || '',
          sujet: s.sujet || '',
          encadrant: { id: teacherId }
        };
        return this.httpClient.put<void>(`/MEMBRE-SERVICE/membres/etudiant/${studentId}`, payload);
      }),
      catchError(err => {
        console.error('setEncadrant error', err);
        return of(null);
      })
    );
  }

  // Affect an author to a publication (calls backend service method affecterauteurTopublication)
  affectAuthorToPublication(authorId: number, publicationId: number) {
    return this.httpClient.post<void>(`/MEMBRE-SERVICE/affecterauteurTopublication/${authorId}/${publicationId}`, {}).pipe(
      catchError(err => {
        console.error('affectAuthorToPublication error', err);
        return of(null);
      })
    );
  }

  // Remove author association from a publication (best-effort endpoint)
  removeAuthorFromPublication(authorId: number, publicationId: number) {
    return this.httpClient.post<void>(`/MEMBRE-SERVICE/removeauteurTopublication/${authorId}/${publicationId}`, {}).pipe(
      catchError(err => {
        // Not all backends will expose such endpoint; log and continue
        console.error('removeAuthorFromPublication error (ignored)', err);
        return of(null);
      })
    );
  }

  // Batch helper to affect multiple authors (returns observable that completes when all done)
  affectAuthorsToPublication(publicationId: number, authorIds: number[]): Observable<any> {
    if (!authorIds || authorIds.length === 0) return of(null);
    const ops = authorIds.map(id => this.affectAuthorToPublication(id, publicationId));
    // use forkJoin to wait for all to finish
    return forkJoin(ops);
  }

  // Affect a member to an event
  affectMemberToEvent(memberId: number, eventId: number) {
    return this.httpClient.post<void>(`/MEMBRE-SERVICE/affectermembreToevenement/${memberId}/${eventId}`, {}).pipe(
      catchError(err => {
        console.error('affectMemberToEvent error', err);
        return of(null);
      })
    );
  }

  removeMemberFromEvent(memberId: number, eventId: number) {
    return this.httpClient.post<void>(`/MEMBRE-SERVICE/removeMembreToevenement/${memberId}/${eventId}`, {}).pipe(
      catchError(err => {
        console.error('removeMemberFromEvent error (ignored)', err);
        return of(null);
      })
    );
  }

  affectMembersToEvent(eventId: number, memberIds: number[]): Observable<any> {
    if (!memberIds || memberIds.length === 0) return of(null);
    const ops = memberIds.map(id => this.affectMemberToEvent(id, eventId));
    return forkJoin(ops);
  }

  // Affect a member to an outil
  affectMemberToOutil(memberId: number, outilId: number) {
    return this.httpClient.post<void>(`/MEMBRE-SERVICE/affectermembreTooutil/${memberId}/${outilId}`, {}).pipe(
      catchError(err => {
        console.error('affectMemberToOutil error', err);
        return of(null);
      })
    );
  }

  removeMemberFromOutil(memberId: number, outilId: number) {
    return this.httpClient.post<void>(`/MEMBRE-SERVICE/removeMembreTooutil/${memberId}/${outilId}`, {}).pipe(
      catchError(err => {
        console.error('removeMemberFromOutil error (ignored)', err);
        return of(null);
      })
    );
  }

  affectMembersToOutil(outilId: number, memberIds: number[]): Observable<any> {
    if (!memberIds || memberIds.length === 0) return of(null);
    const ops = memberIds.map(id => this.affectMemberToOutil(id, outilId));
    return forkJoin(ops);
  }

  // Remove encadrant from a student
  removeEncadrant(studentId: string) {
    return this.getRawMemberById(studentId).pipe(
      switchMap((s: any) => {
        const payload: any = {
          cin: s.cin,
          nom: s.nom,
          prenom: s.prenom,
          dateNaissance: s.dateNaissance || new Date().toISOString().slice(0,10),
          email: s.email || '',
          password: s.password || '',
          photo: s.photo || null,
          cv: s.cv || '',
          dateInscription: s.dateInscription || new Date().toISOString().slice(0,10),
          diplome: s.diplome || '',
          sujet: s.sujet || '',
          encadrant: null
        };
        return this.httpClient.put<void>(`/MEMBRE-SERVICE/membres/etudiant/${studentId}`, payload);
      })
    );
  }

  updateMember(id: string, f: Member): Observable<void> {
    const today = new Date().toISOString().slice(0, 10);
    
    if (f.type.toLowerCase() === 'enseignant') {
      const payload = { 
        cin: f.cin, 
        nom: f.nom, 
        prenom: f.prenom, 
        dateNaissance: f.dateNaissance || today, 
        email: f.email || '', 
        password: f.password || '',
        photo: f.photo || null,
        cv: f.cv || '',
        grade: (f as any).grade || '', 
        etablissement: (f as any).etablissement || ''
      };
      return this.httpClient.put<void>(`/MEMBRE-SERVICE/membres/enseignant/${id}`, payload);
    } else {
      const payload = { 
        cin: f.cin, 
        nom: f.nom, 
        prenom: f.prenom, 
        dateNaissance: f.dateNaissance || today, 
        email: f.email || '', 
        password: f.password || '',
        photo: f.photo || null,
        cv: f.cv || '',
        dateInscription: (f as any).dateInscription || today, 
        diplome: (f as any).diplome || '', 
        sujet: (f as any).sujet || '',
        encadrant: (f as any).encadrant || null
      };
      return this.httpClient.put<void>(`/MEMBRE-SERVICE/membres/etudiant/${id}`, payload);
    }
  }
  
}