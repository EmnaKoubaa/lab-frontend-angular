export interface Evt{
    id:number;
    titre:string;
    dateDeb:Date;
    dateFin:Date;
    lieu:string;
    membres?: any[];
}