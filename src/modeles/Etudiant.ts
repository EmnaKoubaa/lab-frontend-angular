import { Member } from './Member';

export interface Etudiant extends Member {
  dateInscription: Date,
  diplome: string,
}