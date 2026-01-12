import { Member } from './Member';

export interface Enseignant extends Member {
  grade: string,
  etablissement: string,
}