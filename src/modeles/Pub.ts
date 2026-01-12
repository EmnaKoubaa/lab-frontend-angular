export interface Pub {
  id: number;
  type: string;
  titre: string;
  lien: string;
  date: Date;
  sourcePdf: string;
  membres?: any[];
}